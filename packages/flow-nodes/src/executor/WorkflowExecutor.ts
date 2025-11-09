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

      // 识别容器节点（有子节点的节点）
      const containerNodeIds = this.identifyContainerNodes(workflow.nodes);
      
      // 排除容器节点进行拓扑排序（容器节点由循环逻辑特殊处理）
      const nonContainerNodes = workflow.nodes.filter(
        (node) => !containerNodeIds.has(node.id)
      );
      
      // 排除与容器节点相关的边
      const nonContainerEdges = workflow.edges.filter(
        (edge) => 
          !containerNodeIds.has(edge.source) && 
          !containerNodeIds.has(edge.target)
      );

      console.log(
        `[WorkflowExecutor] 排除 ${containerNodeIds.size} 个容器节点后，对 ${nonContainerNodes.length} 个节点进行拓扑排序`
      );

      // 拓扑排序（只对非容器节点）
      const sortedNodes = this.topologicalSort(nonContainerNodes, nonContainerEdges);

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
      console.warn(
        "[WorkflowExecutor] 工作流中没有找到开始节点，将不执行任何节点"
      );
      return new Set<string>();
    }

    // 如果有多个开始节点，发出警告
    if (startNodes.length > 1) {
      console.warn(
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

    console.log(
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

    // 检查是否有来自条件分支节点的输入
    let hasConditionalBranchInput = false;
    let hasValidInputFromConditionalBranch = false;

    for (const edge of incomingEdges) {
      // 查找源节点
      const sourceNode = workflow.nodes.find((n) => n.id === edge.source);
      if (!sourceNode) {
        continue;
      }

      // 获取源节点类型
      const sourceNodeType = sourceNode.data?.nodeType || sourceNode.type;

      // 检查源节点是否是条件分支节点（IF 节点等）
      const isConditionalBranch = sourceNodeType === "if";

      if (!isConditionalBranch) {
        // 如果源节点不是条件分支节点，不检查输入有效性
        continue;
      }

      hasConditionalBranchInput = true;

      const sourceOutput = context.getNodeOutput(edge.source);
      if (!sourceOutput) {
        // 源节点还没有执行，不跳过
        continue;
      }

      // 获取源节点指定输出端口的值
      const sourceHandle = edge.sourceHandle || "default";
      const outputValue = sourceOutput[sourceHandle];

      // 如果输出值不是 undefined 或 null，说明有有效输入
      if (outputValue !== undefined && outputValue !== null) {
        hasValidInputFromConditionalBranch = true;
        break;
      }
    }

    // 只有当存在来自条件分支节点的输入，且所有这些输入都无效时，才跳过节点
    return hasConditionalBranchInput && !hasValidInputFromConditionalBranch;
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

      // 检查节点是否应该被跳过（基于输入有效性）
      if (this.shouldSkipNodeDueToInvalidInputs(nodeId, context)) {
        console.log(
          `[WorkflowExecutor] 跳过节点 ${nodeId}: 所有输入端口都没有有效数据`
        );
        context.setNodeState(nodeId, "skipped");
        options.onNodeSkipped?.(nodeId, "no-valid-input");
        return;
      }

      // 获取节点输入（从前驱节点的输出）
      const inputs = context.getNodeInputs(nodeId);

      console.log(`[WorkflowExecutor] 节点 ${nodeId} (${nodeType}) 初始输入:`, {
        inputs: Object.keys(inputs),
        hasParams: !!node.data?.params,
      });

      // 合并节点配置参数（node.data.params）到输入中，并进行变量替换
      if (node.data?.params) {
        console.log(
          `[WorkflowExecutor] 节点 ${nodeId} 的 params:`,
          node.data.params
        );

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

        console.log(
          `[WorkflowExecutor] 节点 ${nodeId} 解析后的 params:`,
          resolvedParams
        );

        // 合并解析后的参数到输入中
        Object.assign(inputs, resolvedParams);

        console.log(
          `[WorkflowExecutor] 节点 ${nodeId} 合并后的 inputs:`,
          Object.keys(inputs)
        );
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

      // 检查是否是循环节点，如果是则执行循环逻辑
      await this.handleForLoopIfNeeded(
        node,
        outputs,
        context,
        options
      );
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

  /**
   * 识别容器节点
   * 容器节点是那些有其他节点将其作为 parentNode 的节点
   */
  private identifyContainerNodes(nodes: WorkflowNode[]): Set<string> {
    const containerIds = new Set<string>();
    
    for (const node of nodes) {
      const parentId = node.parentNode || node.data?.parentNode;
      if (parentId && typeof parentId === 'string') {
        containerIds.add(parentId);
        console.log(
          `[WorkflowExecutor] 节点 ${node.id} 的父节点是 ${parentId}（容器节点）`
        );
      }
    }
    
    console.log(
      `[WorkflowExecutor] 识别到 ${containerIds.size} 个容器节点:`,
      Array.from(containerIds)
    );
    
    return containerIds;
  }

  /**
   * 检查并处理循环节点
   */
  private async handleForLoopIfNeeded(
    node: WorkflowNode,
    outputs: Record<string, any>,
    context: ExecutionContext,
    options: ExecutionOptions
  ): Promise<void> {
    // 检查节点类型是否为 'for'
    const nodeType = node.data?.nodeType || node.type;
    if (nodeType !== "for") {
      return;
    }

    // 获取循环输出信息
    const loopOutput = outputs.loop || outputs.outputs?.loop;
    if (!loopOutput) {
      console.warn(`[WorkflowExecutor] For 节点 ${node.id} 没有返回循环信息`);
      return;
    }

    const { iterations, containerId, itemName, indexName } = loopOutput;

    // 检查是否有容器 ID
    if (!containerId) {
      console.warn(`[WorkflowExecutor] For 节点 ${node.id} 没有配置容器 ID`);
      return;
    }

    // 检查迭代数据
    if (!Array.isArray(iterations) || iterations.length === 0) {
      console.log(`[WorkflowExecutor] For 节点 ${node.id} 没有迭代数据`);
      // 更新输出
      const updatedOutputs = {
        ...outputs,
        next: {
          count: 0,
          results: [],
          summary: "无迭代数据",
        },
      };
      context.setNodeOutput(node.id, updatedOutputs);
      return;
    }

    // 获取分页配置
    const pagination = node.data?.config?.pagination;
    const isPaginated = pagination?.enabled ?? false;
    const pageSize = pagination?.pageSize ?? 10;
    const currentPage = pagination?.currentPage ?? 1;

    // 计算要执行的迭代范围
    let iterationsToExecute = iterations;
    let startIndex = 0;
    let endIndex = iterations.length;

    if (isPaginated && pageSize > 0) {
      startIndex = (currentPage - 1) * pageSize;
      endIndex = Math.min(startIndex + pageSize, iterations.length);
      iterationsToExecute = iterations.slice(startIndex, endIndex);

      console.log(
        `[WorkflowExecutor] For 节点 ${node.id} 启用分页：第 ${currentPage} 页，每页 ${pageSize} 条，执行 ${iterationsToExecute.length} 次迭代（总共 ${iterations.length} 次）`
      );
    } else {
      console.log(
        `[WorkflowExecutor] 开始执行 For 节点 ${node.id} 的循环，共 ${iterations.length} 次迭代`
      );
    }

    const iterationResults: any[] = [];
    const workflow = context.getWorkflow();

    for (let i = 0; i < iterationsToExecute.length; i++) {
      const actualIndex = startIndex + i;
      const iterationVars = iterationsToExecute[i] || {};

      console.log(
        `[WorkflowExecutor] 执行第 ${actualIndex + 1}/${iterations.length} 次迭代`,
        iterationVars
      );

      try {
        // 执行容器内的节点，并传入迭代变量
        const containerOutput = await this.executeContainerNodes(
          containerId,
          iterationVars,
          context,
          options
        );

        iterationResults.push({
          index: actualIndex,
          variables: iterationVars,
          result: containerOutput,
          status: "success",
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          `[WorkflowExecutor] 第 ${actualIndex + 1} 次迭代失败:`,
          errorMsg
        );

        iterationResults.push({
          index: actualIndex,
          variables: iterationVars,
          error: errorMsg,
          status: "error",
        });

        // 检查是否继续执行
        const errorHandling = node.data?.config?.errorHandling;
        if (!errorHandling?.continueOnError) {
          throw error;
        }
      }
    }

    // 构建输出结果
    const totalCount = iterations.length;
    const executedCount = iterationsToExecute.length;
    const successCount = iterationResults.filter((r) => r.status === "success").length;
    const errorCount = iterationResults.filter((r) => r.status === "error").length;

    // 更新 For 节点的输出
    const updatedOutputs = {
      ...outputs,
      next: {
        // 执行统计
        totalCount,
        executedCount,
        successCount,
        errorCount,
        // 结果数据
        results: iterationResults,
        // 分页信息
        pagination: isPaginated
          ? {
              enabled: true,
              currentPage,
              pageSize,
              totalPages: Math.ceil(totalCount / pageSize),
              startIndex,
              endIndex: endIndex - 1,
            }
          : undefined,
        // 摘要信息
        summary: isPaginated
          ? `第 ${currentPage} 页：执行 ${executedCount} 次，成功 ${successCount} 次，失败 ${errorCount} 次`
          : `循环执行 ${executedCount} 次，成功 ${successCount} 次，失败 ${errorCount} 次`,
      },
    };

    context.setNodeOutput(node.id, updatedOutputs);
    console.log(
      `[WorkflowExecutor] For 节点 ${node.id} 循环执行完成：${updatedOutputs.next.summary}`
    );
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
        (node.data?.parentNode === containerId || node.parentNode === containerId)
    );

    if (containerNodes.length === 0) {
      console.warn(
        `[WorkflowExecutor] 容器 ${containerId} 内没有找到任何节点`
      );
      return null;
    }

    console.log(
      `[WorkflowExecutor] 容器 ${containerId} 内有 ${containerNodes.length} 个节点`
    );

    // 重置容器内节点的状态
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

    console.log(
      `[WorkflowExecutor] 容器内有 ${containerEdges.length} 条边`
    );

    const sortedNodes = this.topologicalSort(containerNodes, containerEdges);

    // 将迭代变量注入到执行上下文中（临时）
    (context as any).loopVariables = iterationVars;

    let containerOutput: any = null;

    // 按顺序执行容器内的节点
    for (const node of sortedNodes) {
      // 检查是否取消
      if (context.isCancelled()) {
        break;
      }

      // 执行节点
      await this.executeNode(node, context, options);

      // 记录最后一个节点的输出作为容器的输出
      const nodeOutput = context.getNodeOutput(node.id);
      if (nodeOutput) {
        containerOutput = nodeOutput;
      }
    }

    // 恢复原始上下文
    (context as any).loopVariables = undefined;

    return containerOutput;
  }
}
