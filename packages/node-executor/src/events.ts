/**
 * 工作流事件类型枚举
 */
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
