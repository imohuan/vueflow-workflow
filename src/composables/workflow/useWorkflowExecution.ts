/**
 * 工作流执行状态管理 Composable
 *
 * 职责：
 * 1. 状态存储 - 维护所有执行任务的状态
 * 2. 事件监听 - 监听 mitt 事件并更新状态
 * 3. 状态查询 - 提供状态查询接口
 * 4. 恢复机制 - 支持执行状态恢复
 */

import { ref, computed, onMounted, onUnmounted, inject } from "vue";
import type { Emitter } from "mitt";
import {
  WorkflowEventType,
  type WorkflowEvents,
  type ExecutionContext,
  type NodeExecutionState,
  type ExecutionSnapshot,
  type WorkflowStartedPayload,
  type WorkflowCompletedPayload,
  type WorkflowErrorPayload,
  type NodeStatusPayload,
  type NodeProgressPayload,
  type NodeLogPayload,
  type EdgeActivePayload,
  type RestoreDataPayload,
} from "@/typings/workflowExecution";

// ==================== 状态定义 ====================

/** 状态管理器返回值 */
export interface UseWorkflowExecutionReturn {
  /** 当前活跃的执行任务 ID */
  activeExecutionId: Readonly<Ref<string | null>>;

  /** 所有执行任务的上下文 */
  executions: Readonly<Ref<Map<string, ExecutionContext>>>;

  /** 获取指定执行任务的节点状态 */
  getNodeStates: (
    executionId: string
  ) => Map<string, NodeExecutionState> | undefined;

  /** 获取指定节点的执行状态 */
  getNodeState: (
    executionId: string,
    nodeId: string
  ) => NodeExecutionState | undefined;

  /** 获取指定执行任务的激活边 */
  getActiveEdges: (executionId: string) => Set<string> | undefined;

  /** 判断某个边是否激活 */
  isEdgeActive: (executionId: string, edgeId: string) => boolean;

  /** 发送恢复请求 */
  requestRestore: (executionId: string, workflowId: string) => void;

  /** 清理指定执行任务的状态 */
  clearExecution: (executionId: string) => void;

  /** 清理所有已完成的执行任务 */
  clearCompletedExecutions: () => void;
}

// ==================== 主函数 ====================

