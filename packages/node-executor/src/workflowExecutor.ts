import type { BaseNode } from "./BaseNode.ts";
import type {
  PortDefinition,
  NodeResult,
  NodeResultOutput,
  ExecutionLog,
  NodeExecutionLog,
  WorkflowEdge,
  WorkflowExecutionResult,
  WorkflowExecutorOptions,
  WorkflowNode,
  WorkflowStatus,
  NodeExecutionStatus,
  WorkflowExecutionContext,
  IterationResult,
} from "./types.ts";
import { WorkflowEventType } from "./events.ts";
import { StartNode } from "./nodes/StartNode.ts";
import { EndNode } from "./nodes/EndNode.ts";
import { IfNode } from "./nodes/IfNode.ts";
import { ForNode, type ForConfig } from "./nodes/ForNode.ts";
import {
  buildVariableContext,
  resolveConfigWithVariables,
} from "./variableResolver.ts";

const DEBUG_PREFIX = "[NODE_EXECUTOR_DEBUG]";

function debugLog(message: string, payload?: unknown): void {
  if (payload === undefined) {
    console.log(`${DEBUG_PREFIX} ${message}`);
    return;
  }

  console.log(`${DEBUG_PREFIX} ${message}`, payload);
}

// 核心节点注册表
const CORE_NODE_MAP: Record<string, BaseNode> = {
  start: new StartNode(),
  end: new EndNode(),
  if: new IfNode(),
  for: new ForNode(),
};

/**
 * 收集节点输入的上下文选项
 */
interface CollectContextOptions {
  /** 入边映射表，键为节点ID，值为指向该节点的边数组 */
  incomingMap: Map<string, WorkflowEdge[]>;
  /** 节点执行结果映射表，键为节点ID，值为节点执行结果 */
  nodeResults: Record<string, NodeResult>;
}

/**
 * 确定开始节点的选项
 */
interface DetermineStartOptions {
  /** 工作流节点数组 */
  nodes: WorkflowNode[];
  /** 显式指定的开始节点ID */
  explicitStartId?: string;
}

/** 默认日志前缀 */
const DEFAULT_LOG_PREFIX = "workflow";

/**
 * 执行工作流
 * @param options - 工作流执行选项
 * @returns 工作流执行结果
 * @throws 如果节点数组为空或未找到开始节点，则抛出错误
 */
