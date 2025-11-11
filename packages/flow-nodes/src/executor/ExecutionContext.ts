/**
 * 执行上下文
 * 管理工作流执行过程中的状态和数据
 */

import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  NodeExecutionState,
  NodeExecutionStatus,
  CachedNodeResult,
  CacheStats,
  ExecutionState,
  IterationResultData,
  IterationHistory,
} from "./types";

/**
 * 执行上下文类
 * 负责管理执行过程中的状态、缓存和数据流
 */
export class ExecutionContext {
  /** 工作流定义 */
  private workflow: Workflow;

  /** 执行 ID */
  private executionId: string;

  /** 执行状态 */
  private state: ExecutionState = "idle";

  /** 节点执行状态映射 */
  private nodeStates: Map<string, NodeExecutionState> = new Map();

  /** 节点输出数据缓存（运行时） */
  private nodeOutputs: Map<string, Record<string, any>> = new Map();

  /** 当前工作流的缓存存储 */
  private readonly workflowCache: Map<string, CachedNodeResult>;

  /** 开始时间 */
  private startTime: number = 0;

  /** 结束时间 */
  private endTime: number = 0;

  /** 是否暂停 */
  private paused: boolean = false;

  /** 是否已取消 */
  private cancelled: boolean = false;

  /** 循环变量 */
  loopVariables: Record<string, any> | undefined = undefined;

  /** 节点迭代历史存储（用于循环容器内的节点） */
  private nodeIterationHistories: Map<string, IterationHistory> = new Map();

  constructor(
    workflow: Workflow,
    executionId: string,
    cacheStore: Map<string, CachedNodeResult>
  ) {
    this.workflow = workflow;
    this.executionId = executionId;
    this.workflowCache = cacheStore;
  }

  /**
   * 获取执行 ID
   */
  getExecutionId(): string {
    return this.executionId;
  }

  /**
   * 获取工作流 ID
   */
  getWorkflowId(): string {
    return this.workflow.workflow_id;
  }

  /**
   * 获取工作流定义
   */
  getWorkflow(): Workflow {
    return this.workflow;
  }

  /**
   * 设置执行状态
   */
  setState(state: ExecutionState): void {
    this.state = state;
  }

  /**
   * 获取执行状态
   */
  getState(): ExecutionState {
    return this.state;
  }

  /**
   * 开始执行
   */
  start(): void {
    this.state = "running";
    this.startTime = Date.now();
  }

  /**
   * 完成执行
   */
  complete(): void {
    this.state = "completed";
    this.endTime = Date.now();
  }

  /**
   * 执行出错
   */
  error(): void {
    this.state = "error";
    this.endTime = Date.now();
  }

  /**
   * 暂停执行
   */
  pause(): void {
    this.paused = true;
    this.state = "paused";
  }

  /**
   * 恢复执行
   */
  resume(): void {
    this.paused = false;
    this.state = "running";
  }

  /**
   * 取消执行
   */
  cancel(): void {
    this.cancelled = true;
    this.state = "cancelled";
    this.endTime = Date.now();
  }

  /**
   * 是否已暂停
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * 是否已取消
   */
  isCancelled(): boolean {
    return this.cancelled;
  }

  /**
   * 获取执行时长（毫秒）
   */
  getDuration(): number {
    if (this.startTime === 0) return 0;
    const end = this.endTime || Date.now();
    return end - this.startTime;
  }

  /**
   * 获取开始时间
   */
  getStartTime(): number {
    return this.startTime;
  }

  /**
   * 获取结束时间
   */
  getEndTime(): number {
    return this.endTime;
  }

  /**
   * 设置节点状态
   */
  setNodeState(
    nodeId: string,
    status: NodeExecutionStatus,
    data?: Partial<NodeExecutionState>
  ): void {
    const existing = this.nodeStates.get(nodeId) || {
      nodeId,
      status: "pending",
    };

    const updated: NodeExecutionState = {
      ...existing,
      status,
      ...data,
    };

    // 自动记录开始和结束时间
    if (status === "running" && !updated.startTime) {
      updated.startTime = Date.now();
    }

    if (
      (status === "success" || status === "error" || status === "cached") &&
      !updated.endTime
    ) {
      updated.endTime = Date.now();
      if (updated.startTime) {
        updated.duration = updated.endTime - updated.startTime;
      }
    }

    this.nodeStates.set(nodeId, updated);
  }

  /**
   * 获取节点状态
   */
  getNodeState(nodeId: string): NodeExecutionState | undefined {
    return this.nodeStates.get(nodeId);
  }

  /**
   * 获取所有节点状态
   */
  getAllNodeStates(): Map<string, NodeExecutionState> {
    return new Map(this.nodeStates);
  }

