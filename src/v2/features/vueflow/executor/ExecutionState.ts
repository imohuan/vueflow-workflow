/**
 * 执行状态管理
 * 管理工作流执行的全局状态
 */

import { ref, computed, type Ref, type ComputedRef } from "vue";
import type {
  ExecutionState,
  ExecutionResult,
  NodeExecutionState,
} from "./types";

/**
 * 执行状态管理返回值
 */
export interface ExecutionStateManager {
  state: Ref<ExecutionState>;
  progress: Ref<number>;
  executionId: Ref<string | null>;
  workflowId: Ref<string | null>;
  nodeStates: Ref<Map<string, NodeExecutionState>>;
  lastResult: Ref<ExecutionResult | null>;
  isExecuting: ComputedRef<boolean>;
  isPaused: ComputedRef<boolean>;
  isCompleted: ComputedRef<boolean>;
  hasError: ComputedRef<boolean>;
  startTime: Ref<number | null>;
  endTime: Ref<number | null>;
  duration: ComputedRef<number | null>;

  setState(newState: ExecutionState): void;
  setProgress(newProgress: number): void;
  startExecution(execId: string, wfId: string): void;
  completeExecution(result: ExecutionResult): void;
  updateNodeState(nodeId: string, state: Partial<NodeExecutionState>): void;
  reset(): void;
}

/**
 * 使用执行状态管理
 */
export function useExecutionState(): ExecutionStateManager {
  const state = ref<ExecutionState>("idle");
  const progress = ref<number>(0);
  const executionId = ref<string | null>(null);
  const workflowId = ref<string | null>(null);
  const nodeStates = ref<Map<string, NodeExecutionState>>(new Map());
  const lastResult = ref<ExecutionResult | null>(null);
  const startTime = ref<number | null>(null);
  const endTime = ref<number | null>(null);

  const isExecuting = computed(() => state.value === "running");
  const isPaused = computed(() => state.value === "paused");
  const isCompleted = computed(() => state.value === "completed");
  const hasError = computed(() => state.value === "error");

  const duration = computed(() => {
    if (!startTime.value) return null;
    const end = endTime.value || Date.now();
    return end - startTime.value;
  });

  function setState(newState: ExecutionState): void {
    state.value = newState;
  }

  function setProgress(newProgress: number): void {
    progress.value = Math.max(0, Math.min(1, newProgress));
  }

  function startExecution(execId: string, wfId: string): void {
    executionId.value = execId;
    workflowId.value = wfId;
    state.value = "running";
    progress.value = 0;
    startTime.value = Date.now();
    endTime.value = null;
    nodeStates.value.clear();
  }

  function completeExecution(result: ExecutionResult): void {
    lastResult.value = result;
    state.value = result.success ? "completed" : "error";
    progress.value = 1;
    endTime.value = Date.now();

    if (result.nodeResults) {
      nodeStates.value = new Map(result.nodeResults);
    }
  }

  function updateNodeState(
    nodeId: string,
    stateUpdate: Partial<NodeExecutionState>
  ): void {
    const existing = nodeStates.value.get(nodeId) || {
      nodeId,
      status: "pending",
    };

    const updated = {
      ...existing,
      ...stateUpdate,
    };

    nodeStates.value.set(nodeId, updated);
    nodeStates.value = new Map(nodeStates.value);
  }

  function reset(): void {
    state.value = "idle";
    progress.value = 0;
    executionId.value = null;
    workflowId.value = null;
    nodeStates.value.clear();
    lastResult.value = null;
    startTime.value = null;
    endTime.value = null;
  }

  return {
    state,
    progress,
    executionId,
    workflowId,
    nodeStates,
    lastResult,
    isExecuting,
    isPaused,
    isCompleted,
    hasError,
    startTime,
    endTime,
    duration,
    setState,
    setProgress,
    startExecution,
    completeExecution,
    updateNodeState,
    reset,
  };
}
