export * from "./types.ts";
export { WorkflowEventType } from "./events.ts";

export { BaseNode } from "./BaseNode.ts";
export { NodeRegistry } from "./NodeRegistry.ts";
export { CoreNodeRegistry } from "./CoreNodeRegistry.ts";
export { executeWorkflow } from "./workflowExecutor.ts";
export {
  buildVariableContext,
  resolveConfigWithVariables,
} from "./variableResolver.ts";
export type {
  VariableTreeNode,
  VariableContextResult,
} from "./variableResolver.ts";

// 导出核心节点
export { StartNode } from "./nodes/StartNode.ts";
export { EndNode } from "./nodes/EndNode.ts";
export { IfNode } from "./nodes/IfNode.ts";
export { ForNode } from "./nodes/ForNode.ts";

// 导出核心节点类型和常量
export type { StartNodeConfig } from "./nodes/StartNode.ts";
export type { EndNodeConfig } from "./nodes/EndNode.ts";

export type {
  DataType,
  OperatorType,
  ConditionOperand,
  SubCondition,
  Condition,
  IfConfig,
} from "./nodes/IfNode.ts";

export {
  OPERATOR_LABELS,
  DATA_TYPE_LABELS,
  OPERATORS_BY_TYPE,
} from "./nodes/IfNode.ts";

export type { ForConfig } from "./nodes/ForNode.ts";