export async function executeWorkflow<TNode extends BaseNode = BaseNode>(
  options: WorkflowExecutorOptions<TNode>
): Promise<WorkflowExecutionResult> {
  const {
    nodes,
    edges,
    startNodeId,
    nodeFactory: __nodeFactory,
    signal,
    logId,
    emitter,
    executionId,
    workflowId,
  } = options;

  const nodeFactory = (type: string): BaseNode | undefined => {
    return CORE_NODE_MAP[type] ?? __nodeFactory?.(type);
  };

  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new Error("执行失败：至少需要一个节点");
  }

  if (signal?.aborted) {
    throw new Error("执行已被取消");
  }

  // 生成执行任务ID（如果未提供）
  const taskExecutionId = executionId || `exec_${Date.now()}`;
  const taskWorkflowId = workflowId || "default-workflow";

  // 发送工作流开始事件
  if (emitter) {
    emitter.emit(WorkflowEventType.STARTED, {
      executionId: taskExecutionId,
      workflowId: taskWorkflowId,
      mode: "worker",
      timestamp: Date.now(),
      totalNodes: nodes.length,
    });
  }

  const startNode = determineStartNode({ nodes, explicitStartId: startNodeId });
  if (!startNode) {
    throw new Error("执行失败：未找到开始节点");
  }

  const nodeMap = new Map<string, WorkflowNode>();
  nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node, data: { ...node.data } });
  });

  const outgoingMap = buildEdgeMap(edges, "source");
  const incomingMap = buildEdgeMap(edges, "target");

  const log: ExecutionLog = {
    logId: logId ?? `${DEFAULT_LOG_PREFIX}_${Date.now()}`,
    startTime: Date.now(),
    status: "running",
    nodes: nodes.map((node) => createPendingLog(node)),
  };

  const nodeLogMap = new Map<string, NodeExecutionLog>();
  log.nodes.forEach((entry) => nodeLogMap.set(entry.nodeId, entry));

  const nodeResults: Record<string, NodeResult> = {};
  const executedNodeIds = new Set<string>();
  const queue: string[] = [startNode.id];
  const visitedQueue = new Set<string>();
  let workflowStatus: WorkflowStatus = "running";
  let workflowError: string | undefined;
  let endNodeReached = false;

  // 创建执行上下文，用于在工作流执行过程中共享状态
  const context: WorkflowExecutionContext = {};

  while (queue.length > 0) {
    if (signal?.aborted) {
      workflowStatus = "aborted";
      workflowError = "执行已被取消";
      break;
    }

    const nodeId = queue.shift()!;
    if (visitedQueue.has(nodeId)) {
      continue;
    }
    visitedQueue.add(nodeId);

    const currentNode = nodeMap.get(nodeId);
    if (!currentNode) {
      continue;
    }

    const logEntry = nodeLogMap.get(nodeId);
    if (!logEntry) {
      continue;
    }

    logEntry.status = "running";
    logEntry.startTime = Date.now();

    // 发送节点开始执行事件
    if (emitter) {
      emitter.emit(WorkflowEventType.NODE_STATUS, {
        executionId: taskExecutionId,
        nodeId,
        status: "running" as NodeExecutionStatus,
        timestamp: Date.now(),
      });
    }

    try {
      if (!nodeFactory) {
        throw new Error("nodeFactory 是必需的，请提供节点工厂函数");
      }

      const executor = resolveNodeExecutor(currentNode, nodeFactory);

      if (!executor) {
        throw new Error(`未找到节点执行器: ${deriveNodeType(currentNode)}`);
      }

      const inputs = collectNodeInputs(currentNode.id, {
        incomingMap,
        nodeResults,
      });
      logEntry.input = inputs;

      const resolvedConfig = resolveNodeConfig({
        node: currentNode,
        executor,
        nodeMap,
        edges,
      });
      debugLog("executeWorkflow:resolvedConfig", {
        nodeId,
        resolvedConfig,
      });

      // 传递执行上下文给节点
      const result = await executor.run(resolvedConfig, inputs, context);

      let finalResult = result;
      let forLoopHandled = false;

      if (deriveNodeType(currentNode) === "for") {
        const loopExecution = await handleForLoopExecution({
          currentNode,
          result,
          context,
          nodeMap,
          edges,
          nodeResults,
          nodeFactory,
          incomingMap,
          outgoingMap,
          emitter,
          executionId: taskExecutionId,
          nodeLogMap,
          executedNodeIds,
        });

        finalResult = loopExecution.result;
        forLoopHandled = loopExecution.handled;
      }

      nodeResults[currentNode.id] = finalResult;
      executedNodeIds.add(currentNode.id);
      currentNode.data = {
        ...currentNode.data,
        result: finalResult,
      };

      const endTime = Date.now();
      logEntry.status = "success";
      logEntry.endTime = endTime;
      logEntry.input = inputs;
      logEntry.output = finalResult;

      // 发送节点执行成功事件
      if (emitter) {
        emitter.emit(WorkflowEventType.NODE_STATUS, {
          executionId: taskExecutionId,
          nodeId,
          status: "success" as NodeExecutionStatus,
          timestamp: endTime,
          output: finalResult,
          duration: endTime - logEntry.startTime,
        });
      }

      if (deriveNodeType(currentNode) === "end") {
        endNodeReached = true;
        continue;
      }

      const nextEdges = outgoingMap.get(nodeId) ?? [];

      const activeHandles = new Set<string>();
      const outputEntries = Object.entries(finalResult.data?.outputs ?? {});
      outputEntries.forEach(([handleId, output]) => {
        const outputValue = output as NodeResultOutput | undefined;
        if (outputValue && outputValue.value !== undefined) {
          activeHandles.add(handleId);
        }
      });

      if (forLoopHandled) {
        activeHandles.delete("loop");
      }

      let edgesToQueue = nextEdges;
      if (activeHandles.size > 0) {
        edgesToQueue = nextEdges.filter((edge) => {
          const handleId = edge.sourceHandle ?? null;
          if (!handleId) {
            return activeHandles.size === 1;
          }
          if (activeHandles.has(handleId)) {
            return true;
          }
          return handleId === "__output__" || handleId === "result";
        });
      }

      // 发送边激活事件
      edgesToQueue.forEach((edge) => {
        if (!visitedQueue.has(edge.target)) {
          queue.push(edge.target);

          // 发送边激活事件
          if (emitter && edge.id) {
            emitter.emit(WorkflowEventType.EDGE_ACTIVE, {
              executionId: taskExecutionId,
              edgeId: edge.id,
              fromNodeId: edge.source,
              toNodeId: edge.target,
              timestamp: Date.now(),
            });
          }
        }
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? "执行异常");
      const errorTime = Date.now();
      logEntry.status = "error";
      logEntry.endTime = errorTime;
      logEntry.input = logEntry.input ?? null;
      logEntry.error = message;
      workflowStatus = "error";
      workflowError = message;

      // 发送节点执行错误事件
      if (emitter) {
        emitter.emit(WorkflowEventType.NODE_STATUS, {
          executionId: taskExecutionId,
          nodeId,
          status: "error" as NodeExecutionStatus,
          timestamp: errorTime,
          error: {
            message,
            stack: error instanceof Error ? error.stack : undefined,
          },
          duration: errorTime - logEntry.startTime,
        });
      }

      break;
    }
  }

  if (workflowStatus === "running") {
    if (endNodeReached) {
      workflowStatus = "success";
    } else {
      // 队列执行完毕但未显式遇到结束节点
      workflowStatus = "success";
    }
  }

  // 标记未执行节点
  const skippedNodeIds: string[] = [];
  log.nodes.forEach((entry) => {
    if (!executedNodeIds.has(entry.nodeId)) {
      if (entry.status !== "error") {
        entry.status = "skipped";
      }
      entry.endTime = entry.endTime ?? Date.now();
      entry.input = entry.input ?? null;
      skippedNodeIds.push(entry.nodeId);
    }
  });

  const finalEndTime = Date.now();
  log.status = workflowStatus;
  log.endTime = finalEndTime;
  log.error = workflowError;

  // 发送工作流完成或错误事件
  if (emitter) {
    if (workflowStatus === "success") {
      const successCount = log.nodes.filter(
        (n) => n.status === "success"
      ).length;
      const failedCount = log.nodes.filter((n) => n.status === "error").length;

      emitter.emit(WorkflowEventType.COMPLETED, {
        executionId: taskExecutionId,
        timestamp: finalEndTime,
        duration: finalEndTime - log.startTime,
        successNodes: successCount,
        failedNodes: failedCount,
      });
    } else if (workflowStatus === "error") {
      emitter.emit(WorkflowEventType.ERROR, {
        executionId: taskExecutionId,
        error: {
          message: workflowError || "工作流执行失败",
        },
        timestamp: finalEndTime,
      });
    }
  }

  if (workflowStatus === "aborted") {
    throwAbortError(workflowError);
  }

  return {
    status: workflowStatus,
    log,
    nodeResults,
    nodes: Array.from(nodeMap.values()),
    skippedNodeIds,
  };
}

