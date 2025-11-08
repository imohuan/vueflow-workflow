/**
 * 工作流执行管理器
 * 根据配置自动选择 Worker 或 Server 模式
 */

import { ref, computed, inject } from "vue";
import {
  createWorkflowWorker,
  type UseWorkflowWorkerReturn,
} from "./useWorkflowWorker";
import {
  ensureWorkflowServerClient,
  resetWorkflowServerClient,
  type UseWorkflowServerClientReturn,
} from "./useWorkflowServerClient";
import type { Emitter } from "mitt";
import type { WorkflowEvents } from "../typings/workflowExecution";
import {
  getExecutionModeConfig,
  type ExecutionModeConfig,
} from "../config/executionMode";
import type { WorkflowNode, WorkflowEdge } from "workflow-node-executor";

const config = ref<ExecutionModeConfig>(getExecutionModeConfig());

// 全局共享的执行器实例
let workerExecutor: UseWorkflowWorkerReturn | null = null;
let serverExecutor: UseWorkflowServerClientReturn | null = null;
let serverExecutorUrl: string | null = null;

/**
 * 工作流执行管理器（单例模式）
 */
export function useWorkflowExecutionManager() {
  const emitter = inject<Emitter<WorkflowEvents>>("workflowEmitter");

  if (!emitter) {
    throw new Error(
      "workflowEmitter not provided. Make sure it's provided in main.ts"
    );
  }

  function ensureWorkerExecutor(): UseWorkflowWorkerReturn {
    if (!workerExecutor) {
      console.log(`[ExecutionManager] 初始化 Worker 执行器`);
      workerExecutor = createWorkflowWorker(emitter!);
    }
    return workerExecutor;
  }

  function ensureServerExecutor(
    serverUrl: string
  ): UseWorkflowServerClientReturn {
    if (!serverExecutor || serverExecutorUrl !== serverUrl) {
      console.log(`[ExecutionManager] 初始化/更新 Server 执行器: ${serverUrl}`);
      serverExecutor = ensureWorkflowServerClient(emitter!, serverUrl);
      serverExecutorUrl = serverUrl;
    }
    return serverExecutor;
  }

  function ensureActiveExecutor():
    | UseWorkflowWorkerReturn
    | UseWorkflowServerClientReturn {
    if (config.value.mode === "worker") {
      return ensureWorkerExecutor();
    }
    return ensureServerExecutor(config.value.serverUrl);
  }

  const executor = computed(() => ensureActiveExecutor());

  /**
   * 更新配置
   */
  function updateConfig(newConfig: ExecutionModeConfig) {
    const previousMode = config.value.mode;
    const previousUrl = config.value.serverUrl;
    const modeChanged = previousMode !== newConfig.mode;
    const urlChanged = previousUrl !== newConfig.serverUrl;

    console.log(`[ExecutionManager] 配置更新:`, {
      from: config.value,
      to: newConfig,
      modeChanged,
      urlChanged,
    });

    config.value = newConfig;

    if (modeChanged) {
      console.log(`[ExecutionManager] 切换模式 -> ${newConfig.mode}`);
      if (newConfig.mode === "worker") {
        if (serverExecutor) {
          console.log(`[ExecutionManager] 断开 Server 执行器`);
          resetWorkflowServerClient();
          serverExecutor = null;
          serverExecutorUrl = null;
        }
        ensureWorkerExecutor();
      } else {
        ensureServerExecutor(newConfig.serverUrl);
      }
    } else if (urlChanged && newConfig.mode === "server") {
      console.log(
        `[ExecutionManager] 更新 Server 地址 -> ${newConfig.serverUrl}`
      );
      resetWorkflowServerClient();
      serverExecutor = null;
      serverExecutorUrl = null;
      ensureServerExecutor(newConfig.serverUrl);
    } else {
      ensureActiveExecutor();
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
    const instance = executor.value;

    if (config.value.mode === "worker") {
      (instance as UseWorkflowWorkerReturn).executeWorkflow(
        executionId,
        workflowId,
        nodes,
        edges
      );
    } else {
      (instance as UseWorkflowServerClientReturn).executeWorkflow(
        executionId,
        workflowId,
        nodes,
        edges
      );
    }
  }

  /**
   * 等待执行器就绪
   */
  async function waitForReady(): Promise<void> {
    await executor.value.waitForReady();
  }

  return {
    config: computed(() => config.value),
    mode: computed(() => config.value.mode),
    serverUrl: computed(() => config.value.serverUrl),
    isReady: computed(() => executor.value?.isReady?.value ?? false),
    status: computed(() => executor.value?.status?.value ?? "disconnected"),
    nodeMetadata: computed(() => executor.value?.nodeMetadata?.value ?? []),
    updateConfig,
    executeWorkflow,
    waitForReady,
  };
}
