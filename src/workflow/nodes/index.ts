// 导出 IfNode 的类型和常量（供组件使用）
export type {
  DataType,
  OperatorType,
  ConditionOperand,
  SubCondition,
  Condition,
  IfConfig,
} from "@workflow-imohuan/node-executor";

export {
  OPERATOR_LABELS,
  DATA_TYPE_LABELS,
  OPERATORS_BY_TYPE,
} from "@workflow-imohuan/node-executor";

// 从 useNodeRegistry 统一导入（包含核心节点和 browser-nodes 包中的节点）
export { getNodeByType } from "@/composables/useNodeRegistry";

// 导出 BaseNode 从 @workflow-imohuan/node-executor
export { BaseNode } from "@workflow-imohuan/node-executor";

// 导出类型（从 @workflow-imohuan/node-executor 导出基础类型）
export type {
  PortDefinition,
  NodeData,
  NodeResult,
  NodeResultOutput,
  NodeResultData,
} from "@workflow-imohuan/node-executor";