/**
 * 确定工作流的开始节点
 * @param options - 确定开始节点的选项
 * @returns 开始节点，如果未找到则返回 undefined
 */
function determineStartNode({
  nodes,
  explicitStartId,
}: DetermineStartOptions): WorkflowNode | undefined {
  if (explicitStartId) {
    return nodes.find((node) => node.id === explicitStartId);
  }

  const startByVariant = nodes.find((node) => node.data?.variant === "start");
  if (startByVariant) {
    return startByVariant;
  }

  return nodes.find((node) => deriveNodeType(node) === "start");
}

/**
 * 推导节点类型
 * @param node - 工作流节点
 * @returns 节点类型字符串
 */
function deriveNodeType(node: WorkflowNode): string {
  if (node.data?.variant) {
    return String(node.data.variant);
  }
  if (node.id.includes("_")) {
    return node.id.split("_")[0] ?? "";
  }
  return node.type ?? "";
}

/**
 * 构建边的映射表
 * @param edges - 工作流边数组
 * @param key - 映射键类型，"source" 表示以源节点为键，"target" 表示以目标节点为键
 * @returns 边的映射表，键为节点ID，值为指向该节点的边数组
 */
function buildEdgeMap(
  edges: WorkflowEdge[],
  key: "source" | "target"
): Map<string, WorkflowEdge[]> {
  const map = new Map<string, WorkflowEdge[]>();
  edges.forEach((edge) => {
    const id = edge[key];
    if (!id) return;
    if (!map.has(id)) {
      map.set(id, []);
    }
    map.get(id)?.push(edge);
  });
  return map;
}

