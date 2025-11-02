// 导出 IfNode 的类型和常量（供组件使用）
export type {
  DataType,
  OperatorType,
  ConditionOperand,
  SubCondition,
  Condition,
  IfConfig,
} from "workflow-node-executor";

export {
  OPERATOR_LABELS,
  DATA_TYPE_LABELS,
  OPERATORS_BY_TYPE,
} from "workflow-node-executor";

// 导出 BaseNode 从 workflow-node-executor
export { BaseNode } from "workflow-node-executor";

// 导出类型（从 workflow-node-executor 导出基础类型）
export type {
  PortDefinition,
  NodeData,
  NodeResult,
  NodeResultOutput,
  NodeResultData,
} from "workflow-node-executor";
