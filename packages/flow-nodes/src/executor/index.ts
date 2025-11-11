/**
 * Executor 模块统一导出
 */

// 导出类型
export type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  ExecutionOptions,
  ExecutionResult,
  NodeExecutionState,
  NodeExecutionStatus,
  CachedNodeResult,
  CacheStats,
  ExecutionState,
  NodeMetadata,
  NodeExecuteFunction,
  ExecutionLifecycleEvent,
  ExecutionErrorEvent,
  IterationResultData,
  IterationHistory,
} from "./types";

// 导出核心类
export { WorkflowExecutor } from "./WorkflowExecutor";
export { ExecutionContext } from "./ExecutionContext";

// 导出节点解析器
export {
  type INodeResolver,
  DefaultNodeResolver,
  createNodeResolver,
} from "./NodeResolver";

// 导出变量解析器
export {
  type VariableTreeNode,
  type VariableContextResult,
  type NodeOutputExtractor,
  tokenRegex,
  containsVariableReference,
  buildVariableContext,
  buildVariableContextFromExecutionContext,
  resolveConfigWithVariables,
} from "./VariableResolver";
