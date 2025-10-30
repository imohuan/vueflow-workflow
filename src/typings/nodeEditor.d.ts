/**
 * 节点编辑器类型定义
 */

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
 * 节点执行结果
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

export interface NodeResultData {
  /** 输出结果 */
  outputs: Record<string, NodeResultOutput>;
  /** 原始返回数据 */
  raw: unknown;
  /** 结果摘要 */
  summary?: string;
}

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
 * 节点类型
 */
export type NodeType = "custom" | "input" | "output" | "process";

/**
 * 连接线类型
 */
export type EdgeType = "default" | "step" | "smoothstep" | "straight";

/**
 * 连接对象
 */
export interface Connection {
  /** 源节点ID */
  source: string;
  /** 源端口ID */
  sourceHandle: string | null;
  /** 目标节点ID */
  target: string;
  /** 目标端口ID */
  targetHandle: string | null;
}

/**
 * 画布状态
 */
export interface CanvasState {
  /** 缩放比例 */
  zoom: number;
  /** 平移偏移 */
  pan: { x: number; y: number };
  /** 当前选中节点ID */
  selectedNodeId: string | null;
  /** 是否正在连接 */
  isConnecting: boolean;
  /** 连接起点 */
  connectingFrom: { nodeId: string; handleId: string } | null;
}
