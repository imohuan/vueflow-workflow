/**
 * 工作流服务器客户端 Composable
 *
 * 通过 WebSocket 连接到 workflow-server
 * 替代 useWorkflowWorker（Worker 版本）
 *
 * 使用方式：
 * ```typescript
 * const client = useWorkflowServerClient('ws://localhost:3001');
 * await client.waitForReady();
 * client.executeWorkflow(executionId, workflowId, nodes, edges);
 * ```
 */

import {
  ref,
  computed,
  inject,
  onUnmounted,
  type Ref,
  type ComputedRef,
} from "vue";
import type { Emitter } from "mitt";
import type { WorkflowEvents } from "@/typings/workflowExecution";
import type { WorkflowNode, WorkflowEdge } from "workflow-node-executor";
import { useNotifyStore } from "@/stores/notify";

/** 客户端状态 */
type ClientStatus = "disconnected" | "connecting" | "ready" | "error";

/** 节点元数据 */
export interface NodeMetadata {
  type: string;
  label: string;
  description: string;
  category: string;
  inputs: any[];
  outputs: any[];
  defaultConfig: Record<string, any>;
}

/** 客户端消息 */
type ClientMessage =
  | { type: "INIT" }
  | {
      type: "EXECUTE_WORKFLOW";
      payload: {
        executionId: string;
        workflowId: string;
        nodes: WorkflowNode[];
        edges: WorkflowEdge[];
      };
    }
  | { type: "PING"; payload: { timestamp: number } };

/** 服务器消息 */
type ServerMessage =
  | {
      type: "INITIALIZED";
      payload: {
        nodeMetadata: NodeMetadata[];
        serverId: string;
        timestamp: number;
      };
    }
  | {
      type: "WORKFLOW_EVENT";
      payload: { eventType: keyof WorkflowEvents; eventData: any };
    }
  | {
      type: "ERROR";
      payload: { message: string; stack?: string; code?: string };
    }
  | {
      type: "PONG";
      payload: { timestamp: number; serverTimestamp: number };
    };

export interface UseWorkflowServerClientReturn {
  status: ComputedRef<ClientStatus>;
  nodeMetadata: ComputedRef<NodeMetadata[]>;
  serverId: ComputedRef<string | null>;
  error: ComputedRef<string | null>;
  isReady: ComputedRef<boolean>;
  executeWorkflow: (
    executionId: string,
    workflowId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ) => void;
  waitForReady: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => void;
}

// 单例状态
let clientInstance: UseWorkflowServerClientReturn | null = null;
let currentServerUrl: string | null = null;

