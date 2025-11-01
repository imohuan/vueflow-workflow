/**
 * 工作流模块统一导出
 */

// 导出执行相关
export { useWorkflowExecution } from "./execution/useWorkflowExecution";
export type { UseWorkflowExecutionReturn } from "./execution/useWorkflowExecution";

// 导出变量解析
export {
  buildVariableContext,
  resolveConfigWithVariables,
  simplifyVariableReference,
} from "./variables/variableResolver";
export type {
  VariableTreeNode,
  VariableContextResult,
} from "./variables/variableResolver";

// 导出节点相关
export * from "./nodes";