  /**
   * 设置节点输出数据
   */
  setNodeOutput(nodeId: string, outputs: Record<string, any>): void {
    this.nodeOutputs.set(nodeId, outputs);
  }

  /**
   * 获取节点输出数据
   */
  getNodeOutput(nodeId: string): Record<string, any> | undefined {
    return this.nodeOutputs.get(nodeId);
  }

  /**
   * 获取节点的输入数据（根据连接关系）
   */
  getNodeInputs(nodeId: string): Record<string, any> {
    const inputs: Record<string, any> = {};
    const edges = this.workflow.edges;

    // 找到所有指向该节点的边
    const incomingEdges = edges.filter((edge) => edge.target === nodeId);

    for (const edge of incomingEdges) {
      const sourceOutput = this.nodeOutputs.get(edge.source);
      if (sourceOutput) {
        // 如果指定了端口，使用端口名称
        const portName = edge.targetHandle || "default";
        const sourcePortName = edge.sourceHandle || "default";

        // 获取源节点的输出数据
        const value = sourceOutput[sourcePortName] ?? sourceOutput;
        inputs[portName] = value;
      }
    }

    console.log("[getNodeInputs]", inputs);

    return inputs;
  }

  /**
   * 设置持久化缓存
   */
  setCachedResult(nodeId: string, result: CachedNodeResult): void {
    this.workflowCache.set(nodeId, result);
  }

  /**
   * 获取持久化缓存
   */
  getCachedResult(nodeId: string): CachedNodeResult | null {
    return this.workflowCache.get(nodeId) ?? null;
  }

  /**
   * 清空指定工作流的缓存
   */
  clearCache(workflowId?: string): void {
    if (workflowId && workflowId !== this.workflow.workflow_id) {
      return;
    }

    this.workflowCache.clear();
  }

  /**
   * 清空所有缓存
   */
  clearAllCache(): void {
    this.workflowCache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(workflowId?: string): CacheStats {
    if (!workflowId) {
      workflowId = this.workflow.workflow_id;
    }

    const cachedNodes = this.workflowCache.size;
    const totalNodes = this.workflow.nodes.length;
    const hitRate = totalNodes > 0 ? cachedNodes / totalNodes : 0;

    return {
      totalNodes,
      cachedNodes,
      hitRate,
    };
  }

  /**
   * 检查节点是否有有效缓存
   */
  hasValidCache(nodeId: string, configHash?: string): boolean {
    const cached = this.getCachedResult(nodeId);
    if (!cached) return false;

    // 如果提供了配置哈希，检查是否匹配
    if (configHash && cached.configHash !== configHash) {
      return false;
    }

    // 检查缓存是否成功
    return cached.status === "success";
  }

  /**
   * 获取执行进度（0-1）
   */
  getProgress(): number {
    const totalNodes = this.workflow.nodes.length;
    if (totalNodes === 0) return 1;

    let completedNodes = 0;
    for (const state of this.nodeStates.values()) {
      if (
        state.status === "success" ||
        state.status === "error" ||
        state.status === "cached" ||
        state.status === "skipped"
      ) {
        completedNodes++;
      }
    }

    return completedNodes / totalNodes;
  }

  /**
   * 重置执行状态（保留缓存）
   */
  reset(): void {
    this.state = "idle";
    this.nodeStates.clear();
    this.nodeOutputs.clear();
    this.nodeIterationHistories.clear();
    this.startTime = 0;
    this.endTime = 0;
    this.paused = false;
    this.cancelled = false;
  }

  /**
   * 追加节点的迭代结果（用于循环容器内的节点）
   */
  appendIterationResult(
    nodeId: string,
    iterationData: IterationResultData
  ): void {
    // 获取或创建迭代历史
    let history = this.nodeIterationHistories.get(nodeId);
    if (!history) {
      history = {
        iterations: [],
        totalIterations: 0,
        currentPage: 1,
      };
      this.nodeIterationHistories.set(nodeId, history);
    }

    // 追加迭代结果
    history.iterations.push(iterationData);
    history.totalIterations = history.iterations.length;

    // 同时更新节点状态中的迭代历史
    const nodeState = this.nodeStates.get(nodeId);
    if (nodeState) {
      nodeState.iterationHistory = { ...history };
    }
  }

  /**
   * 获取节点的迭代历史
   */
  getIterationHistory(nodeId: string): IterationHistory | undefined {
    return this.nodeIterationHistories.get(nodeId);
  }

  /**
   * 清空节点的迭代历史（在新一轮循环开始前调用）
   */
  clearIterationHistory(nodeId: string): void {
    this.nodeIterationHistories.delete(nodeId);
  }

  /**
   * 清空所有迭代历史
   */
  clearAllIterationHistories(): void {
    this.nodeIterationHistories.clear();
  }
}
