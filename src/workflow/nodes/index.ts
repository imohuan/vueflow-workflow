// 导出 IfNode 的类型和常量（供组件使用）
export type {
  DataType,
  OperatorType,
  ConditionOperand,
  SubCondition,
  Condition,
  IfConfig,
} from "@node-executor/core";

export {
  OPERATOR_LABELS,
  DATA_TYPE_LABELS,
  OPERATORS_BY_TYPE,
} from "@node-executor/core";

// 导入核心节点实例
import { StartNode, EndNode, IfNode, ForNode } from "@node-executor/core";

// 导入 browser-nodes 包
import {
  getNodeByType as getBrowserNodeByType,
  type MCPClient,
} from "@browser-nodes/core";
import { type BaseNode } from "@node-executor/core";

// 核心节点注册表
const CORE_NODE_MAP: Record<string, BaseNode> = {
  start: new StartNode(),
  end: new EndNode(),
  if: new IfNode(),
  for: new ForNode(),
};

/**
 * 获取节点实例（包含核心节点和 browser-nodes 包中的节点）
 * @param type - 节点类型
 * @returns 节点实例
 */
export function getNodeByType(type: string): BaseNode | undefined {
  // 先查找核心节点
  if (CORE_NODE_MAP[type]) {
    return CORE_NODE_MAP[type];
  }
  // 再查找 browser-nodes 包中的节点
  return getBrowserNodeByType(type);
}

// 重新导出 WorkflowExecutionContext（与 node-executor 中的定义保持一致）
export interface WorkflowExecutionContext {
  /** MCP 客户端实例（由初始化节点设置） */
  mcpClient?: MCPClient;
  /** 其他共享数据 */
  [key: string]: unknown;
}

// 导出 BaseNode 从 @node-executor/core
export { BaseNode } from "@node-executor/core";

// 导出类型（从 @node-executor/core 导出基础类型）
export type {
  PortDefinition,
  NodeData,
  NodeResult,
  NodeResultOutput,
  NodeResultData,
} from "@node-executor/core";
