/**
 * 节点执行状态管理
 * 监听执行事件并维护节点执行状态
 */

import { ref, onUnmounted } from "vue";
import { eventBusUtils } from "../events";
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
  /** 错误信息 */
  error?: string;
}

/**
 * 节点执行状态管理 Hook
 */
export function useNodeExecutionStatus() {
  /** 节点状态映射 */
  const nodeStatuses = ref<Map<string, NodeExecutionStatus>>(new Map());

  /** 当前执行 ID */
  const currentExecutionId = ref<string | null>(null);

  /**
   * 获取节点状态
   */
  function getNodeStatus(nodeId: string): NodeExecutionStatus | undefined {
    return nodeStatuses.value.get(nodeId);
  }

  /**
   * 设置节点状态
   */
  function setNodeStatus(nodeId: string, status: Partial<NodeExecutionStatus>) {
    const current = nodeStatuses.value.get(nodeId);
    const updated: NodeExecutionStatus = {
      nodeId,
      status: "pending",
      ...current,
      ...status,
    };

    // 计算执行时长
    if (updated.startTime && updated.endTime) {
      updated.duration = updated.endTime - updated.startTime;
    }

    nodeStatuses.value.set(nodeId, updated);
  }

  /**
   * 清空所有节点状态
   */
  function clearAllStatuses() {
    nodeStatuses.value.clear();
    currentExecutionId.value = null;
  }

  /**
   * 处理执行开始
   */
  function handleExecutionStart(payload: {
    executionId: string;
    workflowId: string;
  }) {
    console.log("[NodeExecutionStatus] 执行开始:", payload.executionId);
    currentExecutionId.value = payload.executionId;
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
    console.log("[NodeExecutionStatus] 节点完成:", payload.nodeId);
    setNodeStatus(payload.nodeId, {
      status: "success",
      endTime: Date.now(),
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
    setNodeStatus(payload.nodeId, {
      status: "error",
      endTime: Date.now(),
      error: payload.error,
    });
  }

  /**
   * 处理缓存命中
   */
  function handleCacheHit(payload: ExecutionCacheHitEvent) {
    console.log("[NodeExecutionStatus] 缓存命中:", payload.nodeId);
    setNodeStatus(payload.nodeId, {
      status: "cached",
      startTime: Date.now(),
      endTime: Date.now(),
      duration: payload.cachedResult.duration,
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
    nodeStatuses,
    /** 当前执行 ID */
    currentExecutionId,
    /** 获取节点状态 */
    getNodeStatus,
    /** 设置节点状态 */
    setNodeStatus,
    /** 清空所有状态 */
    clearAllStatuses,
  };
}
