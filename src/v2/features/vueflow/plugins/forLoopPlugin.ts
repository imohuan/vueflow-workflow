/**
 * For 循环节点插件
 * 处理 For 循环节点和容器节点的交互逻辑
 */

import type {
  VueFlowPlugin,
  PluginContext,
  ContainerHighlightType,
} from "./types";
import type { Node, Edge } from "@vue-flow/core";
import { ref, type Ref } from "vue";
import { CONTAINER_CONFIG } from "../../../config/nodeConfig";

// 从配置中获取容器常量
const {
  headerHeight: CONTAINER_HEADER_HEIGHT,
  padding: CONTAINER_PADDING,
  minWidth: CONTAINER_MIN_WIDTH,
  minHeight: CONTAINER_MIN_HEIGHT,
} = CONTAINER_CONFIG;

// 边层级类名常量
const EDGE_LAYER_CLASS_CONTAINER = "edge-layer-container";

// 插件状态
interface ForLoopPluginState {
  /** 当前拖拽目标容器 ID */
  dragTargetContainerId: string | null;
  /** Ctrl 键是否按下 */
  isCtrlPressed: boolean;
  /** Ctrl 拖拽脱离上下文（记录正在脱离的节点和容器） */
  ctrlDetachContext: {
    nodeId: string;
    containerId: string;
  } | null;
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
    isCtrlPressed: false,
    ctrlDetachContext: null,
  };

  // 容器高亮状态（响应式）
  const containerHighlightRef: Ref<Record<string, ContainerHighlightType>> =
    ref({});

  /**
   * 提取边的类名数组
   */
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

  /**
   * 设置容器高亮
   * @param containerId 容器 ID
   * @param type 高亮类型：normal=绿色（可移入），warning=红色（有连接，无法移入）
   */
  function setContainerHighlight(
    containerId: string,
    type: ContainerHighlightType
  ) {
    containerHighlightRef.value = { [containerId]: type };
    console.log(`[ForLoopPlugin] 设置容器高亮: ${containerId}, 类型: ${type}`);
  }

  /**
   * 清除所有容器高亮
   */
  function clearAllHighlights() {
    containerHighlightRef.value = {};
  }

  /**
   * 检测节点是否与容器有交集（简化版）
   */
  function hasIntersection(node: Node, container: Node): boolean {
    const nodeX = node.position.x;
    const nodeY = node.position.y;
    const nodeWidth = (node.width as number) || 200;
    const nodeHeight = (node.height as number) || 100;

    const containerX = container.position.x;
    const containerY = container.position.y;
    const containerWidth = (container.width as number) || CONTAINER_MIN_WIDTH;
    const containerHeight =
      (container.height as number) || CONTAINER_MIN_HEIGHT;

    // 简单的矩形碰撞检测
    return !(
      nodeX + nodeWidth < containerX ||
      nodeX > containerX + containerWidth ||
      nodeY + nodeHeight < containerY ||
      nodeY > containerY + containerHeight
    );
  }

  /**
   * 检查节点是否有任何连接
   */
  function hasAnyConnections(nodeId: string, ctx: PluginContext): boolean {
    const edges = ctx.core.edges.value;
    return edges.some(
      (edge) => edge.source === nodeId || edge.target === nodeId
    );
  }

  /**
   * 应用边层级类
   * 用于确保容器内的连接线显示在容器节点之上
   */
  function applyEdgeLayerClass(edge: Edge, ctx: PluginContext) {
    if (!edge) return;

    const nodes = ctx.core.nodes.value;
    const classNames = extractClassNames(edge.class).filter(
      (cls) => cls !== EDGE_LAYER_CLASS_CONTAINER
    );

    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (!sourceNode || !targetNode) return;

    const sourceParent = sourceNode?.parentNode ?? null;
    const targetParent = targetNode?.parentNode ?? null;

    // 判断是否为容器内的边
    const isContainerEdge = Boolean(
      (sourceParent && sourceParent === targetParent) ||
      (sourceNode?.type === "forLoopContainer" &&
        targetParent === sourceNode.id) ||
      (targetNode?.type === "forLoopContainer" &&
        sourceParent === targetNode.id)
    );

    if (isContainerEdge) {
      classNames.push(EDGE_LAYER_CLASS_CONTAINER);
      // 通过 DOM 操作给 SVG 父元素添加类名
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

    // 更新边的类名(不需要 给父元素添加类名就可以了)
    // edge.class = classNames.join(" ");
  }

  /**
   * 刷新所有边的层级类
   */
  function refreshEdgeLayerClasses(ctx: PluginContext) {
    const edges = ctx.core.edges.value;
    edges.forEach((edge) => applyEdgeLayerClass(edge, ctx));
    console.log(`[ForLoopPlugin] 已刷新 ${edges.length} 条边的层级类`);
  }

  /**
   * 将节点从容器中移出
   * 转换为绝对坐标，删除所有内部连接
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

    // 计算绝对坐标（相对坐标转绝对坐标）
    const absoluteX = container.position.x + node.position.x;
    const absoluteY = container.position.y + node.position.y;

    // 收集需要删除的边（与该节点相关的所有边）
    const edgesToDelete: string[] = [];
    ctx.core.edges.value.forEach((edge) => {
      if (edge.source === nodeId || edge.target === nodeId) {
        edgesToDelete.push(edge.id);
      }
    });

    // 删除所有相关连接
    edgesToDelete.forEach((edgeId) => {
      ctx.core.deleteEdge(edgeId);
    });

    // 更新节点：移除父节点，设置绝对位置
    ctx.core.updateNodes((nodes) =>
      nodes.map((n) =>
        n.id === nodeId
          ? {
            ...n,
            parentNode: undefined,
            position: { x: absoluteX, y: absoluteY },
          }
          : n
      )
    );

    console.log(
      `[ForLoopPlugin] ✅ 节点 ${nodeId} 已脱离容器 ${containerId}，删除了 ${edgesToDelete.length} 条连接`
    );

    // 更新容器尺寸
    updateContainerBounds(containerId, ctx);

    // 刷新边层级
    refreshEdgeLayerClasses(ctx);
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

    // 计算相对位置（绝对坐标转相对坐标）
    const relativeX = node.position.x - container.position.x;
    const relativeY = node.position.y - container.position.y;

    // 更新节点：设置父节点和相对位置
    ctx.core.updateNodes((nodes) =>
      nodes.map((n) =>
        n.id === nodeId
          ? {
            ...n,
            parentNode: containerId,
            position: { x: relativeX, y: relativeY },
            // extent: "parent" as const,
          }
          : n
      )
    );

    console.log(`[ForLoopPlugin] ✅ 节点 ${nodeId} 已移入容器 ${containerId}`);

    // 移入后立即更新容器尺寸
    updateContainerBounds(containerId, ctx);

    // 刷新边层级
    refreshEdgeLayerClasses(ctx);
  }

  /**
   * 更新容器尺寸（根据子节点自动扩容）
   *
   * 逻辑说明：
   * 1. 获取所有子节点的边界框（基于子节点的相对坐标）
   * 2. 计算容器应该在画布上的新位置，确保所有子节点都在容器内且满足padding
   * 3. 更新容器的位置和尺寸
   * 4. 更新所有子节点的相对坐标（因为容器位置改变了）
   */
  function updateContainerBounds(containerId: string, ctx: PluginContext) {
    const nodes = ctx.core.nodes.value;
    const container = nodes.find((n) => n.id === containerId);

    if (!container) {
      return;
    }

    // 获取容器内的所有子节点
    const childNodes = nodes.filter((n) => n.parentNode === containerId);

    if (childNodes.length === 0) {
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

    // 步骤1：计算所有子节点在画布上的绝对边界框
    let minAbsX = Infinity;
    let minAbsY = Infinity;
    let maxAbsX = -Infinity;
    let maxAbsY = -Infinity;

    childNodes.forEach((child) => {
      const childWidth = (child.width as number) || 200;
      const childHeight = (child.height as number) || 100;

      // 子节点在画布上的绝对位置 = 容器位置 + 子节点相对位置
      const absX = container.position.x + child.position.x;
      const absY = container.position.y + child.position.y;

      minAbsX = Math.min(minAbsX, absX);
      minAbsY = Math.min(minAbsY, absY);
      maxAbsX = Math.max(maxAbsX, absX + childWidth);
      maxAbsY = Math.max(maxAbsY, absY + childHeight);
    });

    // 步骤2：计算容器在画布上的新位置（左上角）
    // 容器左上角 = 子节点边界框的左上角 - padding
    const newContainerX = minAbsX - CONTAINER_PADDING.left;
    const newContainerY =
      minAbsY - CONTAINER_HEADER_HEIGHT - CONTAINER_PADDING.top;

    // 步骤3：计算容器的新尺寸
    const contentWidth = maxAbsX - minAbsX;
    const contentHeight = maxAbsY - minAbsY;
    const requiredWidth = Math.max(
      contentWidth + CONTAINER_PADDING.left + CONTAINER_PADDING.right,
      CONTAINER_MIN_WIDTH
    );
    const requiredHeight = Math.max(
      contentHeight +
      CONTAINER_HEADER_HEIGHT +
      CONTAINER_PADDING.top +
      CONTAINER_PADDING.bottom,
      CONTAINER_MIN_HEIGHT
    );

    // 步骤4：批量更新容器和所有子节点
    ctx.core.updateNodes((nodes) =>
      nodes.map((n) => {
        // 更新容器
        if (n.id === containerId) {
          return {
            ...n,
            position: { x: newContainerX, y: newContainerY },
            width: requiredWidth,
            height: requiredHeight,
            style: {
              ...n.style,
              width: `${requiredWidth}px`,
              height: `${requiredHeight}px`,
            },
          };
        }

        // 更新子节点的相对位置
        // 新的相对位置 = 子节点的绝对位置 - 容器的新位置
        if (n.parentNode === containerId) {
          const childAbsX = container.position.x + n.position.x;
          const childAbsY = container.position.y + n.position.y;

          return {
            ...n,
            position: {
              x: childAbsX - newContainerX,
              y: childAbsY - newContainerY,
            },
          };
        }

        return n;
      })
    );

    console.log(
      `[ForLoopPlugin] 容器已更新 - 位置: (${newContainerX}, ${newContainerY}), 尺寸: ${requiredWidth}x${requiredHeight}`
    );
  }

  // 删除 ensureNodeInsideContainer 函数，不限制节点向左上移动

  /**
   * 处理节点拖拽
   */
  function handleNodeDrag(event: { node: Node }) {
    if (!context) return;

    const { node } = event;

    // 检查是否需要启动 Ctrl 脱离模式（支持拖拽过程中按下 Ctrl）
    if (node.parentNode && state.isCtrlPressed && !state.ctrlDetachContext) {
      const container = context.core.nodes.value.find(
        (n) => n.id === node.parentNode
      );

      if (container && container.type === "forLoopContainer") {
        state.ctrlDetachContext = {
          nodeId: node.id,
          containerId: node.parentNode,
        };
        console.log(
          `[ForLoopPlugin] 启动 Ctrl 脱离模式: 节点 ${node.id} 从容器 ${node.parentNode}`
        );
      }
    }

    // 场景1: Ctrl 脱离模式 - 容器内节点按 Ctrl 拖拽
    if (state.ctrlDetachContext && state.ctrlDetachContext.nodeId === node.id) {
      const containerId = state.ctrlDetachContext.containerId;
      const container = context.core.nodes.value.find(
        (n) => n.id === containerId
      );

      if (container) {
        // 计算节点的绝对位置
        const nodeAbsX = container.position.x + node.position.x;
        const nodeAbsY = container.position.y + node.position.y;

        // 创建临时节点对象用于交集检测
        const tempNode = {
          ...node,
          position: { x: nodeAbsX, y: nodeAbsY },
        };

        // 检测是否与容器有交集
        const hasIntersect = hasIntersection(tempNode, container);

        // 有交集 = 绿色（保持在容器内），无交集 = 红色（即将脱离）
        setContainerHighlight(containerId, hasIntersect ? "normal" : "warning");
      }

      return;
    }

    // 场景2: 普通拖拽 - 外部节点拖入容器
    if (node.parentNode) {
      return;
    }

    if (node.type === "forLoopContainer") return;

    // 使用 VueFlow API 获取交集节点
    const intersections = context.vueflow.getIntersectingNodes(node) || [];

    // 查找交集的容器节点
    const targetContainer = intersections.find(
      (n) => n.type === "forLoopContainer"
    );

    if (targetContainer) {
      // 双重验证：使用自定义交集检测
      const isIntersecting = hasIntersection(node, targetContainer);

      if (isIntersecting) {
        // 检查节点是否有连接
        const hasConnections = hasAnyConnections(node.id, context);

        // 设置当前目标容器
        state.dragTargetContainerId = targetContainer.id;

        // 根据是否有连接显示不同颜色的高亮
        // 有连接 = 红色警告（无法移入），无连接 = 绿色正常（可以移入）
        setContainerHighlight(
          targetContainer.id,
          hasConnections ? "warning" : "normal"
        );
        return;
      }
    }

    // 没有交集，清除高亮
    if (state.dragTargetContainerId) {
      clearAllHighlights();
      state.dragTargetContainerId = null;
    }
  }

  /**
   * 处理节点拖拽结束
   */
  function handleNodeDragStop(event: { node: Node }) {
    if (!context) return;

    const { node } = event;

    // 场景1: Ctrl 脱离模式 - 检查是否需要脱离容器
    if (state.ctrlDetachContext && state.ctrlDetachContext.nodeId === node.id) {
      const containerId = state.ctrlDetachContext.containerId;
      const container = context.core.nodes.value.find(
        (n) => n.id === containerId
      );

      if (container) {
        // 计算节点的绝对位置
        const nodeAbsX = container.position.x + node.position.x;
        const nodeAbsY = container.position.y + node.position.y;

        // 创建临时节点对象用于交集检测
        const tempNode = {
          ...node,
          position: { x: nodeAbsX, y: nodeAbsY },
        };

        // 检测是否与容器有交集
        const hasIntersect = hasIntersection(tempNode, container);

        if (!hasIntersect) {
          // 没有交集，执行脱离
          console.log(
            `[ForLoopPlugin] 节点 ${node.id} 脱离容器 ${containerId}`
          );
          detachNodeFromContainer(node.id, containerId, context);
        } else {
          // 有交集，保持在容器内，更新容器尺寸
          console.log(
            `[ForLoopPlugin] 节点 ${node.id} 保持在容器 ${containerId} 内`
          );
          updateContainerBounds(containerId, context);
        }
      }

      // 清除脱离上下文
      state.ctrlDetachContext = null;
      clearAllHighlights();
      return;
    }

    // 场景2: 普通拖拽 - 外部节点移入容器
    if (state.dragTargetContainerId && !node.parentNode) {
      // 检查节点是否有连接
      const hasConnections = hasAnyConnections(node.id, context);

      if (!hasConnections) {
        console.log(
          `[ForLoopPlugin] 节点 ${node.id} 移入容器 ${state.dragTargetContainerId}`
        );
        moveNodeIntoContainer(node.id, state.dragTargetContainerId, context);
      } else {
        console.log(`[ForLoopPlugin] 节点 ${node.id} 有连接，无法移入容器`);
      }
    }

    // 如果节点在容器内，执行容器扩容
    if (node.parentNode) {
      const parentContainer = context.core.nodes.value.find(
        (n) => n.id === node.parentNode
      );

      if (parentContainer && parentContainer.type === "forLoopContainer") {
        // 根据子节点更新容器尺寸
        updateContainerBounds(node.parentNode, context);
      }
    }

    // 清除所有状态
    clearAllHighlights();
    state.dragTargetContainerId = null;
  }

  /**
   * 处理连接验证
   * 规则：
   * 1. 容器内的子节点只能连接同一容器内的其他子节点
   * 2. 容器内的子节点可以连接到父容器的两侧端口（loop-left, loop-right）
   * 3. 父容器可以连接到子节点（通过 loop-left 源端口）
   * 4. 子节点可以连接到父容器（通过 loop-right 目标端口）
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

    const sourceHandle = connection.sourceHandle;
    const targetHandle = connection.targetHandle;

    // 情况1: 源节点是容器，目标节点必须是其子节点（通过 loop-left 端口）
    if (sourceNode.type === "forLoopContainer") {
      if (sourceHandle === "loop-left") {
        // loop-left 只能连接到该容器的子节点
        if (targetNode.parentNode !== sourceNode.id) {
          console.warn(
            "[ForLoopPlugin] 容器的 loop-left 端口只能连接到容器内的子节点"
          );
          return false;
        }
        return true;
      }
    }

    // 情况2: 目标节点是容器，源节点必须是其子节点（通过 loop-right 端口）
    if (targetNode.type === "forLoopContainer") {
      if (targetHandle === "loop-right") {
        // loop-right 只能接收来自该容器子节点的连接
        if (sourceNode.parentNode !== targetNode.id) {
          console.warn(
            "[ForLoopPlugin] 容器的 loop-right 端口只能接收来自容器内子节点的连接"
          );
          return false;
        }
        return true;
      }
    }

    // 情况3: 源节点在容器内
    if (sourceNode.parentNode) {
      // 3a. 目标节点是源节点的父容器（子节点连接到父容器的 loop-right）
      if (
        targetNode.id === sourceNode.parentNode &&
        targetNode.type === "forLoopContainer" &&
        targetHandle === "loop-right"
      ) {
        return true;
      }

      // 3b. 目标节点也在容器内，必须在同一容器
      if (targetNode.parentNode) {
        if (targetNode.parentNode !== sourceNode.parentNode) {
          console.warn("[ForLoopPlugin] 容器内节点只能连接同一容器内的节点");
          return false;
        }
        return true;
      }

      // 3c. 目标节点在容器外（不是父容器），拒绝
      console.warn("[ForLoopPlugin] 容器内节点不能连接到容器外的节点");
      return false;
    }

    // 情况4: 目标节点在容器内
    if (targetNode.parentNode) {
      // 4a. 源节点是目标节点的父容器（父容器通过 loop-left 连接到子节点）
      if (
        sourceNode.id === targetNode.parentNode &&
        sourceNode.type === "forLoopContainer" &&
        sourceHandle === "loop-left"
      ) {
        return true;
      }

      // 4b. 源节点在容器外（不是父容器），拒绝
      console.warn("[ForLoopPlugin] 容器外节点不能连接到容器内的节点");
      return false;
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
        // 暴露 updateContainerBounds 函数供其他插件使用
        updateContainerBounds: (containerId: string) => {
          updateContainerBounds(containerId, ctx);
        },
        // 暴露 refreshEdgeLayerClasses 函数供其他组件使用
        refreshEdgeLayerClasses: () => {
          refreshEdgeLayerClasses(ctx);
        },
      };

      // 监听键盘事件（Ctrl 键）
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Control" || event.ctrlKey) {
          state.isCtrlPressed = true;
        }
      };

      const handleKeyUp = (event: KeyboardEvent) => {
        if (event.key === "Control" || !event.ctrlKey) {
          state.isCtrlPressed = false;
          // 如果释放 Ctrl 键，取消脱离模式
          if (state.ctrlDetachContext) {
            clearAllHighlights();
            state.ctrlDetachContext = null;
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      cleanupFns.push(() => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      });

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
          // 连接创建后刷新边层级
          setTimeout(() => refreshEdgeLayerClasses(ctx), 100);
        });
        if (cleanup3 && typeof cleanup3 === "object" && "off" in cleanup3) {
          cleanupFns.push(() => cleanup3.off());
        }
      }

      // 初始化时刷新一次边层级
      setTimeout(() => refreshEdgeLayerClasses(ctx), 200);

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
