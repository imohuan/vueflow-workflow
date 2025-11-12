/**
 * Executor 核心类型定义
 * 用于工作流执行引擎
 */

/**
 * 工作流节点定义
 */
export interface WorkflowNode {
  /** 节点唯一标识 */
  id: string;

  /** 节点类型（对应 NODE_CLASS_REGISTRY 中的 type） */
  type: string;

  /** 节点标签 */
  label?: string;

  /** 节点位置 */
  position?: { x: number; y: number };

  /** 节点数据/配置 */
  data?: Record<string, any>;

  /** 节点配置哈希（用于缓存失效检测） */
  configHash?: string;

  /** 父节点 ID（用于容器节点） */
  parentNode?: string;
}

/**
 * 工作流边定义
 */
export interface WorkflowEdge {
  /** 边 ID */
  id: string;

  /** 源节点 ID */
  source: string;

  /** 源节点输出端口 */
  sourceHandle?: string;

  /** 目标节点 ID */
  target: string;

  /** 目标节点输入端口 */
  targetHandle?: string;

  /** 边的数据 */
  data?: Record<string, any>;
}

/**
 * 工作流定义
 */
export interface Workflow {
  /** 工作流唯一标识（用于缓存） */
  workflow_id: string;

  /** 节点列表 */
  nodes: WorkflowNode[];

  /** 边列表 */
  edges: WorkflowEdge[];

  /** 选中要执行的节点 ID 列表（可选）
   * - 为空：执行所有节点
   * - 有值：仅执行选中节点及其必需的依赖节点
   */
  selectedNodeIds?: string[];

  /** 工作流名称 */
  name?: string;

  /** 工作流描述 */
  description?: string;

  /** 创建时间 */
  createdAt?: number;

  /** 更新时间 */
  updatedAt?: number;
}

/**
 * 执行选项
 */
export interface ExecutionOptions {
  /** 超时时间（毫秒） */
  timeout?: number;

  /** 最大重试次数 */
  maxRetries?: number;

  /** 是否使用缓存（默认：true） */
  useCache?: boolean;

  /** 是否清空缓存后执行（默认：false） */
  clearCache?: boolean;

  /** 全局变量（可在所有节点中访问） */
  globalVariables?: Record<string, any>;

  /** 日志函数（可选） */
  log?: (...args: any[]) => void;

  /** 错误日志函数（可选） */
  error?: (...args: any[]) => void;

  /** 执行生命周期回调 */
  onExecutionStart?: (payload: ExecutionLifecycleEvent) => void;
  onExecutionComplete?: (result: ExecutionResult) => void;
  onExecutionError?: (payload: ExecutionErrorEvent) => void;

  /** 节点事件回调 */
  onNodeStart?: (nodeId: string) => void;
  onNodeComplete?: (nodeId: string, result: any) => void;
  onNodeError?: (nodeId: string, error: Error) => void;
  onProgress?: (progress: number) => void;
  onCacheHit?: (nodeId: string, cachedResult: any) => void;
  onNodeSkipped?: (nodeId: string, reason: string) => void;
  /** 迭代历史更新回调（用于循环容器内的节点） */
  onIterationUpdate?: (nodeId: string, iterationData: IterationResultData) => void;
}

/**
 * 节点执行状态
 */
export type NodeExecutionStatus =
  | "pending" // 等待执行
  | "running" // 执行中
  | "success" // 成功
  | "error" // 错误
  | "skipped" // 跳过（不在执行范围内）
  | "cached"; // 使用缓存

/**
 * 单次迭代的执行数据（用于循环节点内的子节点）
 */
export interface IterationResultData {
  /** 迭代索引（第几次循环，从 0 开始） */
  iterationIndex: number;

  /** 迭代变量（item, index 等） */
  iterationVars: Record<string, any>;

  /** 该次迭代的执行结果 */
  executionResult: any;

  /** 执行状态 */
  executionStatus: NodeExecutionStatus;

  /** 执行时长（毫秒） */
  executionDuration?: number;

  /** 执行时间戳 */
  executionTimestamp: number;

  /** 错误信息（如果有） */
  executionError?: string;
}

/**
 * 迭代历史记录（用于循环节点内的子节点）
 */
export interface IterationHistory {
  /** 所有迭代的执行记录 */
  iterations: IterationResultData[];

