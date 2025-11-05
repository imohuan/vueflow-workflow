/**
 * VueFlow 事件类型定义
 */

import type { Node, Edge, Connection } from "@vue-flow/core";

/**
 * 节点相关事件
 */
export interface NodeEvents {
  /** 节点被添加 */
  "node:added": { node: Node };
  /** 节点被删除 */
  "node:deleted": { nodeId: string };
  /** 节点被选中 */
  "node:selected": { node: Node };
  /** 节点被取消选中 */
  "node:deselected": { node: Node };
  /** 节点位置改变 */
  "node:moved": { node: Node; oldPosition: { x: number; y: number } };
  /** 节点数据更新 */
  "node:updated": { node: Node };
  /** 节点被点击 */
  "node:clicked": { node: Node; event: MouseEvent };
  /** 节点双击 */
  "node:double-clicked": { node: Node; event: MouseEvent };
  /** 节点右键 */
  "node:context-menu": { node: Node; event: MouseEvent };
}

/**
 * 边相关事件
 */
export interface EdgeEvents {
  /** 边被添加 */
  "edge:added": { edge: Edge };
  /** 边被删除 */
  "edge:deleted": { edgeId: string };
  /** 边被选中 */
  "edge:selected": { edge: Edge };
  /** 边被取消选中 */
  "edge:deselected": { edge: Edge };
  /** 边连接完成 */
  "edge:connected": { connection: Connection };
  /** 边数据更新 */
  "edge:updated": { edge: Edge };
}

/**
 * 画布相关事件
 */
export interface CanvasEvents {
  /** 画布缩放改变 */
  "canvas:zoom-changed": { zoom: number };
  /** 画布视口改变 */
  "canvas:viewport-changed": { x: number; y: number; zoom: number };
  /** 画布被点击 */
  "canvas:clicked": { event: MouseEvent };
  /** 画布适应视图 */
  "canvas:fit-view": { padding?: number };
  /** 画布清空 */
  "canvas:cleared": void;
}

/**
 * 工作流相关事件
 */
export interface WorkflowEvents {
  /** 工作流加载完成 */
  "workflow:loaded": { workflowId?: string };
  /** 工作流保存 */
  "workflow:saved": { workflowId: string };
  /** 工作流执行开始 */
  "workflow:execution-started": { workflowId?: string };
  /** 工作流执行完成 */
  "workflow:execution-completed": { workflowId?: string; success: boolean };
  /** 工作流验证 */
  "workflow:validated": { valid: boolean; errors?: string[] };
}

/**
 * 历史记录事件
 */
export interface HistoryEvents {
  /** 撤销 */
  "history:undo": void;
  /** 重做 */
  "history:redo": void;
  /** 历史记录改变 */
  "history:changed": { canUndo: boolean; canRedo: boolean };
}

/**
 * 所有事件类型合并
 */
export type VueFlowEventMap = NodeEvents &
  EdgeEvents &
  CanvasEvents &
  WorkflowEvents &
  HistoryEvents;

/**
 * 事件名称类型
 */
export type VueFlowEventName = keyof VueFlowEventMap;
