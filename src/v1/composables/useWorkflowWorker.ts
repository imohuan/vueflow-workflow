/**
 * 工作流 Worker 管理 Composable
 *
 * 职责：
 * 1. 初始化和管理 Worker 实例
 * 2. 处理 Worker 消息并转发到 mitt emitter
 * 3. 提供执行工作流的接口
 * 4. 管理节点元数据
 */

import { ref, computed, inject, type Ref } from "vue";
import type { Emitter } from "mitt";
import type { WorkflowEvents } from "../typings/workflowExecution";
import type { WorkflowNode, WorkflowEdge } from "workflow-node-executor";

// ==================== 类型定义 ====================

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

/** Worker 状态 */
type WorkerStatus = "initializing" | "ready" | "error";

// ==================== 全局状态 ====================

let workerInstance: Worker | null = null;
let workerStatus: Ref<WorkerStatus> = ref("initializing");
let nodeMetadataList: Ref<NodeMetadata[]> = ref([]);
let initializationPromise: Promise<void> | null = null;

// ==================== Worker 管理 ====================

/**
 * 初始化 Worker（单例模式）
 */
function initializeWorker(emitter: Emitter<WorkflowEvents>): Promise<void> {
  // 如果已经在初始化，返回现有的 Promise
  if (initializationPromise) {
    return initializationPromise;
  }

  // 如果已经初始化完成，直接返回
  if (workerStatus.value === "ready") {
    return Promise.resolve();
  }

  initializationPromise = new Promise((resolve, reject) => {
    try {
      // 创建 Worker 实例
      workerInstance = new Worker(
        new URL("../workers/workflowWorker.ts", import.meta.url),
        { type: "module" }
      );

      // 监听 Worker 消息
      workerInstance.onmessage = (event) => {
        handleWorkerMessage(event.data, emitter);

        // 初始化完成
        if (event.data.type === "INITIALIZED") {
          workerStatus.value = "ready";
          nodeMetadataList.value = event.data.payload.nodeMetadata;
          console.log(
            `[WorkflowWorker] Worker 初始化完成，已加载 ${nodeMetadataList.value.length} 个节点`
          );
          resolve();
        }
      };

      // 监听 Worker 错误
      workerInstance.onerror = (error) => {
        console.error("[WorkflowWorker] Worker 错误", error);
        workerStatus.value = "error";
        reject(error);
      };

      // 发送初始化消息
      workerInstance.postMessage({ type: "INIT" });

      console.log("[WorkflowWorker] Worker 初始化中...");
    } catch (error) {
      console.error("[WorkflowWorker] Worker 创建失败", error);
      workerStatus.value = "error";
      reject(error);
    }
  });

  return initializationPromise;
}

/**
 * 处理 Worker 消息
 */
function handleWorkerMessage(message: any, emitter: Emitter<WorkflowEvents>) {
  switch (message.type) {
    case "INITIALIZED": {
      // 初始化完成消息已在 initializeWorker 中处理
      break;
    }

    case "WORKFLOW_EVENT": {
      // 转发工作流事件到 mitt emitter
      const { eventType, eventData } = message.payload;
      emitter.emit(eventType, eventData);
      break;
    }

    case "ERROR": {
      // Worker 执行错误
      console.error("[WorkflowWorker] Worker 执行错误", message.payload);
      break;
    }

    default: {
      console.warn("[WorkflowWorker] 未知的 Worker 消息类型", message);
    }
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
): void {
  if (!workerInstance) {
    throw new Error("Worker 未初始化");
  }

  if (workerStatus.value !== "ready") {
    throw new Error(`Worker 状态异常: ${workerStatus.value}`);
  }

  // 发送执行消息到 Worker
  workerInstance.postMessage({
    type: "EXECUTE_WORKFLOW",
    payload: {
      executionId,
      workflowId,
      nodes,
      edges,
    },
  });

  console.log(`[WorkflowWorker] 已发送执行请求: ${executionId}`);
}

/**
 * 清理 Worker
 */
function terminateWorker(): void {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
    workerStatus.value = "initializing";
    nodeMetadataList.value = [];
    initializationPromise = null;
    console.log("[WorkflowWorker] Worker 已终止");
  }
}

// ==================== Composable ====================

export interface UseWorkflowWorkerReturn {
  /** Worker 状态 */
  status: Readonly<Ref<WorkerStatus>>;

  /** 是否已就绪 */
  isReady: Readonly<Ref<boolean>>;

  /** 节点元数据列表 */
  nodeMetadata: Readonly<Ref<NodeMetadata[]>>;

  /** 执行工作流 */
  executeWorkflow: (
    executionId: string,
    workflowId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ) => void;

  /** 等待 Worker 初始化完成 */
  waitForReady: () => Promise<void>;
}

/**
 * 创建或获取工作流 Worker 实例
 */
export function createWorkflowWorker(
  emitter: Emitter<WorkflowEvents>
): UseWorkflowWorkerReturn {
  if (!emitter) {
    throw new Error(
      "workflowEmitter not provided. Make sure it's provided in main.ts"
    );
  }

  if (!workerInstance && workerStatus.value === "initializing") {
    initializeWorker(emitter).catch((error) => {
      console.error("[WorkflowWorker] 初始化失败", error);
    });
  }

  return {
    status: workerStatus,
    isReady: computed(() => workerStatus.value === "ready"),
    nodeMetadata: nodeMetadataList,
    executeWorkflow,
    waitForReady: () => initializeWorker(emitter),
  };
}

/**
 * 使用工作流 Worker
 */
export function useWorkflowWorker(): UseWorkflowWorkerReturn {
  // 注入全局 emitter
  const emitter = inject<Emitter<WorkflowEvents>>("workflowEmitter");

  if (!emitter) {
    throw new Error(
      "workflowEmitter not provided. Make sure it's provided in main.ts"
    );
  }

  return createWorkflowWorker(emitter);
}

// ==================== 导出清理函数（用于应用关闭时） ====================

export function cleanupWorkflowWorker(): void {
  terminateWorker();
}
