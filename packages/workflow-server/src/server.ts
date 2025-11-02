/**
 * WebSocket 工作流服务器
 * 提供工作流执行服务，替代 Web Worker
 */

import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import { NodeRegistryManager } from "./nodeRegistry.js";
import { WorkflowExecutor } from "./executor.js";
import type {
  ServerConfig,
  ClientMessage,
  ServerMessage,
  ClientConnection,
} from "./types.js";

const DEFAULT_CONFIG: Required<ServerConfig> = {
  port: 3001,
  host: "localhost", // Windows 上 localhost 更可靠
  heartbeatInterval: 30000, // 30秒
  maxConnections: 100,
};

export class WorkflowServer {
  private wss: WebSocketServer | null = null;
  private config: Required<ServerConfig>;
  private nodeRegistry: NodeRegistryManager;
  private executor: WorkflowExecutor;
  private clients: Map<string, ClientConnection>;
  private serverId: string;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.nodeRegistry = new NodeRegistryManager();
    this.executor = new WorkflowExecutor(this.nodeRegistry);
    this.clients = new Map();
    this.serverId = `server_${randomUUID()}`;
  }

  /**
   * 启动服务器
   */
  start(): void {
    console.log("========================================");
    console.log("🚀 工作流 WebSocket 服务器");
    console.log("========================================");

    // 先初始化节点注册表
    try {
      this.nodeRegistry.initialize();
    } catch (error) {
      console.error("❌ 节点注册表初始化失败:", error);
      throw error;
    }

    // 创建 WebSocket 服务器
    this.wss = new WebSocketServer({
      port: this.config.port,
      host: this.config.host,
    });

    // 设置连接处理
    this.wss.on("connection", this.handleConnection.bind(this));

    // 设置错误处理
    this.wss.on("error", this.handleServerError.bind(this));

    // 监听服务器就绪事件
    this.wss.on("listening", () => {
      console.log(`✅ WebSocket 服务器正在监听端口 ${this.config.port}`);
    });

    // 启动心跳检测
    this.startHeartbeat();

    console.log(`✅ 服务器已启动`);
    console.log(`   地址: ws://${this.config.host}:${this.config.port}`);
    console.log(`   节点数: ${this.nodeRegistry.getNodeCount()}`);
    console.log(`   最大连接数: ${this.config.maxConnections}`);
    console.log("========================================\n");
  }

  /**
   * 停止服务器
   */
  stop(): void {
    console.log("\n正在停止服务器...");

    // 停止心跳
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // 关闭所有客户端连接
    this.clients.forEach((client) => {
      client.ws.close(1000, "Server shutting down");
    });
    this.clients.clear();

    // 关闭服务器
    if (this.wss) {
      this.wss.close(() => {
        console.log("✅ 服务器已停止");
      });
    }
  }

  /**
   * 处理客户端连接
   */
  private handleConnection(ws: WebSocket): void {
    const clientId = `client_${randomUUID()}`;

    // 检查连接数限制
    if (this.clients.size >= this.config.maxConnections) {
      console.warn(`❌ 拒绝连接 ${clientId}: 已达到最大连接数`);
      ws.close(1008, "Max connections reached");
      return;
    }

    const client: ClientConnection = {
      id: clientId,
      ws,
      connectedAt: Date.now(),
      lastPingAt: Date.now(),
    };

    this.clients.set(clientId, client);
    console.log(
      `✅ 客户端已连接: ${clientId} (总连接数: ${this.clients.size})`
    );

    // 监听消息
    ws.on("message", (data: Buffer) => {
      this.handleMessage(clientId, data);
    });

    // 监听关闭
    ws.on("close", (code: number, reason: Buffer) => {
      this.handleDisconnection(clientId, code, reason.toString());
    });

    // 监听错误
    ws.on("error", (error: Error) => {
      this.handleClientError(clientId, error);
    });
  }

  /**
   * 处理客户端消息
   */
  private handleMessage(clientId: string, data: Buffer): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message: ClientMessage = JSON.parse(data.toString());

      switch (message.type) {
        case "INIT":
          this.handleInit(client);
          break;

        case "EXECUTE_WORKFLOW":
          this.handleExecuteWorkflow(client, message.payload);
          break;

        case "PING":
          this.handlePing(client, message.payload);
          break;

        default:
          console.warn(`[${clientId}] 未知消息类型:`, message);
      }
    } catch (error) {
      console.error(`[${clientId}] 解析消息失败:`, error);
      this.sendMessage(client, {
        type: "ERROR",
        payload: {
          message: "Invalid message format",
          code: "INVALID_MESSAGE",
        },
      });
    }
  }

  /**
   * 处理初始化请求
   */
  private handleInit(client: ClientConnection): void {
    console.log(`[${client.id}] 处理初始化请求`);

    const nodeMetadata = this.nodeRegistry.extractAllNodeMetadata();

    const response: ServerMessage = {
      type: "INITIALIZED",
      payload: {
        nodeMetadata,
        serverId: this.serverId,
        timestamp: Date.now(),
      },
    };

    this.sendMessage(client, response);
    console.log(`[${client.id}] ✅ 已发送 ${nodeMetadata.length} 个节点元数据`);
  }

  /**
   * 处理工作流执行请求
   */
  private async handleExecuteWorkflow(
    client: ClientConnection,
    payload: {
      executionId: string;
      workflowId: string;
      nodes: any[];
      edges: any[];
    }
  ): Promise<void> {
    console.log(
      `[${client.id}] 执行工作流: ${payload.workflowId} (ID: ${payload.executionId})`
    );

    const { executionId, workflowId, nodes, edges } = payload;

    // 异步执行工作流（不阻塞其他消息处理）
    this.executor
      .execute(executionId, workflowId, nodes, edges, (message) => {
        this.sendMessage(client, message);
      })
      .catch((error) => {
        console.error(`[${client.id}] 工作流执行异常:`, error);
      });
  }

  /**
   * 处理心跳 PING
   */
  private handlePing(
    client: ClientConnection,
    payload: { timestamp: number }
  ): void {
    client.lastPingAt = Date.now();

    const response: ServerMessage = {
      type: "PONG",
      payload: {
        timestamp: payload.timestamp,
        serverTimestamp: Date.now(),
      },
    };

    this.sendMessage(client, response);
  }

  /**
   * 发送消息给客户端
   */
  private sendMessage(client: ClientConnection, message: ServerMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  /**
   * 处理客户端断开连接
   */
  private handleDisconnection(
    clientId: string,
    code: number,
    reason: string
  ): void {
    this.clients.delete(clientId);
    console.log(
      `🔌 客户端已断开: ${clientId} (code: ${code}, reason: ${
        reason || "none"
      }) (剩余: ${this.clients.size})`
    );
  }

  /**
   * 处理客户端错误
   */
  private handleClientError(clientId: string, error: Error): void {
    console.error(`[${clientId}] 客户端错误:`, error);
  }

  /**
   * 处理服务器错误
   */
  private handleServerError(error: Error): void {
    console.error("❌ 服务器错误:", error);
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.heartbeatInterval * 2; // 2倍心跳间隔为超时

      this.clients.forEach((client) => {
        if (now - client.lastPingAt > timeout) {
          console.warn(`⚠️  客户端 ${client.id} 心跳超时，断开连接`);
          client.ws.close(1000, "Heartbeat timeout");
          this.clients.delete(client.id);
        }
      });
    }, this.config.heartbeatInterval);
  }

  /**
   * 获取服务器状态
   */
  getStatus() {
    return {
      serverId: this.serverId,
      isRunning: this.wss !== null,
      clientCount: this.clients.size,
      nodeCount: this.nodeRegistry.getNodeCount(),
      config: this.config,
    };
  }
}
