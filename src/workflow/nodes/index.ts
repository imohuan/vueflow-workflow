// 导出核心节点
export { StartNode } from "./core/StartNode";
export { EndNode } from "./core/EndNode";
export { IfNode } from "./core/IfNode";
export { ForNode } from "./core/ForNode";

// 导出 IfNode 的类型和常量（供组件使用）
export type {
  DataType,
  OperatorType,
  ConditionOperand,
  SubCondition,
  Condition,
  IfConfig,
} from "./core/IfNode";
export {
  OPERATOR_LABELS,
  DATA_TYPE_LABELS,
  OPERATORS_BY_TYPE,
} from "./core/IfNode";

// 导入核心节点实例
import { StartNode } from "./core/StartNode";
import { EndNode } from "./core/EndNode";
import { IfNode } from "./core/IfNode";
import { ForNode } from "./core/ForNode";

// 导入 browser-nodes 包
import {
  getNodeByType as getBrowserNodeByType,
  type BaseNode,
  type MCPClient,
} from "@browser-nodes/core";

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

// 导出 browser-nodes 包中的其他内容（排除 getNodeByType，避免冲突）
export {
  BaseNode,
  // 浏览器管理
  NavigateNode,
  GetWindowsAndTabsNode,
  CloseTabsNode,
  GoBackOrForwardNode,
  // 截图和视觉
  ScreenshotNode,
  // 网络监控
  NetworkCaptureStartNode,
  NetworkCaptureStopNode,
  NetworkDebuggerStartNode,
  NetworkDebuggerStopNode,
  NetworkRequestNode,
  // 内容分析
  SearchTabsContentNode,
  GetWebContentNode,
  GetInteractiveElementsNode,
  // 交互操作
  ClickElementNode,
  FillOrSelectNode,
  KeyboardNode,
  // 数据管理
  SearchHistoryNode,
  SearchBookmarksNode,
  AddBookmarkNode,
  DeleteBookmarkNode,
  // 高级功能
  InjectScriptNode,
  SendCommandToInjectScriptNode,
  CaptureConsoleNode,
  // 流程控制
  DelayNode,
  // 数据处理
  MergeNode,
  CodeNode,
  // 工具函数
  getAllNodes,
  getNodesByCategory,
  // MCP 客户端（只导出函数，类型已在上面导出）
  createMCPClient,
} from "@browser-nodes/core";

// 导出类型
export type {
  PortDefinition,
  NodeData,
  NodeResult,
  NodeResultOutput,
  NodeResultData,
  MCPClient,
  MCPRequest,
  MCPResponse,
  MCPClientConfig,
  MCPClientStatus,
  MCPInitializeParams,
  MCPToolCallParams,
  NavigateOptions,
  CloseTabsOptions,
  ScreenshotOptions,
  NetworkCaptureStartOptions,
  NetworkRequestOptions,
  SearchHistoryOptions,
  SearchBookmarksOptions,
  AddBookmarkOptions,
  DeleteBookmarkOptions,
} from "@browser-nodes/core";
