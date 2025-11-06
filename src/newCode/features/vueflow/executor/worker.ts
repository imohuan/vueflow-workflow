/**
 * VueFlow 工作流执行 Worker
 * 在 Web Worker 环境中运行
 */

import {
  WorkflowExecutor,
  createNodeResolver,
  NODE_CLASS_REGISTRY,
  getAllNodeMetadata,
} from "workflow-flow-nodes";

import type {
  Workflow,
  ExecutionOptions,
  ExecutionResult,
  ExecutionState,
  ExecutionErrorEvent,
} from "workflow-flow-nodes";
import type {
  ExecutionCommand,
  ExecutionEventMessage,
  NodeMetadataItem,
} from "./types";

// ==================== 全局变量 ====================

const loggerPrefix = "[FlowWorker]";

let executor: WorkflowExecutor | null = null;
let initialized = false;

const executionContext: {
  executionId: string | null;
  workflowId: string | null;
} = {
  executionId: null,
  workflowId: null,
};

const postMessageToMain = (message: ExecutionEventMessage) =>
  self.postMessage(message);

const getOptionalContextIds = () => ({
  executionId: executionContext.executionId ?? undefined,
  workflowId: executionContext.workflowId ?? undefined,
});

const requireContextIds = () => {
  if (!executionContext.executionId || !executionContext.workflowId) {
    throw new Error("执行上下文未初始化");
  }
  return {
    executionId: executionContext.executionId,
    workflowId: executionContext.workflowId,
  };
};

const emitState = (state: ExecutionState) => {
  postMessageToMain({
    type: "STATE_CHANGE",
    payload: { ...getOptionalContextIds(), state },
  });
};

const resetExecutionContext = () => {
  executionContext.executionId = null;
  executionContext.workflowId = null;
};

const createFallbackResult = (
  executionId: string,
  workflowId: string,
  error: string
): ExecutionResult => {
  const timestamp = Date.now();
  return {
    success: false,
    executionId,
    workflowId,
    startTime: timestamp,
    endTime: timestamp,
    duration: 0,
    nodeResults: new Map(),
    executedNodeIds: [],
    skippedNodeIds: [],
    cachedNodeIds: [],
    strategy: "full",
    error,
  };
};

const normalizeErrorPayload = (
  payload: ExecutionErrorEvent
): ExecutionErrorEvent => {
  const workflowId = payload.workflowId ?? executionContext.workflowId ?? "";

  if (payload.result && payload.workflowId) {
    return payload;
  }

  return {
    ...payload,
    workflowId,
    result:
      payload.result ??
      createFallbackResult(payload.executionId, workflowId, payload.error),
  };
};

const wrapExecutionOptions = (
  options?: ExecutionOptions
): ExecutionOptions => ({
  ...options,
  onExecutionStart: (payload) => {
    executionContext.executionId = payload.executionId;
    executionContext.workflowId = payload.workflowId;
    postMessageToMain({ type: "EXECUTION_START", payload });
    emitState("running");
    options?.onExecutionStart?.(payload);
  },
  onExecutionComplete: (result) => {
    executionContext.executionId = result.executionId;
    executionContext.workflowId = result.workflowId;
    postMessageToMain({ type: "EXECUTION_COMPLETE", payload: result });
    emitState("completed");
    options?.onExecutionComplete?.(result);
    resetExecutionContext();
  },
  onExecutionError: (payload) => {
    const normalized = normalizeErrorPayload(payload);
    executionContext.executionId = normalized.executionId;
    executionContext.workflowId = normalized.workflowId;
    postMessageToMain({
      type: "EXECUTION_ERROR",
      payload: normalized,
    });
    emitState("error");
    options?.onExecutionError?.(normalized);
    resetExecutionContext();
  },
  onNodeStart: (nodeId) => {
    const ids = requireContextIds();
    postMessageToMain({ type: "NODE_START", payload: { ...ids, nodeId } });
    options?.onNodeStart?.(nodeId);
  },
  onNodeComplete: (nodeId, result) => {
    const ids = requireContextIds();
    postMessageToMain({
      type: "NODE_COMPLETE",
      payload: { ...ids, nodeId, result },
    });
    options?.onNodeComplete?.(nodeId, result);
  },
  onNodeError: (nodeId, error) => {
    const ids = requireContextIds();
    postMessageToMain({
      type: "NODE_ERROR",
      payload: { ...ids, nodeId, error: error.message },
    });
    options?.onNodeError?.(nodeId, error);
  },
  onProgress: (progress) => {
    postMessageToMain({
      type: "PROGRESS",
      payload: { ...getOptionalContextIds(), progress },
    });
    options?.onProgress?.(progress);
  },
  onCacheHit: (nodeId, cachedResult) => {
    const ids = requireContextIds();
    postMessageToMain({
      type: "CACHE_HIT",
      payload: { ...ids, nodeId, cachedResult },
    });
    options?.onCacheHit?.(nodeId, cachedResult);
  },
});

