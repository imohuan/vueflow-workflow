/**
 * VueFlow 执行系统统一接口
 * 提供统一的 API 给 UI 层使用
 */

import { ref, onUnmounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useEditorConfigStore } from "../../../stores/editorConfig";
import { eventBusUtils } from "../events";
import { useExecutionState } from "./ExecutionState";
import type {
  ExecutionMode,
  ExecutionConfig,
  ExecutionCommand,
  ExecutionEventMessage,
  ExecutionStateEvent,
  ExecutionProgressEvent,
  ExecutionNodeEvent,
  ExecutionNodeCompleteEvent,
  ExecutionNodeErrorEvent,
  ExecutionCacheHitEvent,
  ExecutionChannel,
  NodeMetadataItem,
  ExecutionHistoryRecord,
} from "./types";

import type {
  Workflow,
  ExecutionOptions,
  ExecutionResult,
  CacheStats,
  ExecutionLifecycleEvent,
  ExecutionErrorEvent,
} from "./types";

import { WebSocketExecutorClient } from "./websocket-client";

/**
 * 默认配置
 */
const DEFAULT_WORKER_URL = new URL("./worker.ts", import.meta.url);

const DEFAULT_CONFIG: ExecutionConfig = {
  mode: "worker",
  workerUrl: DEFAULT_WORKER_URL,
  serverUrl: "ws://localhost:3001",
  timeout: 60000,
  useCache: true,
  autoReconnect: true,
};

const CACHE_REQUEST_TIMEOUT = 5000;

interface PendingExecution {
  resolve: (result: ExecutionResult) => void;
  reject: (reason: unknown) => void;
}

