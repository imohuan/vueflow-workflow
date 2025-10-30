/**
 * MCP 协议相关类型定义
 */

/** MCP JSON-RPC 请求体 */
export interface MCPRequest {
  /** JSON-RPC 版本 */
  jsonrpc: "2.0";
  /** 请求 ID */
  id: number;
  /** 方法名 */
  method: string;
  /** 参数 */
  params?: Record<string, any>;
}

/** MCP JSON-RPC 响应体 */
export interface MCPResponse<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  result?: T;
  /** 错误信息 */
  error?: MCPError;
}

/** MCP 错误对象 */
export interface MCPError {
  /** 错误代码 */
  code: number;
  /** 错误消息 */
  message: string;
  /** 额外数据 */
  data?: any;
}

/** MCP 客户端配置 */
export interface MCPClientConfig {
  /** API 端点 URL */
  apiUrl?: string;
  /** 协议版本 */
  protocolVersion?: string;
  /** 客户端信息 */
  clientInfo?: {
    /** 客户端名称 */
    name: string;
    /** 客户端版本 */
    version: string;
  };
  /** 是否启用日志 */
  enableLog?: boolean;
}

/** MCP 客户端状态 */
export interface MCPClientStatus {
  /** Session ID */
  sessionId: string | null;
  /** 是否已初始化 */
  isInitialized: boolean;
  /** 请求计数 */
  requestCount: number;
  /** API URL */
  apiUrl: string;
}

/** MCP 初始化参数 */
export interface MCPInitializeParams {
  /** 协议版本 */
  protocolVersion: string;
  /** 能力声明 */
  capabilities: Record<string, any>;
  /** 客户端信息 */
  clientInfo: {
    name: string;
    version: string;
  };
}

/** MCP 工具调用参数 */
export interface MCPToolCallParams {
  /** 工具名称 */
  name: string;
  /** 工具参数 */
  arguments: Record<string, any>;
}

// ==================== 浏览器管理相关类型 ====================

/** 导航选项 */
export interface NavigateOptions {
  /** 是否在新窗口中打开（默认：false） */
  newWindow?: boolean;
  /** 视口宽度（像素，默认：1280） */
  width?: number;
  /** 视口高度（像素，默认：720） */
  height?: number;
}

/** 关闭标签页选项 */
export interface CloseTabsOptions {
  /** 要关闭的标签页 ID 数组 */
  tabIds?: number[];
  /** 要关闭匹配此 URL 的标签页 */
  url?: string;
}

// ==================== 截图和视觉相关类型 ====================

/** 截图选项 */
export interface ScreenshotOptions {
  /** 截图文件名 */
  name?: string;
  /** 元素截图的 CSS 选择器 */
  selector?: string;
  /** 宽度（像素，默认：800） */
  width?: number;
  /** 高度（像素，默认：600） */
  height?: number;
  /** 返回 base64 数据（默认：false） */
  storeBase64?: boolean;
  /** 捕获整个页面（默认：true） */
  fullPage?: boolean;
}

// ==================== 网络监控相关类型 ====================

/** 网络捕获开始选项 */
export interface NetworkCaptureStartOptions {
  /** 要导航并捕获的 URL */
  url?: string;
  /** 最大捕获时间（毫秒，默认：30000） */
  maxCaptureTime?: number;
  /** 无活动后停止时间（毫秒，默认：3000） */
  inactivityTimeout?: number;
  /** 包含静态资源（默认：false） */
  includeStatic?: boolean;
}

/** HTTP 请求方法 */
export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS";

/** 网络请求选项 */
export interface NetworkRequestOptions {
  /** HTTP 方法（默认："GET"） */
  method?: HttpMethod | string;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求体 */
  body?: string;
}

// ==================== 内容分析相关类型 ====================

/** 内容格式 */
export type ContentFormat = "html" | "text";

/** 获取网页内容选项 */
export interface GetWebContentOptions {
  /** 内容格式："html" 或 "text"（默认："text"） */
  format?: ContentFormat;
  /** 特定元素的 CSS 选择器 */
  selector?: string;
  /** 特定标签页 ID（默认：活动标签页） */
  tabId?: number;
}

