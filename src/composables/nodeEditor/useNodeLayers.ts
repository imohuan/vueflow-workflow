/**
 * 节点层级管理 Hook
 * 负责管理节点和边的 CSS 类名，用于层级控制
 */
import type { Ref } from "vue";
import type { Node, Edge } from "@vue-flow/core";
import type { NodeData } from "../../typings/nodeEditor";
import {
  NODE_LAYER_CLASS_CONTAINER,
  NODE_LAYER_CLASS_CHILD,
  EDGE_LAYER_CLASS_CONTAINER,
} from "./utils";

export function useNodeLayers(
  nodes: Ref<Node<NodeData>[]>,
  edges: Ref<Edge[]>
) {
  /** 提取类名数组 */
  function extractClassNames(value: Edge["class"]): string[] {
    if (!value) return [];
    if (typeof value === "string") {
      return value.split(/\s+/).filter(Boolean);
    }
    if (Array.isArray(value)) {
      return value
        .flatMap((item) =>
          typeof item === "string" ? item.split(/\s+/).filter(Boolean) : []
        )
        .filter(Boolean);
    }
    if (typeof value === "object") {
      return Object.entries(value)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([name]) => name)
        .filter(Boolean);
    }
    return [];
  }

  /** 应用节点层级类 */
  function applyNodeLayerClass(node: Node<NodeData>) {
    if (!node) return;
    const existing =
      typeof node.class === "string"
        ? node.class
            .split(/\s+/)
            .filter(
              (cls) =>
                cls &&
                cls !== NODE_LAYER_CLASS_CONTAINER &&
                cls !== NODE_LAYER_CLASS_CHILD
            )
        : [];

    if (node.type === "loopContainer" || node.data?.isContainer) {
      existing.push(NODE_LAYER_CLASS_CONTAINER);
    }

    if (node.parentNode) {
      existing.push(NODE_LAYER_CLASS_CHILD);
    }

    node.class = existing.join(" ");
  }

  /** 刷新节点层级类 */
  function refreshNodeLayerClasses() {
    // TODO： 暂时不需要这个功能，因为节点层级管理已经通过 edge-layer-container 来管理了
    // nodes.value.forEach((node) => applyNodeLayerClass(node));
  }

  /** 应用边层级类 */
  function applyEdgeLayerClass(edge: Edge) {
    if (!edge) return;
    const classNames = extractClassNames(edge.class).filter(
      (cls) => cls !== EDGE_LAYER_CLASS_CONTAINER
    );

    const sourceNode = nodes.value.find((n) => n.id === edge.source);
    const targetNode = nodes.value.find((n) => n.id === edge.target);

    const sourceParent = sourceNode?.parentNode ?? null;
    const targetParent = targetNode?.parentNode ?? null;

    const isContainerEdge = Boolean(
      (sourceParent && sourceParent === targetParent) ||
        (sourceNode?.type === "loopContainer" &&
          targetParent === sourceNode.id) ||
        (targetNode?.type === "loopContainer" && sourceParent === targetNode.id)
    );

    if (isContainerEdge) {
      classNames.push(EDGE_LAYER_CLASS_CONTAINER);
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => {
          const edgeElement = document.querySelector<SVGGElement>(
            `[data-id="${edge.id}"]`
          );
          const parentSvg = edgeElement?.parentElement;
          if (!parentSvg) return;

          if (isContainerEdge) {
            parentSvg.classList.add(EDGE_LAYER_CLASS_CONTAINER);
          } else {
            parentSvg.classList.remove(EDGE_LAYER_CLASS_CONTAINER);
          }
        });
      }
    }
  }

  /** 刷新边层级类 */
  function refreshEdgeLayerClasses() {
    edges.value.forEach((edge) => applyEdgeLayerClass(edge));
  }

  return {
    applyNodeLayerClass,
    refreshNodeLayerClasses,
    applyEdgeLayerClass,
    refreshEdgeLayerClasses,
  };
}
