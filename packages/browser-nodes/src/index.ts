/**
 * MCP 节点注册中心
 * 管理所有可用的节点类型
 */

import { BaseNode } from "@workflow-imohuan/node-executor";

// 浏览器管理
import { InitializeMCPNode } from "./nodes/core/InitializeMCPNode.ts";
import { NavigateNode } from "./nodes/browser/NavigateNode.ts";
import { GetWindowsAndTabsNode } from "./nodes/browser/GetWindowsAndTabsNode.ts";
import { CloseTabsNode } from "./nodes/browser/CloseTabsNode.ts";
import { GoBackOrForwardNode } from "./nodes/browser/GoBackOrForwardNode.ts";

// 截图和视觉
import { ScreenshotNode } from "./nodes/screenshot/ScreenshotNode.ts";

// 网络监控
import { NetworkCaptureStartNode } from "./nodes/network/NetworkCaptureStartNode.ts";
import { NetworkCaptureStopNode } from "./nodes/network/NetworkCaptureStopNode.ts";
import { NetworkDebuggerStartNode } from "./nodes/network/NetworkDebuggerStartNode.ts";
import { NetworkDebuggerStopNode } from "./nodes/network/NetworkDebuggerStopNode.ts";
import { NetworkRequestNode } from "./nodes/network/NetworkRequestNode.ts";

// 内容分析
import { SearchTabsContentNode } from "./nodes/content/SearchTabsContentNode.ts";
import { GetWebContentNode } from "./nodes/content/GetWebContentNode.ts";
import { GetInteractiveElementsNode } from "./nodes/content/GetInteractiveElementsNode.ts";

// 交互操作
import { ClickElementNode } from "./nodes/interaction/ClickElementNode.ts";
import { FillOrSelectNode } from "./nodes/interaction/FillOrSelectNode.ts";
import { KeyboardNode } from "./nodes/interaction/KeyboardNode.ts";

// 数据管理
import { SearchHistoryNode } from "./nodes/data/SearchHistoryNode.ts";
import { SearchBookmarksNode } from "./nodes/data/SearchBookmarksNode.ts";
import { AddBookmarkNode } from "./nodes/data/AddBookmarkNode.ts";
import { DeleteBookmarkNode } from "./nodes/data/DeleteBookmarkNode.ts";

// 高级功能
import { InjectScriptNode } from "./nodes/advanced/InjectScriptNode.ts";
import { SendCommandToInjectScriptNode } from "./nodes/advanced/SendCommandToInjectScriptNode.ts";
import { CaptureConsoleNode } from "./nodes/advanced/CaptureConsoleNode.ts";

// 流程控制
import { DelayNode } from "./nodes/flow/DelayNode.ts";

// 数据处理
import { MergeNode } from "./nodes/transform/MergeNode.ts";
import { CodeNode } from "./nodes/transform/CodeNode.ts";

/**
 * 节点注册表
 * 按分类组织所有节点
 */
export const NODE_REGISTRY = {
  /** 浏览器管理 */
  browser: {
    initializeMCP: new InitializeMCPNode(),
    navigate: new NavigateNode(),
    getWindowsAndTabs: new GetWindowsAndTabsNode(),
    closeTabs: new CloseTabsNode(),
    goBackOrForward: new GoBackOrForwardNode(),
  },
  /** 截图和视觉 */
  screenshot: {
    screenshot: new ScreenshotNode(),
  },
  /** 网络监控 */
  network: {
    networkCaptureStart: new NetworkCaptureStartNode(),
    networkCaptureStop: new NetworkCaptureStopNode(),
    networkDebuggerStart: new NetworkDebuggerStartNode(),
    networkDebuggerStop: new NetworkDebuggerStopNode(),
    networkRequest: new NetworkRequestNode(),
  },
  /** 内容分析 */
  content: {
    searchTabsContent: new SearchTabsContentNode(),
    getWebContent: new GetWebContentNode(),
    getInteractiveElements: new GetInteractiveElementsNode(),
  },
  /** 交互操作 */
  interaction: {
    clickElement: new ClickElementNode(),
    fillOrSelect: new FillOrSelectNode(),
    keyboard: new KeyboardNode(),
  },
  /** 数据管理 */
  data: {
    searchHistory: new SearchHistoryNode(),
    searchBookmarks: new SearchBookmarksNode(),
    addBookmark: new AddBookmarkNode(),
    deleteBookmark: new DeleteBookmarkNode(),
  },
  /** 高级功能 */
  advanced: {
    injectScript: new InjectScriptNode(),
    sendCommandToInjectScript: new SendCommandToInjectScriptNode(),
    captureConsole: new CaptureConsoleNode(),
  },
  /** 流程控制 */
  flow: {
    delay: new DelayNode(),
  },
  /** 数据处理 */
  transform: {
    merge: new MergeNode(),
    code: new CodeNode(),
  },
} as const;

/**
 * 节点类型映射
 * 将节点类型字符串映射到节点实例
 */
export const NODE_TYPE_MAP: Record<string, BaseNode> = (() => {
  const map: Record<string, BaseNode> = {};

  Object.values(NODE_REGISTRY).forEach((category) => {
    Object.values(category).forEach((node) => {
      map[node.type] = node;
    });
  });

  return map;
})();

/**
 * 获取节点实例
 * @param type - 节点类型
 * @returns 节点实例
 */
export function getNodeByType(type: string): BaseNode | undefined {
  return NODE_TYPE_MAP[type];
}

/**
 * 获取所有节点列表
 * @returns 节点列表
 */
export function getAllNodes(): BaseNode[] {
  return Object.values(NODE_TYPE_MAP);
}

/**
 * 按分类获取节点
 * @returns 按分类组织的节点列表
 */
export function getNodesByCategory(): Record<string, BaseNode[]> {
  const categories: Record<string, BaseNode[]> = {};

  Object.values(NODE_TYPE_MAP).forEach((node) => {
    const category = node.category;
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category]!.push(node);
  });

  return categories;
}

// 导出核心类
export { BaseNode } from "@workflow-imohuan/node-executor";

/**
 * 导出节点类
 */
export {
  // 浏览器管理
  InitializeMCPNode,
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
};

// 导出 MCP 客户端
export { MCPClient, createMCPClient } from "./mcp-client.ts";

// 导出 MCP 类型
export type {
  MCPRequest,
  MCPResponse,
  MCPError,
  MCPClientConfig,
  MCPClientStatus,
  MCPInitializeParams,
  MCPToolCallParams,
  NavigateOptions,
  CloseTabsOptions,
  ScreenshotOptions,
  NetworkCaptureStartOptions,
  NetworkRequestOptions,
  HttpMethod,
  ContentFormat,
  GetWebContentOptions,
  ClickElementOptions,
  FillOrSelectOptions,
  KeyboardOptions,
  SearchHistoryOptions,
  SearchBookmarksOptions,
  AddBookmarkOptions,
  DeleteBookmarkOptions,
  JavaScriptWorld,
  InjectScriptOptions,
  SendCommandToInjectScriptOptions,
  ConsoleOptions,
  FileUploadOptions,
} from "./mcp-types.ts";