// ==================== 交互操作相关类型 ====================

/** 点击元素选项 */
export interface ClickElementOptions {
  /** 目标元素的 CSS 选择器 */
  selector: string;
  /** 特定标签页 ID（默认：活动标签页） */
  tabId?: number;
}

/** 填充表单选项 */
export interface FillOrSelectOptions {
  /** 目标元素的 CSS 选择器 */
  selector: string;
  /** 要填充或选择的值 */
  value: string;
  /** 特定标签页 ID（默认：活动标签页） */
  tabId?: number;
}

/** 键盘输入选项 */
export interface KeyboardOptions {
  /** 按键组合（如："Ctrl+C"、"Enter"） */
  keys: string;
  /** 目标元素选择器 */
  selector?: string;
  /** 按键间延迟（毫秒，默认：0） */
  delay?: number;
}

// ==================== 数据管理相关类型 ====================

/** 搜索历史记录选项 */
export interface SearchHistoryOptions {
  /** 在 URL/标题中搜索文本 */
  text?: string;
  /** 开始日期（ISO 格式） */
  startTime?: string;
  /** 结束日期（ISO 格式） */
  endTime?: string;
  /** 最大结果数（默认：100） */
  maxResults?: number;
  /** 排除当前标签页（默认：true） */
  excludeCurrentTabs?: boolean;
}

/** 搜索书签选项 */
export interface SearchBookmarksOptions {
  /** 搜索关键词 */
  query?: string;
  /** 最大结果数（默认：100） */
  maxResults?: number;
  /** 在特定文件夹内搜索 */
  folderPath?: string;
}

/** 添加书签选项 */
export interface AddBookmarkOptions {
  /** 要收藏的 URL（默认：当前标签页） */
  url?: string;
  /** 书签标题（默认：页面标题） */
  title?: string;
  /** 父文件夹 ID 或路径 */
  parentId?: string;
  /** 如果不存在则创建文件夹（默认：false） */
  createFolder?: boolean;
}

/** 删除书签选项 */
export interface DeleteBookmarkOptions {
  /** 要删除的书签 ID */
  bookmarkId?: string;
  /** 要查找并删除的 URL */
  url?: string;
}

// ==================== 高级功能相关类型 ====================

/** JavaScript 执行环境 */
export type JavaScriptWorld = "ISOLATED" | "MAIN";

/** 注入脚本选项 */
export interface InjectScriptOptions {
  /** 如果指定 URL，则将脚本注入到对应的网页中 */
  url?: string;
  /** JavaScript 执行环境（必须是 ISOLATED 或 MAIN） */
  type: JavaScriptWorld;
  /** 要注入的脚本内容 */
  jsScript: string;
}

/** 发送命令到注入脚本选项 */
export interface SendCommandToInjectScriptOptions {
  /** 之前注入脚本的标签页 ID（如果不提供，使用当前活动标签页） */
  tabId?: number;
  /** 注入的脚本监听的事件名称 */
  eventName: string;
  /** 传递给事件的数据，必须是 JSON 字符串 */
  payload?: string;
}

/** 控制台捕获选项 */
export interface ConsoleOptions {
  /** 要导航并捕获控制台的 URL（如果不提供，使用当前活动标签页） */
  url?: string;
  /** 是否包含未捕获的异常（默认：true） */
  includeExceptions?: boolean;
  /** 最大捕获的控制台消息数量（默认：100） */
  maxMessages?: number;
}

/** 文件上传选项 */
export interface FileUploadOptions {
  /** 文件输入元素的 CSS 选择器（input[type="file"]） */
  selector: string;
  /** 要上传的本地文件路径 */
  filePath?: string;
  /** 要从中下载文件的 URL */
  fileUrl?: string;
  /** Base64 编码的文件数据 */
  base64Data?: string;
  /** 使用 base64 或 URL 时的可选文件名（默认："uploaded-file"） */
  fileName?: string;
  /** 输入是否接受多个文件（默认：false） */
  multiple?: boolean;
}