/**
 * 收集节点的输入数据
 * @param nodeId - 节点ID
 * @param options - 收集输入的上下文选项
 * @returns 节点的输入数据，键为输入端口ID，值为输入值
 */
function collectNodeInputs(
  nodeId: string,
  options: CollectContextOptions
): Record<string, unknown> {
  const { incomingMap, nodeResults } = options;
  const inputs: Record<string, unknown> = {};
  const incomingEdges = incomingMap.get(nodeId) ?? [];

  incomingEdges.forEach((edge) => {
    const sourceResult = nodeResults[edge.source];
    if (!sourceResult) {
      return;
    }

    const targetHandle: string = edge.targetHandle ?? "default";
    const sourceHandle: string = (edge.sourceHandle ?? "__output__") as string;
    const outputs = sourceResult.data?.outputs as
      | Record<string, NodeResultOutput>
      | undefined;
    const outputRecord: Record<string, NodeResultOutput | undefined> = outputs
      ? outputs
      : {};
    const outputKeys = Object.keys(outputRecord);

    let value: unknown;

    const explicitHandle = edge.sourceHandle ?? undefined;
    const explicitOutput = getOutputByHandle(outputRecord, explicitHandle);
    if (explicitOutput) {
      value = explicitOutput.value;
    } else if (outputKeys.length === 1) {
      const key = outputKeys[0] as keyof typeof outputRecord;
      value = outputRecord[key]?.value;
    } else {
      const fallbackOutput = getOutputByHandle(outputRecord, sourceHandle);
      value = fallbackOutput?.value;
    }

    if (value === undefined) {
      value = sourceResult.data?.raw ?? null;
    }

    inputs[targetHandle] = value;
  });

  return inputs;
}

interface ResolveNodeConfigOptions {
  node: WorkflowNode;
  executor: BaseNode;
  nodeMap: Map<string, WorkflowNode>;
  edges: WorkflowEdge[];
}

function resolveNodeConfig(
  options: ResolveNodeConfigOptions
): Record<string, any> {
  const { node, executor, nodeMap, edges } = options;

  const baseConfig = node.data?.config ? { ...node.data.config } : {};
  debugLog("resolveNodeConfig:start", {
    nodeId: node.id,
    baseConfig,
    edgeCount: edges.length,
  });
  if (!edges.length) {
    return baseConfig;
  }

  const nodes = Array.from(nodeMap.values());
  const { map: contextMap } = buildVariableContext(node.id, nodes, edges);
  debugLog("resolveNodeConfig:contextKeys", Array.from(contextMap.keys()));

  if (contextMap.size === 0) {
    return baseConfig;
  }

  const definitionsFromExecutor = executor.getInputDefinitions();
  const fallbackInputs = Array.isArray(node.data?.inputs)
    ? node.data.inputs
    : [];
  const inputDefinitions: PortDefinition[] =
    definitionsFromExecutor.length > 0
      ? definitionsFromExecutor
      : fallbackInputs;

  const resolved = resolveConfigWithVariables(
    baseConfig,
    inputDefinitions,
    contextMap
  );
  debugLog("resolveNodeConfig:resolved", {
    nodeId: node.id,
    resolved,
  });
  return resolved;
}

