/**
 * 节点剪贴板 Hook
 * 负责节点的复制、粘贴操作
 */
import { ref, type Ref } from "vue";
import type { Node, Edge } from "@vue-flow/core";
import type { NodeData } from "@/typings/nodeEditor";
import type { NodeClipboardData, NodeClipboardNode } from "./types";
import {
  cloneDeep,
  cleanupClonedNode,
  getNodeAbsolutePosition,
  getClipboardNodeDepth,
  generateCopiedNodeId,
  notifyContainerInternals,
} from "./utils";

export function useNodeClipboard(
  nodes: Ref<Node<NodeData>[]>,
  edges: Ref<Edge[]>,
  applyNodeLayerClass: (node: Node<NodeData>) => void,
  applyEdgeLayerClass: (edge: Edge) => void,
  refreshEdgeLayerClasses: () => void,
  updateContainerBounds: (container: Node<NodeData>) => void,
  generateUniqueName: (baseName: string) => string,
  onBatchStart: () => void,
  onBatchEnd: () => void,
  onSchedulePersist: () => void
) {
  const clipboard = ref<NodeClipboardData | null>(null);

  /** 清空剪贴板 */
  function clearClipboard() {
    clipboard.value = null;
  }

  /** 复制节点到剪贴板 */
  function copyNodesToClipboard(nodeIds: string[]) {
    if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
      clearClipboard();
      return;
    }

    const idSet = new Set(nodeIds.filter(Boolean));
    if (idSet.size === 0) {
      clearClipboard();
      return;
    }

    const selectedNodes = nodes.value.filter((node) => idSet.has(node.id));
    if (selectedNodes.length === 0) {
      clearClipboard();
      return;
    }

    const nodeMap = new Map(nodes.value.map((node) => [node.id, node]));
    const cache = new Map<string, { x: number; y: number }>();

    const clipboardNodes: NodeClipboardNode[] = selectedNodes.map((node) => {
      const absolutePosition = getNodeAbsolutePosition(node, nodeMap, cache);
      const clonedNode = cloneDeep(node);
      cleanupClonedNode(clonedNode);
      return {
        sourceId: node.id,
        node: clonedNode,
        absolutePosition,
      };
    });

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;

    clipboardNodes.forEach(({ absolutePosition }) => {
      minX = Math.min(minX, absolutePosition.x);
      minY = Math.min(minY, absolutePosition.y);
    });

    const anchor = {
      x: Number.isFinite(minX) ? minX : 0,
      y: Number.isFinite(minY) ? minY : 0,
    };

    const clipboardEdges = edges.value
      .filter((edge) => idSet.has(edge.source) && idSet.has(edge.target))
      .map((edge) => cloneDeep(edge));

    clipboard.value = {
      nodes: clipboardNodes,
      edges: clipboardEdges,
      anchor,
    };
  }

  /** 检查是否有剪贴板数据 */
  function hasClipboardData(): boolean {
    return Boolean(clipboard.value && clipboard.value.nodes.length > 0);
  }

  /** 粘贴剪贴板节点 */
  function pasteClipboardNodes(targetPosition: {
    x: number;
    y: number;
  }): string[] {
    const data = clipboard.value;
    if (!data || data.nodes.length === 0) {
      return [];
    }

    const offset = {
      x: targetPosition.x - data.anchor.x,
      y: targetPosition.y - data.anchor.y,
    };

    const idMap = new Map<string, string>();
    const absolutePositionMap = new Map<string, { x: number; y: number }>();
    const selectionMap = new Map<string, Node<NodeData>>();

    data.nodes.forEach((item) => {
      const newId = generateCopiedNodeId(item.node);
      idMap.set(item.sourceId, newId);
      absolutePositionMap.set(item.sourceId, {
        x: item.absolutePosition.x + offset.x,
        y: item.absolutePosition.y + offset.y,
      });
      selectionMap.set(item.sourceId, item.node);
    });

    const sortedNodes = [...data.nodes].sort(
      (a, b) =>
        getClipboardNodeDepth(a.node, selectionMap) -
        getClipboardNodeDepth(b.node, selectionMap)
    );

    const affectedContainers = new Set<string>();
    const newNodeIds: string[] = [];

    onBatchStart();
    try {
      sortedNodes.forEach((item) => {
        const originalNode = item.node;
        const newNode = cloneDeep(originalNode);
        cleanupClonedNode(newNode);

        const newId = idMap.get(item.sourceId);
        if (!newId) {
          return;
        }
        newNode.id = newId;

        const absolutePosition = absolutePositionMap.get(item.sourceId);
        if (!absolutePosition) {
          return;
        }

        const parentOldId = originalNode.parentNode;
        if (parentOldId && idMap.has(parentOldId)) {
          const parentNewId = idMap.get(parentOldId)!;
          newNode.parentNode = parentNewId;
          const parentAbs = absolutePositionMap.get(parentOldId);
          if (parentAbs) {
            newNode.position = {
              x: absolutePosition.x - parentAbs.x,
              y: absolutePosition.y - parentAbs.y,
            };
          } else {
            newNode.position = { ...absolutePosition };
          }
          affectedContainers.add(parentNewId);
        } else {
          if (newNode.parentNode) {
            delete newNode.parentNode;
          }
          newNode.position = { ...absolutePosition };
        }

        if (newNode.data) {
          newNode.data = { ...newNode.data };

          if (newNode.data.config) {
            newNode.data.config = cloneDeep(newNode.data.config);
            const configObj = newNode.data.config as Record<string, any>;
            ["containerId", "forNodeId"].forEach((key) => {
              const value = configObj[key];
              if (typeof value === "string") {
                if (idMap.has(value)) {
                  configObj[key] = idMap.get(value);
                } else {
                  delete configObj[key];
                }
              }
            });
          }

          if (newNode.data.inputs) {
            newNode.data.inputs = cloneDeep(newNode.data.inputs);
          }

          if (newNode.data.outputs) {
            newNode.data.outputs = cloneDeep(newNode.data.outputs);
          }

          if ("result" in newNode.data) {
            delete (newNode.data as any).result;
          }
          if ("resultExpanded" in newNode.data) {
            delete (newNode.data as any).resultExpanded;
          }

          if (typeof newNode.data.label === "string" && newNode.data.label) {
            newNode.data.label = generateUniqueName(newNode.data.label);
          }
        }

        applyNodeLayerClass(newNode);
        nodes.value.push(newNode);
        newNodeIds.push(newNode.id);

        if (newNode.type === "loopContainer") {
          affectedContainers.add(newNode.id);
        }

        notifyContainerInternals(newNode.id);
      });

      const edgeTimestamp = Date.now();
      data.edges.forEach((edge, index) => {
        const newSource = idMap.get(edge.source);
        const newTarget = idMap.get(edge.target);
        if (!newSource || !newTarget) {
          return;
        }

        const newEdge = cloneDeep(edge);
        newEdge.id = `edge_${edgeTimestamp + index}_${Math.random()
          .toString(36)
          .slice(2, 9)}`;
        newEdge.source = newSource;
        newEdge.target = newTarget;

        edges.value.push(newEdge);
        applyEdgeLayerClass(newEdge);
      });

      affectedContainers.forEach((containerId) => {
        const containerNode = nodes.value.find(
          (node) => node.id === containerId
        );
        if (containerNode) {
          updateContainerBounds(containerNode);
          notifyContainerInternals(containerNode.id);
        }
      });
    } finally {
      onBatchEnd();
      refreshEdgeLayerClasses();
    }

    onSchedulePersist();
    return newNodeIds;
  }

  return {
    clipboard,
    clearClipboard,
    copyNodesToClipboard,
    hasClipboardData,
    pasteClipboardNodes,
  };
}
