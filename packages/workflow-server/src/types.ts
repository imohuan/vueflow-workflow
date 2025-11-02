/**
 * 工作流服务器类型定义
 */

import type { WorkflowNode, WorkflowEdge } from "workflow-node-executor";

/** 从客户端接收的消息类型 */
export type ClientMessage =
  | {
      type: "INIT";
      payload?: {
        clientId?: string;
      };
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
      type: "PING";
      payload: {
        timestamp: number;
      };
    };

/** 发送给客户端的消息类型 */
export type ServerMessage =
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
        serverId: string;
        timestamp: number;
      };
    }
  | {
      type: "WORKFLOW_EVENT";
      payload: {
        eventType: string;
        eventData: any;
      };
    }
  | {
      type: "ERROR";
      payload: {
        message: string;
        stack?: string;
        code?: string;
      };
    }
  | {
      type: "PONG";
      payload: {
        timestamp: number;
        serverTimestamp: number;
      };
    };

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

/** 服务器配置 */
export interface ServerConfig {
  /** WebSocket 端口 */
  port: number;
  /** 主机地址 */
  host?: string;
  /** 心跳间隔（毫秒） */
  heartbeatInterval?: number;
  /** 最大连接数 */
  maxConnections?: number;
}

/** 客户端连接信息 */
export interface ClientConnection {
  id: string;
  ws: any; // WebSocket 实例
  connectedAt: number;
  lastPingAt: number;
}
