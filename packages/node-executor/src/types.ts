import type { BaseNode } from "./BaseNode.ts";

/**
 * 端口定义
 */
export interface PortDefinition {
  /** 端口ID */
  id: string;
  /** 端口名称 */
  name: string;
  /** 端口类型 */
  type: string;
  /** 端口说明 */
  description?: string;
  /** 是否必填 */
  required?: boolean;
  /** 是否为真正的端口（用于区分配置字段）默认为 false，表示配置字段 */
  isPort?: boolean;
}

/**
 * 节点执行结果输出
 */
export interface NodeResultOutput {
  /** 输出端口 ID */
  id: string;
  /** 输出名称 */
  label: string;
  /** 输出类型 */
  type: string;
  /** 输出值 */
  value: unknown;
  /** 输出描述 */
  description?: string;
}

/**
 * 节点执行结果数据
 */
export interface NodeResultData {
  /** 输出结果 */
  outputs: Record<string, NodeResultOutput>;
  /** 原始返回数据 */
  raw: unknown;
  /** 结果摘要 */
  summary?: string;
}

/**
 * 节点执行结果
 */
export interface NodeResult {
  /** 执行耗时（毫秒） */
  duration: number;
  /** 执行状态 */
  status: "success" | "error";
  /** 错误信息 */
  error?: string;
  /** 执行时间戳 */
  timestamp: number;
  /** 执行结果数据 */
  data: NodeResultData;
}

/**
 * 节点数据
 */
export interface NodeData {
  /** 节点配置数据 */
  config: Record<string, any>;
  /** 输入端口定义 */
  inputs: PortDefinition[];
  /** 输出端口定义 */
  outputs: PortDefinition[];
  /** 执行结果 */
  result?: NodeResult;
  /** 结果是否展开 */
  resultExpanded?: boolean;
  /** 节点执行状态 */
  executionStatus?: "pending" | "running" | "success" | "error" | "skipped";
  /** 节点执行错误信息 */
  executionError?: string;
  /** 节点标签 */
  label?: string;
  /** 节点分类 */
  category?: string;
  /** 节点宽度（可选） */
  width?: number;
  /** 节点高度（可选） */
  height?: number;
  /** 自定义节点变体标识 */
  variant?: string;
  /** 是否为容器节点 */
  isContainer?: boolean;
  /** 容器是否处于高亮状态（拖拽交集提示） */
  isHighlighted?: boolean;
  /** 容器高亮类型 */
  highlightType?: "normal" | "warning";
}

/**
 * 工作流状态类型
 */
export type WorkflowStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "aborted";

/**
 * 节点执行状态类型
 */
export type NodeExecutionStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "skipped";

/**
 * 工作流执行上下文
 * 用于在工作流执行过程中共享状态和数据
 */
export interface WorkflowExecutionContext {
  /** MCP 客户端实例（由初始化节点设置） */
  /** 其他共享数据 */
  [key: string]: unknown;
}

/**
 * 工作流节点
 */
export interface WorkflowNode {
  /** 节点唯一 ID */
  id: string;
  /** Vue Flow 节点类型，可选 */
  type?: string;
  /** 节点数据 */
  data: NodeData;
  /** 父节点 ID（容器节点使用） */
  parentNode?: string;
  /** 额外元数据 */
  meta?: Record<string, unknown>;
}

/**
 * 工作流边
 */
export interface WorkflowEdge {
  /** 边的唯一 ID */
  id?: string;
  /** 源节点 ID */
  source: string;
  /** 目标节点 ID */
  target: string;
  /** 源端口句柄 */
  sourceHandle?: string | null;
  /** 目标端口句柄 */
  targetHandle?: string | null;
}

/**
 * 工作流事件发射器接口
 * 兼容 mitt 和其他事件发射器
 */
export interface WorkflowEventEmitter<T = any> {
  emit(event: string, payload: T): void;
}

/**
 * 工作流执行器选项
 */
export interface WorkflowExecutorOptions<TNode extends BaseNode = BaseNode> {
  /** 工作流节点数组 */
  nodes: WorkflowNode[];
  /** 工作流边数组 */
  edges: WorkflowEdge[];
  /** 开始节点 ID（可选，如果不指定则自动查找） */
  startNodeId?: string;
  /** 节点工厂函数，根据节点类型创建节点实例 */
  nodeFactory?: (type: string) => TNode | undefined;
  /** 中止信号（用于取消执行） */
  signal?: AbortSignal;
  /** 日志 ID */
  logId?: string;
  /** 工作流事件发射器（用于实时预览） */
  emitter?: WorkflowEventEmitter<any>;
  /** 执行任务 ID（用于实时预览） */
  executionId?: string;
  /** 工作流 ID（用于实时预览） */
  workflowId?: string;
}

/**
 * 节点执行日志
 */
export interface NodeExecutionLog {
  /** 节点 ID */
  nodeId: string;
  /** 节点名称 */
  nodeName: string;
  /** 执行状态 */
  status: NodeExecutionStatus;
  /** 开始时间（时间戳） */
  startTime: number;
  /** 结束时间（时间戳） */
  endTime?: number;
  /** 输入数据 */
  input: Record<string, unknown> | null;
  /** 输出结果 */
  output?: NodeResult;
  /** 错误信息 */
  error?: string;
}

/**
 * 执行日志
 */
export interface ExecutionLog {
  /** 日志 ID */
  logId: string;
  /** 开始时间（时间戳） */
  startTime: number;
  /** 结束时间（时间戳） */
  endTime?: number;
  /** 执行状态 */
  status: Exclude<WorkflowStatus, "pending">;
  /** 节点执行日志数组 */
  nodes: NodeExecutionLog[];
  /** 错误信息 */
  error?: string;
}

/**
 * 工作流执行结果
 */
export interface WorkflowExecutionResult {
  /** 工作流执行状态 */
  status: WorkflowStatus;
  /** 执行日志 */
  log: ExecutionLog;
  /** 节点执行结果 */
  nodeResults: Record<string, NodeResult>;
  /** 执行后节点数据（包含 result） */
  nodes: WorkflowNode[];
  /** 未执行的节点列表 */
  skippedNodeIds: string[];
}