const handleUnexpectedError = (
  workflow: Workflow,
  error: unknown,
  options?: ExecutionOptions
) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const executionId =
    executionContext.executionId ??
    `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const workflowId = executionContext.workflowId ?? workflow.workflow_id;

  const payload: ExecutionErrorEvent = {
    executionId,
    workflowId,
    error: errorMessage,
    result: createFallbackResult(executionId, workflowId, errorMessage),
  };

  postMessageToMain({
    type: "EXECUTION_ERROR",
    payload,
  });
  emitState("error");
  options?.onExecutionError?.(payload);
  resetExecutionContext();
};

// ==================== 初始化 ====================

/**
 * 初始化执行器
 */
function initialize() {
  try {
    console.log(`${loggerPrefix} 开始初始化...`);

    // 创建节点解析器
    const nodeResolver = createNodeResolver(NODE_CLASS_REGISTRY);

    console.log(
      `${loggerPrefix} 已加载 ${nodeResolver.getAllTypes().length} 个节点类型:`,
      nodeResolver.getAllTypes()
    );

    // 创建执行器
    executor = new WorkflowExecutor(nodeResolver);

    initialized = true;

    // 发送初始化完成消息
    postMessageToMain({ type: "INITIALIZED" });

    console.log(`${loggerPrefix} 初始化完成`);
  } catch (error) {
    console.error(`${loggerPrefix} 初始化失败:`, error);

    const errorMessage: ExecutionEventMessage = {
      type: "ERROR",
      payload: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    };
    postMessageToMain(errorMessage);
  }
}

// ==================== 工作流执行 ====================

/**
 * 执行工作流
 */
async function executeWorkflow(workflow: Workflow, options?: ExecutionOptions) {
  if (!executor) {
    throw new Error("执行器未初始化");
  }
  try {
    console.log(`${loggerPrefix} 开始执行工作流:`, workflow.workflow_id);
    const executionOptions = wrapExecutionOptions(options);
    const result = await executor.execute(workflow, executionOptions);
    console.log(`${loggerPrefix} 工作流执行完成:`, result);
    return result;
  } catch (error) {
    console.error(`${loggerPrefix} 工作流执行失败:`, error);
    handleUnexpectedError(workflow, error, options);
  }
}

// ==================== 执行控制 ====================

function pause() {
  if (executor) {
    executor.pause();
    emitState("paused");
    console.log(`${loggerPrefix} 执行已暂停`);
  }
}

function resume() {
  if (executor) {
    executor.resume();
    emitState("running");
    console.log(`${loggerPrefix} 执行已恢复`);
  }
}

function stop() {
  if (executor) {
    executor.stop();
    emitState("cancelled");
    resetExecutionContext();
    console.log(`${loggerPrefix} 执行已停止`);
  }
}

// ==================== 缓存管理 ====================

function getCacheStats(workflowId: string, requestId: string) {
  if (!executor) {
    return;
  }

  const stats = executor.getCacheStats(workflowId);

  postMessageToMain({
    type: "CACHE_STATS",
    payload: {
      requestId,
      stats,
    },
  });
}

function clearCache(workflowId: string) {
  if (executor) {
    executor.clearCache(workflowId);
    console.log(`${loggerPrefix} 已清空缓存:`, workflowId);
  }
}

function clearAllCache() {
  if (executor) {
    executor.clearAllCache();
    console.log(`${loggerPrefix} 已清空所有缓存`);
  }
}

function getNodeList(requestId: string) {
  try {
    const metadata = getAllNodeMetadata();

    // 转换为UI需要的格式
    const nodes: NodeMetadataItem[] = metadata.map((node) => ({
      type: node.type,
      label: node.label,
      description: node.description,
      category: node.category,
      icon: node.style?.icon,
      tags: [], // 可以根据category或其他信息生成tags
      inputs: node.inputs.map((input) => ({
        name: input.name,
        type: input.type,
        description: input.description,
        required: input.required,
        defaultValue: input.defaultValue,
        options: input?.options ?? [], // 传递选项配置
      })),
      outputs: node.outputs.map((output) => ({
        name: output.name,
        type: output.type,
        description: output.description,
      })),
    }));

    postMessageToMain({
      type: "NODE_LIST",
      payload: {
        requestId,
        nodes,
      },
    });

    console.log(`${loggerPrefix} 已返回节点列表，共 ${nodes.length} 个节点`);
  } catch (error) {
    console.error(`${loggerPrefix} 获取节点列表失败:`, error);
  }
}

// ==================== 消息处理 ====================

self.addEventListener(
  "message",
  async (event: MessageEvent<ExecutionCommand>) => {
    const message = event.data;

    try {
      switch (message.type) {
        case "INIT":
          initialize();
          break;

        case "EXECUTE":
          if (!initialized) {
            throw new Error("执行器未初始化，请先发送 INIT 消息");
          }
          await executeWorkflow(
            message.payload.workflow,
            message.payload.options
          );
          break;

        case "PAUSE":
          pause();
          break;

        case "RESUME":
          resume();
          break;

        case "STOP":
          stop();
          break;

        case "GET_CACHE_STATS":
          getCacheStats(message.payload.workflowId, message.payload.requestId);
          break;

        case "CLEAR_CACHE":
          clearCache(message.payload.workflowId);
          break;

        case "CLEAR_ALL_CACHE":
          clearAllCache();
          break;

        case "GET_NODE_LIST":
          getNodeList(message.payload.requestId);
          break;

        default:
          console.warn(`${loggerPrefix} 未知消息类型:`, message);
      }
    } catch (error) {
      console.error(`${loggerPrefix} 处理消息时出错:`, error);
      const errorMessage: ExecutionEventMessage = {
        type: "ERROR",
        payload: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
      postMessageToMain(errorMessage);
    }
  }
);

// ==================== Worker 启动 ====================

console.log(`${loggerPrefix} VueFlow 执行 Worker 已启动`);