  /** 总迭代次数 */
  totalIterations: number;

  /** 当前显示的页码（用于 UI，从 1 开始） */
  currentPage: number;
}

/**
 * 节点执行状态详情
 */
export interface NodeExecutionState {
  /** 节点 ID */
  nodeId: string;

  /** 执行状态 */
  status: NodeExecutionStatus;

  /** 开始时间 */
  startTime?: number;

  /** 结束时间 */
  endTime?: number;

  /** 执行耗时（毫秒） */
  duration?: number;

  /** 错误信息 */
  error?: string;

  /** 输出数据 */
  outputs?: Record<string, any>;

  /** 是否来自缓存 */
  fromCache?: boolean;

  /** 输入数据（调试用） */
  inputs?: Record<string, any>;

  /** 迭代历史（仅用于循环容器内的节点） */
  iterationHistory?: IterationHistory;
}

/**
 * 执行结果
 */
export interface ExecutionResult {
  /** 是否成功 */
  success: boolean;

  /** 执行 ID */
  executionId: string;

  /** 工作流 ID */
  workflowId: string;

  /** 开始时间 */
  startTime: number;

  /** 结束时间 */
  endTime: number;

  /** 执行时长（毫秒） */
  duration: number;

  /** 节点执行结果映射 */
  nodeResults: Map<string, NodeExecutionState>;

  /** 实际执行的节点 ID 列表 */
  executedNodeIds: string[];

  /** 跳过的节点 ID 列表（不在执行范围内） */
  skippedNodeIds: string[];

  /** 缓存命中的节点 ID 列表 */
  cachedNodeIds: string[];

  /** 错误信息 */
  error?: string;

  /** 执行策略 */
  strategy?: "full" | "selective" | "single";
}

/**
 * 执行生命周期事件
 */
export interface ExecutionLifecycleEvent {
  /** 执行 ID */
  executionId: string;

  /** 工作流 ID */
  workflowId: string;
}

/**
 * 执行错误事件
 */
export interface ExecutionErrorEvent extends ExecutionLifecycleEvent {
  /** 错误信息 */
  error: string;

  /** 错误时的执行结果 */
  result?: ExecutionResult;
}

/**
 * 缓存键
 */
export interface CacheKey {
  /** 工作流 ID */
  workflowId: string;

  /** 节点 ID */
  nodeId: string;
}

/**
 * 缓存的节点结果
 */
export interface CachedNodeResult {
  /** 节点 ID */
  nodeId: string;

  /** 执行状态 */
  status: "success" | "error";

  /** 执行时间 */
  timestamp: number;

  /** 输出数据 */
  outputs: Record<string, any>;

  /** 执行耗时 */
  duration: number;

  /** 节点配置哈希（用于检测节点是否修改） */
  configHash?: string;

  /** 输入数据（用于调试） */
  inputs?: Record<string, any>;
}

/**
 * 缓存统计
 */
export interface CacheStats {
  /** 总节点数 */
  totalNodes: number;

  /** 已缓存节点数 */
  cachedNodes: number;

  /** 命中率（0-1） */
  hitRate: number;
}

/**
 * 执行状态
 */
export type ExecutionState =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "error"
  | "cancelled";

/**
 * 节点元数据
 */
export interface NodeMetadata {
  /** 节点类型 */
  type: string;

  /** 节点标签 */
  label: string;

  /** 节点描述 */
  description?: string;

  /** 输入端口配置 */
  inputs?: Array<{
    name: string;
    label: string;
    type?: string;
    required?: boolean;
  }>;

  /** 输出端口配置 */
  outputs?: Array<{
    name: string;
    label: string;
    type?: string;
  }>;

  /** 节点分类 */
  category?: string;

  /** 节点图标 */
  icon?: string;
}

/**
 * 节点执行函数类型
 * @param inputs - 节点输入数据
 * @param context - 节点执行上下文（包含 nodeId, nodeData, workflowId, executeContainer 等）
 * @returns 节点执行结果（NodeExecutionResult 从 BaseFlowNode 导入）
 */
export type NodeExecuteFunction = (
  inputs: Record<string, any>,
  context: Record<string, any>
) => Promise<import("../BaseFlowNode").NodeExecutionResult>;
