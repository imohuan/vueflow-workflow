/**
 * 工作流执行器
 * 核心执行引擎，负责工作流的执行、控制和缓存
 */

import { ExecutionContext } from "./ExecutionContext";
import type { INodeResolver } from "./NodeResolver";
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  ExecutionOptions,
  ExecutionResult,
  NodeExecutionState,
  ExecutionState,
  CachedNodeResult,
  CacheStats,
  ExecutionLifecycleEvent,
  ExecutionErrorEvent,
} from "./types";
import {
  buildVariableContextFromExecutionContext,
  resolveConfigWithVariables,
} from "./VariableResolver";

/**
 * 工作流执行器类
 */
export class WorkflowExecutor {
  /** 节点解析器 */
  private nodeResolver: INodeResolver;

  /** 日志记录器 */
  private logger: { log: (...args: any[]) => void; error: (...args: any[]) => void; warn: (...args: any[]) => void };

  /** 默认执行选项 */
  private defaultOptions: ExecutionOptions = {
    timeout: 60000,
    maxRetries: 3,
    useCache: true,
    clearCache: false,
    log: console.log,
    error: console.error,
  };

  /** 当前执行上下文 */
  private currentContext?: ExecutionContext;

  /** 缓存存储（跨工作流共享） */
  private readonly cacheStore: Map<string, Map<string, CachedNodeResult>> =
    new Map();

  /** 工作流节点数量缓存 */
  private readonly workflowNodeCounts: Map<string, number> = new Map();

  constructor(
    nodeResolver: INodeResolver,
    options?: Partial<ExecutionOptions>
  ) {
    this.nodeResolver = nodeResolver;
    if (options) {
      this.defaultOptions = { ...this.defaultOptions, ...options };
    }
    
    // 初始化日志记录器
    this.logger = {
      log: this.defaultOptions.log || console.log,
      error: this.defaultOptions.error || console.error,
      warn: console.warn,
    };
  }

