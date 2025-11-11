/**
 * 节点执行状态管理
 * 监听执行事件并同步到 canvasStore
 */

import { onUnmounted } from "vue";
import { eventBusUtils } from "../events";
import { useCanvasStore } from "@/v2/stores/canvas";
import type {
  ExecutionNodeEvent,
  ExecutionNodeCompleteEvent,
  ExecutionNodeErrorEvent,
  ExecutionCacheHitEvent,
} from "../executor/types";

/** 节点执行状态 */
export interface NodeExecutionStatus {
  /** 节点 ID */
  nodeId: string;
  /** 执行状态 */
  status: "pending" | "running" | "success" | "error" | "cached" | "skipped";
  /** 开始时间 */
  startTime?: number;
  /** 结束时间 */
  endTime?: number;
  /** 执行时长（毫秒） */
  duration?: number;
  /** 执行结果 */
  result?: any;
  /** 错误信息 */
  error?: string;
  /** 时间戳 */
  timestamp?: number;
}

/**
 * 节点执行状态管理 Hook
 * 监听执行事件并同步到 canvasStore
 */
export function useNodeExecutionStatus() {
  const canvasStore = useCanvasStore();

  /**
   * 获取节点状态
   */
  function getNodeStatus(nodeId: string): NodeExecutionStatus | undefined {
    return canvasStore.getNodeExecutionStatus(nodeId);
  }

  /**
   * 设置节点状态
   */
  function setNodeStatus(nodeId: string, status: Partial<NodeExecutionStatus>) {
    canvasStore.setNodeExecutionStatus(nodeId, status);
  }

  /**
   * 清空所有节点状态
   */
  function clearAllStatuses() {
    canvasStore.clearNodeExecutionStatuses();
  }

  /**
   * 处理执行开始
   */
  function handleExecutionStart(payload: {
    executionId: string;
    workflowId: string;
  }) {
    console.log("[NodeExecutionStatus] 执行开始:", payload.executionId);
    canvasStore.currentExecutionId = payload.executionId;
    clearAllStatuses();
  }

  /**
   * 处理执行完成
   */
  function handleExecutionComplete(payload: { executionId: string }) {
    console.log("[NodeExecutionStatus] 执行完成:", payload.executionId);
    // 保留状态供用户查看，不立即清空
  }

  /**
   * 处理节点开始执行
   */
  function handleNodeStart(payload: ExecutionNodeEvent) {
    console.log("[NodeExecutionStatus] 节点开始:", payload.nodeId);
    setNodeStatus(payload.nodeId, {
      status: "running",
      startTime: Date.now(),
    });
  }

  /**
   * 处理节点执行完成
   */
  function handleNodeComplete(payload: ExecutionNodeCompleteEvent) {
    console.log(
      "[NodeExecutionStatus] 节点完成:",
      payload.nodeId,
      payload.result
    );
    const now = Date.now();
    setNodeStatus(payload.nodeId, {
      status: "success",
      endTime: now,
      timestamp: now,
      result: payload.result,
    });
  }

  /**
   * 处理节点执行错误
   */
  function handleNodeError(payload: ExecutionNodeErrorEvent) {
    console.log(
      "[NodeExecutionStatus] 节点错误:",
      payload.nodeId,
      payload.error
    );
    const now = Date.now();
    setNodeStatus(payload.nodeId, {
      status: "error",
      endTime: now,
      timestamp: now,
      error: payload.error,
    });
  }

  /**
   * 处理缓存命中
   */
  function handleCacheHit(payload: ExecutionCacheHitEvent) {
    console.log("[NodeExecutionStatus] 缓存命中:", payload.nodeId);
    const now = Date.now();
    setNodeStatus(payload.nodeId, {
      status: "cached",
      startTime: now,
      endTime: now,
      timestamp: now,
      duration: payload.cachedResult.duration,
      result: payload.cachedResult.outputs,
    });
  }

  // 监听执行事件
  eventBusUtils.on("execution:start", handleExecutionStart);
  eventBusUtils.on("execution:complete", handleExecutionComplete);
  eventBusUtils.on("execution:node:start", handleNodeStart);
  eventBusUtils.on("execution:node:complete", handleNodeComplete);
  eventBusUtils.on("execution:node:error", handleNodeError);
  eventBusUtils.on("execution:cache-hit", handleCacheHit);

  // 组件卸载时清理
  onUnmounted(() => {
    eventBusUtils.off("execution:start", handleExecutionStart);
    eventBusUtils.off("execution:complete", handleExecutionComplete);
    eventBusUtils.off("execution:node:start", handleNodeStart);
    eventBusUtils.off("execution:node:complete", handleNodeComplete);
    eventBusUtils.off("execution:node:error", handleNodeError);
    eventBusUtils.off("execution:cache-hit", handleCacheHit);
  });

  return {
    /** 节点状态映射 */
    nodeStatuses: canvasStore.nodeExecutionStatuses,
    /** 当前执行 ID */
    currentExecutionId: canvasStore.currentExecutionId,
    /** 获取节点状态 */
    getNodeStatus,
    /** 设置节点状态 */
    setNodeStatus,
    /** 清空所有状态 */
    clearAllStatuses,
  };
}
