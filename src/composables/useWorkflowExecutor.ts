/**
 * 工作流执行器 Composable
 *
 * 职责：
 * 1. 提供执行工作流的接口
 * 2. 使用 Worker 执行工作流
 * 3. 生成唯一的执行 ID
 */

import { useWorkflowWorker } from "./useWorkflowWorker";
import type { WorkflowNode, WorkflowEdge } from "workflow-node-executor";

export interface UseWorkflowExecutorReturn {
  /** 执行工作流 */
  execute: (
    workflowId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ) => string;

  /** Worker 是否就绪 */
  isReady: () => boolean;

  /** 等待 Worker 就绪 */
  waitForReady: () => Promise<void>;
}

/**
 * 生成唯一的执行 ID
 */
function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 使用工作流执行器
 */
export function useWorkflowExecutor(): UseWorkflowExecutorReturn {
  const worker = useWorkflowWorker();

  /**
   * 执行工作流
   * @param workflowId - 工作流 ID
   * @param nodes - 节点列表
   * @param edges - 边列表
   * @returns 执行 ID
   */
  function execute(
    workflowId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): string {
    if (worker.status.value !== "ready") {
      throw new Error(
        `Worker 状态异常: ${worker.status.value}，无法执行工作流`
      );
    }

    // 生成执行 ID
    const executionId = generateExecutionId();

    // 发送执行请求到 Worker
    worker.executeWorkflow(executionId, workflowId, nodes, edges);

    return executionId;
  }

  /**
   * 检查 Worker 是否就绪
   */
  function isReady(): boolean {
    return worker.status.value === "ready";
  }

  /**
   * 等待 Worker 就绪
   */
  async function waitForReady(): Promise<void> {
    await worker.waitForReady();
  }

  return {
    execute,
    isReady,
    waitForReady,
  };
}


