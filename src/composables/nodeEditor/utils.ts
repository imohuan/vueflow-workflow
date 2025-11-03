/**
 * 节点编辑器工具函数
 */
import type { Node } from "@vue-flow/core";
import type { NodeData } from "@/typings/nodeEditor";
import type { PaddingValues } from "./types";
import { nodeEditorLayoutConfig } from "@/config";
import { getNodeEditorBridge } from "@/components/node-editor/nodeEditorBridge";

const { containerDefaults } = nodeEditorLayoutConfig;

export const DEFAULT_CONTAINER_PADDING: PaddingValues = {
  top: containerDefaults.padding.top,
  right: containerDefaults.padding.right,
  bottom: containerDefaults.padding.bottom,
  left: containerDefaults.padding.left,
};

export const CONTAINER_DEFAULT_WIDTH = containerDefaults.width;
export const CONTAINER_DEFAULT_HEIGHT = containerDefaults.height;
export const CONTAINER_HEADER_HEIGHT = containerDefaults.headerHeight;
export const CHILD_ESTIMATED_WIDTH = nodeEditorLayoutConfig.childEstimate.width;
export const CHILD_ESTIMATED_HEIGHT =
  nodeEditorLayoutConfig.childEstimate.height;

/** 节点层级类名 */
export const NODE_LAYER_CLASS_CONTAINER = "node-layer-container";
export const NODE_LAYER_CLASS_CHILD = "node-layer-child";
export const EDGE_LAYER_CLASS_CONTAINER = "edge-layer-container";

/** 深拷贝 */
export function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** 拷贝内边距配置 */
export function clonePadding(padding: PaddingValues): PaddingValues {
  return { ...padding };
}

/** 规范化内边距 */
export function normalizePadding(padding?: unknown): PaddingValues {
  const base = clonePadding(DEFAULT_CONTAINER_PADDING);
  if (!padding) {
    return base;
  }

  if (typeof padding !== "object" || padding === null) {
    return base;
  }

  const source = padding as Record<string, unknown>;

  const isNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

  if (isNumber(source.x)) {
    if (!isNumber(source.left)) {
      base.left = source.x;
    }
    if (!isNumber(source.right)) {
      base.right = source.x;
    }
  }

  if (isNumber(source.y)) {
    if (!isNumber(source.top)) {
      base.top = source.y;
    }
    if (!isNumber(source.bottom)) {
      base.bottom = source.y;
    }
  }

  if (isNumber(source.top)) {
    base.top = source.top;
  }
  if (isNumber(source.right)) {
    base.right = source.right;
  }
  if (isNumber(source.bottom)) {
    base.bottom = source.bottom;
  }
  if (isNumber(source.left)) {
    base.left = source.left;
  }

  return base;
}

/** 清理克隆节点的临时属性 */
export function cleanupClonedNode(node: Node<NodeData>) {
  delete (node as any).selected;
  delete (node as any).dragging;
  delete (node as any).positionAbsolute;
  delete (node as any).extent;
}

/** 从节点派生类型键 */
export function deriveNodeTypeKey(node: Node<NodeData>): string {
  if (node.type === "loopContainer") {
    return "loopContainer";
  }
  if (node.data?.variant) {
    return String(node.data.variant);
  }
  const prefix = node.id.split("_")[0];
  return prefix || "node";
}

/** 生成复制节点的 ID */
export function generateCopiedNodeId(node: Node<NodeData>): string {
  return `${deriveNodeTypeKey(node)}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

/** 获取节点类型键 */
export function getNodeTypeKey(node: Node<NodeData>): string {
  if (node.data?.variant) {
    return String(node.data.variant);
  }
  const prefix = node.id.split("_")[0];
  if (prefix) {
    return prefix;
  }
  return node.type || "";
}

/** 获取节点近似宽度 */
export function getNodeApproxWidth(node: Node<NodeData>): number {
  const anyNode: any = node;
  return (
    anyNode.dimensions?.width ?? anyNode.data?.width ?? CHILD_ESTIMATED_WIDTH
  );
}

/** 获取节点近似高度 */
export function getNodeApproxHeight(node: Node<NodeData>): number {
  const anyNode: any = node;
  return (
    anyNode.dimensions?.height ?? anyNode.data?.height ?? CHILD_ESTIMATED_HEIGHT
  );
}

/** 通知容器内部更新 */
export function notifyContainerInternals(id: string) {
  if (!id) return;
  const bridge = getNodeEditorBridge();
  if (!bridge) return;
  requestAnimationFrame(() => bridge.updateNodeInternals(id));
}

/** 获取节点绝对位置 */
export function getNodeAbsolutePosition(
  node: Node<NodeData>,
  nodeMap: Map<string, Node<NodeData>>,
  cache: Map<string, { x: number; y: number }>
): { x: number; y: number } {
  const cached = cache.get(node.id);
  if (cached) {
    return cached;
  }

  const baseX = node.position?.x ?? 0;
  const baseY = node.position?.y ?? 0;
  const result = { x: baseX, y: baseY };

  if (node.parentNode) {
    const parent = nodeMap.get(node.parentNode);
    if (parent) {
      const parentPosition = getNodeAbsolutePosition(parent, nodeMap, cache);
      result.x += parentPosition.x;
      result.y += parentPosition.y;
    }
  }

  cache.set(node.id, result);
  return result;
}

/** 获取剪贴板节点深度 */
export function getClipboardNodeDepth(
  node: Node<NodeData>,
  selectionMap: Map<string, Node<NodeData>>
): number {
  let depth = 0;
  let currentParentId = node.parentNode;
  while (currentParentId) {
    const parentNode = selectionMap.get(currentParentId);
    if (!parentNode) {
      break;
    }
    depth += 1;
    currentParentId = parentNode.parentNode;
  }
  return depth;
}