export function useWorkflowExecution(
  currentWorkflowId?: Ref<string> | string
): UseWorkflowExecutionReturn {
  // 注入全局 emitter
  const emitter = inject<Emitter<WorkflowEvents>>("workflowEmitter");

  if (!emitter) {
    throw new Error(
      "workflowEmitter not provided. Make sure it's provided in main.ts"
    );
  }

  // ==================== 状态 ====================

  /** 当前活跃的执行任务 ID */
  const activeExecutionId = ref<string | null>(null);

  /** 所有执行任务的上下文 */
  const executions = ref(new Map<string, ExecutionContext>());

  /** 节点执行状态（按 executionId 分组） */
  const nodeStates = ref(new Map<string, Map<string, NodeExecutionState>>());

  /** 激活的边（按 executionId 分组） */
  const activeEdges = ref(new Map<string, Set<string>>());

  /** 执行历史快照（用于恢复，最多保留 5 个） */
  const snapshots = ref(new Map<string, ExecutionSnapshot>());

  // 当前工作流 ID（支持响应式和普通字符串）
  const workflowId = computed(() => {
    if (typeof currentWorkflowId === "string") {
      return currentWorkflowId;
    }
    return currentWorkflowId?.value || "";
  });

  // ==================== 辅助函数 ====================

  /** 判断事件是否应该被处理 */
  function shouldHandleEvent(payload: { executionId: string }): boolean {
    // 如果当前画布没有活跃执行，检查是否是当前工作流的执行
    if (!activeExecutionId.value) {
      const execution = executions.value.get(payload.executionId);
      return execution?.workflowId === workflowId.value;
    }

    // 只处理当前活跃的执行任务
    return payload.executionId === activeExecutionId.value;
  }

  /** 初始化执行任务的节点状态映射 */
  function ensureNodeStatesMap(executionId: string): void {
    if (!nodeStates.value.has(executionId)) {
      nodeStates.value.set(executionId, new Map());
    }
  }

  /** 初始化执行任务的边状态集合 */
  function ensureActiveEdgesSet(executionId: string): void {
    if (!activeEdges.value.has(executionId)) {
      activeEdges.value.set(executionId, new Set());
    }
  }

  /** 生成执行快照 */
  function createSnapshot(executionId: string): ExecutionSnapshot | null {
    const execution = executions.value.get(executionId);
    const nodes = nodeStates.value.get(executionId);
    const edges = activeEdges.value.get(executionId);

    if (!execution || !nodes) {
      return null;
    }

    // 将 Map 转换为 Record
    const nodesRecord: Record<string, NodeExecutionState> = {};
    nodes.forEach((state, nodeId) => {
      nodesRecord[nodeId] = state;
    });

    // 找到当前正在执行的节点
    let currentNodeId: string | undefined;
    nodes.forEach((state, nodeId) => {
      if (state.status === "running") {
        currentNodeId = nodeId;
      }
    });

    return {
      context: execution,
      nodes: nodesRecord,
      activeEdges: edges ? Array.from(edges) : [],
      snapshotTime: Date.now(),
      currentNodeId,
    };
  }

  /** 保存快照（限制数量） */
  function saveSnapshot(executionId: string): void {
    const snapshot = createSnapshot(executionId);
    if (snapshot) {
      snapshots.value.set(executionId, snapshot);

      // 限制快照数量为 5 个，清理最老的
      if (snapshots.value.size > 5) {
        const oldestKey = Array.from(snapshots.value.keys())[0];
        snapshots.value.delete(oldestKey);
      }
    }
  }

  // ==================== 事件处理器 ====================

  /** 处理工作流开始事件 */
  function handleWorkflowStarted(payload: WorkflowStartedPayload): void {
    const execution: ExecutionContext = {
      executionId: payload.executionId,
      workflowId: payload.workflowId,
      mode: payload.mode,
      startTime: payload.timestamp,
      status: "running",
    };

    executions.value.set(payload.executionId, execution);

    // 如果是当前工作流的执行，设置为活跃任务
    if (payload.workflowId === workflowId.value) {
      activeExecutionId.value = payload.executionId;
    }

    // 初始化状态映射
    ensureNodeStatesMap(payload.executionId);
    ensureActiveEdgesSet(payload.executionId);

    console.log(`[WorkflowExecution] 工作流开始执行: ${payload.executionId}`);
  }

  /** 处理工作流完成事件 */
  function handleWorkflowCompleted(payload: WorkflowCompletedPayload): void {
    if (!shouldHandleEvent(payload)) return;

    const execution = executions.value.get(payload.executionId);
    if (execution) {
      execution.status = "completed";
      executions.value.set(payload.executionId, execution);
    }

    // 保存最终快照
    saveSnapshot(payload.executionId);

    console.log(
      `[WorkflowExecution] 工作流执行完成: ${payload.executionId}, 耗时: ${payload.duration}ms`
    );
  }

  /** 处理工作流错误事件 */
  function handleWorkflowError(payload: WorkflowErrorPayload): void {
    if (!shouldHandleEvent(payload)) return;

    const execution = executions.value.get(payload.executionId);
    if (execution) {
      execution.status = "error";
      executions.value.set(payload.executionId, execution);
    }

    console.error(
      `[WorkflowExecution] 工作流执行错误: ${payload.executionId}`,
      payload.error
    );
  }

  /** 处理节点状态变化事件 */
  function handleNodeStatus(payload: NodeStatusPayload): void {
    if (!shouldHandleEvent(payload)) return;

    ensureNodeStatesMap(payload.executionId);

    const nodesMap = nodeStates.value.get(payload.executionId)!;
    const existingState = nodesMap.get(payload.nodeId);

    const newState: NodeExecutionState = {
      nodeId: payload.nodeId,
      status: payload.status,
      startTime: existingState?.startTime || payload.timestamp,
      endTime:
        payload.status === "success" || payload.status === "error"
          ? payload.timestamp
          : undefined,
      output: payload.output,
      error: payload.error,
    };

    nodesMap.set(payload.nodeId, newState);

    // 实时打印节点状态变化
    const statusEmoji = {
      pending: "⏸️",
      running: "🔵",
      success: "✅",
      error: "❌",
      skipped: "⏭️",
    };
    console.log(
      `${statusEmoji[payload.status] || "🔹"} 节点 ${payload.nodeId}: ${
        payload.status
      }`,
      payload.duration ? `耗时: ${payload.duration}ms` : "",
      payload.output ? payload.output : ""
    );

    // 节点状态变化时保存快照
    if (payload.status === "success" || payload.status === "error") {
      saveSnapshot(payload.executionId);
    }
  }

  /** 处理节点进度更新事件 */
  function handleNodeProgress(payload: NodeProgressPayload): void {
    if (!shouldHandleEvent(payload)) return;

    ensureNodeStatesMap(payload.executionId);

    const nodesMap = nodeStates.value.get(payload.executionId)!;
    const existingState = nodesMap.get(payload.nodeId);

    if (existingState) {
      existingState.progress = payload.progress;
      nodesMap.set(payload.nodeId, existingState);
    }
  }

  /** 处理节点日志事件 */
  function handleNodeLog(payload: NodeLogPayload): void {
    if (!shouldHandleEvent(payload)) return;

    ensureNodeStatesMap(payload.executionId);

    const nodesMap = nodeStates.value.get(payload.executionId)!;
    const existingState = nodesMap.get(payload.nodeId);

    if (existingState) {
      if (!existingState.logs) {
        existingState.logs = [];
      }
      existingState.logs.push({
        level: payload.level,
        message: payload.message,
        timestamp: payload.timestamp,
      });
      nodesMap.set(payload.nodeId, existingState);
    }
  }

  /** 处理边激活事件 */
  function handleEdgeActive(payload: EdgeActivePayload): void {
    if (!shouldHandleEvent(payload)) return;

    ensureActiveEdgesSet(payload.executionId);

    const edgesSet = activeEdges.value.get(payload.executionId)!;
    edgesSet.add(payload.edgeId);

    // 500ms 后自动移除激活状态（短暂的过渡动画）
    setTimeout(() => {
      edgesSet.delete(payload.edgeId);
    }, 500);
  }

  /** 处理恢复数据事件 */
  function handleRestoreData(payload: RestoreDataPayload): void {
    const { executionId, snapshot } = payload;

    // 恢复执行上下文
    executions.value.set(executionId, snapshot.context);

    // 恢复节点状态
    const nodesMap = new Map<string, NodeExecutionState>();
    Object.entries(snapshot.nodes).forEach(([nodeId, state]) => {
      nodesMap.set(nodeId, state);
    });
    nodeStates.value.set(executionId, nodesMap);

    // 恢复边状态
    const edgesSet = new Set<string>(snapshot.activeEdges);
    activeEdges.value.set(executionId, edgesSet);

    // 设置为活跃任务
    if (snapshot.context.workflowId === workflowId.value) {
      activeExecutionId.value = executionId;
    }

    console.log(`[WorkflowExecution] 执行状态已恢复: ${executionId}`);
  }

  // ==================== 公开方法 ====================

  /** 获取指定执行任务的节点状态 */
  function getNodeStates(
    executionId: string
  ): Map<string, NodeExecutionState> | undefined {
    return nodeStates.value.get(executionId);
  }

  /** 获取指定节点的执行状态 */
  function getNodeState(
    executionId: string,
    nodeId: string
  ): NodeExecutionState | undefined {
    return nodeStates.value.get(executionId)?.get(nodeId);
  }

  /** 获取指定执行任务的激活边 */
  function getActiveEdges(executionId: string): Set<string> | undefined {
    return activeEdges.value.get(executionId);
  }

  /** 判断某个边是否激活 */
  function isEdgeActive(executionId: string, edgeId: string): boolean {
    return activeEdges.value.get(executionId)?.has(edgeId) || false;
  }

  /** 发送恢复请求 */
  function requestRestore(executionId: string, workflowId: string): void {
    emitter.emit(WorkflowEventType.RESTORE_REQUEST, {
      executionId,
      workflowId,
      requestTime: Date.now(),
    });
  }

  /** 清理指定执行任务的状态 */
  function clearExecution(executionId: string): void {
    executions.value.delete(executionId);
    nodeStates.value.delete(executionId);
    activeEdges.value.delete(executionId);
    snapshots.value.delete(executionId);

    if (activeExecutionId.value === executionId) {
      activeExecutionId.value = null;
    }
  }

  /** 清理所有已完成的执行任务 */
  function clearCompletedExecutions(): void {
    const completedIds: string[] = [];

    executions.value.forEach((execution, executionId) => {
      if (execution.status === "completed" || execution.status === "error") {
        completedIds.push(executionId);
      }
    });

    completedIds.forEach((executionId) => {
      clearExecution(executionId);
    });

    console.log(
      `[WorkflowExecution] 已清理 ${completedIds.length} 个已完成的执行任务`
    );
  }

  // ==================== 生命周期 ====================

  onMounted(() => {
    // 注册事件监听器
    emitter.on(WorkflowEventType.STARTED, handleWorkflowStarted);
    emitter.on(WorkflowEventType.COMPLETED, handleWorkflowCompleted);
    emitter.on(WorkflowEventType.ERROR, handleWorkflowError);
    emitter.on(WorkflowEventType.NODE_STATUS, handleNodeStatus);
    emitter.on(WorkflowEventType.NODE_PROGRESS, handleNodeProgress);
    emitter.on(WorkflowEventType.NODE_LOG, handleNodeLog);
    emitter.on(WorkflowEventType.EDGE_ACTIVE, handleEdgeActive);
    emitter.on(WorkflowEventType.RESTORE_DATA, handleRestoreData);

    console.log("[WorkflowExecution] 状态管理器已初始化");
  });

  onUnmounted(() => {
    // 清理事件监听器
    emitter.off(WorkflowEventType.STARTED, handleWorkflowStarted);
    emitter.off(WorkflowEventType.COMPLETED, handleWorkflowCompleted);
    emitter.off(WorkflowEventType.ERROR, handleWorkflowError);
    emitter.off(WorkflowEventType.NODE_STATUS, handleNodeStatus);
    emitter.off(WorkflowEventType.NODE_PROGRESS, handleNodeProgress);
    emitter.off(WorkflowEventType.NODE_LOG, handleNodeLog);
    emitter.off(WorkflowEventType.EDGE_ACTIVE, handleEdgeActive);
    emitter.off(WorkflowEventType.RESTORE_DATA, handleRestoreData);

    console.log("[WorkflowExecution] 状态管理器已卸载");
  });

  // ==================== 返回 ====================

  return {
    activeExecutionId: computed(() => activeExecutionId.value),
    executions: computed(() => executions.value),
    getNodeStates,
    getNodeState,
    getActiveEdges,
    isEdgeActive,
    requestRestore,
    clearExecution,
    clearCompletedExecutions,
  };
}