  /**
   * 执行工作流
   */
  async execute(
    workflow: Workflow,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    const opts = { ...this.defaultOptions, ...options };
    const executionId = this.generateExecutionId();

    // 创建执行上下文
    const context = new ExecutionContext(
      workflow,
      executionId,
      this.getWorkflowCache(workflow.workflow_id)
    );
    this.currentContext = context;
    this.workflowNodeCounts.set(workflow.workflow_id, workflow.nodes.length);

    // 清空缓存（如果需要）
    if (opts.clearCache) {
      context.clearCache();
    }

    try {
      this.logger.log(
        `[WorkflowExecutor] 开始执行工作流: ${workflow.workflow_id}, 执行ID: ${executionId}`
      );
      this.logger.log(
        `[WorkflowExecutor] 工作流配置: 节点数=${workflow.nodes.length}, 边数=${workflow.edges.length}, 选中节点数=${workflow.selectedNodeIds?.length || 0}`
      );
      
      // 开始执行
      context.start();
      opts.onProgress?.(0);
      this.emitExecutionStart(opts, {
        executionId,
        workflowId: workflow.workflow_id,
      });

      // 确定执行策略
      const strategy = this.determineStrategy(workflow);
      this.logger.log(`[WorkflowExecutor] 执行策略: ${strategy}`);

      // 确定要执行的节点
      const nodesToExecute = this.determineNodesToExecute(workflow, strategy);
      this.logger.log(`[WorkflowExecutor] 需要执行的节点数量: ${nodesToExecute.size}`);

      // 识别容器节点（有子节点的节点）
      const containerNodeIds = this.identifyContainerNodes(workflow.nodes);

      // 识别容器内的子节点（有 parentNode 的节点）
      const childNodeIds = new Set<string>();
      for (const node of workflow.nodes) {
        const parentId = node.parentNode || node.data?.parentNode;
        if (parentId && typeof parentId === "string") {
          childNodeIds.add(node.id);
        }
      }

      // 排除容器节点和容器内的子节点进行拓扑排序
      // 主流程只执行顶层节点，容器内的子节点由循环逻辑特殊处理
      const topLevelNodes = workflow.nodes.filter(
        (node) => !containerNodeIds.has(node.id) && !childNodeIds.has(node.id)
      );

      // 排除与容器节点和子节点相关的边
      const topLevelEdges = workflow.edges.filter((edge) => {
        const isSourceTopLevel =
          !containerNodeIds.has(edge.source) && !childNodeIds.has(edge.source);
        const isTargetTopLevel =
          !containerNodeIds.has(edge.target) && !childNodeIds.has(edge.target);
        return isSourceTopLevel && isTargetTopLevel;
      });

      this.logger.log(
        `[WorkflowExecutor] 排除 ${containerNodeIds.size} 个容器节点和 ${childNodeIds.size} 个子节点后，对 ${topLevelNodes.length} 个顶层节点进行拓扑排序`
      );

      // 拓扑排序（只对顶层节点）
      const sortedNodes = this.topologicalSort(topLevelNodes, topLevelEdges);
      this.logger.log(`[WorkflowExecutor] 拓扑排序完成，执行顺序: ${sortedNodes.map(n => n.id).join(' -> ')}`);

      // 过滤出需要执行的节点（保持拓扑顺序）
      const executionOrder = sortedNodes.filter((node) =>
        nodesToExecute.has(node.id)
      );

      this.logger.log(`[WorkflowExecutor] 最终执行顺序: ${executionOrder.map(n => n.id).join(' -> ')}`);

      // 初始化所有节点状态
      for (const node of workflow.nodes) {
        const status = nodesToExecute.has(node.id) ? "pending" : "skipped";
        context.setNodeState(node.id, status);
        if (status === "skipped") {
          this.logger.log(`[WorkflowExecutor] 跳过节点: ${node.id} (未选中执行)`);
          opts.onNodeSkipped?.(node.id, "not-selected");
        }
      }

      // 按顺序执行节点
      this.logger.log(`[WorkflowExecutor] 开始按顺序执行 ${executionOrder.length} 个节点`);
      for (const node of executionOrder) {
        this.logger.log(`[WorkflowExecutor] 准备执行节点: ${node.id} (${node.data?.nodeType || node.type})`);
        
        // 检查是否暂停或取消
        if (context.isPaused()) {
          this.logger.log(`[WorkflowExecutor] 执行已暂停，等待恢复...`);
          await this.waitForResume(context);
          this.logger.log(`[WorkflowExecutor] 执行已恢复`);
        }

        if (context.isCancelled()) {
          this.logger.log(`[WorkflowExecutor] 执行已取消，停止后续节点执行`);
          break;
        }

        // 执行节点
        await this.executeNode(node, context, opts);

        // 更新进度
        const progress = context.getProgress();
        this.logger.log(`[WorkflowExecutor] 节点 ${node.id} 执行完成，当前进度: ${progress}%`);
        opts.onProgress?.(progress);
      }

      // 完成执行
      context.complete();
      this.logger.log(`[WorkflowExecutor] 工作流执行完成，执行ID: ${executionId}`);

      // 构建执行结果
      const result = this.buildExecutionResult(context, strategy);
      this.logger.log(`[WorkflowExecutor] 执行结果: 成功=${result.success}, 执行节点数=${result.executedNodeIds.length}, 跳过节点数=${result.skippedNodeIds.length}, 缓存节点数=${result.cachedNodeIds.length}`);
      this.emitExecutionComplete(opts, result);
      return result;
    } catch (error) {
      // 执行出错
      context.error();
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`[WorkflowExecutor] 工作流执行失败，执行ID: ${executionId}, 错误: ${errorMessage}`);
      this.logger.error(error);
      const strategy = this.determineStrategy(workflow);
      const result = this.buildExecutionResult(context, strategy, errorMessage);
      this.emitExecutionError(opts, {
        executionId,
        workflowId: workflow.workflow_id,
        error: errorMessage,
        result,
      });
      return result;
    }
  }

  /**
   * 暂停执行
   */
  pause(): void {
    this.currentContext?.pause();
  }

  /**
   * 恢复执行
   */
  resume(): void {
    this.currentContext?.resume();
  }

  /**
   * 停止执行
   */
  stop(): void {
    this.currentContext?.cancel();
  }

  /**
   * 获取执行状态
   */
  getState(): ExecutionState {
    return this.currentContext?.getState() || "idle";
  }

  /**
   * 获取缓存的节点结果
   */
  getCachedResult(workflowId: string, nodeId: string): any | null {
    return this.cacheStore.get(workflowId)?.get(nodeId) ?? null;
  }

  /**
   * 清空指定工作流的缓存
   */
  clearCache(workflowId: string): void {
    this.cacheStore.get(workflowId)?.clear();
    this.workflowNodeCounts.delete(workflowId);
  }

  /**
   * 清空所有缓存
   */
  clearAllCache(): void {
    this.cacheStore.clear();
    this.workflowNodeCounts.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(workflowId: string): CacheStats {
    const workflowCache = this.cacheStore.get(workflowId);
    const cachedNodes = workflowCache ? workflowCache.size : 0;
    const totalNodes = this.workflowNodeCounts.get(workflowId) ?? 0;
    const hitRate = totalNodes > 0 ? cachedNodes / totalNodes : 0;

    return {
      totalNodes,
      cachedNodes,
      hitRate,
    };
  }

  /**
   * 确定执行策略
   */
  private determineStrategy(
    workflow: Workflow
  ): "full" | "selective" | "single" {
    const selectedIds = workflow.selectedNodeIds;

    if (!selectedIds || selectedIds.length === 0) {
      return "full";
    }

    if (selectedIds.length === 1) {
      return "single";
    }

    return "selective";
  }

  /**
   * 确定要执行的节点集合
   */
  private determineNodesToExecute(
    workflow: Workflow,
    strategy: "full" | "selective" | "single"
  ): Set<string> {
    const result = new Set<string>();

    if (strategy === "full") {
      // 全量执行：从开始节点出发，只执行可达的节点
      const reachableNodes = this.findReachableNodesFromStart(
        workflow.nodes,
        workflow.edges
      );
      return reachableNodes;
    }

    // 选择性执行或单节点执行：需要分析依赖
    const selectedIds = workflow.selectedNodeIds || [];

    for (const nodeId of selectedIds) {
      // 添加目标节点
      result.add(nodeId);

      // 添加所有依赖节点
      const dependencies = this.findDependencies(
        nodeId,
        workflow.nodes,
        workflow.edges
      );
      dependencies.forEach((depId) => result.add(depId));
    }

    return result;
  }

  /**
   * 从开始节点查找所有可达的节点
   * 使用广度优先搜索（BFS）
   */
  private findReachableNodesFromStart(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): Set<string> {
    // 查找开始节点
    const startNodes = nodes.filter(
      (node) => node.data?.nodeType === "start" || node.type === "start"
    );

    // 如果没有开始节点，返回空集合（不执行任何节点）
    if (startNodes.length === 0) {
      this.logger.warn(
        "[WorkflowExecutor] 工作流中没有找到开始节点，将不执行任何节点"
      );
      return new Set<string>();
    }

    // 如果有多个开始节点，发出警告
    if (startNodes.length > 1) {
      this.logger.warn(
        `[WorkflowExecutor] 工作流中发现多个开始节点（${startNodes.length}个），将从所有开始节点出发`
      );
    }

    // 使用 BFS 查找所有可达节点
    const reachable = new Set<string>();
    const queue: string[] = startNodes.map((node) => node.id);

    // 将开始节点加入可达集合
    startNodes.forEach((node) => reachable.add(node.id));

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      // 找到从当前节点出发的所有边
      const outgoingEdges = edges.filter((edge) => edge.source === currentId);

      for (const edge of outgoingEdges) {
        // 如果目标节点还没有被访问过，加入队列和可达集合
        if (!reachable.has(edge.target)) {
          reachable.add(edge.target);
          queue.push(edge.target);
        }
      }
    }

    this.logger.log(
      `[WorkflowExecutor] 从开始节点出发，找到 ${reachable.size} 个可达节点`
    );
    return reachable;
  }

  /**
   * 查找节点的所有依赖节点（递归）
   */
  private findDependencies(
    nodeId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): Set<string> {
    const dependencies = new Set<string>();
    const visited = new Set<string>();

    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      // 找到所有指向该节点的边
      const incomingEdges = edges.filter((edge) => edge.target === id);

      for (const edge of incomingEdges) {
        dependencies.add(edge.source);
        traverse(edge.source);
      }
    };

    traverse(nodeId);
    return dependencies;
  }

  /**
   * 检查节点是否应该因为没有有效输入而被跳过
   * 主要用于 IF 节点等条件分支场景
   * 只有当上游节点是条件分支节点（如 IF 节点）时才生效
   */
  private shouldSkipNodeDueToInvalidInputs(
    nodeId: string,
    context: ExecutionContext
  ): boolean {
    const workflow = context.getWorkflow();
    const incomingEdges = workflow.edges.filter(
      (edge) => edge.target === nodeId
    );

    // 如果节点没有传入边，不跳过（例如开始节点）
    if (incomingEdges.length === 0) {
      return false;
    }

    let hasConditionalBranchInput = false;
    let hasValidInputFromConditionalBranch = false;
    let hasNonConditionalValidInput = false;

    for (const edge of incomingEdges) {
      // 查找源节点
      const sourceNode = workflow.nodes.find((n) => n.id === edge.source);
      if (!sourceNode) {
        continue;
      }

      // 获取源节点类型
      const sourceNodeType = sourceNode.data?.nodeType || sourceNode.type;
      const isConditionalBranch = sourceNodeType === "if";

      const sourceOutput = context.getNodeOutput(edge.source);
      if (!sourceOutput) {
        // 源节点尚无输出，继续检查其他入边
        continue;
      }

      const sourceHandle = edge.sourceHandle || "default";
      const handleValue = sourceOutput[sourceHandle];

      if (isConditionalBranch) {
        hasConditionalBranchInput = true;
        if (handleValue !== undefined && handleValue !== null) {
          hasValidInputFromConditionalBranch = true;
        }
      } else {
        const value =
          handleValue !== undefined && handleValue !== null
            ? handleValue
            : sourceOutput;
        if (value !== undefined && value !== null) {
          hasNonConditionalValidInput = true;
        }
      }
    }

    if (hasConditionalBranchInput) {
      return !hasValidInputFromConditionalBranch;
    }

    return !hasNonConditionalValidInput;
  }

  /**
   * 拓扑排序
   * 使用 Kahn 算法
   */
  private topologicalSort(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): WorkflowNode[] {
    // 构建邻接表和入度表
    const adjacencyList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // 初始化
    for (const node of nodes) {
      adjacencyList.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    // 构建图
    for (const edge of edges) {
      adjacencyList.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    // Kahn 算法
    const queue: string[] = [];
    const result: string[] = [];

    // 找到所有入度为 0 的节点
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      // 减少相邻节点的入度
      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // 检查是否有环
    if (result.length !== nodes.length) {
      const error = new Error("工作流中存在循环依赖");
      this.logger.error(`[WorkflowExecutor] 拓扑排序失败: ${error.message}`);
      this.logger.error(`[WorkflowExecutor] 节点总数: ${nodes.length}, 排序后: ${result.length}`);
      this.logger.error(`[WorkflowExecutor] 未排序的节点: ${nodes.filter(n => !result.includes(n.id)).map(n => n.id).join(', ')}`);
      throw error;
    }

    // 返回排序后的节点数组
    return result.map((id) => nodes.find((node) => node.id === id)!);
  }

  /**
   * 执行单个节点
   */
  private async executeNode(
    node: WorkflowNode,
    context: ExecutionContext,
    options: ExecutionOptions
  ): Promise<void> {
    const nodeId = node.id;

    try {
      // 获取节点类型
      const nodeType = node.data?.nodeType || node.type;

      // 检查节点是否应该被跳过（基于输入有效性）
      if (this.shouldSkipNodeDueToInvalidInputs(nodeId, context)) {
        this.logger.log(
          `[WorkflowExecutor] 跳过节点 ${nodeId}: 所有输入端口都没有有效数据`
        );
        context.setNodeState(nodeId, "skipped");
        options.onNodeSkipped?.(nodeId, "no-valid-input");
        return;
      }

      // 获取节点输入（从前驱节点的输出）
      const inputs = context.getNodeInputs(nodeId);

      this.logger.log(`[WorkflowExecutor] 节点 ${nodeId} (${nodeType}) 初始输入:`, {
        inputs: Object.keys(inputs),
        hasParams: !!node.data?.params,
      });

      // 合并节点配置参数（node.data.params）到输入中，并进行变量替换
      if (node.data?.params) {
        this.logger.log(
          `[WorkflowExecutor] 节点 ${nodeId} 的 params:`,
          node.data.params
        );

        // 构建变量上下文（包含全局变量）
        const { map: contextMap } = buildVariableContextFromExecutionContext(
          nodeId,
          context,
          context.getWorkflow().nodes,
          context.getWorkflow().edges,
          options.globalVariables
        );

        this.logger.log(
          `[WorkflowExecutor] 节点 ${nodeId} 变量上下文包含 ${contextMap.size} 个变量`
        );

        // 对参数进行变量替换
        const resolvedParams = resolveConfigWithVariables(
          node.data.params,
          contextMap
        );

        this.logger.log(
          `[WorkflowExecutor] 节点 ${nodeId} 解析后的 params:`,
          resolvedParams
        );

        // 合并解析后的参数到输入中
        Object.assign(inputs, resolvedParams);

        this.logger.log(
          `[WorkflowExecutor] 节点 ${nodeId} 合并后的 inputs:`,
          Object.keys(inputs)
        );
      }

      // 缓存判断逻辑
      let shouldUseCache = false;
      let configHash: string | undefined;

      // 1. 首先判断全局缓存开关
      if (options.useCache) {
        this.logger.log(`[WorkflowExecutor] 节点 ${nodeId} 缓存功能已启用`);
        
        // 2. 获取节点实例以进行节点级缓存判断
        const nodeInstance = this.nodeResolver.resolveInstance(nodeType);

        // 3. 判断节点是否允许使用缓存
        shouldUseCache = nodeInstance.shouldUseCache(inputs, {
          nodeId,
          workflowId: context.getWorkflowId(),
        });
        
        this.logger.log(`[WorkflowExecutor] 节点 ${nodeId} 缓存判断结果: ${shouldUseCache}`);

        // 4. 如果节点允许使用缓存，计算配置哈希并检查缓存
        if (shouldUseCache) {
          configHash = nodeInstance.computeConfigHash(inputs, node.data || {});
          this.logger.log(`[WorkflowExecutor] 节点 ${nodeId} 配置哈希: ${configHash}`);

          // 检查是否有有效缓存
          if (context.hasValidCache(nodeId, configHash)) {
            // 使用缓存
            this.logger.log(`[WorkflowExecutor] 节点 ${nodeId} 使用缓存结果`);
            const cached = context.getCachedResult(nodeId)!;
            context.setNodeState(nodeId, "cached", {
              outputs: cached.outputs,
              fromCache: true,
              duration: cached.duration,
              inputs: cached.inputs,
            });
            context.setNodeOutput(nodeId, cached.outputs);

            options.onCacheHit?.(nodeId, cached);
            return;
          } else {
            this.logger.log(`[WorkflowExecutor] 节点 ${nodeId} 无有效缓存，将重新执行`);
          }
        }
      } else {
        this.logger.log(`[WorkflowExecutor] 节点 ${nodeId} 缓存功能已禁用`);
      }

      // 开始执行节点
      this.logger.log(`[WorkflowExecutor] 开始执行节点 ${nodeId} (${nodeType})`);
      context.setNodeState(nodeId, "running");
      options.onNodeStart?.(nodeId);

      // 获取节点执行函数
      const executeFunc = this.nodeResolver.resolve(nodeType);

      // 构建节点执行上下文
      const nodeContext: Record<string, any> = {
        nodeId,
        nodeData: node.data,
        workflowId: context.getWorkflowId(),
      };

      // 为 For 节点注入特殊的 executeContainer 方法
      if (nodeType === "for") {
        nodeContext.executeContainer = async (
          containerId: string,
          iterationVars: Record<string, any>
        ) => {
          return await this.executeContainerNodes(
            containerId,
            iterationVars,
            context,
            options
          );
        };
      }

      // 执行节点
      this.logger.log(`[WorkflowExecutor] 正在调用节点 ${nodeId} 的执行函数`);
      const result = await this.executeWithTimeout(
        () => executeFunc(inputs, nodeContext),
        options.timeout
      );
      this.logger.log(`[WorkflowExecutor] 节点 ${nodeId} 执行函数调用完成`);

      // 检查执行结果
      // NodeResolver 现在返回完整的 NodeExecutionResult 对象
      // 检查 success 字段，如果为 false 则抛出错误
      if (result && typeof result === "object" && "success" in result) {
        if (result.success === false) {
          const errorMessage = result.error || "节点执行失败";
          this.logger.error(`[WorkflowExecutor] 节点 ${nodeId} 执行失败: ${errorMessage}`);
          throw new Error(errorMessage);
        }
      }

      // 提取输出数据
      // result 应该是 NodeExecutionResult 类型，提取 outputs 字段
      const outputs = result?.outputs ?? {};
      this.logger.log(`[WorkflowExecutor] 节点 ${nodeId} 输出数据:`, {
        outputKeys: Object.keys(outputs),
        hasOutput: Object.keys(outputs).length > 0,
      });

      // 保存输出
      context.setNodeOutput(nodeId, outputs);

      // 更新状态
      context.setNodeState(nodeId, "success", {
        outputs,
        inputs,
      });

      // 缓存结果（只有在允许缓存且已计算配置哈希的情况下）
      if (shouldUseCache && configHash) {
        this.logger.log(`[WorkflowExecutor] 缓存节点 ${nodeId} 的执行结果`);
        const nodeState = context.getNodeState(nodeId)!;

        context.setCachedResult(nodeId, {
          nodeId,
          status: "success",
          timestamp: Date.now(),
          outputs,
          inputs,
          duration: nodeState.duration || 0,
          configHash,
        });
      }

      this.logger.log(`[WorkflowExecutor] 节点 ${nodeId} 执行成功完成`);
      options.onNodeComplete?.(nodeId, outputs);
    } catch (error) {
      // 执行失败
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[WorkflowExecutor] 节点 ${nodeId} 执行失败: ${errorMsg}`);
      this.logger.error(error);
      context.setNodeState(nodeId, "error", {
        error: errorMsg,
      });

      options.onNodeError?.(
        nodeId,
        error instanceof Error ? error : new Error(errorMsg)
      );

      // 如果是关键错误，停止执行
      throw error;
    }
  }

  /**
   * 带超时的执行
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number = 60000
  ): Promise<T> {
    this.logger.log(`[WorkflowExecutor] 设置执行超时: ${timeout}ms`);
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        const timeoutError = new Error("执行超时");
        this.logger.error(`[WorkflowExecutor] 执行超时: ${timeout}ms`);
        reject(timeoutError);
      }, timeout);

      fn()
        .then((value) => {
          clearTimeout(timer);
          this.logger.log(`[WorkflowExecutor] 执行在超时前完成`);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          this.logger.error(`[WorkflowExecutor] 执行过程中发生错误:`, error);
          reject(error);
        });
    });
  }

  /**
   * 等待恢复执行
   */
  private async waitForResume(context: ExecutionContext): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!context.isPaused()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * 构建执行结果
   */
  private buildExecutionResult(
    context: ExecutionContext,
    strategy: "full" | "selective" | "single",
    error?: string
  ): ExecutionResult {
    const nodeResults = context.getAllNodeStates();
    const executedNodeIds: string[] = [];
    const skippedNodeIds: string[] = [];
    const cachedNodeIds: string[] = [];

    for (const [nodeId, state] of nodeResults.entries()) {
      if (
        state.status === "success" ||
        state.status === "running" ||
        state.status === "error"
      ) {
        executedNodeIds.push(nodeId);
      } else if (state.status === "skipped") {
        skippedNodeIds.push(nodeId);
      } else if (state.status === "cached") {
        cachedNodeIds.push(nodeId);
      }
    }

    const success = context.getState() === "completed" && !error;

    return {
      success,
      executionId: context.getExecutionId(),
      workflowId: context.getWorkflowId(),
      startTime: context.getStartTime(),
      endTime: context.getEndTime(),
      duration: context.getDuration(),
      nodeResults,
      executedNodeIds,
      skippedNodeIds,
      cachedNodeIds,
      strategy,
      error,
    };
  }

  /**
   * 生成执行 ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private getWorkflowCache(workflowId: string): Map<string, CachedNodeResult> {
    if (!this.cacheStore.has(workflowId)) {
      this.cacheStore.set(workflowId, new Map());
    }
    return this.cacheStore.get(workflowId)!;
  }

  private emitExecutionStart(
    options: ExecutionOptions,
    payload: ExecutionLifecycleEvent
  ): void {
    options.onExecutionStart?.(payload);
  }

  private emitExecutionComplete(
    options: ExecutionOptions,
    result: ExecutionResult
  ): void {
    options.onExecutionComplete?.(result);
  }

  private emitExecutionError(
    options: ExecutionOptions,
    payload: ExecutionErrorEvent
  ): void {
    options.onExecutionError?.(payload);
  }

  /**
   * 识别容器节点
   * 容器节点是那些有其他节点将其作为 parentNode 的节点
   */
  private identifyContainerNodes(nodes: WorkflowNode[]): Set<string> {
    const containerIds = new Set<string>();

    for (const node of nodes) {
      const parentId = node.parentNode || node.data?.parentNode;
      if (parentId && typeof parentId === "string") {
        containerIds.add(parentId);
        this.logger.log(
          `[WorkflowExecutor] 节点 ${node.id} 的父节点是 ${parentId}（容器节点）`
        );
      }
    }

    this.logger.log(
      `[WorkflowExecutor] 识别到 ${containerIds.size} 个容器节点:`,
      Array.from(containerIds)
    );

    return containerIds;
  }

  /**
   * 执行容器内的节点
   */
  private async executeContainerNodes(
    containerId: string,
    iterationVars: Record<string, any>,
    context: ExecutionContext,
    options: ExecutionOptions
  ): Promise<any> {
    const workflow = context.getWorkflow();

    // 查找容器内的所有节点（排除容器节点本身）
    const containerNodes = workflow.nodes.filter(
      (node) =>
        node.id !== containerId &&
        (node.data?.parentNode === containerId ||
          node.parentNode === containerId)
    );

    if (containerNodes.length === 0) {
      this.logger.warn(`[WorkflowExecutor] 容器 ${containerId} 内没有找到任何节点`);
      return null;
    }

    // 获取当前迭代索引
    const iterationIndex = iterationVars.index ?? 0;

    this.logger.log(
      `[WorkflowExecutor] 容器 ${containerId} 第 ${
        iterationIndex + 1
      } 次迭代，内有 ${containerNodes.length} 个节点`
    );

    // 如果是第一次迭代，清空容器内所有节点的迭代历史
    if (iterationIndex === 0) {
      this.logger.log(
        `[WorkflowExecutor] 清空容器 ${containerId} 内 ${containerNodes.length} 个节点的迭代历史`
      );
      for (const node of containerNodes) {
        context.clearIterationHistory(node.id);
      }
    }

    // 重置容器内节点的状态（清除上一轮的时间戳）
    for (const node of containerNodes) {
      context.setNodeState(node.id, "pending");
    }

    // 创建容器内节点 ID 集合，便于查找
    const containerNodeIds = new Set(containerNodes.map((n) => n.id));

    // 拓扑排序容器内的节点
    // 只包含容器内节点之间的边，排除与容器节点或外部节点的连接
    const containerEdges = workflow.edges.filter(
      (edge) =>
        containerNodeIds.has(edge.source) &&
        containerNodeIds.has(edge.target) &&
        edge.source !== containerId &&
        edge.target !== containerId
    );

    this.logger.log(`[WorkflowExecutor] 容器内有 ${containerEdges.length} 条边`);

    const sortedNodes = this.topologicalSort(containerNodes, containerEdges);
    this.logger.log(`[WorkflowExecutor] 容器内节点执行顺序: ${sortedNodes.map(n => n.id).join(' -> ')}`);

    // 将迭代变量注入到执行上下文中（临时）
    context.loopVariables = iterationVars;
    this.logger.log(`[WorkflowExecutor] 注入迭代变量:`, Object.keys(iterationVars));

    let containerOutput: any = null;

    // 按顺序执行容器内的节点
    this.logger.log(`[WorkflowExecutor] 开始执行容器 ${containerId} 内的节点`);
    for (const node of sortedNodes) {
      this.logger.log(`[WorkflowExecutor] 容器内执行节点: ${node.id}`);
      
      // 检查是否取消
      if (context.isCancelled()) {
        this.logger.log(`[WorkflowExecutor] 容器执行已取消`);
        break;
      }

      // 执行节点
      await this.executeNode(node, context, options);

      // 获取节点执行结果和状态
      const nodeOutput = context.getNodeOutput(node.id);
      const nodeState = context.getNodeState(node.id);

      // 保存该节点在本次迭代的执行结果到迭代历史
      if (nodeState) {
        const iterationData = {
          iterationIndex,
          iterationVars,
          executionResult: nodeOutput || null,
          executionStatus: nodeState.status,
          executionDuration: nodeState.duration,
          executionTimestamp: Date.now(),
          executionError: nodeState.error,
        };

        context.appendIterationResult(node.id, iterationData);

        // 通知前端更新迭代历史
        options.onIterationUpdate?.(node.id, iterationData);

        this.logger.log(
          `[WorkflowExecutor] 保存节点 ${node.id} 第 ${
            iterationIndex + 1
          } 次迭代结果:`,
          {
            status: nodeState.status,
            hasOutput: !!nodeOutput,
            duration: nodeState.duration,
          }
        );
      }

      // 记录最后一个节点的输出作为容器的输出
      if (nodeOutput) {
        containerOutput = nodeOutput;
      }
    }

    // 恢复原始上下文
    context.loopVariables = undefined;
    this.logger.log(`[WorkflowExecutor] 容器 ${containerId} 执行完成，恢复原始上下文`);

    return containerOutput;
  }
}
