/**
 * 节点注册表类
 * 管理所有浏览器节点实例的加载和访问
 */

import { BaseNode, NodeRegistry } from "workflow-node-executor";

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

// 调试工具
import { EchoNode } from "./nodes/debug/EchoNode.ts";
import { ImagePreviewNode } from "./nodes/debug/ImagePreviewNode.ts";

/**
 * 节点注册表
 * 按分类组织所有节点（内部使用）
 */
const NODE_REGISTRY = {
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
  /** 调试工具 */
  debug: {
    echo: new EchoNode(),
    imagePreview: new ImagePreviewNode(),
  },
} as const;

/**
 * 构建节点类型映射表
 */
function buildNodeTypeMap(): Record<string, BaseNode> {
  const map: Record<string, BaseNode> = {};
  Object.values(NODE_REGISTRY).forEach((category) => {
    Object.values(category).forEach((node) => {
      map[node.type] = node;
    });
  });
  return map;
}

/**
 * 浏览器节点注册表类
 * 继承自 NodeRegistry，提供浏览器节点的专用注册表
 */
export class BrowserNodeRegistry extends NodeRegistry {
  /**
   * 创建浏览器节点注册表实例
   * @param nodes - 可选的节点映射表，如果不提供则使用默认的 NODE_REGISTRY 构建
   */
  constructor() {
    super(buildNodeTypeMap());
  }
}
