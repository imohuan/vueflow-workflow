import { getNodeByType } from "@/core/nodes";
import type { BaseNode } from "@/core/nodes";
import type {
  ExecutionLog,
  NodeExecutionLog,
  WorkflowEdge,
  WorkflowExecutionResult,
  WorkflowExecutorOptions,
  WorkflowNode,
  WorkflowStatus,
} from "./types";
import type { NodeResult, NodeResultOutput } from "@/typings/nodeEditor";
import type { MCPClient } from "@/core/mcp-client";

interface CollectContextOptions {
  incomingMap: Map<string, WorkflowEdge[]>;
  nodeResults: Record<string, NodeResult>;
}

interface DetermineStartOptions {
  nodes: WorkflowNode[];
  explicitStartId?: string;
}

const DEFAULT_LOG_PREFIX = "workflow";

export async function executeWorkflow(
  options: WorkflowExecutorOptions
): Promise<WorkflowExecutionResult> {
  const { nodes, edges, startNodeId, client, nodeFactory, signal, logId } =
    options;

  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new Error("执行失败：至少需要一个节点");
  }

  if (signal?.aborted) {
    throw new Error("执行已被取消");
  }

  const startNode = determineStartNode({ nodes, explicitStartId: startNodeId });
  if (!startNode) {
    throw new Error("执行失败：未找到开始节点");
  }

  const nodeMap = new Map<string, WorkflowNode>();
  nodes.forEach((node) => {
    nodeMap.set(node.id, {
      ...node,
      data: {
        ...node.data,
      },
    });
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

    try {
      const executor = resolveNodeExecutor(
        currentNode,
        nodeFactory ?? defaultNodeFactory
      );

      if (!executor) {
        throw new Error(`未找到节点执行器: ${deriveNodeType(currentNode)}`);
      }

      const inputs = collectNodeInputs(currentNode.id, {
        incomingMap,
        nodeResults,
      });
      logEntry.input = inputs;

      const config = { ...currentNode.data.config };
      const runtimeClient = (client ?? ({} as MCPClient)) as MCPClient;
      const result = await executor.run(config, inputs, runtimeClient);

      nodeResults[currentNode.id] = result;
      executedNodeIds.add(currentNode.id);
      currentNode.data = {
        ...currentNode.data,
        result,
      };

      logEntry.status = "success";
      logEntry.endTime = Date.now();
      logEntry.input = inputs;
      logEntry.output = result;

      if (deriveNodeType(currentNode) === "end") {
        endNodeReached = true;
        continue;
      }

      const nextEdges = outgoingMap.get(nodeId) ?? [];

      const activeHandles = new Set<string>();
      const outputEntries = Object.entries(result.data?.outputs ?? {});
      outputEntries.forEach(([handleId, output]) => {
        if (output && output.value !== undefined) {
          activeHandles.add(handleId);
        }
      });

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

      edgesToQueue.forEach((edge) => {
        if (!visitedQueue.has(edge.target)) {
          queue.push(edge.target);
        }
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? "执行异常");
      logEntry.status = "error";
      logEntry.endTime = Date.now();
      logEntry.input = logEntry.input ?? null;
      logEntry.error = message;
      workflowStatus = "error";
      workflowError = message;
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

  log.status = workflowStatus;
  log.endTime = Date.now();
  log.error = workflowError;

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

function deriveNodeType(node: WorkflowNode): string {
  if (node.data?.variant) {
    return String(node.data.variant);
  }
  if (node.id.includes("_")) {
    return node.id.split("_")[0] ?? "";
  }
  return node.type ?? "";
}

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

function resolveNodeExecutor(
  node: WorkflowNode,
  factory: (type: string) => BaseNode | undefined
): BaseNode | undefined {
  const type = deriveNodeType(node);
  if (!type) return undefined;
  return factory(type);
}

function defaultNodeFactory(type: string): BaseNode | undefined {
  return getNodeByType(type);
}

function createPendingLog(node: WorkflowNode): NodeExecutionLog {
  return {
    nodeId: node.id,
    nodeName: node.data?.label ?? node.id,
    status: "pending",
    startTime: 0,
    input: null,
  };
}

function throwAbortError(message?: string): never {
  const error = new Error(message || "执行已被取消");
  error.name = "AbortError";
  throw error;
}

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
