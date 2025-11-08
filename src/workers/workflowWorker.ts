/**
 * 工作流执行 Worker
 *
 * 职责：
 * 1. 加载和管理节点注册表
 * 2. 执行工作流
 * 3. 实时发送执行事件到主线程
 */

import { BrowserNodeRegistry } from "workflow-browser-nodes";
import {
  CoreNodeRegistry,
  executeWorkflow,
  type BaseNode,
} from "workflow-node-executor";
import type { WorkflowExecutorOptions } from "workflow-node-executor";
import type { WorkflowEvents } from "../typings/workflowExecution";
import type { WorkflowNode, WorkflowEdge } from "workflow-node-executor";

// ==================== Worker 消息类型定义 ====================

/** 从主线程接收的消息类型 */
type WorkerMessageFromMain =
  | {
      type: "INIT";
    }
  | {
      type: "EXECUTE_WORKFLOW";
      payload: {
        executionId: string;
        workflowId: string;
        nodes: WorkflowNode[];
        edges: WorkflowEdge[];
      };
    }
  | {
      type: "REGISTER_NODES";
      payload: {
        nodes: any[]; // 动态注册的节点元数据
      };
    };

/** 发送到主线程的消息类型 */
type WorkerMessageToMain =
  | {
      type: "INITIALIZED";
      payload: {
        nodeMetadata: Array<{
          type: string;
          label: string;
          description: string;
          category: string;
          inputs: any[];
          outputs: any[];
          defaultConfig: Record<string, any>;
        }>;
      };
    }
  | {
      type: "WORKFLOW_EVENT";
      payload: {
        eventType: keyof WorkflowEvents;
        eventData: any;
      };
    }
  | {
      type: "ERROR";
      payload: {
        message: string;
        stack?: string;
      };
    };

// ==================== 节点注册表管理 ====================

/** 节点注册表列表 */
const nodeRegistries = [new CoreNodeRegistry(), new BrowserNodeRegistry()];

/** 节点类型映射表（用于快速查找） */
const nodeTypeMap = new Map<string, BaseNode>();

/**
 * 初始化节点注册表
 */
function initializeNodeRegistry() {
  nodeRegistries.forEach((registry) => {
    const nodes = registry.getAllNodes();
    nodes.forEach((node: BaseNode) => {
      nodeTypeMap.set(node.type, node);
    });
  });

  console.log(`[Worker] 已加载 ${nodeTypeMap.size} 个节点`);
}

/**
 * 获取节点实例（节点工厂函数）
 */
function getNodeByType(type: string): BaseNode | undefined {
  return nodeTypeMap.get(type);
}

/**
 * 提取节点元数据
 */
function extractNodeMetadata() {
  const metadata: Array<{
    type: string;
    label: string;
    description: string;
    category: string;
    inputs: any[];
    outputs: any[];
    defaultConfig: Record<string, any>;
  }> = [];

  nodeTypeMap.forEach((node) => {
    const nodeData = node.createNodeData();
    metadata.push({
      type: node.type,
      label: node.label,
      description: node.description,
      category: node.category,
      inputs: nodeData.inputs,
      outputs: nodeData.outputs,
      defaultConfig: nodeData.config,
    });
  });

  return metadata;
}

// ==================== 工作流执行 ====================

/**
 * 创建事件发射器（将事件发送到主线程）
 */
function createWorkerEmitter() {
  return {
    emit(eventType: keyof WorkflowEvents, eventData: any) {
      const message: WorkerMessageToMain = {
        type: "WORKFLOW_EVENT",
        payload: {
          eventType,
          eventData,
        },
      };
      self.postMessage(message);
    },
    on() {
      // Worker 中不需要监听事件
    },
    off() {
      // Worker 中不需要取消监听
    },
  };
}

/**
 * 执行工作流
 */
async function executeWorkflowInWorker(
  executionId: string,
  workflowId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
) {
  try {
    const emitter = createWorkerEmitter();

    const options: WorkflowExecutorOptions = {
      nodes,
      edges,
      nodeFactory: getNodeByType,
      emitter: emitter as any,
      executionId,
      workflowId,
    };

    const result = await executeWorkflow(options);

    console.log(`[Worker] 工作流执行完成: ${executionId}`, result);
  } catch (error) {
    console.error(`[Worker] 工作流执行失败: ${executionId}`, error);

    // 发送错误消息到主线程
    const errorMessage: WorkerMessageToMain = {
      type: "ERROR",
      payload: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    };
    self.postMessage(errorMessage);
  }
}

// ==================== 消息处理 ====================

/**
 * 处理来自主线程的消息
 */
self.addEventListener(
  "message",
  async (event: MessageEvent<WorkerMessageFromMain>) => {
    const message = event.data;

    switch (message.type) {
      case "INIT": {
        try {
          // 初始化节点注册表
          initializeNodeRegistry();

          // 提取节点元数据
          const nodeMetadata = extractNodeMetadata();

          // 发送初始化完成消息
          const response: WorkerMessageToMain = {
            type: "INITIALIZED",
            payload: {
              nodeMetadata,
            },
          };
          self.postMessage(response);

          console.log(
            `[Worker] 初始化完成，已发送 ${nodeMetadata.length} 个节点元数据`
          );
        } catch (error) {
          console.error("[Worker] 初始化失败", error);
          const errorMessage: WorkerMessageToMain = {
            type: "ERROR",
            payload: {
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
          };
          self.postMessage(errorMessage);
        }
        break;
      }

      case "EXECUTE_WORKFLOW": {
        const { executionId, workflowId, nodes, edges } = message.payload;
        console.log(`[Worker] 收到执行请求: ${executionId}`, { nodes, edges });

        // 异步执行工作流（不阻塞消息处理）
        executeWorkflowInWorker(executionId, workflowId, nodes, edges);
        break;
      }

      case "REGISTER_NODES": {
        // TODO: 实现动态节点注册（用于未来的服务器模式）
        console.log("[Worker] 动态节点注册功能尚未实现");
        break;
      }

      default: {
        console.warn("[Worker] 未知消息类型", message);
      }
    }
  }
);

// ==================== Worker 生命周期 ====================

console.log("[Worker] 工作流执行 Worker 已启动");
