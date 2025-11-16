/**
 * VueFlow 执行系统类型定义
 */

import type {
  Workflow,
  ExecutionOptions,
  ExecutionResult,
  ExecutionState,
  CacheStats,
  ExecutionLifecycleEvent,
  ExecutionErrorEvent,
  CachedNodeResult,
  IterationResultData,
  WorkflowNode,
  WorkflowEdge,
} from "workflow-flow-nodes";

/**
 * 重新导出核心类型
 */
export type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  ExecutionOptions,
  ExecutionResult,
  NodeExecutionState,
  ExecutionState,
  CacheStats,
  ExecutionLifecycleEvent,
  ExecutionErrorEvent,
  CachedNodeResult,
  IterationResultData,
  IterationHistory,
} from "workflow-flow-nodes";

/**
 * 执行模式
 */
export type ExecutionMode = "worker" | "server";

/**
 * 执行配置
 */
export interface ExecutionConfig {
  mode: ExecutionMode;
  workerUrl?: string | URL;
  serverUrl?: string;
  timeout?: number;
  useCache?: boolean;
  autoReconnect?: boolean;
}

/**
 * 执行状态事件载荷
 */
export interface ExecutionStateEvent {
  executionId?: string;
  workflowId?: string;
  state: ExecutionState;
}

/**
 * 执行进度事件载荷
 */
export interface ExecutionProgressEvent {
  executionId?: string;
  workflowId?: string;
  progress: number;
}

/**
 * 节点执行事件基类
 */
export interface ExecutionNodeEvent {
  executionId: string;
  workflowId: string;
  nodeId: string;
}

export interface ExecutionNodeCompleteEvent extends ExecutionNodeEvent {
  result: any;
}

export interface ExecutionNodeErrorEvent extends ExecutionNodeEvent {
  error: string;
}

export interface ExecutionCacheHitEvent extends ExecutionNodeEvent {
  cachedResult: CachedNodeResult;
}

export interface ExecutionIterationUpdateEvent extends ExecutionNodeEvent {
  iterationData: IterationResultData;
}

/**
 * 主线程 → 执行通道 命令
 */
export type ExecutionCommand =
  | { type: "INIT" }
  | {
      type: "EXECUTE";
      payload: {
        workflow: Workflow;
        options?: ExecutionOptions;
      };
    }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "STOP" }
  | {
      type: "GET_CACHE_STATS";
      payload: {
        workflowId: string;
        requestId: string;
      };
    }
  | {
      type: "CLEAR_CACHE";
      payload: {
        workflowId: string;
      };
    }
  | { type: "CLEAR_ALL_CACHE" }
  | {
      type: "GET_NODE_LIST";
      payload: {
        requestId: string;
      };
    }
  | {
      type: "GET_HISTORY";
      payload: {
        requestId: string;
        executionId?: string;
        page?: number;
        pageSize?: number;
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
 * 执行通道 → 主线程 消息
 */
export type ExecutionEventMessage =
  | { type: "INITIALIZED" }
  | { type: "EXECUTION_START"; payload: ExecutionLifecycleEvent }
  | { type: "EXECUTION_COMPLETE"; payload: ExecutionResult }
  | { type: "EXECUTION_ERROR"; payload: ExecutionErrorEvent }
  | { type: "NODE_START"; payload: ExecutionNodeEvent }
  | { type: "NODE_COMPLETE"; payload: ExecutionNodeCompleteEvent }
  | { type: "NODE_ERROR"; payload: ExecutionNodeErrorEvent }
  | { type: "PROGRESS"; payload: ExecutionProgressEvent }
  | { type: "CACHE_HIT"; payload: ExecutionCacheHitEvent }
  | { type: "ITERATION_UPDATE"; payload: ExecutionIterationUpdateEvent }
  | {
      type: "CACHE_STATS";
      payload: {
        requestId: string;
        stats: CacheStats;
      };
    }
  | { type: "STATE_CHANGE"; payload: ExecutionStateEvent }
  | {
      type: "ERROR";
      payload: {
        message: string;
        stack?: string;
      };
    }
  | {
      type: "NODE_LIST";
      payload: {
        requestId: string;
        nodes: NodeMetadataItem[];
      };
    }
  | {
      type: "HISTORY_DATA";
      payload: {
        requestId: string;
        history: ExecutionHistoryRecord[];
        total: number;
        page: number;
        pageSize: number;
      };
    };

/**
 * 执行通道接口
 */
export interface ExecutionChannel {
  init(): Promise<void>;
  terminate(): void;
  send(message: ExecutionCommand): void;
  onMessage(handler: (message: ExecutionEventMessage) => void): void;
  offMessage(handler: (message: ExecutionEventMessage) => void): void;
}

/**
 * 执行历史记录
 */
export interface ExecutionHistoryRecord {
  executionId: string;
  workflowId: string;
  success: boolean;
  startTime: number;
  endTime: number;
  duration: number;
  error?: string;
  executedNodeCount: number;
  skippedNodeCount: number;
  cachedNodeCount: number;
  // 节点ID列表
  executedNodeIds: string[];
  skippedNodeIds: string[];
  cachedNodeIds: string[];
  // 节点执行结果（可选，用于恢复详细状态）
  nodeResults?: Record<string, any>;
  // 工作流结构快照（用于恢复工作流状态）
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

/**
 * 节点元数据项
 */
export interface NodeMetadataItem {
  type: string;
  label: string;
  description?: string;
  category?: string;
  icon?: string;
  tags?: string[];
  inputs: {
    name: string;
    type: string;
    description?: string;
    required?: boolean;
    defaultValue?: any;
    options?: Array<{
      label: string;
      value: string | number | boolean;
    }>;
  }[];
  outputs: {
    name: string;
    type: string;
    description?: string;
  }[];
}
