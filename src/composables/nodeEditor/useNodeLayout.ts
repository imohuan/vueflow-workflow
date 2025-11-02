/**
 * 节点布局管理 Hook
 * 负责自动布局、节点移动和容器内节点定位
 */
import type { Ref } from "vue";
import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@vue-flow/core";
import type { NodeData } from "@/typings/nodeEditor";
import type {
  AutoLayoutOptions,
  DagreLayoutDirection,
  NodeMoveOptions,
} from "./types";
import {
  getNodeApproxWidth,
  getNodeApproxHeight,
  notifyContainerInternals,
} from "./utils";

/** Ctrl 拖拽分离状态 */
const ctrlDetachState = new Map<string, { containerId: string }>();

export function useNodeLayout(
  nodes: Ref<Node<NodeData>[]>,
  edges: Ref<Edge[]>,
  getContainerVisualConfig: (node: Node<NodeData>) => any,
  ensureContainerCapacity: (
    container: Node<NodeData>,
    child: Node<NodeData>,
    position: { x: number; y: number }
  ) => any,
  clampChildPosition: (
    position: { x: number; y: number },
    config: any,
    child: Node<NodeData>
  ) => { x: number; y: number },
  updateContainerBounds: (container: Node<NodeData>) => void,
  layoutContainerChildren: (containerId: string) => void,
  refreshNodeLayerClasses: () => void,
  refreshEdgeLayerClasses: () => void,
  onRecordHistory: () => void,
  onRecordHistoryDebounced: () => void,
  onBatchStart: () => void,
  onBatchEnd: () => void
) {
  /** 移动节点（内部实现） */
  function moveNodeInternal(
    nodeId: string,
    position: { x: number; y: number },
    options: NodeMoveOptions
  ) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node) return;
    const { isDragging, recordHistory } = options;

    if (node.parentNode) {
      const container = nodes.value.find((n) => n.id === node.parentNode);
      if (container && container.type === "loopContainer") {
        if (ctrlDetachState.has(nodeId)) {
          node.position = position;
          if (recordHistory) {
            onRecordHistoryDebounced();
          }
          return;
        }

        if (isDragging) {
          node.position = position;
          notifyContainerInternals(node.id);
          return;
        }

        const { config: adjustedConfig, position: adjustedPosition } =
          ensureContainerCapacity(container, node, position);
        node.position = clampChildPosition(
          adjustedPosition,
          adjustedConfig,
          node
        );
        notifyContainerInternals(node.id);

        updateContainerBounds(container);
        notifyContainerInternals(container.id);
        if (recordHistory) {
          onRecordHistoryDebounced();
        }
        return;
      }
    }

    node.position = position;
    notifyContainerInternals(node.id);
    if (recordHistory) {
      onRecordHistoryDebounced();
    }
  }

  /** 更新节点位置 */
  function updateNodePosition(
    nodeId: string,
    position: { x: number; y: number },
    isDragging = false
  ) {
    moveNodeInternal(nodeId, position, {
      isDragging,
      recordHistory: true,
    });
  }

  /** 处理节点拖拽 */
  function handleNodeDrag(nodeId: string, position: { x: number; y: number }) {
    moveNodeInternal(nodeId, position, {
      isDragging: true,
      recordHistory: false,
    });
  }

  /** 处理节点拖拽停止 */
  function handleNodeDragStop(
    nodeId: string,
    position: { x: number; y: number }
  ) {
    moveNodeInternal(nodeId, position, {
      isDragging: false,
      recordHistory: true,
    });
  }

  /** 自动布局循环容器 */
  function autoLayoutLoopContainer(
    container: Node<NodeData>,
    layoutConfig: {
      direction: DagreLayoutDirection;
      nodesep: number;
      ranksep: number;
      padding: number;
    }
  ) {
    const children = nodes.value.filter(
      (node) => node.parentNode === container.id
    );

    if (children.length === 0) {
      return;
    }

    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({
      rankdir: layoutConfig.direction,
      nodesep: layoutConfig.nodesep,
      ranksep: layoutConfig.ranksep,
      marginx: 0,
      marginy: 0,
    });

    const childIds = new Set(children.map((child) => child.id));

    children.forEach((child) => {
      graph.setNode(child.id, {
        width: getNodeApproxWidth(child),
        height: getNodeApproxHeight(child),
      });
    });

    edges.value.forEach((edge) => {
      if (!childIds.has(edge.source) || !childIds.has(edge.target)) {
        return;
      }
      graph.setEdge(edge.source, edge.target);
    });

    dagre.layout(graph);

    interface ChildLayoutEntry {
      child: Node<NodeData>;
      rawX: number;
      rawY: number;
    }

    const layoutEntries: ChildLayoutEntry[] = [];
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;

    children.forEach((child) => {
      const metadata = graph.node(child.id) as
        | { x: number; y: number }
        | undefined;
      if (!metadata) {
        return;
      }

      const width = getNodeApproxWidth(child);
      const height = getNodeApproxHeight(child);
      const rawX = metadata.x - width / 2;
      const rawY = metadata.y - height / 2;

      if (rawX < minX) {
        minX = rawX;
      }
      if (rawY < minY) {
        minY = rawY;
      }

      layoutEntries.push({
        child,
        rawX,
        rawY,
      });
    });

    if (layoutEntries.length === 0) {
      return;
    }

    const baseX = Number.isFinite(minX) ? minX : 0;
    const baseY = Number.isFinite(minY) ? minY : 0;

    let containerConfig = getContainerVisualConfig(container);

    layoutEntries.forEach(({ child, rawX, rawY }) => {
      const desiredPosition = {
        x: rawX - baseX + containerConfig.padding.left + layoutConfig.padding,
        y:
          rawY -
          baseY +
          containerConfig.headerHeight +
          containerConfig.padding.top +
          layoutConfig.padding,
      };

      const { config: nextConfig, position: adjustedPosition } =
        ensureContainerCapacity(container, child, desiredPosition);
      const clamped = clampChildPosition(adjustedPosition, nextConfig, child);
      child.position = clamped;
      containerConfig = nextConfig;
      notifyContainerInternals(child.id);
    });

    updateContainerBounds(container);
    notifyContainerInternals(container.id);
  }

  /** 自动布局 */
  function autoLayout(options: AutoLayoutOptions = {}) {
    const topLevelNodes = nodes.value.filter((node) => !node.parentNode);

    if (topLevelNodes.length === 0) {
      return;
    }

    const direction = options.direction ?? "LR";
    const nodesep = options.nodesep ?? 160;
    const ranksep = options.ranksep ?? 240;
    const padding = options.padding ?? 120;
    const loopContainerGap = options.loopContainerGap ?? nodesep;

    const layoutCandidates = topLevelNodes.filter(
      (node) => node.type !== "loopContainer"
    );

    if (layoutCandidates.length === 0) {
      return;
    }

    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({
      rankdir: direction,
      nodesep,
      ranksep,
      marginx: 0,
      marginy: 0,
    });

    const layoutCandidateIds = new Set(layoutCandidates.map((node) => node.id));

    layoutCandidates.forEach((node) => {
      const width = getNodeApproxWidth(node);
      const height = getNodeApproxHeight(node);
      graph.setNode(node.id, { width, height });
    });

    edges.value.forEach((edge) => {
      if (
        !layoutCandidateIds.has(edge.source) ||
        !layoutCandidateIds.has(edge.target)
      ) {
        return;
      }

      graph.setEdge(edge.source, edge.target);
    });

    dagre.layout(graph);

    type PositionedNode = {
      node: Node<NodeData>;
      x: number;
      y: number;
      width: number;
      height: number;
    };

    const positionedNodes: PositionedNode[] = [];
    const forNodeLayout = new Map<string, PositionedNode>();

    layoutCandidates.forEach((node) => {
      const metadata = graph.node(node.id) as
        | { x: number; y: number }
        | undefined;

      if (!metadata) {
        return;
      }

      const width = getNodeApproxWidth(node);
      const height = getNodeApproxHeight(node);

      const rawX = metadata.x - width / 2;
      const rawY = metadata.y - height / 2;

      const entry: PositionedNode = {
        node,
        x: rawX,
        y: rawY,
        width,
        height,
      };

      positionedNodes.push(entry);

      if (node.data?.variant === "for") {
        forNodeLayout.set(node.id, entry);
      }
    });

    const loopContainers = topLevelNodes.filter(
      (node) => node.type === "loopContainer"
    );

    loopContainers.forEach((container) => {
      const width = getNodeApproxWidth(container);
      const height = getNodeApproxHeight(container);

      let rawX = container.position?.x ?? 0;
      let rawY = container.position?.y ?? 0;

      const forNodeId = (container.data?.config as any)?.forNodeId as
        | string
        | undefined;
      const forEntry = forNodeLayout.get(forNodeId ?? "");

      if (forEntry) {
        rawX = forEntry.x + (forEntry.width - width) / 2;
        rawY = forEntry.y + forEntry.height + loopContainerGap;
      }

      positionedNodes.push({
        node: container,
        x: rawX,
        y: rawY,
        width,
        height,
      });
    });

    if (positionedNodes.length === 0) {
      return;
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;

    positionedNodes.forEach(({ x, y }) => {
      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
    });

    const baseX = Number.isFinite(minX) ? minX : 0;
    const baseY = Number.isFinite(minY) ? minY : 0;

    onBatchStart();

    positionedNodes.forEach(({ node, x, y }) => {
      const nextPosition = {
        x: x - baseX + padding,
        y: y - baseY + padding,
      };

      moveNodeInternal(node.id, nextPosition, {
        isDragging: false,
        recordHistory: false,
      });
    });

    const containerLayoutConfig = {
      direction,
      nodesep,
      ranksep,
      padding: Math.min(padding, 64),
    };

    loopContainers.forEach((container) => {
      autoLayoutLoopContainer(container, containerLayoutConfig);
    });

    onBatchEnd();
  }

  /** 开始节点从容器中分离（Ctrl 拖拽） */
  function beginNodeDetachFromContainer(nodeId: string): string | null {
    if (ctrlDetachState.has(nodeId)) {
      return ctrlDetachState.get(nodeId)!.containerId;
    }

    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node || !node.parentNode) {
      return null;
    }

    const containerId = node.parentNode;
    ctrlDetachState.set(nodeId, {
      containerId,
    });

    return containerId;
  }

  /** 完成节点从容器中分离 */
  function finalizeNodeDetachFromContainer(
    nodeId: string,
    options: { keepInContainer: boolean; recordHistory?: boolean }
  ) {
    const state = ctrlDetachState.get(nodeId);
    if (!state) {
      return;
    }
    ctrlDetachState.delete(nodeId);

    const node = nodes.value.find((n) => n.id === nodeId);
    const container = nodes.value.find((n) => n.id === state.containerId);

    if (!node) {
      return;
    }

    if (options.keepInContainer && container) {
      node.parentNode = container.id;

      const desiredPosition = {
        x: node.position.x,
        y: node.position.y,
      };

      const { config, position: adjustedPosition } = ensureContainerCapacity(
        container,
        node,
        desiredPosition
      );
      const clamped = clampChildPosition(adjustedPosition, config, node);
      node.position = clamped;
      notifyContainerInternals(node.id);

      updateContainerBounds(container);
      layoutContainerChildren(container.id);
      notifyContainerInternals(container.id);
    } else {
      // 节点移出容器时，移除与容器及其内部节点的连接线
      let removedContainerEdges = false;
      const relatedNodeIds = new Set<string>();
      if (state.containerId) {
        relatedNodeIds.add(state.containerId);
      }

      nodes.value.forEach((n) => {
        if (n.parentNode === state.containerId) {
          relatedNodeIds.add(n.id);
        }
      });

      if (relatedNodeIds.size > 0) {
        const filteredEdges = edges.value.filter((edge) => {
          const isSourceNode = edge.source === nodeId;
          const isTargetNode = edge.target === nodeId;

          if (!isSourceNode && !isTargetNode) {
            return true;
          }

          const otherNodeId = isSourceNode ? edge.target : edge.source;
          if (relatedNodeIds.has(otherNodeId)) {
            removedContainerEdges = true;
            return false;
          }

          return true;
        });

        if (removedContainerEdges) {
          edges.value = filteredEdges;
        }
      }

      if (container) {
        const absolutePosition = {
          x: container.position.x + node.position.x,
          y: container.position.y + node.position.y,
        };

        node.parentNode = undefined;
        node.position = absolutePosition;
        notifyContainerInternals(node.id);

        updateContainerBounds(container);
        notifyContainerInternals(container.id);
      } else {
        node.parentNode = undefined;
        notifyContainerInternals(node.id);
      }
    }

    refreshNodeLayerClasses();
    refreshEdgeLayerClasses();
    if (options.recordHistory !== false) {
      onRecordHistory();
    }
  }

  /** 将节点移入容器 */
  function moveNodeIntoContainer(nodeId: string, containerId: string) {
    const node = nodes.value.find((n) => n.id === nodeId);
    const container = nodes.value.find((n) => n.id === containerId);

    if (!node || !container) return;

    const relativeX = node.position.x - container.position.x;
    const relativeY = node.position.y - container.position.y;

    node.parentNode = containerId;
    node.position = {
      x: relativeX,
      y: relativeY,
    };

    const { config: adjustedConfig, position: adjustedPosition } =
      ensureContainerCapacity(container, node, node.position);
    node.position = clampChildPosition(adjustedPosition, adjustedConfig, node);
    notifyContainerInternals(nodeId);

    updateContainerBounds(container);
    layoutContainerChildren(containerId);

    refreshNodeLayerClasses();
    refreshEdgeLayerClasses();

    onRecordHistory();

    notifyContainerInternals(containerId);
  }

  return {
    updateNodePosition,
    handleNodeDrag,
    handleNodeDragStop,
    autoLayout,
    beginNodeDetachFromContainer,
    finalizeNodeDetachFromContainer,
    moveNodeIntoContainer,
  };
}