interface ForLoopExecutionOptions {
  currentNode: WorkflowNode;
  result: NodeResult;
  context: WorkflowExecutionContext;
  nodeMap: Map<string, WorkflowNode>;
  edges: WorkflowEdge[];
  nodeResults: Record<string, NodeResult>;
  nodeFactory: (type: string) => BaseNode | undefined;
  incomingMap: Map<string, WorkflowEdge[]>;
  outgoingMap: Map<string, WorkflowEdge[]>;
  emitter?: WorkflowExecutorOptions["emitter"];
  executionId: string;
  nodeLogMap: Map<string, NodeExecutionLog>;
  executedNodeIds: Set<string>;
}

interface ForLoopExecutionResult {
  result: NodeResult;
  handled: boolean;
}

interface ContainerExecutionOptions {
  containerId: string;
  context: WorkflowExecutionContext;
  nodeMap: Map<string, WorkflowNode>;
  nodeResults: Record<string, NodeResult>;
  nodeFactory: (type: string) => BaseNode | undefined;
  incomingMap: Map<string, WorkflowEdge[]>;
  outgoingMap: Map<string, WorkflowEdge[]>;
  edges: WorkflowEdge[];
  childNodeIds: Set<string>;
  nodeLogMap: Map<string, NodeExecutionLog>;
  executedNodeIds: Set<string>;
  emitter?: WorkflowExecutorOptions["emitter"];
  executionId: string;
}

