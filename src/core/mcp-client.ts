import type {
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
  GetWebContentOptions,
  SearchHistoryOptions,
  SearchBookmarksOptions,
  AddBookmarkOptions,
  DeleteBookmarkOptions,
} from "@/typings/mcp";

/**
 * MCP (Model Context Protocol) 客户端
 * 用于与 MCP 服务端进行通信，支持工具调用、会话管理等功能
 *
 * @example
 * ```ts
 * const client = new MCPClient({ apiUrl: '/api/mcp' })
 * await client.initialize()
 * const result = await client.callTool('chrome_navigate', { url: 'https://www.baidu.com' })
 * ```
 */
export class MCPClient {
  /** API 端点 URL */
  private apiUrl: string;

  /** 请求 ID 计数器 */
  private requestId: number = 1;

  /** MCP Session ID */
  private sessionId: string | null = null;

  /** 是否已初始化 */
  private isInitialized: boolean = false;

  /** 协议版本 */
  private protocolVersion: string;

  /** 客户端信息 */
  private clientInfo: { name: string; version: string };

  /** 是否启用日志 */
  private enableLog: boolean;

  /**
   * 创建 MCP 客户端实例
   * @param config - 客户端配置
   */
  constructor(config: MCPClientConfig = {}) {
    this.apiUrl = config.apiUrl || "/api/mcp";
    this.protocolVersion = config.protocolVersion || "2024-11-05";
    this.clientInfo = config.clientInfo || {
      name: "mcp-client",
      version: "1.0.0",
    };
    this.enableLog = config.enableLog ?? true;
  }

