/**
 * VueFlow 核心类型定义
 * 导出所有节点相关的类型
 */

// 从 workflow-flow-nodes package 导入和重新导出
export type {
  NodeDataType,
  PortConfig,
  NodeStyleConfig,
  NodeExecutionContext,
  NodeExecutionResult,
  NodeType,
  NodeRegistration,
  INodeFactory,
  INodeExecutor,
  NodeConnection,
  NodeInstanceConfig,
  WorkflowGraph,
  NodeExecutionStatus,
  NodeExecutionRecord,
  WorkflowExecutionLog,
} from "workflow-flow-nodes";

export { BaseFlowNode } from "workflow-flow-nodes";
