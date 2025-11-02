/**
 * 工作流执行器
 * 负责执行工作流并通过 WebSocket 发送事件
 */

import {
  executeWorkflow,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowExecutorOptions,
} from "workflow-node-executor";
import type { NodeRegistryManager } from "./nodeRegistry.js";
import type { ServerMessage } from "./types.js";

export class WorkflowExecutor {
  constructor(private nodeRegistry: NodeRegistryManager) {}

  /**
   * 执行工作流
   */
  async execute(
    executionId: string,
    workflowId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    sendMessage: (message: ServerMessage) => void
  ): Promise<void> {
    console.log(
      `[Executor] 开始执行工作流: ${workflowId} (执行ID: ${executionId})`
    );

    try {
      // 创建事件发射器（将事件通过 WebSocket 发送到客户端）
      const emitter = this.createEventEmitter(sendMessage);

      const options: WorkflowExecutorOptions = {
        nodes,
        edges,
        nodeFactory: (type) => this.nodeRegistry.getNodeByType(type),
        emitter: emitter as any,
        executionId,
        workflowId,
      };

      const result = await executeWorkflow(options);

      console.log(`[Executor] ✅ 工作流执行完成: ${executionId}`, result);
    } catch (error) {
      console.error(`[Executor] ❌ 工作流执行失败: ${executionId}`, error);

      // 发送错误消息
      sendMessage({
        type: "ERROR",
        payload: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          code: "WORKFLOW_EXECUTION_ERROR",
        },
      });
    }
  }

  /**
   * 创建事件发射器
   */
  private createEventEmitter(sendMessage: (message: ServerMessage) => void) {
    return {
      emit(eventType: string, eventData: any) {
        const message: ServerMessage = {
          type: "WORKFLOW_EVENT",
          payload: {
            eventType,
            eventData,
          },
        };
        sendMessage(message);
      },
      on() {
        // 服务器端不需要监听事件
      },
      off() {
        // 服务器端不需要取消监听
      },
    };
  }
}