function createClientInternal(
  emitter: Emitter<WorkflowEvents>,
  serverUrl: string
): UseWorkflowServerClientReturn {
  const ws = ref<WebSocket | null>(null);
  const status = ref<ClientStatus>("disconnected");
  const nodeMetadata = ref<NodeMetadata[]>([]);
  const serverId = ref<string | null>(null);
  const error = ref<string | null>(null);

  const initPromise: Ref<Promise<void> | null> = ref(null);
  const reconnectTimer = ref<number | null>(null);
  const heartbeatTimer = ref<number | null>(null);
  const notify = useNotifyStore();
  let hasShownConnectionError = false;

  /**
   * 连接到服务器
   */
  function connect() {
    if (status.value === "connecting" || status.value === "ready") {
      return;
    }

    status.value = "connecting";
    error.value = null;

    console.log(`[ServerClient] 正在连接到服务器: ${serverUrl}`);

    try {
      ws.value = new WebSocket(serverUrl);

      ws.value.onopen = handleOpen;
      ws.value.onmessage = handleMessage;
      ws.value.onerror = handleError;
      ws.value.onclose = handleClose;
    } catch (err) {
      handleError(err as Event);
    }
  }

  /**
   * 处理连接打开
   */
  function handleOpen() {
    console.log("[ServerClient] ✅ WebSocket 连接已建立");
    status.value = "ready";
    hasShownConnectionError = false;

    // 发送初始化请求
    sendMessage({ type: "INIT" });

    // 启动心跳
    startHeartbeat();
  }

  /**
   * 处理服务器消息
   */
  function handleMessage(event: MessageEvent) {
    try {
      const message: ServerMessage = JSON.parse(event.data);

      switch (message.type) {
        case "INITIALIZED":
          handleInitialized(message.payload);
          break;

        case "WORKFLOW_EVENT":
          // 转发工作流事件到全局 emitter
          emitter.emit(message.payload.eventType, message.payload.eventData);
          break;

        case "ERROR":
          console.error("[ServerClient] 服务器错误:", message.payload);
          error.value = message.payload.message;
          break;

        case "PONG":
          // 心跳响应
          break;

        default:
          console.warn("[ServerClient] 未知消息类型:", message);
      }
    } catch (err) {
      console.error("[ServerClient] 解析消息失败:", err);
    }
  }

  /**
   * 处理初始化响应
   */
  function handleInitialized(payload: {
    nodeMetadata: NodeMetadata[];
    serverId: string;
    timestamp: number;
  }) {
    nodeMetadata.value = payload.nodeMetadata;
    serverId.value = payload.serverId;

    console.log(
      `[ServerClient] ✅ 已从服务器加载 ${payload.nodeMetadata.length} 个节点元数据`
    );
    console.log(`[ServerClient] 服务器 ID: ${payload.serverId}`);

    // 解决初始化 Promise
    if (initPromise.value) {
      initPromise.value = Promise.resolve();
    }
  }

  /**
   * 处理连接错误
   */
  function handleError(event: Event) {
    console.error("[ServerClient] ❌ WebSocket 错误:", event);
    status.value = "error";
    error.value = "WebSocket 连接错误";

    if (!hasShownConnectionError) {
      hasShownConnectionError = true;
      notify.showError(
        "无法连接到执行服务器",
        `地址：${serverUrl}`,
        event instanceof ErrorEvent && event.message ? event.message : undefined
      );
    }
  }

  /**
   * 处理连接关闭
   */
  function handleClose(event: CloseEvent) {
    console.warn(
      `[ServerClient] 🔌 WebSocket 连接已关闭 (code: ${event.code}, reason: ${
        event.reason || "none"
      })`
    );

    status.value = "disconnected";
    stopHeartbeat();

    if (event.code !== 1000 && !hasShownConnectionError) {
      hasShownConnectionError = true;
      notify.showWarning(
        "执行服务器连接已断开",
        event.reason
          ? `${event.reason} (code: ${event.code})`
          : `code: ${event.code}`
      );
    }

    // 自动重连（5秒后）
    if (!reconnectTimer.value) {
      console.log("[ServerClient] 将在 5 秒后尝试重新连接...");
      reconnectTimer.value = window.setTimeout(() => {
        reconnectTimer.value = null;
        connect();
      }, 5000);
    }
  }

  /**
   * 发送消息到服务器
   */
  function sendMessage(message: ClientMessage) {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(message));
    } else {
      console.warn("[ServerClient] WebSocket 未连接，无法发送消息");
    }
  }

  /**
   * 启动心跳
   */
  function startHeartbeat() {
    heartbeatTimer.value = window.setInterval(() => {
      sendMessage({
        type: "PING",
        payload: { timestamp: Date.now() },
      });
    }, 30000); // 30秒
  }

  /**
   * 停止心跳
   */
  function stopHeartbeat() {
    if (heartbeatTimer.value) {
      clearInterval(heartbeatTimer.value);
      heartbeatTimer.value = null;
    }
  }

  /**
   * 执行工作流
   */
  function executeWorkflow(
    executionId: string,
    workflowId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ) {
    if (status.value !== "ready") {
      throw new Error("客户端未就绪，无法执行工作流");
    }

    sendMessage({
      type: "EXECUTE_WORKFLOW",
      payload: {
        executionId,
        workflowId,
        nodes,
        edges,
      },
    });
  }

  /**
   * 等待客户端就绪
   */
  async function waitForReady(): Promise<void> {
    if (status.value === "ready" && nodeMetadata.value.length > 0) {
      return Promise.resolve();
    }

    if (!initPromise.value) {
      initPromise.value = new Promise((resolve) => {
        const checkReady = () => {
          if (status.value === "ready" && nodeMetadata.value.length > 0) {
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });
    }

    return initPromise.value;
  }

  /**
   * 断开连接
   */
  function disconnect() {
    if (reconnectTimer.value) {
      clearTimeout(reconnectTimer.value);
      reconnectTimer.value = null;
    }

    stopHeartbeat();

    if (ws.value) {
      ws.value.close(1000, "Client disconnecting");
      ws.value = null;
    }

    status.value = "disconnected";
    nodeMetadata.value = [];
    serverId.value = null;
  }

  // 自动连接
  connect();

  return {
    status: computed(() => status.value),
    nodeMetadata: computed(() => nodeMetadata.value),
    serverId: computed(() => serverId.value),
    error: computed(() => error.value),
    isReady: computed(() => status.value === "ready"),
    executeWorkflow,
    waitForReady,
    disconnect,
    reconnect: connect,
  };
}

export function ensureWorkflowServerClient(
  emitter: Emitter<WorkflowEvents>,
  serverUrl: string = "ws://localhost:3001"
): UseWorkflowServerClientReturn {
  if (!clientInstance || currentServerUrl !== serverUrl) {
    if (clientInstance) {
      clientInstance.disconnect();
    }
    clientInstance = createClientInternal(emitter, serverUrl);
    currentServerUrl = serverUrl;
  }

  return clientInstance;
}

export function resetWorkflowServerClient(): void {
  if (clientInstance) {
    clientInstance.disconnect();
    clientInstance = null;
    currentServerUrl = null;
  }
}

/**
 * 使用工作流服务器客户端
 *
 * @param serverUrl WebSocket 服务器地址（默认：ws://localhost:3001）
 */
export function useWorkflowServerClient(
  serverUrl: string = "ws://localhost:3001"
) {
  const emitter = inject<Emitter<WorkflowEvents>>("workflowEmitter");

  if (!emitter) {
    throw new Error("workflowEmitter not provided");
  }

  const client = ensureWorkflowServerClient(emitter, serverUrl);

  onUnmounted(() => {
    if (clientInstance === client) {
      resetWorkflowServerClient();
    }
  });

  return client;
}
