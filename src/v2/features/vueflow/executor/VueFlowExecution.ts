/**
 * VueFlow 执行系统统一接口
 * 提供统一的 API 给 UI 层使用
 */

import { ref, onUnmounted, type Ref } from "vue";
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
} from "./types";

import type {
  Workflow,
  ExecutionOptions,
  ExecutionResult,
  CacheStats,
  ExecutionLifecycleEvent,
  ExecutionErrorEvent,
} from "./types";

/**
 * VueFlow 执行系统返回值
 */
export interface VueFlowExecutionManager {
  mode: Ref<ExecutionMode>;
  state: ReturnType<typeof useExecutionState>;
  execute(
    workflow: Workflow,
    options?: ExecutionOptions
  ): Promise<ExecutionResult>;
  pause(): void;
  resume(): void;
  stop(): void;
  getCacheStats(workflowId: string): Promise<CacheStats>;
  clearCache(workflowId: string): Promise<void>;
  clearAllCache(): Promise<void>;
  switchMode(newMode: ExecutionMode): Promise<void>;
  getNodeList(): Promise<NodeMetadataItem[]>;
  isInitialized: Ref<boolean>;
}

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
export function useVueFlowExecution(
  config?: Partial<ExecutionConfig>
): VueFlowExecutionManager {
  const finalConfig: ExecutionConfig = {
    ...DEFAULT_CONFIG,
    workerUrl: config?.workerUrl ?? DEFAULT_WORKER_URL,
    ...config,
  };

  const mode = ref<ExecutionMode>(finalConfig.mode);
  const isInitialized = ref(false);
  const stateManager = useExecutionState();

  let channel: ExecutionChannel | null = null;
  let channelHandler: ((message: ExecutionEventMessage) => void) | null = null;

  let awaitingExecution: PendingExecution | null = null;
  const activeExecutions = new Map<string, PendingExecution>();
  const pendingCacheRequests = new Map<string, PendingCacheRequest>();
  const pendingNodeListRequests = new Map<string, PendingNodeListRequest>();

  async function initialize() {
    if (channel) {
      return;
    }

    if (mode.value !== "worker") {
      throw new Error("Server 模式暂未实现");
    }

    const workerChannel = createWorkerChannel(finalConfig.workerUrl!);
    channelHandler = handleChannelMessage;
    workerChannel.onMessage(handleChannelMessage);
    await workerChannel.init();
    workerChannel.send({ type: "INIT" });
    channel = workerChannel;
    isInitialized.value = true;
    console.log(`[VueFlowExecution] 执行通道已准备 (${mode.value} 模式)`);
  }

  async function execute(
    workflow: Workflow,
    options?: ExecutionOptions
  ): Promise<ExecutionResult> {
    if (!channel) {
      await initialize();
    }

    if (!channel) {
      throw new Error("执行通道未初始化");
    }

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
    if (!channel) {
      await initialize();
    }

    if (!channel) {
      throw new Error("执行通道未初始化");
    }

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
    if (!channel) {
      await initialize();
    }
    channel?.send({ type: "CLEAR_CACHE", payload: { workflowId } });
  }

  async function clearAllCache(): Promise<void> {
    if (!channel) {
      await initialize();
    }
    channel?.send({ type: "CLEAR_ALL_CACHE" });
  }

  async function getNodeList(): Promise<NodeMetadataItem[]> {
    if (!channel) {
      await initialize();
    }

    if (!channel) {
      throw new Error("执行通道未初始化");
    }

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

  async function switchMode(newMode: ExecutionMode): Promise<void> {
    if (newMode === mode.value) {
      return;
    }

    if (channel) {
      if (channelHandler) {
        channel.offMessage(channelHandler);
      }
      channel.terminate();
      channel = null;
    }

    mode.value = newMode;
    isInitialized.value = false;

    if (newMode !== "worker") {
      throw new Error("Server 模式暂未实现");
    }

    await initialize();

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
    isInitialized.value = false;
  }

  onUnmounted(() => {
    cleanupChannel();
  });

  function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // 默认初始化执行通道
  initialize().catch((error) => {
    console.error("[VueFlowExecution] 初始化失败:", error);
  });

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
    isInitialized,
  };
}