  /**
   * 发送 MCP 请求
   * @param method - 方法名
   * @param params - 参数
   * @returns 响应结果
   */
  async request<T = any>(
    method: string,
    params?: Record<string, any>
  ): Promise<MCPResponse<T>> {
    const body: MCPRequest = {
      jsonrpc: "2.0",
      id: this.requestId++,
      method,
      params,
    };

    this.log(
      "📤 发送请求:",
      method,
      params ? `\n   参数: ${JSON.stringify(params, null, 2)}` : ""
    );

    try {
      // 构建请求头
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "Cache-Control": "no-cache",
      };

      // 如果有 session ID，添加到请求头
      if (this.sessionId) {
        headers["mcp-session-id"] = this.sessionId;
      }

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      // 保存 session ID（如果服务器返回了）
      const mcpSessionId = response.headers.get("mcp-session-id");
      if (mcpSessionId && !this.sessionId) {
        this.sessionId = mcpSessionId;
        this.log("💾 保存 Session ID:", mcpSessionId);
      }

      return await this.parseResponse<T>(response);
    } catch (error: any) {
      this.logError("❌ 网络错误:", error.message);
      return {
        success: false,
        error: {
          code: -1,
          message: error.message,
        },
      };
    }
  }

  /**
   * 初始化 MCP 会话
   * @returns 是否初始化成功
   */
  async initialize(): Promise<boolean> {
    this.log("🚀 ========== 初始化 MCP 会话 ==========");

    const params: MCPInitializeParams = {
      protocolVersion: this.protocolVersion,
      capabilities: {},
      clientInfo: this.clientInfo,
    };

    const result = await this.request("initialize", params);

    if (result.success) {
      // 发送 initialized 通知
      const notifyHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      };

      // 添加 session ID
      if (this.sessionId) {
        notifyHeaders["mcp-session-id"] = this.sessionId;
      }

      await fetch(this.apiUrl, {
        method: "POST",
        headers: notifyHeaders,
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        }),
      });

      this.isInitialized = true;
      this.log("✅ 会话初始化成功\n");
      return true;
    } else {
      this.logError("❌ 会话初始化失败:", result.error?.message, "\n");
      return false;
    }
  }

  /**
   * 调用 MCP 工具
   * @param toolName - 工具名称
   * @param args - 工具参数
   * @returns 工具执行结果
   */
  async callTool<T = any>(
    toolName: string,
    args: Record<string, any> = {}
  ): Promise<MCPResponse<T>> {
    // 如果未初始化，先初始化
    if (!this.isInitialized) {
      this.log("⚠️  未初始化，先初始化...");
      const initialized = await this.initialize();
      if (!initialized) {
        return {
          success: false,
          error: {
            code: -1,
            message: "初始化失败",
          },
        };
      }
      // 等待 1 秒确保初始化完成
      await this.sleep(1000);
    }

    this.log(`🔧 ========== 调用工具: ${toolName} ==========`);

    const params: MCPToolCallParams = {
      name: toolName,
      arguments: args,
    };

    return await this.request<T>("tools/call", params);
  }

  /**
   * 获取可用工具列表
   * @returns 工具列表
   */
  async listTools(): Promise<MCPResponse<any>> {
    // 如果未初始化，先初始化
    if (!this.isInitialized) {
      this.log("⚠️  未初始化，先初始化...");
      const initialized = await this.initialize();
      if (!initialized) {
        return {
          success: false,
          error: {
            code: -1,
            message: "初始化失败",
          },
        };
      }
    }

    this.log("📋 ========== 获取工具列表 ==========");
    return await this.request("tools/list");
  }

  // ==================== 浏览器管理 ====================

  /**
   * 获取所有窗口和标签页
   * @returns 窗口和标签页信息
   */
  async getWindowsAndTabs(): Promise<MCPResponse<any>> {
    return await this.callTool("get_windows_and_tabs");
  }

  /**
   * 导航到指定 URL
   * @param url - 目标 URL
   * @param options - 导航选项
   */
  async navigate(
    url: string,
    options?: NavigateOptions
  ): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_navigate", {
      url,
      ...options,
    });
  }

  /**
   * 关闭指定的标签页或窗口
   * @param options - 关闭选项
   */
  async closeTabs(options?: CloseTabsOptions): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_close_tabs", options);
  }

  /**
   * 浏览器历史导航（前进/后退）
   * @param isForward - 是否前进（true: 前进, false: 后退）
   */
  async goBackOrForward(isForward: boolean = false): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_go_back_or_forward", {
      isForward,
    });
  }

  // ==================== 截图和视觉 ====================

  /**
   * 截图
   * @param options - 截图选项
   */
  async screenshot(options?: ScreenshotOptions): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_screenshot", options);
  }

  // ==================== 网络监控 ====================

  /**
   * 开始网络捕获
   * @param options - 捕获选项
   */
  async networkCaptureStart(
    options?: NetworkCaptureStartOptions
  ): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_network_capture_start", options);
  }

  /**
   * 停止网络捕获
   * @returns 捕获的网络数据
   */
  async networkCaptureStop(): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_network_capture_stop");
  }

  /**
   * 开始调试器网络捕获（包含响应体）
   * @param url - 要导航的 URL（可选）
   */
  async networkDebuggerStart(url?: string): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_network_debugger_start", {
      ...(url && { url }),
    });
  }

  /**
   * 停止调试器网络捕获
   * @returns 捕获的网络数据（含响应体）
   */
  async networkDebuggerStop(): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_network_debugger_stop");
  }

  /**
   * 发送自定义 HTTP 请求
   * @param url - 请求 URL
   * @param options - 请求选项
   */
  async networkRequest(
    url: string,
    options?: NetworkRequestOptions
  ): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_network_request", {
      url,
      ...options,
    });
  }

  // ==================== 内容分析 ====================

  /**
   * 跨标签页语义搜索
   * @param query - 搜索查询
   */
  async searchTabsContent(query: string): Promise<MCPResponse<any>> {
    return await this.callTool("search_tabs_content", { query });
  }

  /**
   * 获取网页内容
   * @param options - 获取选项
   */
  async getWebContent(
    options?: GetWebContentOptions
  ): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_get_web_content", options);
  }

  /**
   * 获取可交互元素
   * @param options - 获取选项
   * @param options.textQuery - 文本搜索查询（模糊搜索）
   * @param options.selector - CSS 选择器过滤
   * @param options.includeCoordinates - 是否包含元素坐标（默认: true）
   */
  async getInteractiveElements(options?: {
    textQuery?: string;
    selector?: string;
    includeCoordinates?: boolean;
  }): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_get_interactive_elements", options);
  }

  // ==================== 交互操作 ====================

  /**
   * 点击元素或坐标
   * @param options - 点击选项
   * @param options.selector - CSS 选择器（与 coordinates 二选一）
   * @param options.coordinates - 坐标位置（与 selector 二选一）
   * @param options.waitForNavigation - 是否等待页面导航（默认: false）
   * @param options.timeout - 超时时间（默认: 5000ms）
   */
  async clickElement(options: {
    selector?: string;
    coordinates?: { x: number; y: number };
    waitForNavigation?: boolean;
    timeout?: number;
  }): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_click_element", options);
  }

  /**
   * 填充表单或选择选项
   * @param selector - CSS 选择器
   * @param value - 要填充的值
   */
  async fillOrSelect(
    selector: string,
    value: string
  ): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_fill_or_select", {
      selector,
      value,
    });
  }

  /**
   * 模拟键盘输入
   * @param keys - 按键组合（如："Ctrl+C"、"Enter"）
   * @param options - 键盘选项
   * @param options.selector - CSS 选择器，指定发送键盘事件的元素
   * @param options.delay - 按键序列间延迟（毫秒）
   */
  async keyboard(
    keys: string,
    options?: { selector?: string; delay?: number }
  ): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_keyboard", {
      keys,
      ...options,
    });
  }

  // ==================== 数据管理 ====================

  /**
   * 搜索浏览器历史记录
   * @param options - 搜索选项
   */
  async searchHistory(
    options?: SearchHistoryOptions
  ): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_history", options);
  }

  /**
   * 搜索书签
   * @param options - 搜索选项
   */
  async searchBookmarks(
    options?: SearchBookmarksOptions
  ): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_bookmark_search", options);
  }

  /**
   * 添加书签
   * @param options - 书签选项
   */
  async addBookmark(options?: AddBookmarkOptions): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_bookmark_add", options);
  }

  /**
   * 删除书签
   * @param options - 删除选项
   */
  async deleteBookmark(
    options?: DeleteBookmarkOptions
  ): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_bookmark_delete", options);
  }

  // ==================== 高级功能 ====================

  /**
   * 注入脚本到网页
   * @param jsScript - 要注入的 JavaScript 代码
   * @param type - 脚本执行环境（"ISOLATED" 或 "MAIN"）
   * @param url - 指定注入的网页 URL（可选，默认当前活动标签）
   */
  async injectScript(
    jsScript: string,
    type: "ISOLATED" | "MAIN",
    url?: string
  ): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_inject_script", {
      jsScript,
      type,
      ...(url && { url }),
    });
  }

  /**
   * 向注入的脚本发送命令
   * @param eventName - 事件名称
   * @param payload - 传递给事件的数据（必须是 JSON 字符串）
   * @param tabId - 标签页 ID（可选，默认当前活动标签）
   */
  async sendCommandToInjectScript(
    eventName: string,
    payload?: string,
    tabId?: number
  ): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_send_command_to_inject_script", {
      eventName,
      ...(payload && { payload }),
      ...(tabId && { tabId }),
    });
  }

  /**
   * 捕获浏览器控制台输出
   * @param options - 控制台捕获选项
   * @param options.url - 要导航到的 URL（可选）
   * @param options.includeExceptions - 是否包含异常（默认: true）
   * @param options.maxMessages - 最大消息数量（默认: 100）
   */
  async captureConsole(options?: {
    url?: string;
    includeExceptions?: boolean;
    maxMessages?: number;
  }): Promise<MCPResponse<any>> {
    return await this.callTool("chrome_console", options);
  }

  // ==================== 工具方法 ====================

  /**
   * 重置会话
   */
  reset(): void {
    this.sessionId = null;
    this.isInitialized = false;
    this.requestId = 1;
    this.log("🔄 会话已重置");
  }

  /**
   * 获取客户端状态
   * @returns 客户端状态
   */
  getStatus(): MCPClientStatus {
    return {
      sessionId: this.sessionId,
      isInitialized: this.isInitialized,
      requestCount: this.requestId,
      apiUrl: this.apiUrl,
    };
  }

  /**
   * 检查客户端是否已准备好
   * @returns 是否已准备好
   */
  isReady(): boolean {
    return this.isInitialized && this.sessionId !== null;
  }

  /**
   * 解析响应
   * @param response - Fetch Response 对象
   * @returns 解析后的响应
   */
  private async parseResponse<T>(response: Response): Promise<MCPResponse<T>> {
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("text/event-stream")) {
      // 处理 SSE 响应
      const text = await response.text();
      return this.parseSSEResponse<T>(text);
    } else {
      // 处理普通 JSON 响应
      const data = await response.json();

      if (data.error) {
        this.logError("❌ 错误:", data.error);
        return { success: false, error: data.error };
      } else {
        this.log("✅ 成功:", data.result);
        // 解析 MCP 标准响应格式
        const parsedResult = this.parseMCPContent(data.result);
        return { success: true, result: parsedResult };
      }
    }
  }

  /**
   * 解析 SSE 格式的响应
   * @param text - SSE 文本
   * @returns 解析后的响应
   */
  private parseSSEResponse<T>(text: string): MCPResponse<T> {
    this.log("📥 原始响应:", text);

    // 解析 SSE 格式: event: message\ndata: {...}\n\n
    const lines = text.split("\n");
    let jsonData = "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        jsonData = line.substring(6); // 去掉 "data: " 前缀
        break;
      }
    }

    if (!jsonData) {
      this.logError("❌ 无法从 SSE 响应中提取数据");
      return {
        success: false,
        error: {
          code: -1,
          message: "No data in SSE response",
        },
      };
    }

    const data = JSON.parse(jsonData);

    if (data.error) {
      this.logError("❌ 错误:", data.error);
      return { success: false, error: data.error };
    } else {
      this.log("✅ 成功:", data.result);
      // 解析 MCP 标准响应格式
      const parsedResult = this.parseMCPContent(data.result);
      return { success: true, result: parsedResult };
    }
  }

  /**
   * 解析 MCP 标准 content 格式
   * @param result - MCP 响应结果
   * @returns 解析后的数据
   */
  private parseMCPContent(result: any): any {
    // 递归处理对象中的所有 { type: "text", text: "..." } 结构
    return this.deepParseTextContent(result);
  }

  /**
   * 深度解析所有 { type: "text", text: "..." } 结构
   * @param data - 要解析的数据
   * @returns 解析后的数据
   */
  private deepParseTextContent(data: any): any {
    // null 或 undefined 直接返回
    if (data == null) {
      return data;
    }

    // 处理 { type: "text", text: "..." } 结构
    if (
      typeof data === "object" &&
      !Array.isArray(data) &&
      data.type === "text" &&
      typeof data.text === "string"
    ) {
      try {
        // 尝试解析 text 字段中的 JSON
        const parsed = JSON.parse(data.text);
        // 递归处理解析后的数据
        return this.deepParseTextContent(parsed);
      } catch {
        // 如果不是 JSON，返回原始文本
        return data.text;
      }
    }

    // 处理带 content 数组的标准 MCP 响应格式
    if (
      typeof data === "object" &&
      !Array.isArray(data) &&
      Array.isArray(data.content) &&
      data.content.length > 0
    ) {
      const firstItem = data.content[0];

      // 如果第一项是 text 类型，尝试解析
      if (
        firstItem &&
        firstItem.type === "text" &&
        typeof firstItem.text === "string"
      ) {
        try {
          const parsed = JSON.parse(firstItem.text);

          // 如果解析成功且有 data 字段，优先返回 data
          if (parsed && typeof parsed === "object" && parsed.data) {
            return this.deepParseTextContent(parsed.data);
          }

          // 否则返回解析后的整个对象
          return this.deepParseTextContent(parsed);
        } catch {
          // 如果不是 JSON，返回文本
          return firstItem.text;
        }
      }
    }

    // 处理数组：递归处理每一项
    if (Array.isArray(data)) {
      return data.map((item) => this.deepParseTextContent(item));
    }

    // 处理普通对象：递归处理每个属性
    if (typeof data === "object") {
      const result: Record<string, any> = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          result[key] = this.deepParseTextContent(data[key]);
        }
      }
      return result;
    }

    // 基本类型直接返回
    return data;
  }

  /**
   * 延迟函数
   * @param ms - 延迟毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 日志输出
   */
  private log(...args: any[]): void {
    if (this.enableLog) {
      console.log(...args);
    }
  }

  /**
   * 错误日志输出
   */
  private logError(...args: any[]): void {
    if (this.enableLog) {
      console.error(...args);
    }
  }
}

/**
 * 创建 MCP 客户端实例（工厂函数）
 * @param config - 客户端配置
 * @returns MCP 客户端实例
 */
export function createMCPClient(config?: MCPClientConfig): MCPClient {
  return new MCPClient(config);
}