interface PendingCacheRequest {
  resolve: (stats: CacheStats) => void;
  reject: (reason: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface PendingNodeListRequest {
  resolve: (nodes: NodeMetadataItem[]) => void;
  reject: (reason: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface PendingHistoryRequest {
  resolve: (history: ExecutionHistoryRecord[]) => void;
  reject: (reason: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

function createWorkerChannel(workerUrl: string | URL): ExecutionChannel {
  let worker: Worker | null = null;
  const handlers = new Set<(message: ExecutionEventMessage) => void>();

  const notify = (message: ExecutionEventMessage) => {
    handlers.forEach((handler) => handler(message));
  };

  return {
    async init() {
      if (worker) {
        return;
      }
      worker = new Worker(workerUrl, { type: "module" });
      worker.onmessage = (event: MessageEvent<ExecutionEventMessage>) => {
        notify(event.data);
      };
      worker.onerror = (event) => {
        console.error("[VueFlowExecution][Worker] 错误:", event.message);
      };
    },
    terminate() {
      if (worker) {
        worker.terminate();
        worker = null;
      }
    },
    send(message: ExecutionCommand) {
      if (!worker) {
        throw new Error("执行通道未初始化");
      }
      worker.postMessage(message);
    },
    onMessage(handler) {
      handlers.add(handler);
    },
    offMessage(handler) {
      handlers.delete(handler);
    },
  };
}

/**
 * 使用 VueFlow 执行系统
 */
export function useVueFlowExecution(config?: Partial<ExecutionConfig>) {
  const finalConfig: ExecutionConfig = {
    ...DEFAULT_CONFIG,
    workerUrl: config?.workerUrl ?? DEFAULT_WORKER_URL,
    ...config,
  };

  // 从配置中读取执行模式
  const editorConfigStore = useEditorConfigStore();
  const { config: editorConfig } = storeToRefs(editorConfigStore);

  // 使用计算属性跟踪配置中的执行模式
  const mode = computed(() => editorConfig.value.executionMode);
  const isInitialized = ref(false);
  const stateManager = useExecutionState();

  let channel: ExecutionChannel | null = null;
  let channelHandler: ((message: ExecutionEventMessage) => void) | null = null;

  let awaitingExecution: PendingExecution | null = null;
  const activeExecutions = new Map<string, PendingExecution>();
  const pendingCacheRequests = new Map<string, PendingCacheRequest>();
  const pendingNodeListRequests = new Map<string, PendingNodeListRequest>();
  const pendingHistoryRequests = new Map<string, PendingHistoryRequest>();

  /**
   * 统一的通道初始化函数
   * 根据配置的模式创建对应的通道
   */
  async function ensureChannel(): Promise<ExecutionChannel> {
    // 如果通道已存在，直接返回
    if (channel && isInitialized.value) {
      return channel;
    }

    // 清理旧通道
    if (channel) {
      cleanupChannel();
    }

    // 根据模式创建通道
    if (mode.value === "worker") {
      const workerChannel = createWorkerChannel(finalConfig.workerUrl!);
      channelHandler = handleChannelMessage;
      workerChannel.onMessage(handleChannelMessage);
      await workerChannel.init();
      workerChannel.send({ type: "INIT" });
      channel = workerChannel;
      isInitialized.value = true;
      console.log(`[VueFlowExecution] Worker 通道已准备`);
    } else if (mode.value === "server") {
      // Server 模式：使用 WebSocket 客户端
      const serverUrl = editorConfig.value.serverUrl;

      // 将 http:// 转换为 ws://
      let wsUrl = serverUrl;
      if (wsUrl.startsWith("http://")) {
        wsUrl = wsUrl.replace("http://", "ws://");
      } else if (wsUrl.startsWith("https://")) {
        wsUrl = wsUrl.replace("https://", "wss://");
      } else if (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://")) {
        wsUrl = "ws://" + wsUrl;
      }

      const wsClient = new WebSocketExecutorClient({
        url: wsUrl,
        autoReconnect: true,
        enableLogging: true,
      });

      // 连接到服务器
      await wsClient.connect();

      // 创建通道适配器
      const wsChannel: ExecutionChannel = {
        init: async () => {
          // WebSocket 已经在 connect() 中初始化
          return Promise.resolve();
        },
        send: (command: ExecutionCommand) => {
          // 将命令转发到 WebSocket 客户端
          switch (command.type) {
            case "EXECUTE":
              wsClient.execute(
                command.payload.workflow,
                command.payload.options
              );
              break;
            case "PAUSE":
              wsClient.pause();
              break;
            case "RESUME":
              wsClient.resume();
              break;
            case "STOP":
              wsClient.stop();
              break;
            case "GET_CACHE_STATS":
              wsClient.getCacheStats(
                command.payload.workflowId,
                command.payload.requestId
              );
              break;
            case "CLEAR_CACHE":
              wsClient.clearCache(command.payload.workflowId);
              break;
            case "CLEAR_ALL_CACHE":
              wsClient.clearAllCache();
              break;
            case "GET_NODE_LIST":
              wsClient.getNodeList(command.payload.requestId);
              break;
            case "GET_HISTORY":
              wsClient.getHistory(
                command.payload.requestId,
                command.payload.workflowId,
                command.payload.limit
              );
              break;
            case "CLEAR_HISTORY":
              wsClient.clearHistory(command.payload.workflowId);
              break;
            case "DELETE_HISTORY":
              wsClient.deleteHistory(command.payload.executionId);
              break;
            default:
              console.warn("[VueFlowExecution] 未知的命令类型:", command);
          }
        },
        onMessage: (handler: (message: ExecutionEventMessage) => void) => {
          // 监听所有消息类型
          const eventTypes: ExecutionEventMessage["type"][] = [
            "INITIALIZED",
            "EXECUTION_START",
            "EXECUTION_COMPLETE",
            "EXECUTION_ERROR",
            "NODE_START",
            "NODE_COMPLETE",
            "NODE_ERROR",
            "PROGRESS",
            "CACHE_HIT",
            "ITERATION_UPDATE",
            "STATE_CHANGE",
            "CACHE_STATS",
            "NODE_LIST",
            "HISTORY_DATA",
            "ERROR",
          ];

          eventTypes.forEach((type) => {
            wsClient.on(type, (payload) => {
              handler({ type, payload } as any);
            });
          });
        },
        offMessage: () => {
          // WebSocketExecutorClient 的 off 方法
          // 暂时不实现，因为重连机制由客户端管理
        },
        terminate: () => {
          wsClient.disconnect();
        },
      };

      channel = wsChannel;
      channelHandler = handleChannelMessage;
      wsChannel.onMessage(handleChannelMessage);
      isInitialized.value = true;
      console.log(`[VueFlowExecution] WebSocket 通道已准备`);
    } else {
      throw new Error(`不支持的执行模式: ${mode.value}`);
    }

    return channel!;
  }

  async function execute(
    workflow: Workflow,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    await ensureChannel();

    if (awaitingExecution) {
      return Promise.reject(new Error("已有执行任务正在等待开始"));
    }

    return new Promise<ExecutionResult>((resolve, reject) => {
      awaitingExecution = { resolve, reject };
      channel!.send({
        type: "EXECUTE",
        payload: {
          workflow,
          options,
        },
      });
    });
  }

  function pause(): void {
    channel?.send({ type: "PAUSE" });
  }

  function resume(): void {
    channel?.send({ type: "RESUME" });
  }

  function stop(): void {
    channel?.send({ type: "STOP" });
  }

  async function getCacheStats(workflowId: string): Promise<CacheStats> {
    await ensureChannel();

    const requestId = generateRequestId();

    return new Promise<CacheStats>((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingCacheRequests.delete(requestId);
        reject(new Error("获取缓存统计超时"));
      }, CACHE_REQUEST_TIMEOUT);

      pendingCacheRequests.set(requestId, { resolve, reject, timer });

      channel!.send({
        type: "GET_CACHE_STATS",
        payload: { workflowId, requestId },
      });
    });
  }

  async function clearCache(workflowId: string): Promise<void> {
    await ensureChannel();
    channel!.send({ type: "CLEAR_CACHE", payload: { workflowId } });
  }

  async function clearAllCache(): Promise<void> {
    await ensureChannel();
    channel!.send({ type: "CLEAR_ALL_CACHE" });
  }

  async function getNodeList(): Promise<NodeMetadataItem[]> {
    // 必须通过通道获取节点列表
    await ensureChannel();

    const requestId = generateRequestId();

    return new Promise<NodeMetadataItem[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingNodeListRequests.delete(requestId);
        reject(new Error("获取节点列表超时"));
      }, CACHE_REQUEST_TIMEOUT);

      pendingNodeListRequests.set(requestId, { resolve, reject, timer });

      channel!.send({
        type: "GET_NODE_LIST",
        payload: { requestId },
      });
    });
  }

  async function getHistory(
    workflowId?: string,
    limit?: number
  ): Promise<ExecutionHistoryRecord[]> {
    await ensureChannel();

    const requestId = generateRequestId();

    return new Promise<ExecutionHistoryRecord[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingHistoryRequests.delete(requestId);
        reject(new Error("获取历史记录超时"));
      }, CACHE_REQUEST_TIMEOUT);

      pendingHistoryRequests.set(requestId, { resolve, reject, timer });

      channel!.send({
        type: "GET_HISTORY",
        payload: { requestId, workflowId, limit },
      });
    });
  }

  async function clearHistory(workflowId?: string): Promise<void> {
    await ensureChannel();
    channel!.send({ type: "CLEAR_HISTORY", payload: { workflowId } });
  }

  async function deleteHistory(executionId: string): Promise<void> {
    await ensureChannel();
    channel!.send({ type: "DELETE_HISTORY", payload: { executionId } });
  }

  async function switchMode(newMode: ExecutionMode): Promise<void> {
    // 注意：mode 现在由配置管理，这个函数暂时保留用于手动切换
    console.warn(
      "[VueFlowExecution] switchMode 已弃用，请使用配置面板切换执行模式"
    );

    if (newMode === mode.value) {
      return;
    }

    // 清理旧通道
    cleanupChannel();

    // 更新配置
    editorConfigStore.updateConfig({ executionMode: newMode });

    // 初始化新通道
    await ensureChannel();

    console.log(`[VueFlowExecution] 已切换到 ${newMode} 模式`);
  }

  function handleExecutionStart(payload: ExecutionLifecycleEvent) {
    stateManager.startExecution(payload.executionId, payload.workflowId);
    eventBusUtils.emit("execution:start", payload);
    eventBusUtils.emit("workflow:execution-started", {
      workflowId: payload.workflowId,
    });

    if (awaitingExecution) {
      activeExecutions.set(payload.executionId, awaitingExecution);
      awaitingExecution = null;
    }
  }

  function handleExecutionComplete(payload: ExecutionResult) {
    stateManager.completeExecution(payload);
    eventBusUtils.emit("execution:complete", payload);
    eventBusUtils.emit("workflow:execution-completed", {
      workflowId: payload.workflowId,
      success: payload.success,
    });

    const pending = activeExecutions.get(payload.executionId);
    if (pending) {
      pending.resolve(payload);
      activeExecutions.delete(payload.executionId);
    }
  }

  function handleExecutionError(payload: ExecutionErrorEvent) {
    stateManager.setState("error");
    eventBusUtils.emit("execution:error", payload);
    const pending = activeExecutions.get(payload.executionId);
    if (pending) {
      pending.reject(new Error(payload.error));
      activeExecutions.delete(payload.executionId);
      return;
    }
    if (awaitingExecution) {
      awaitingExecution.reject(new Error(payload.error));
      awaitingExecution = null;
    }
  }

  function handleNodeStart(payload: ExecutionNodeEvent) {
    stateManager.updateNodeState(payload.nodeId, {
      status: "running",
      startTime: Date.now(),
    });
    eventBusUtils.emit("execution:node:start", payload);
  }

  function handleNodeComplete(payload: ExecutionNodeCompleteEvent) {
    stateManager.updateNodeState(payload.nodeId, {
      status: "success",
      outputs: payload.result,
      endTime: Date.now(),
    });
    eventBusUtils.emit("execution:node:complete", payload);
  }

  function handleNodeError(payload: ExecutionNodeErrorEvent) {
    stateManager.updateNodeState(payload.nodeId, {
      status: "error",
      error: payload.error,
      endTime: Date.now(),
    });
    eventBusUtils.emit("execution:node:error", payload);
  }

  function handleProgress(payload: ExecutionProgressEvent) {
    stateManager.setProgress(payload.progress);
    eventBusUtils.emit("execution:progress", payload);
  }

  function handleCacheHit(payload: ExecutionCacheHitEvent) {
    stateManager.updateNodeState(payload.nodeId, {
      status: "cached",
      outputs: payload.cachedResult.outputs,
      fromCache: true,
    });
    eventBusUtils.emit("execution:cache-hit", payload);
  }

  function handleIterationUpdate(payload: any) {
    // 发送迭代更新事件到事件总线
    eventBusUtils.emit("execution:iteration:update", payload);
  }

  function handleStateChange(payload: ExecutionStateEvent) {
    stateManager.setState(payload.state);
    eventBusUtils.emit("execution:state", payload);
  }

  function handleCacheStatsResponse(
    requestId: string,
    stats: CacheStats
  ): void {
    const pending = pendingCacheRequests.get(requestId);
    if (!pending) {
      return;
    }
    clearTimeout(pending.timer);
    pending.resolve(stats);
    pendingCacheRequests.delete(requestId);
  }

  function handleNodeListResponse(
    requestId: string,
    nodes: NodeMetadataItem[]
  ): void {
    const pending = pendingNodeListRequests.get(requestId);
    if (!pending) {
      return;
    }
    clearTimeout(pending.timer);
    pending.resolve(nodes);
    pendingNodeListRequests.delete(requestId);
  }

  function handleHistoryResponse(
    requestId: string,
    history: ExecutionHistoryRecord[]
  ): void {
    const pending = pendingHistoryRequests.get(requestId);
    if (!pending) {
      return;
    }
    clearTimeout(pending.timer);
    pending.resolve(history);
    pendingHistoryRequests.delete(requestId);
  }

  function handleChannelMessage(message: ExecutionEventMessage) {
    switch (message.type) {
      case "INITIALIZED":
        console.log("[VueFlowExecution] Worker 初始化完成");
        break;
      case "EXECUTION_START":
        handleExecutionStart(message.payload);
        break;
      case "EXECUTION_COMPLETE":
        handleExecutionComplete(message.payload);
        break;
      case "EXECUTION_ERROR":
        handleExecutionError(message.payload);
        break;
      case "NODE_START":
        handleNodeStart(message.payload);
        break;
      case "NODE_COMPLETE":
        handleNodeComplete(message.payload);
        break;
      case "NODE_ERROR":
        handleNodeError(message.payload);
        break;
      case "PROGRESS":
        handleProgress(message.payload);
        break;
      case "CACHE_HIT":
        handleCacheHit(message.payload);
        break;
      case "ITERATION_UPDATE":
        handleIterationUpdate(message.payload);
        break;
      case "CACHE_STATS":
        handleCacheStatsResponse(
          message.payload.requestId,
          message.payload.stats
        );
        break;
      case "NODE_LIST":
        handleNodeListResponse(
          message.payload.requestId,
          message.payload.nodes
        );
        break;
      case "HISTORY_DATA":
        handleHistoryResponse(
          message.payload.requestId,
          message.payload.history
        );
        break;
      case "STATE_CHANGE":
        handleStateChange(message.payload);
        break;
      case "ERROR":
        console.error("[VueFlowExecution] 通道错误:", message.payload);
        break;
      default:
        console.warn("[VueFlowExecution] 未知的通道消息:", message);
    }
  }

  function cleanupChannel() {
    if (channel) {
      if (channelHandler) {
        channel.offMessage(channelHandler);
      }
      channel.terminate();
      channel = null;
      channelHandler = null;
    }
    if (awaitingExecution) {
      awaitingExecution.reject(new Error("执行通道已关闭"));
      awaitingExecution = null;
    }
    activeExecutions.forEach(({ reject }) =>
      reject(new Error("执行通道已关闭"))
    );
    activeExecutions.clear();
    pendingCacheRequests.forEach(({ reject, timer }) => {
      clearTimeout(timer);
      reject(new Error("执行通道已关闭"));
    });
    pendingCacheRequests.clear();
    pendingNodeListRequests.forEach(({ reject, timer }) => {
      clearTimeout(timer);
      reject(new Error("执行通道已关闭"));
    });
    pendingNodeListRequests.clear();
    pendingHistoryRequests.forEach(({ reject, timer }) => {
      clearTimeout(timer);
      reject(new Error("执行通道已关闭"));
    });
    pendingHistoryRequests.clear();
    isInitialized.value = false;
  }

  onUnmounted(() => {
    cleanupChannel();
  });

  function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  return {
    mode,
    state: stateManager,
    execute,
    pause,
    resume,
    stop,
    getCacheStats,
    clearCache,
    clearAllCache,
    switchMode,
    getNodeList,
    getHistory,
    clearHistory,
    deleteHistory,
    isInitialized,
    ensureChannel,
    cleanupChannel,
  };
}
