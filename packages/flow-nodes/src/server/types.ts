/**
 * 服务端 WebSocket 类型定义
 */

import type { Workflow, ExecutionOptions } from "../executor/types";

/**
 * 客户端发送的消息类型
 */
export type ClientMessage =
  | {
      type: "INIT";
    }
  | {
      type: "EXECUTE";
      payload: {
        workflow: Workflow;
        options?: ExecutionOptions;
      };
    }
  | {
      type: "PAUSE";
    }
  | {
      type: "RESUME";
    }
  | {
      type: "STOP";
    }
  | {
      type: "GET_CACHE_STATS";
      payload: {
        workflowId: string;
        requestId?: string;
      };
    }
  | {
      type: "CLEAR_CACHE";
      payload: {
        workflowId: string;
      };
    }
  | {
      type: "CLEAR_ALL_CACHE";
    }
  | {
      type: "GET_NODE_LIST";
      payload: {
        requestId?: string;
      };
    }
  | {
      type: "GET_HISTORY";
      payload: {
        requestId: string;
        workflowId?: string;
        limit?: number;
      };
    }
  | {
      type: "CLEAR_HISTORY";
      payload: {
        workflowId?: string;
      };
    }
  | {
      type: "DELETE_HISTORY";
      payload: {
        executionId: string;
      };
    };

/**
 * 服务端发送的消息类型
 */
export type ServerMessage =
  | {
      type: "INITIALIZED";
    }
  | {
      type: "EXECUTION_START";
      payload: {
        executionId: string;
        workflowId: string;
      };
    }
  | {
      type: "EXECUTION_COMPLETE";
      payload: any;
    }
  | {
      type: "EXECUTION_ERROR";
      payload: any;
    }
  | {
      type: "NODE_START";
      payload: {
        executionId: string;
        workflowId: string;
        nodeId: string;
      };
    }
  | {
      type: "NODE_COMPLETE";
      payload: {
        executionId: string;
        workflowId: string;
        nodeId: string;
        result: any;
      };
    }
  | {
      type: "NODE_ERROR";
      payload: {
        executionId: string;
        workflowId: string;
        nodeId: string;
        error: string;
      };
    }
  | {
      type: "PROGRESS";
      payload: {
        executionId?: string;
        workflowId?: string;
        progress: number;
      };
    }
  | {
      type: "CACHE_HIT";
      payload: {
        executionId: string;
        workflowId: string;
        nodeId: string;
        cachedResult: any;
      };
    }
  | {
      type: "ITERATION_UPDATE";
      payload: {
        executionId: string;
        workflowId: string;
        nodeId: string;
        iterationData: any;
      };
    }
  | {
      type: "STATE_CHANGE";
      payload: {
        executionId?: string;
        workflowId?: string;
        state: string;
      };
    }
  | {
      type: "CACHE_STATS";
      payload: {
        requestId?: string;
        stats: any;
      };
    }
  | {
      type: "NODE_LIST";
      payload: {
        requestId?: string;
        nodes: any[];
      };
    }
  | {
      type: "HISTORY_DATA";
      payload: {
        requestId: string;
        history: any[];
      };
    }
  | {
      type: "ERROR";
      payload: {
        message: string;
        stack?: string;
      };
    };

/**
 * 历史记录处理器
 */
export interface HistoryHandlers {
  /** 获取历史记录 */
  getHistory: (workflowId?: string, limit?: number) => Promise<any[]>;
  /** 保存历史记录 */
  saveHistory: (
    result: any,
    workflow?: { nodes?: any[]; edges?: any[] }
  ) => Promise<void>;
  /** 清空历史记录 */
  clearHistory: (workflowId?: string) => Promise<void>;
  /** 删除单个历史记录 */
  deleteHistory: (executionId: string) => Promise<void>;
}

/**
 * 服务器配置
 */
export interface ServerConfig {
  /** WebSocket 端口 */
  port: number;
  /** 主机地址 */
  host?: string;
  /** 节点类注册表 */
  nodeRegistry: Record<string, any>;
  /** 是否启用日志 */
  enableLogging?: boolean;
  /** 历史记录处理器（可选） */
  historyHandlers?: HistoryHandlers;
}