async function handleForLoopExecution(
  options: ForLoopExecutionOptions
): Promise<ForLoopExecutionResult> {
  const {
    currentNode,
    result,
    context,
    nodeMap,
    edges,
    nodeResults,
    nodeFactory,
    incomingMap,
    outgoingMap,
    emitter,
    executionId,
    nodeLogMap,
    executedNodeIds,
  } = options;

  const forConfig = (currentNode.data.config || {}) as ForConfig;
  const containerId = forConfig.containerId;

  if (!containerId) {
    return { result, handled: false };
  }

  const iterations = extractIterations(result);
  if (!Array.isArray(iterations)) {
    return { result, handled: true };
  }

  const childNodeIds = getContainerChildIds(containerId, nodeMap);

  if (childNodeIds.size === 0) {
    return { result, handled: true };
  }

  const continueOnError = Boolean(forConfig.errorHandling?.continueOnError);
  const iterationResults: IterationResult[] = [];
  const loopStartTime = Date.now();

  if (emitter) {
    emitter.emit(WorkflowEventType.LOOP_STARTED, {
      executionId,
      forNodeId: currentNode.id,
      containerId,
      totalIterations: iterations.length,
      timestamp: loopStartTime,
    });
  }

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < iterations.length; i++) {
    const iterationVars = iterations[i] ?? {};
    const iterationStart = Date.now();

    if (emitter) {
      emitter.emit(WorkflowEventType.ITERATION_STARTED, {
        executionId,
        forNodeId: currentNode.id,
        iterationIndex: i,
        variables: iterationVars,
        timestamp: iterationStart,
      });
    }

    const previousLoopVariables = context.loopVariables;
    context.loopVariables = iterationVars;

    resetContainerNodeState(childNodeIds, nodeMap, nodeResults, nodeLogMap);

    try {
      const { containerResults } = await executeContainer({
        containerId,
        context,
        nodeMap,
        nodeResults,
        nodeFactory,
        incomingMap,
        outgoingMap,
        edges,
        childNodeIds,
        nodeLogMap,
        executedNodeIds,
        emitter,
        executionId,
      });

      const iterationDuration = Date.now() - iterationStart;

      iterationResults.push({
        index: i,
        variables: iterationVars,
        nodeResults: containerResults,
        duration: iterationDuration,
        status: "success",
      });

      successCount += 1;

      if (emitter) {
        emitter.emit(WorkflowEventType.ITERATION_COMPLETED, {
          executionId,
          forNodeId: currentNode.id,
          iterationIndex: i,
          duration: iterationDuration,
          status: "success",
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      const iterationDuration = Date.now() - iterationStart;
      const message =
        error instanceof Error
          ? error.message
          : String(error ?? "迭代执行失败");

      iterationResults.push({
        index: i,
        variables: iterationVars,
        nodeResults: {},
        duration: iterationDuration,
        status: "error",
        error: message,
      });

      errorCount += 1;

      if (emitter) {
        emitter.emit(WorkflowEventType.ITERATION_COMPLETED, {
          executionId,
          forNodeId: currentNode.id,
          iterationIndex: i,
          duration: iterationDuration,
          status: "error",
          error: message,
          timestamp: Date.now(),
        });
      }

      if (!continueOnError) {
        context.loopVariables = previousLoopVariables;
        throw error;
      }
    } finally {
      context.loopVariables = previousLoopVariables;
    }
  }

  const loopDuration = Date.now() - loopStartTime;

  if (emitter) {
    emitter.emit(WorkflowEventType.LOOP_COMPLETED, {
      executionId,
      forNodeId: currentNode.id,
      containerId,
      totalIterations: iterations.length,
      successCount,
      errorCount,
      duration: loopDuration,
      timestamp: Date.now(),
    });
  }

  const totalDuration = iterationResults.reduce(
    (sum, item) => sum + item.duration,
    0
  );

  const summaryParts = [
    `循环执行 ${iterations.length} 次`,
    `总耗时 ${totalDuration}ms`,
  ];

  const nextResult: NodeResult = {
    ...result,
    iterations: iterationResults,
    data: {
      ...result.data,
      summary: summaryParts.join("，"),
    },
  };

  return {
    result: nextResult,
    handled: true,
  };
}

async function executeContainer(options: ContainerExecutionOptions): Promise<{
  containerResults: Record<string, NodeResult>;
  exitNodeId: string | null;
}> {
  const {
    containerId,
    context,
    nodeMap,
    nodeResults,
    nodeFactory,
    incomingMap,
    outgoingMap,
    edges,
    childNodeIds,
    nodeLogMap,
    executedNodeIds,
    emitter,
    executionId,
  } = options;

  const nodesSnapshot = Array.from(nodeMap.values());
  const entryNodeId = getContainerEntryNode(containerId, nodesSnapshot, edges);
  const exitNodeId = getContainerExitNode(containerId, nodesSnapshot, edges);

  if (!entryNodeId) {
    throw new Error(`容器 ${containerId} 没有入口节点`);
  }

  if (!exitNodeId) {
    throw new Error(`容器 ${containerId} 没有出口节点`);
  }

  const containerQueue: string[] = [entryNodeId];
  const containerVisited = new Set<string>();
  const containerResults: Record<string, NodeResult> = {};

  while (containerQueue.length > 0) {
    const nodeId = containerQueue.shift();
    if (!nodeId || containerVisited.has(nodeId)) {
      continue;
    }
    containerVisited.add(nodeId);

    const currentNode = nodeMap.get(nodeId);
    if (!currentNode) {
      continue;
    }

    const logEntry = nodeLogMap.get(nodeId);
    const startTime = Date.now();
    if (logEntry) {
      logEntry.status = "running";
      logEntry.startTime = startTime;
      logEntry.endTime = undefined;
      logEntry.error = undefined;
      logEntry.output = undefined;
      logEntry.input = null;
    }

    if (emitter) {
      emitter.emit(WorkflowEventType.NODE_STATUS, {
        executionId,
        nodeId,
        status: "running" as NodeExecutionStatus,
        timestamp: startTime,
      });
    }

    try {
      const executor = resolveNodeExecutor(currentNode, nodeFactory);
      if (!executor) {
        throw new Error(`未找到节点执行器: ${deriveNodeType(currentNode)}`);
      }

      const inputs = collectNodeInputs(nodeId, {
        incomingMap,
        nodeResults: {
          ...nodeResults,
          ...containerResults,
        },
      });

      if (logEntry) {
        logEntry.input = inputs;
      }

      const resolvedConfig = resolveNodeConfig({
        node: currentNode,
        executor,
        nodeMap,
        edges,
      });
      debugLog("executeContainer:resolvedConfig", {
        nodeId,
        resolvedConfig,
      });
      const nodeResult = await executor.run(resolvedConfig, inputs, context);

      containerResults[nodeId] = nodeResult;
      nodeResults[nodeId] = nodeResult;
      executedNodeIds.add(nodeId);
      currentNode.data = {
        ...currentNode.data,
        result: nodeResult,
      };

      const endTime = Date.now();
      if (logEntry) {
        logEntry.status = "success";
        logEntry.endTime = endTime;
        logEntry.output = nodeResult;
      }

      if (emitter) {
        emitter.emit(WorkflowEventType.NODE_STATUS, {
          executionId,
          nodeId,
          status: "success" as NodeExecutionStatus,
          timestamp: endTime,
          output: nodeResult,
          duration: endTime - startTime,
        });
      }

      if (nodeId === exitNodeId) {
        break;
      }

      const nextEdges = outgoingMap.get(nodeId) ?? [];
      let edgesToQueue = nextEdges;

      const activeHandles = new Set<string>();
      const outputEntries = Object.entries(nodeResult.data?.outputs ?? {});
      outputEntries.forEach(([handleId, output]) => {
        const outputValue = output as NodeResultOutput | undefined;
        if (outputValue && outputValue.value !== undefined) {
          activeHandles.add(handleId);
        }
      });

      if (activeHandles.size > 0) {
        edgesToQueue = nextEdges.filter((edge) => {
          const handleId = edge.sourceHandle ?? null;
          if (!handleId) {
            return activeHandles.size === 1;
          }
          if (activeHandles.has(handleId)) {
            return true;
          }
          return handleId === "__output__" || handleId === "result";
        });
      }

      edgesToQueue.forEach((edge) => {
        if (!edge.target) return;
        if (
          childNodeIds.has(edge.target) &&
          !containerVisited.has(edge.target)
        ) {
          containerQueue.push(edge.target);
        }

        if (emitter && edge.id) {
          emitter.emit(WorkflowEventType.EDGE_ACTIVE, {
            executionId,
            edgeId: edge.id,
            fromNodeId: edge.source,
            toNodeId: edge.target,
            timestamp: Date.now(),
          });
        }
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error ?? "迭代执行失败");
      const errorTime = Date.now();

      if (logEntry) {
        logEntry.status = "error";
        logEntry.endTime = errorTime;
        logEntry.error = message;
      }

      if (emitter) {
        emitter.emit(WorkflowEventType.NODE_STATUS, {
          executionId,
          nodeId,
          status: "error" as NodeExecutionStatus,
          timestamp: errorTime,
          error: {
            message,
            stack: error instanceof Error ? error.stack : undefined,
          },
          duration: errorTime - startTime,
        });
      }

      throw error;
    }
  }

  return {
    containerResults,
    exitNodeId,
  };
}

function getContainerChildIds(
  containerId: string,
  nodeMap: Map<string, WorkflowNode>
): Set<string> {
  const childIds = new Set<string>();
  nodeMap.forEach((node) => {
    if (node.parentNode === containerId) {
      childIds.add(node.id);
    }
  });
  return childIds;
}

function resetContainerNodeState(
  childNodeIds: Set<string>,
  nodeMap: Map<string, WorkflowNode>,
  nodeResults: Record<string, NodeResult>,
  nodeLogMap: Map<string, NodeExecutionLog>
): void {
  childNodeIds.forEach((id) => {
    delete nodeResults[id];
    const childNode = nodeMap.get(id);
    if (childNode) {
      childNode.data = {
        ...childNode.data,
        result: undefined,
      };
    }

    const logEntry = nodeLogMap.get(id);
    if (logEntry) {
      logEntry.status = "pending";
      logEntry.startTime = 0;
      logEntry.endTime = undefined;
      logEntry.error = undefined;
      logEntry.output = undefined;
      logEntry.input = null;
    }
  });
}

function extractIterations(result: NodeResult): Record<string, any>[] {
  const loopOutput = result.data?.outputs?.loop;
  if (loopOutput && Array.isArray(loopOutput.value)) {
    return loopOutput.value as Record<string, any>[];
  }

  const raw = result.data?.raw as Record<string, any> | undefined;
  if (raw && Array.isArray(raw.iterations)) {
    return raw.iterations as Record<string, any>[];
  }

  return [];
}

function getContainerEntryNode(
  containerId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string | null {
  const childNodes = nodes.filter((node) => node.parentNode === containerId);
  if (childNodes.length === 0) {
    return null;
  }

  const entryEdge = edges.find(
    (edge) =>
      edge.source === containerId &&
      (edge.sourceHandle === "loop-left" || edge.sourceHandle === "input")
  );

  if (entryEdge) {
    return entryEdge.target ?? null;
  }

  const childNodeIds = new Set(childNodes.map((node) => node.id));

  for (const childNode of childNodes) {
    const hasIncomingFromSibling = edges.some(
      (edge) =>
        edge.target === childNode.id &&
        edge.source !== containerId &&
        childNodeIds.has(edge.source)
    );

    if (!hasIncomingFromSibling) {
      return childNode.id;
    }
  }

  return childNodes[0]?.id ?? null;
}

function getContainerExitNode(
  containerId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string | null {
  const childNodes = nodes.filter((node) => node.parentNode === containerId);
  if (childNodes.length === 0) {
    return null;
  }

  const exitEdge = edges.find(
    (edge) =>
      edge.target === containerId &&
      (edge.targetHandle === "loop-right" || edge.targetHandle === "output")
  );

  if (exitEdge) {
    return exitEdge.source ?? null;
  }

  const childNodeIds = new Set(childNodes.map((node) => node.id));

  for (let i = childNodes.length - 1; i >= 0; i--) {
    const childNode = childNodes[i];
    const hasOutgoingToSibling = edges.some(
      (edge) =>
        edge.source === childNode.id &&
        edge.target !== containerId &&
        childNodeIds.has(edge.target)
    );

    if (!hasOutgoingToSibling) {
      return childNode.id;
    }
  }

  return childNodes[childNodes.length - 1]?.id ?? null;
}

/**
 * 解析节点执行器
 * @param node - 工作流节点
 * @param factory - 节点工厂函数，根据节点类型创建节点实例
 * @returns 节点执行器实例，如果未找到则返回 undefined
 */
function resolveNodeExecutor<TNode extends BaseNode>(
  node: WorkflowNode,
  factory: (type: string) => TNode | undefined
): TNode | undefined {
  const type = deriveNodeType(node);
  if (!type) return undefined;
  return factory(type);
}

/**
 * 创建待执行的节点日志
 * @param node - 工作流节点
 * @returns 节点执行日志
 */
function createPendingLog(node: WorkflowNode): NodeExecutionLog {
  return {
    nodeId: node.id,
    nodeName: node.data?.label ?? node.id,
    status: "pending",
    startTime: 0,
    input: null,
  };
}

/**
 * 抛出中止错误
 * @param message - 错误消息
 * @throws 始终抛出 AbortError 类型的错误
 */
function throwAbortError(message?: string): never {
  const error = new Error(message || "执行已被取消");
  error.name = "AbortError";
  throw error;
}

/**
 * 根据端口句柄获取输出值
 * @param record - 输出记录映射表
 * @param handle - 端口句柄ID
 * @returns 节点结果输出，如果未找到则返回 undefined
 */
function getOutputByHandle(
  record: Record<string, NodeResultOutput | undefined>,
  handle: string | null | undefined
): NodeResultOutput | undefined {
  if (!handle) {
    return undefined;
  }
  if (!Object.prototype.hasOwnProperty.call(record, handle)) {
    return undefined;
  }
  return record[handle];
}
