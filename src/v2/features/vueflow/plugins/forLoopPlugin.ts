/**
 * For 循环节点插件
 * 处理 For 循环节点和容器节点的交互逻辑
 */

import type { VueFlowPlugin, PluginContext } from "./types";
import type { Node } from "@vue-flow/core";
import { ref, type Ref } from "vue";

// 容器常量
const CONTAINER_HEADER_HEIGHT = 32;
const CONTAINER_PADDING = {
  top: 16,
  right: 16,
  bottom: 16,
  left: 16,
};
const CONTAINER_MIN_WIDTH = 300;
const CONTAINER_MIN_HEIGHT = 200;

// 高亮类型
type HighlightType = "normal" | "warning" | null;

// 插件状态
interface ForLoopPluginState {
  /** 当前拖拽目标容器 ID */
  dragTargetContainerId: string | null;
  /** 容器高亮状态 */
  containerHighlight: Record<string, HighlightType>;
  /** Ctrl 脱离上下文 */
  ctrlDetachContext: {
    nodeId: string | null;
    containerId: string | null;
    isIntersecting: boolean;
  };
}

/**
 * 创建 For 循环插件
 */
export function createForLoopPlugin(): VueFlowPlugin {
  const cleanupFns: Array<() => void> = [];
  let context: PluginContext | null = null;

  // 插件状态
  const state: ForLoopPluginState = {
    dragTargetContainerId: null,
    containerHighlight: {},
    ctrlDetachContext: {
      nodeId: null,
      containerId: null,
      isIntersecting: false,
    },
  };

  // 容器高亮状态（响应式）
  const containerHighlightRef: Ref<Record<string, HighlightType>> = ref({});

  /**
   * 设置容器高亮
   */
  function setContainerHighlight(containerId: string, type: HighlightType) {
    state.containerHighlight[containerId] = type;
    containerHighlightRef.value = { ...state.containerHighlight };
  }

  /**
   * 清除容器高亮
   */
  function clearContainerHighlight(containerId: string) {
    delete state.containerHighlight[containerId];
    containerHighlightRef.value = { ...state.containerHighlight };
  }

  /**
   * 清除所有容器高亮
   */
  function clearAllHighlights() {
    state.containerHighlight = {};
    containerHighlightRef.value = {};
  }

  /**
   * 检测节点与容器的交集
   */
  function checkIntersection(
    node: Node,
    container: Node
  ): { hasIntersection: boolean; intersectionRatio: number } {
    const nodeRect = {
      x: node.position.x,
      y: node.position.y,
      width: (node.width as number) || 200,
      height: (node.height as number) || 100,
    };

    const containerRect = {
      x: container.position.x,
      y: container.position.y,
      width: (container.width as number) || CONTAINER_MIN_WIDTH,
      height: (container.height as number) || CONTAINER_MIN_HEIGHT,
    };

    const intersectX = Math.max(nodeRect.x, containerRect.x);
    const intersectY = Math.max(nodeRect.y, containerRect.y);
    const intersectWidth =
      Math.min(
        nodeRect.x + nodeRect.width,
        containerRect.x + containerRect.width
      ) - intersectX;
    const intersectHeight =
      Math.min(
        nodeRect.y + nodeRect.height,
        containerRect.y + containerRect.height
      ) - intersectY;

    const hasIntersection = intersectWidth > 0 && intersectHeight > 0;
    const intersectionArea = hasIntersection
      ? intersectWidth * intersectHeight
      : 0;
    const nodeArea = nodeRect.width * nodeRect.height;
    const intersectionRatio = nodeArea > 0 ? intersectionArea / nodeArea : 0;

    return { hasIntersection, intersectionRatio };
  }

  /**
   * 检查节点是否有外部连接
   */
  function hasExternalConnections(
    nodeId: string,
    containerId: string,
    ctx: PluginContext
  ): boolean {
    const edges = ctx.core.edges.value;
    const nodes = ctx.core.nodes.value;

    // 获取容器内的所有节点 ID
    const containerNodeIds = new Set(
      nodes.filter((n) => n.parentNode === containerId).map((n) => n.id)
    );

    // 检查是否有连接到容器外的边
    const externalEdges = edges.filter((edge) => {
      if (edge.source === nodeId) {
        return !containerNodeIds.has(edge.target);
      }
      if (edge.target === nodeId) {
        return !containerNodeIds.has(edge.source);
      }
      return false;
    });

    return externalEdges.length > 0;
  }

  /**
   * 将节点移入容器
   */
  function moveNodeIntoContainer(
    nodeId: string,
    containerId: string,
    ctx: PluginContext
  ) {
    const nodes = ctx.core.nodes.value;
    const node = nodes.find((n) => n.id === nodeId);
    const container = nodes.find((n) => n.id === containerId);

    if (!node || !container) {
      console.warn("[ForLoopPlugin] 节点或容器不存在");
      return;
    }

    // 计算相对位置
    const relativeX = node.position.x - container.position.x;
    const relativeY = node.position.y - container.position.y;

    // 更新节点
    ctx.core.updateNodes((nodes) =>
      nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              parentNode: containerId,
              position: { x: relativeX, y: relativeY },
              extent: "parent" as const,
            }
          : n
      )
    );

    // 更新容器尺寸
    updateContainerBounds(containerId, ctx);

    console.log(`[ForLoopPlugin] 节点 ${nodeId} 已移入容器 ${containerId}`);
  }

  /**
   * 将节点从容器中脱离
   */
  function detachNodeFromContainer(
    nodeId: string,
    containerId: string,
    ctx: PluginContext
  ) {
    const nodes = ctx.core.nodes.value;
    const node = nodes.find((n) => n.id === nodeId);
    const container = nodes.find((n) => n.id === containerId);

    if (!node || !container) {
      console.warn("[ForLoopPlugin] 节点或容器不存在");
      return;
    }

    // 计算绝对位置
    const absoluteX = container.position.x + node.position.x;
    const absoluteY = container.position.y + node.position.y;

    // 更新节点
    ctx.core.updateNodes((nodes) =>
      nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              parentNode: undefined,
              position: { x: absoluteX, y: absoluteY },
              extent: undefined,
            }
          : n
      )
    );

    // 断开节点与容器内其他节点的连接
    const edges = ctx.core.edges.value;
    const containerNodeIds = new Set(
      nodes
        .filter((n) => n.parentNode === containerId && n.id !== nodeId)
        .map((n) => n.id)
    );

    ctx.core.updateEdges((edges) =>
      edges.filter((edge) => {
        if (edge.source === nodeId) {
          return !containerNodeIds.has(edge.target);
        }
        if (edge.target === nodeId) {
          return !containerNodeIds.has(edge.source);
        }
        return true;
      })
    );

    // 更新容器尺寸
    updateContainerBounds(containerId, ctx);

    console.log(`[ForLoopPlugin] 节点 ${nodeId} 已脱离容器 ${containerId}`);
  }

  /**
   * 更新容器尺寸
   */
  function updateContainerBounds(containerId: string, ctx: PluginContext) {
    const nodes = ctx.core.nodes.value;
    const container = nodes.find((n) => n.id === containerId);

    if (!container) {
      return;
    }

    // 获取容器内的所有子节点
    const children = nodes.filter((n) => n.parentNode === containerId);

    if (children.length === 0) {
      // 如果没有子节点，设置为默认尺寸
      ctx.core.updateNodes((nodes) =>
        nodes.map((n) =>
          n.id === containerId
            ? {
                ...n,
                width: CONTAINER_MIN_WIDTH,
                height: CONTAINER_MIN_HEIGHT,
                style: {
                  ...n.style,
                  width: `${CONTAINER_MIN_WIDTH}px`,
                  height: `${CONTAINER_MIN_HEIGHT}px`,
                },
              }
            : n
        )
      );
      return;
    }

    // 计算所有子节点的边界框
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    children.forEach((child) => {
      const childWidth = (child.width as number) || 200;
      const childHeight = (child.height as number) || 100;

      minX = Math.min(minX, child.position.x);
      minY = Math.min(minY, child.position.y);
      maxX = Math.max(maxX, child.position.x + childWidth);
      maxY = Math.max(maxY, child.position.y + childHeight);
    });

    // 添加容器内边距
    const width = Math.max(
      maxX - minX + CONTAINER_PADDING.left + CONTAINER_PADDING.right,
      CONTAINER_MIN_WIDTH
    );
    const height = Math.max(
      maxY -
        minY +
        CONTAINER_HEADER_HEIGHT +
        CONTAINER_PADDING.top +
        CONTAINER_PADDING.bottom,
      CONTAINER_MIN_HEIGHT
    );

    // 更新容器尺寸
    ctx.core.updateNodes((nodes) =>
      nodes.map((n) =>
        n.id === containerId
          ? {
              ...n,
              width,
              height,
              style: {
                ...n.style,
                width: `${width}px`,
                height: `${height}px`,
              },
            }
          : n
      )
    );
  }

  /**
   * 处理节点拖拽
   */
  function handleNodeDrag(event: { node: Node; intersections?: Node[] }) {
    if (!context) return;

    const { node, intersections = [] } = event;

    // 检查是否按下 Ctrl 键
    const isCtrlPressed = (window.event as KeyboardEvent)?.ctrlKey || false;

    // 如果节点已有父容器且未按 Ctrl，直接返回
    if (node.parentNode && !isCtrlPressed) {
      return;
    }

    // 如果按 Ctrl 且节点在容器内，进入脱离模式
    if (isCtrlPressed && node.parentNode) {
      const containerId = node.parentNode;
      const container = context.core.nodes.value.find(
        (n) => n.id === containerId
      );

      if (container && container.type === "forLoopContainer") {
        const { hasIntersection } = checkIntersection(node, container);

        state.ctrlDetachContext = {
          nodeId: node.id,
          containerId,
          isIntersecting: hasIntersection,
        };

        // 更新容器高亮状态
        setContainerHighlight(
          containerId,
          hasIntersection ? "normal" : "warning"
        );
      }

      return;
    }

    // 如果未按 Ctrl 且节点在容器外，检测是否可移入容器
    if (!isCtrlPressed && !node.parentNode) {
      // 查找与节点相交的 For 循环容器
      const targetContainers = intersections.filter(
        (n) => n.type === "forLoopContainer"
      );

      if (targetContainers.length > 0) {
        const targetContainer = targetContainers[0];
        if (targetContainer) {
          const { hasIntersection, intersectionRatio } = checkIntersection(
            node,
            targetContainer
          );

          if (hasIntersection && intersectionRatio > 0.3) {
            // 检查节点是否有外部连接
            const hasExternal = hasExternalConnections(
              node.id,
              targetContainer.id,
              context
            );

            state.dragTargetContainerId = targetContainer.id;
            setContainerHighlight(
              targetContainer.id,
              hasExternal ? "warning" : "normal"
            );

            return;
          }
        }
      }

      // 清除之前的高亮
      if (state.dragTargetContainerId) {
        clearContainerHighlight(state.dragTargetContainerId);
        state.dragTargetContainerId = null;
      }
    }
  }

  /**
   * 处理节点拖拽结束
   */
  function handleNodeDragStop(event: { node: Node }) {
    if (!context) return;

    const { node } = event;

    // 处理 Ctrl 脱离模式
    if (state.ctrlDetachContext.nodeId === node.id) {
      const { containerId, isIntersecting } = state.ctrlDetachContext;

      if (containerId && !isIntersecting) {
        // 脱离容器
        detachNodeFromContainer(node.id, containerId, context);
      }

      // 清除脱离上下文
      if (containerId) {
        clearContainerHighlight(containerId);
      }
      state.ctrlDetachContext = {
        nodeId: null,
        containerId: null,
        isIntersecting: false,
      };

      return;
    }

    // 处理移入容器
    if (state.dragTargetContainerId) {
      const hasExternal = hasExternalConnections(
        node.id,
        state.dragTargetContainerId,
        context
      );

      if (!hasExternal) {
        // 移入容器
        moveNodeIntoContainer(node.id, state.dragTargetContainerId, context);
      }

      // 清除高亮
      clearContainerHighlight(state.dragTargetContainerId);
      state.dragTargetContainerId = null;
    }

    // 如果节点在容器内，更新容器尺寸
    if (node.parentNode) {
      updateContainerBounds(node.parentNode, context);
    }
  }

  /**
   * 处理连接验证
   */
  function handleConnectionValidation(connection: {
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }): boolean {
    if (!context) return true;

    const nodes = context.core.nodes.value;
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);

    if (!sourceNode || !targetNode) return true;

    // 如果源节点在容器内
    if (sourceNode.parentNode) {
      // 如果目标节点不在同一容器内，拒绝连接
      if (targetNode.parentNode !== sourceNode.parentNode) {
        console.warn("[ForLoopPlugin] 容器内节点不能连接到容器外节点");
        return false;
      }
    }

    // 如果目标节点在容器内
    if (targetNode.parentNode) {
      // 如果源节点不在同一容器内，拒绝连接
      if (sourceNode.parentNode !== targetNode.parentNode) {
        console.warn("[ForLoopPlugin] 容器外节点不能连接到容器内节点");
        return false;
      }
    }

    return true;
  }

  // 标记正在删除的节点，防止循环删除
  const deletingNodes = new Set<string>();

  /**
   * 处理 For 节点删除
   */
  function handleForNodeDelete(ctx: PluginContext, nodeId: string): void {
    // 防止循环删除
    if (deletingNodes.has(nodeId)) return;

    const nodes = ctx.core.nodes.value;
    const node = nodes.find((n) => n.id === nodeId);

    if (!node) return;

    // 收集需要删除的节点和边
    const nodesToDelete = new Set<string>();
    const edgesToDelete = new Set<string>();

    // 处理 For 节点的删除
    if (node.type === "for") {
      nodesToDelete.add(nodeId);

      // 获取 For 节点的容器 ID
      const containerId = node.data?.config?.containerId;
      if (containerId) {
        const container = nodes.find((n) => n.id === containerId);
        if (container) {
          nodesToDelete.add(containerId);

          // 获取容器内的所有子节点
          const childNodes = nodes.filter((n) => n.parentNode === containerId);
          childNodes.forEach((child) => {
            nodesToDelete.add(child.id);
          });

          // 收集与容器相关的所有边
          ctx.core.edges.value.forEach((edge) => {
            if (edge.source === containerId || edge.target === containerId) {
              edgesToDelete.add(edge.id);
            }
          });

          // 清除容器相关状态
          clearContainerHighlight(containerId);
          if (state.dragTargetContainerId === containerId) {
            state.dragTargetContainerId = null;
          }
        }
      }
    }
    // 处理容器节点的删除
    else if (node.type === "forLoopContainer") {
      nodesToDelete.add(nodeId);

      // 获取容器内的所有子节点
      const childNodes = nodes.filter((n) => n.parentNode === nodeId);
      childNodes.forEach((child) => {
        nodesToDelete.add(child.id);
      });

      // 查找对应的 For 节点
      const forNodeId = node.data?.config?.forNodeId;
      if (forNodeId) {
        const forNode = nodes.find((n) => n.id === forNodeId);
        if (forNode && !deletingNodes.has(forNodeId)) {
          nodesToDelete.add(forNodeId);
        }
      }

      // 收集与容器相关的所有边
      ctx.core.edges.value.forEach((edge) => {
        if (edge.source === nodeId || edge.target === nodeId) {
          edgesToDelete.add(edge.id);
        }
      });

      // 清除容器相关状态
      clearContainerHighlight(nodeId);
      if (state.dragTargetContainerId === nodeId) {
        state.dragTargetContainerId = null;
      }
    }

    // 统一标记所有待删除节点
    nodesToDelete.forEach((id) => {
      deletingNodes.add(id);
    });

    // 统一删除所有节点
    nodesToDelete.forEach((id) => {
      ctx.core.deleteNode(id, false); // 禁用钩子避免递归
    });

    // 统一删除所有边
    edgesToDelete.forEach((id) => {
      ctx.core.deleteEdge(id, false); // 禁用钩子
    });

    console.log(
      `[ForLoopPlugin] 已删除 ${nodesToDelete.size} 个节点和 ${edgesToDelete.size} 条边`
    );

    // 延迟清除标记，避免立即重入
    setTimeout(() => {
      nodesToDelete.forEach((id) => {
        deletingNodes.delete(id);
      });
    }, 100);
  }

  return {
    config: {
      id: "for-loop",
      name: "For 循环节点",
      description: "处理 For 循环节点和容器节点的交互逻辑",
      enabled: true,
      version: "1.0.0",
    },

    hooks: {
      beforeNodeDelete(ctx: PluginContext, nodeId: string): boolean | void {
        handleForNodeDelete(ctx, nodeId);
        // 返回 true 允许继续删除
        return true;
      },
    },

    setup(ctx: PluginContext) {
      context = ctx;

      // 注册共享状态
      ctx.shared["for-loop"] = {
        containerHighlight: containerHighlightRef,
      };

      // 监听节点拖拽事件
      if (ctx.vueflow.onNodeDrag) {
        const cleanup1 = ctx.vueflow.onNodeDrag(handleNodeDrag as any);
        if (cleanup1 && typeof cleanup1 === "object" && "off" in cleanup1) {
          cleanupFns.push(() => cleanup1.off());
        }
      }

      // 监听节点拖拽结束事件
      if (ctx.vueflow.onNodeDragStop) {
        const cleanup2 = ctx.vueflow.onNodeDragStop(handleNodeDragStop as any);
        if (cleanup2 && typeof cleanup2 === "object" && "off" in cleanup2) {
          cleanupFns.push(() => cleanup2.off());
        }
      }

      // 监听连接事件
      if (ctx.vueflow.onConnect) {
        const cleanup3 = ctx.vueflow.onConnect((connection) => {
          const isValid = handleConnectionValidation(connection as any);
          if (!isValid) {
            // 阻止无效连接
            return false;
          }
        });
        if (cleanup3 && typeof cleanup3 === "object" && "off" in cleanup3) {
          cleanupFns.push(() => cleanup3.off());
        }
      }

      console.log("[ForLoopPlugin] For 循环插件已启用");
    },

    cleanup() {
      // 清理所有事件监听器
      cleanupFns.forEach((fn) => fn());
      cleanupFns.length = 0;

      // 清除所有高亮
      clearAllHighlights();

      // 清除删除标记
      deletingNodes.clear();

      // 清除上下文
      context = null;

      console.log("[ForLoopPlugin] For 循环插件已禁用");
    },
  };
}
