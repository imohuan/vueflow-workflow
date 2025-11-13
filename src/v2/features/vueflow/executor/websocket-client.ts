/**
 * WebSocket 客户端执行器
 * 连接到服务端 WebSocket 服务器执行工作流
 */

import type {
  Workflow,
  ExecutionOptions,
  ExecutionResult,
  ExecutionState,
  ExecutionErrorEvent,
  ExecutionLifecycleEvent,
} from "workflow-flow-nodes";

import type {
  ExecutionCommand,
  ExecutionEventMessage,
  NodeMetadataItem,
} from "./types";

/**
 * WebSocket 客户端配置
 */
export interface WebSocketClientConfig {
  /** WebSocket 服务器地址 */
  url: string;
  /** 是否自动重连 */
  autoReconnect?: boolean;
  /** 重连间隔（毫秒） */
  reconnectInterval?: number;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 是否启用日志 */
  enableLogging?: boolean;
}

/**
 * WebSocket 客户端执行器
 */
export class WebSocketExecutorClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketClientConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private loggerPrefix = "[WSClient]";
  private initialized = false;

  // 存储待执行的命令队列（连接建立前）
  private pendingCommands: ExecutionCommand[] = [];

  constructor(config: WebSocketClientConfig) {
    this.config = {
      url: config.url,
      autoReconnect: config.autoReconnect ?? true,
      reconnectInterval: config.reconnectInterval ?? 3000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      enableLogging: config.enableLogging ?? true,
    };
  }

  /**
   * 连接到服务器
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.log("正在连接到服务器:", this.config.url);
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          this.log("已连接到服务器");
          this.reconnectAttempts = 0;

          // 发送初始化消息
          this.sendCommand({ type: "INIT" });

          // 处理待执行的命令
          this.flushPendingCommands();

          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          this.error("WebSocket 错误:", error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.log("连接已关闭");
          this.initialized = false;

          if (this.config.autoReconnect) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 尝试重连
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.error("已达到最大重连次数");
      return;
    }

    this.reconnectAttempts++;
    this.log(
      `尝试重连 (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
    );

    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch(() => {
        // 连接失败会自动触发下一次重连
      });
    }, this.config.reconnectInterval);
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 发送命令到服务器
   */
  private sendCommand(command: ExecutionCommand): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // 连接未建立，加入待执行队列
      this.pendingCommands.push(command);
      return;
    }

    this.ws.send(JSON.stringify(command));
  }

  /**
   * 处理待执行的命令
   */
  private flushPendingCommands(): void {
    while (this.pendingCommands.length > 0) {
      const command = this.pendingCommands.shift();
      if (command) {
        this.sendCommand(command);
      }
    }
  }

  /**
   * 处理服务器消息
   */
  private handleMessage(data: string): void {
    try {
      const message: ExecutionEventMessage = JSON.parse(data);

      // 触发对应的消息处理器
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler((message as any).payload);
      }

      // 特殊处理初始化消息
      if (message.type === "INITIALIZED") {
        this.initialized = true;
        this.log("服务端执行器已初始化");
      }
    } catch (error) {
      this.error("解析消息失败:", error);
    }
  }

  /**
   * 监听消息
   */
  on(type: ExecutionEventMessage["type"], handler: (data: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * 移除监听
   */
  off(type: ExecutionEventMessage["type"]): void {
    this.messageHandlers.delete(type);
  }

  /**
   * 执行工作流
   */
  execute(workflow: Workflow, options?: ExecutionOptions): void {
    this.sendCommand({
      type: "EXECUTE",
      payload: { workflow, options },
    });
  }

  /**
   * 暂停执行
   */
  pause(): void {
    this.sendCommand({ type: "PAUSE" });
  }

  /**
   * 恢复执行
   */
  resume(): void {
    this.sendCommand({ type: "RESUME" });
  }

  /**
   * 停止执行
   */
  stop(): void {
    this.sendCommand({ type: "STOP" });
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(workflowId: string, requestId: string): void {
    this.sendCommand({
      type: "GET_CACHE_STATS",
      payload: { workflowId, requestId },
    });
  }

  /**
   * 清空缓存
   */
  clearCache(workflowId: string): void {
    this.sendCommand({
      type: "CLEAR_CACHE",
      payload: { workflowId },
    });
  }

  /**
   * 清空所有缓存
   */
  clearAllCache(): void {
    this.sendCommand({ type: "CLEAR_ALL_CACHE" });
  }

  /**
   * 获取节点列表
   */
  getNodeList(requestId: string): void {
    this.sendCommand({
      type: "GET_NODE_LIST",
      payload: { requestId },
    });
  }

  /**
   * 获取执行历史
   */
  getHistory(requestId: string, workflowId?: string, page?: number, pageSize?: number): void {
    this.sendCommand({
      type: "GET_HISTORY",
      payload: { requestId, workflowId, page, pageSize },
    });
  }

  /**
   * 清空执行历史
   */
  clearHistory(workflowId?: string): void {
    this.sendCommand({
      type: "CLEAR_HISTORY",
      payload: { workflowId },
    });
  }

  /**
   * 删除单个执行历史记录
   */
  deleteHistory(executionId: string): void {
    this.sendCommand({
      type: "DELETE_HISTORY",
      payload: { executionId },
    });
  }

  /**
   * 是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * 日志输出
   */
  private log(...args: any[]): void {
    if (this.config.enableLogging) {
      console.log(this.loggerPrefix, ...args);
    }
  }

  /**
   * 错误日志
   */
  private error(...args: any[]): void {
    if (this.config.enableLogging) {
      console.error(this.loggerPrefix, ...args);
    }
  }
}
