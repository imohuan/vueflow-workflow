/**
 * 工作流执行相关的类型定义
 */

/** 执行模式 */
export type ExecutionMode = "worker" | "websocket";

/** 执行状态 */
export type ExecutionStatus =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "error";

/** 节点执行状态 */
export type NodeExecutionStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "skipped";

/** 日志级别 */
export type LogLevel = "info" | "warn" | "error";

// ==================== 执行上下文 ====================

/** 执行任务标识 */
export interface ExecutionContext {
  /** 执行任务 ID（唯一标识一次执行） */
  executionId: string;

  /** 工作流 ID */
  workflowId: string;

  /** 执行模式 */
  mode: ExecutionMode;

  /** 执行开始时间 */
  startTime: number;

  /** 当前状态 */
  status: ExecutionStatus;
}

// ==================== 节点执行状态 ====================

/** 节点执行错误信息 */
export interface NodeExecutionError {
  message: string;
  stack?: string;
}

/** 节点执行日志 */
export interface NodeExecutionLog {
  level: LogLevel;
  message: string;
  timestamp: number;
}

/** 节点执行状态 */
export interface NodeExecutionState {
  /** 节点 ID */
  nodeId: string;

  /** 执行状态 */
  status: NodeExecutionStatus;

  /** 开始执行时间 */
  startTime?: number;

  /** 结束执行时间 */
  endTime?: number;

  /** 执行结果数据（成功时） */
  output?: any;

  /** 错误信息（失败时） */
  error?: NodeExecutionError;

  /** 执行进度（0-100，可选） */
  progress?: number;

  /** 日志信息 */
  logs?: NodeExecutionLog[];
}

// ==================== 边执行状态 ====================

/** 边执行状态 */
export interface EdgeExecutionState {
  /** 边 ID */
  edgeId: string;

  /** 是否激活（显示动画） */
  active: boolean;

  /** 激活时间 */
  timestamp?: number;

  /** 传递的数据（可选，用于调试） */
  data?: any;
}

// ==================== 执行快照 ====================

/** 执行快照（用于恢复） */
export interface ExecutionSnapshot {
  /** 执行任务信息 */
  context: ExecutionContext;

  /** 所有节点的执行状态 */
  nodes: Record<string, NodeExecutionState>;

  /** 当前激活的边 */
  activeEdges: string[];

  /** 快照时间 */
  snapshotTime: number;

  /** 当前执行到的节点 */
  currentNodeId?: string;
}

// ==================== 事件类型 ====================

/** 工作流事件类型枚举 */
export enum WorkflowEventType {
  // 执行生命周期
  STARTED = "workflow:started",
  COMPLETED = "workflow:completed",
  ERROR = "workflow:error",
  PAUSED = "workflow:paused",
  RESUMED = "workflow:resumed",

  // 节点状态
  NODE_STATUS = "workflow:node:status",
  NODE_PROGRESS = "workflow:node:progress",
  NODE_LOG = "workflow:node:log",

  // 边状态
  EDGE_ACTIVE = "workflow:edge:active",
  EDGE_INACTIVE = "workflow:edge:inactive",

  // 恢复机制
  RESTORE_REQUEST = "workflow:restore:request",
  RESTORE_DATA = "workflow:restore:data",
}

// ==================== 事件 Payload ====================

/** 工作流开始事件 */
export interface WorkflowStartedPayload {
  executionId: string;
  workflowId: string;
  mode: ExecutionMode;
  timestamp: number;
  totalNodes: number;
}

/** 工作流完成事件 */
export interface WorkflowCompletedPayload {
  executionId: string;
  timestamp: number;
  duration: number;
  successNodes: number;
  failedNodes: number;
}

/** 工作流错误事件 */
export interface WorkflowErrorPayload {
  executionId: string;
  error: {
    message: string;
    nodeId?: string;
    stack?: string;
  };
  timestamp: number;
}

/** 工作流暂停事件 */
export interface WorkflowPausedPayload {
  executionId: string;
  timestamp: number;
}

/** 工作流恢复事件 */
export interface WorkflowResumedPayload {
  executionId: string;
  timestamp: number;
}

/** 节点状态变化事件 */
export interface NodeStatusPayload {
  executionId: string;
  nodeId: string;
  status: NodeExecutionStatus;
  timestamp: number;
  output?: any;
  error?: NodeExecutionError;
  duration?: number;
}

/** 节点进度更新事件 */
export interface NodeProgressPayload {
  executionId: string;
  nodeId: string;
  progress: number; // 0-100
  message?: string;
  timestamp: number;
}

/** 节点日志事件 */
export interface NodeLogPayload {
  executionId: string;
  nodeId: string;
  level: LogLevel;
  message: string;
  timestamp: number;
}

/** 边激活事件 */
export interface EdgeActivePayload {
  executionId: string;
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  timestamp: number;
  data?: any;
}

/** 边失活事件 */
export interface EdgeInactivePayload {
  executionId: string;
  edgeId: string;
  timestamp: number;
}

/** 恢复请求事件 */
export interface RestoreRequestPayload {
  executionId: string;
  workflowId: string;
  requestTime: number;
}

/** 恢复数据事件 */
export interface RestoreDataPayload {
  executionId: string;
  snapshot: ExecutionSnapshot;
}

// ==================== 事件类型映射 ====================

/** 工作流事件映射 */
export interface WorkflowEvents {
  [WorkflowEventType.STARTED]: WorkflowStartedPayload;
  [WorkflowEventType.COMPLETED]: WorkflowCompletedPayload;
  [WorkflowEventType.ERROR]: WorkflowErrorPayload;
  [WorkflowEventType.PAUSED]: WorkflowPausedPayload;
  [WorkflowEventType.RESUMED]: WorkflowResumedPayload;
  [WorkflowEventType.NODE_STATUS]: NodeStatusPayload;
  [WorkflowEventType.NODE_PROGRESS]: NodeProgressPayload;
  [WorkflowEventType.NODE_LOG]: NodeLogPayload;
  [WorkflowEventType.EDGE_ACTIVE]: EdgeActivePayload;
  [WorkflowEventType.EDGE_INACTIVE]: EdgeInactivePayload;
  [WorkflowEventType.RESTORE_REQUEST]: RestoreRequestPayload;
  [WorkflowEventType.RESTORE_DATA]: RestoreDataPayload;
}

// ==================== 状态管理 ====================

/** 工作流执行状态 */
export interface WorkflowExecutionState {
  /** 当前活跃的执行任务 */
  activeExecutionId: string | null;

  /** 所有执行任务的上下文 */
  executions: Map<string, ExecutionContext>;

  /** 节点执行状态（按 executionId 分组） */
  nodeStates: Map<string, Map<string, NodeExecutionState>>;

  /** 激活的边（按 executionId 分组） */
  activeEdges: Map<string, Set<string>>;

  /** 执行历史快照（用于恢复） */
  snapshots: Map<string, ExecutionSnapshot>;
}
