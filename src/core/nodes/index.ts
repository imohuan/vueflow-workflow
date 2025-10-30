/**
 * MCP 节点注册中心
 * 管理所有可用的节点类型
 */

import { BaseNode } from "./BaseNode";

// 浏览器管理
import { NavigateNode } from "./browser/NavigateNode";
import { GetWindowsAndTabsNode } from "./browser/GetWindowsAndTabsNode";
import { CloseTabsNode } from "./browser/CloseTabsNode";
import { GoBackOrForwardNode } from "./browser/GoBackOrForwardNode";

// 截图和视觉
import { ScreenshotNode } from "./screenshot/ScreenshotNode";

// 网络监控
import { NetworkCaptureStartNode } from "./network/NetworkCaptureStartNode";
import { NetworkCaptureStopNode } from "./network/NetworkCaptureStopNode";
import { NetworkDebuggerStartNode } from "./network/NetworkDebuggerStartNode";
import { NetworkDebuggerStopNode } from "./network/NetworkDebuggerStopNode";
import { NetworkRequestNode } from "./network/NetworkRequestNode";

// 内容分析
import { SearchTabsContentNode } from "./content/SearchTabsContentNode";
import { GetWebContentNode } from "./content/GetWebContentNode";
import { GetInteractiveElementsNode } from "./content/GetInteractiveElementsNode";

// 交互操作
import { ClickElementNode } from "./interaction/ClickElementNode";
import { FillOrSelectNode } from "./interaction/FillOrSelectNode";
import { KeyboardNode } from "./interaction/KeyboardNode";

// 数据管理
import { SearchHistoryNode } from "./data/SearchHistoryNode";
import { SearchBookmarksNode } from "./data/SearchBookmarksNode";
import { AddBookmarkNode } from "./data/AddBookmarkNode";
import { DeleteBookmarkNode } from "./data/DeleteBookmarkNode";

// 高级功能
import { InjectScriptNode } from "./advanced/InjectScriptNode";
import { SendCommandToInjectScriptNode } from "./advanced/SendCommandToInjectScriptNode";
import { CaptureConsoleNode } from "./advanced/CaptureConsoleNode";

// 流程控制
import { ForNode } from "./flow/ForNode";
import { IfNode } from "./flow/IfNode";

// 数据处理
import { MergeNode } from "./transform/MergeNode";
import { CodeNode } from "./transform/CodeNode";

/**
 * 节点注册表
 * 按分类组织所有节点
 */
export const NODE_REGISTRY = {
  /** 浏览器管理 */
  browser: {
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
    for: new ForNode(),
    if: new IfNode(),
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

/**
 * 导出节点类
 */
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
  ForNode,
  IfNode,
  // 数据处理
  MergeNode,
  CodeNode,
};
