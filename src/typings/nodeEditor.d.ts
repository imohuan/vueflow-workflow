/**
 * 节点编辑器类型定义
 */

export type {
  PortDefinition,
  NodeData,
  NodeResult,
  NodeResultOutput,
  NodeResultData,
} from "workflow-node-executor";

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

export interface ConnectionValidationOptions {
  /** 是否忽略已存在连接的检测 */
  ignoreExisting?: boolean;
  /** 在忽略检测时排除的连接线 ID */
  ignoreEdgeId?: string | null;
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
