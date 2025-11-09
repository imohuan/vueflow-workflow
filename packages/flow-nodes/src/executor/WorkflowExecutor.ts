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

  /** 默认执行选项 */
  private defaultOptions: ExecutionOptions = {
    timeout: 60000,
    maxRetries: 3,
    useCache: true,
    clearCache: false,
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
      // 开始执行
      context.start();
      opts.onProgress?.(0);
      this.emitExecutionStart(opts, {
        executionId,
        workflowId: workflow.workflow_id,
      });

      // 确定执行策略
      const strategy = this.determineStrategy(workflow);

      // 确定要执行的节点
      const nodesToExecute = this.determineNodesToExecute(workflow, strategy);

      // 拓扑排序
      const sortedNodes = this.topologicalSort(workflow.nodes, workflow.edges);

      // 过滤出需要执行的节点（保持拓扑顺序）
      const executionOrder = sortedNodes.filter((node) =>
        nodesToExecute.has(node.id)
      );

      // 初始化所有节点状态
      for (const node of workflow.nodes) {
        const status = nodesToExecute.has(node.id) ? "pending" : "skipped";
        context.setNodeState(node.id, status);
        if (status === "skipped") {
          opts.onNodeSkipped?.(node.id, "not-selected");
        }
      }

      // 按顺序执行节点
      for (const node of executionOrder) {
        // 检查是否暂停或取消
        if (context.isPaused()) {
          await this.waitForResume(context);
        }

        if (context.isCancelled()) {
          break;
        }

        // 执行节点
        await this.executeNode(node, context, opts);

        // 更新进度
        const progress = context.getProgress();
        opts.onProgress?.(progress);
      }

      // 完成执行
      context.complete();

      // 构建执行结果
      const result = this.buildExecutionResult(context, strategy);
      this.emitExecutionComplete(opts, result);
      return result;
    } catch (error) {
      // 执行出错
      context.error();
      const errorMessage =
        error instanceof Error ? error.message : String(error);
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
      // 全量执行：所有节点
      workflow.nodes.forEach((node) => result.add(node.id));
      return result;
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
      throw new Error("工作流中存在循环依赖");
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

      // 获取节点输入（从前驱节点的输出）
      const inputs = context.getNodeInputs(nodeId);

      // 合并节点配置参数（node.data.params）到输入中，并进行变量替换
      if (node.data?.params) {
        // 构建变量上下文
        const { map: contextMap } = buildVariableContextFromExecutionContext(
          nodeId,
          context,
          context.getWorkflow().nodes,
          context.getWorkflow().edges
        );

        // 对参数进行变量替换
        const resolvedParams = resolveConfigWithVariables(
          node.data.params,
          contextMap
        );

        // 合并解析后的参数到输入中
        Object.assign(inputs, resolvedParams);
      }

      // 合并节点配置参数（node.data.params）到输入中，并进行变量替换
      if (node.data?.params) {
        // 构建变量上下文
        const { map: contextMap } = buildVariableContextFromExecutionContext(
          nodeId,
          context,
          context.getWorkflow().nodes,
          context.getWorkflow().edges
        );

        // 对参数进行变量替换
        const resolvedParams = resolveConfigWithVariables(
          node.data.params,
          contextMap
        );

        // 合并解析后的参数到输入中
        Object.assign(inputs, resolvedParams);
      }

      // 缓存判断逻辑
      let shouldUseCache = false;
      let configHash: string | undefined;

      // 1. 首先判断全局缓存开关
      if (options.useCache) {
        // 2. 获取节点实例以进行节点级缓存判断
        const nodeInstance = this.nodeResolver.resolveInstance(nodeType);

        // 3. 判断节点是否允许使用缓存
        shouldUseCache = nodeInstance.shouldUseCache(inputs, {
          nodeId,
          workflowId: context.getWorkflowId(),
        });

        // 4. 如果节点允许使用缓存，计算配置哈希并检查缓存
        if (shouldUseCache) {
          configHash = nodeInstance.computeConfigHash(inputs, node.data || {});

          // 检查是否有有效缓存
          if (context.hasValidCache(nodeId, configHash)) {
            // 使用缓存
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
          }
        }
      }

      // 开始执行节点
      context.setNodeState(nodeId, "running");
      options.onNodeStart?.(nodeId);

      // 获取节点执行函数
      const executeFunc = this.nodeResolver.resolve(nodeType);

      // 执行节点
      const outputs = await this.executeWithTimeout(
        () => executeFunc(inputs, node.data || {}),
        options.timeout
      );

      // 保存输出
      context.setNodeOutput(nodeId, outputs);

      // 更新状态
      context.setNodeState(nodeId, "success", {
        outputs,
        inputs,
      });

      // 缓存结果（只有在允许缓存且已计算配置哈希的情况下）
      if (shouldUseCache && configHash) {
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

      options.onNodeComplete?.(nodeId, outputs);
    } catch (error) {
      // 执行失败
      const errorMsg = error instanceof Error ? error.message : String(error);
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
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("执行超时"));
      }, timeout);

      fn()
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
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
}
