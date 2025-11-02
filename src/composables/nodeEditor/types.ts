/**
 * 节点编辑器 Hooks 共享类型定义
 */
import type { Node, Edge } from "@vue-flow/core";
import type { NodeData } from "@/typings/nodeEditor";

/** Dagre 布局方向 */
export type DagreLayoutDirection = "TB" | "BT" | "LR" | "RL";

/** 自动布局选项 */
export interface AutoLayoutOptions {
  /** 布局方向，默认自上而下 */
  direction?: DagreLayoutDirection;
  /** 节点水平间距 */
  nodesep?: number;
  /** 层级垂直间距 */
  ranksep?: number;
  /** 布局后整体额外边距 */
  padding?: number;
  /** For 容器与 For 节点的垂直间距 */
  loopContainerGap?: number;
}

/** 剪贴板节点 */
export interface NodeClipboardNode {
  sourceId: string;
  node: Node<NodeData>;
  absolutePosition: { x: number; y: number };
}

/** 剪贴板数据 */
export interface NodeClipboardData {
  nodes: NodeClipboardNode[];
  edges: Edge[];
  anchor: { x: number; y: number };
}

/** 容器内边距配置 */
export interface PaddingValues {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** 容器视觉配置 */
export interface ContainerVisualConfig {
  width: number;
  height: number;
  headerHeight: number;
  padding: PaddingValues;
}

/** 节点移动选项 */
export interface NodeMoveOptions {
  isDragging: boolean;
  recordHistory: boolean;
}

/** 历史记录快照 */
export interface HistorySnapshot {
  nodes: Node<NodeData>[];
  edges: Edge[];
}
