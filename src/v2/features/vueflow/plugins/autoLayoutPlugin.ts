/**
 * 自动布局插件
 * 使用 Dagre 算法自动排列画布中的节点
 * 参考 NodeEditor.vue 的实现方式
 */

import type { VueFlowPlugin, PluginContext } from "./types";
import type { Node, Edge } from "@vue-flow/core";
import { nextTick } from "vue";
import dagre from "@dagrejs/dagre";
import { CONTAINER_CONFIG } from "../../../config/nodeConfig";

/** Dagre 布局方向 */
export type DagreLayoutDirection = "TB" | "BT" | "LR" | "RL";

/** 自动布局选项 */
export interface AutoLayoutOptions {
  /** 布局方向，默认 LR（从左到右） */
  direction?: DagreLayoutDirection;
  /**
   * 同列节点间距，默认 160
   * - LR/RL 模式：控制垂直间距（同一列内节点的上下距离）
   * - TB/BT 模式：控制水平间距（同一行内节点的左右距离）
   */
  nodesep?: number;
  /**
   * 列间距，默认 240
   * - LR/RL 模式：控制水平间距（不同列之间的左右距离）
   * - TB/BT 模式：控制垂直间距（不同行之间的上下距离）
   */
  ranksep?: number;
  /** 布局后整体边距，默认 120 */
  padding?: number;
  /** For 节点与容器之间的垂直间距，默认 40 */
  forNodeSpacing?: number;
  /** 布局完成后是否自动适应视图，默认 true */
  fitView?: boolean;
  /** 适应视图的内边距，默认 0.2 */
  fitViewPadding?: number;
  /** 适应视图的动画时长（毫秒），默认 400 */
  fitViewDuration?: number;
}

/**
 * 创建自动布局插件
 */
export function createAutoLayoutPlugin(): VueFlowPlugin {
  let pluginContext: PluginContext | null = null;

  /**
   * 获取节点的近似宽度
   */
  function getNodeApproxWidth(node: Node): number {
    // 优先使用实际测量的宽度
    if ((node as any).dimensions?.width) {
      return (node as any).dimensions.width;
    }
    // 如果有 width 属性
    if ((node as any).width) {
      return (node as any).width;
    }
    // 如果有 data.width
    if ((node as any).data?.width) {
      return (node as any).data.width;
    }
    // 根据节点类型返回默认宽度
    if (node.type === "loopContainer") {
      return 400;
    }
    return 260;
  }

  /**
   * 获取节点的近似高度
   */
  function getNodeApproxHeight(node: Node): number {
    // 优先使用实际测量的高度
    if ((node as any).dimensions?.height) {
      return (node as any).dimensions.height;
    }
    // 如果有 height 属性
    if ((node as any).height) {
      return (node as any).height;
    }
    // 如果有 data.height
    if ((node as any).data?.height) {
      return (node as any).data.height;
    }
    // 根据节点类型返回默认高度
    if (node.type === "loopContainer" || node.type === "forLoopContainer") {
      return 300;
    }
    return 160;
  }

  /**
   * 布局容器内的子节点
   * @param containerId 容器 ID
   * @param nodes 所有节点列表
   * @param edges 所有边列表
   * @param options 布局选项
   * @returns 子节点的相对位置映射
   */
  function layoutContainerChildren(
    containerId: string,
    nodes: Node[],
    edges: Edge[],
    options: {
      direction: DagreLayoutDirection;
      nodesep: number;
      ranksep: number;
    }
  ): Map<string, { x: number; y: number }> {
    const result = new Map<string, { x: number; y: number }>();

    // 获取容器内的所有子节点
    const childNodes = nodes.filter((n) => n.parentNode === containerId);

    if (childNodes.length === 0) {
      return result;
    }

    // 创建 Dagre 图用于子节点布局
    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({
      rankdir: options.direction,
      nodesep: options.nodesep,
      ranksep: options.ranksep,
      marginx: 0,
      marginy: 0,
    });

    // 添加子节点到图中
    childNodes.forEach((node) => {
      const width = getNodeApproxWidth(node);
      const height = getNodeApproxHeight(node);
      graph.setNode(node.id, { width, height });
    });

    // 添加子节点之间的边
    const childNodeIds = new Set(childNodes.map((n) => n.id));
    edges.forEach((edge: Edge) => {
      // 只添加子节点之间的边
      if (
        childNodeIds.has(edge.source) &&
        childNodeIds.has(edge.target) &&
        edge.source !== containerId &&
        edge.target !== containerId
      ) {
        graph.setEdge(edge.source, edge.target);
      }
    });

    // 执行布局
    dagre.layout(graph);

    // 计算子节点的边界框
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;

    childNodes.forEach((node) => {
      const dagreNode = graph.node(node.id);
      if (!dagreNode) return;

      const width = dagreNode.width;
      const height = dagreNode.height;
      const left = dagreNode.x - width / 2;
      const top = dagreNode.y - height / 2;

      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
    });

    const baseX = Number.isFinite(minX) ? minX : 0;
    const baseY = Number.isFinite(minY) ? minY : 0;

    // 计算相对位置（相对于容器左上角，考虑容器的 padding 和 header）
    childNodes.forEach((node) => {
      const dagreNode = graph.node(node.id);
      if (!dagreNode) return;

      const relativeX =
        dagreNode.x -
        dagreNode.width / 2 -
        baseX +
        CONTAINER_CONFIG.padding.left;
      const relativeY =
        dagreNode.y -
        dagreNode.height / 2 -
        baseY +
        CONTAINER_CONFIG.headerHeight +
        CONTAINER_CONFIG.padding.top;

      result.set(node.id, { x: relativeX, y: relativeY });
    });

    return result;
  }

  /**
   * 执行自动布局
   */
  async function executeAutoLayout(options: AutoLayoutOptions = {}) {
    if (!pluginContext) {
      console.warn("[AutoLayout Plugin] 插件上下文未初始化");
      return;
    }

    const { core, vueflow } = pluginContext;
    const { nodes, edges } = core;

    // 检查是否有节点
    if (nodes.value.length === 0) {
      console.warn("[AutoLayout Plugin] 画布中没有节点，无法执行自动布局");
      return;
    }

    // 获取配置参数（带默认值）
    const direction = options.direction ?? "LR";
    const nodesep = options.nodesep ?? 160;
    const ranksep = options.ranksep ?? 240;
    const padding = options.padding ?? 120;
    const forNodeSpacing = options.forNodeSpacing ?? 40;
    const shouldFitView = options.fitView ?? true;
    const fitViewPadding = options.fitViewPadding ?? 0.2;
    const fitViewDuration = options.fitViewDuration ?? 400;

    // ========== 第一步：识别 for 节点及其容器 ==========
    const forNodeContainerMap = new Map<string, string>();
    const containerForNodeMap = new Map<string, string>();

    nodes.value.forEach((node) => {
      if (node.type === "for" && node.data?.config?.containerId) {
        const containerId = node.data.config.containerId;
        forNodeContainerMap.set(node.id, containerId);
        containerForNodeMap.set(containerId, node.id);
      }
    });

    console.log(
      `[AutoLayout Plugin] 识别到 ${containerForNodeMap.size} 个 for 循环容器`
    );

    // ========== 第二步：先布局容器内的子节点 ==========
    const containerChildPositions = new Map<
      string,
      Map<string, { x: number; y: number }>
    >();

    containerForNodeMap.forEach((_forNodeId, containerId) => {
      const childPositions = layoutContainerChildren(
        containerId,
        nodes.value,
        edges.value,
        {
          direction,
          nodesep: nodesep * 0.8, // 容器内间距稍小
          ranksep: ranksep * 0.7,
        }
      );
      containerChildPositions.set(containerId, childPositions);
    });

    // 应用容器内子节点的位置
    if (containerChildPositions.size > 0) {
      core.updateNodes((currentNodes: Node[]) => {
        return currentNodes.map((node) => {
          // 处理容器内的子节点：使用计算好的相对位置
          if (node.parentNode && containerChildPositions.has(node.parentNode)) {
            const childPositions = containerChildPositions.get(
              node.parentNode
            )!;
            const childPos = childPositions.get(node.id);

            if (childPos) {
              return {
                ...node,
                position: {
                  x: childPos.x,
                  y: childPos.y,
                },
              };
            }
          }
          return node;
        });
      });

      // 等待 DOM 更新
      await nextTick();

      console.log(
        `[AutoLayout Plugin] 容器内节点布局完成，共 ${Array.from(
          containerChildPositions.values()
        ).reduce((sum, map) => sum + map.size, 0)} 个节点`
      );
    }

    // ========== 第三步：更新容器的 bounds ==========
    // 获取 forLoopPlugin 暴露的 updateContainerBounds 函数
    const forLoopPlugin = pluginContext?.shared?.["for-loop"];
    if (
      forLoopPlugin &&
      typeof forLoopPlugin.updateContainerBounds === "function"
    ) {
      containerForNodeMap.forEach((_forNodeId, containerId) => {
        forLoopPlugin.updateContainerBounds(containerId);
      });

      // 等待容器尺寸更新 - 需要多次等待确保响应式更新完成
      await nextTick();
      // 额外等待确保 DOM 和响应式状态完全同步
      await new Promise((resolve) => setTimeout(resolve, 50));

      console.log(
        `[AutoLayout Plugin] 容器 bounds 更新完成，共 ${containerForNodeMap.size} 个容器`
      );
    }

    // ========== 第四步：布局顶层节点（包括 For 节点和更新后的容器） ==========
    // 只对顶层节点进行布局（不包含容器内的子节点和 for 节点的容器）
    const topLevelNodes = nodes.value.filter((node) => {
      // 排除有父节点的子节点
      if (node.parentNode) return false;
      // 排除 for 节点的容器（它们会被单独处理）
      if (containerForNodeMap.has(node.id)) return false;
      return true;
    });

    if (topLevelNodes.length === 0) {
      console.warn("[AutoLayout Plugin] 没有顶层节点，无法执行自动布局");
      return;
    }

    // 创建 Dagre 图
    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({
      rankdir: direction,
      nodesep,
      ranksep,
      marginx: 0,
      marginy: 0,
    });

    // 添加节点到图中（此时容器已经有了正确的尺寸）
    topLevelNodes.forEach((node) => {
      const width = getNodeApproxWidth(node);
      const height = getNodeApproxHeight(node);
      graph.setNode(node.id, { width, height });
    });

    // 添加边到图中（只包含顶层节点之间的边）
    const topLevelNodeIds = new Set(topLevelNodes.map((n) => n.id));
    edges.value.forEach((edge: Edge) => {
      if (
        topLevelNodeIds.has(edge.source) &&
        topLevelNodeIds.has(edge.target)
      ) {
        graph.setEdge(edge.source, edge.target);
      }
    });

    // 执行 Dagre 布局算法
    dagre.layout(graph);

    // 收集布局后的节点位置
    interface PositionedNode {
      node: Node;
      x: number;
      y: number;
      width: number;
      height: number;
    }

    const positionedNodes: PositionedNode[] = [];

    topLevelNodes.forEach((node) => {
      const dagreNode = graph.node(node.id);
      if (!dagreNode) return;

      positionedNodes.push({
        node,
        x: dagreNode.x,
        y: dagreNode.y,
        width: dagreNode.width,
        height: dagreNode.height,
      });
    });

    // 计算整体布局的边界框
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;

    positionedNodes.forEach(({ x, y, width, height }) => {
      const left = x - width / 2;
      const top = y - height / 2;

      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
    });

    const baseX = Number.isFinite(minX) ? minX : 0;
    const baseY = Number.isFinite(minY) ? minY : 0;

    // ========== 第五步：应用顶层节点和容器的新位置 ==========
    // 先获取最新的容器尺寸（已经被 updateContainerBounds 更新过）
    const updatedContainerSizes = new Map<
      string,
      { width: number; height: number }
    >();
    containerForNodeMap.forEach((_forNodeId, containerId) => {
      const container = nodes.value.find((n) => n.id === containerId);
      if (container) {
        updatedContainerSizes.set(containerId, {
          width: getNodeApproxWidth(container),
          height: getNodeApproxHeight(container),
        });
      }
    });

    core.updateNodes((currentNodes: Node[]) => {
      return currentNodes.map((node) => {
        // 处理顶层节点的位置
        const positioned = positionedNodes.find((pn) => pn.node.id === node.id);
        if (positioned) {
          const newX = positioned.x - positioned.width / 2 - baseX + padding;
          const newY = positioned.y - positioned.height / 2 - baseY + padding;

          return {
            ...node,
            position: {
              x: newX,
              y: newY,
            },
          };
        }

        // 处理 for 节点的容器：居中放在 for 节点正下方
        if (containerForNodeMap.has(node.id)) {
          const forNodeId = containerForNodeMap.get(node.id)!;
          // 从 positionedNodes 中查找 for 节点的新位置（布局后的位置）
          const forNodePositioned = positionedNodes.find(
            (pn) => pn.node.id === forNodeId
          );

          if (forNodePositioned) {
            // 计算 for 节点的实际位置（应用 padding 和 baseX/baseY）
            const forNodeX =
              forNodePositioned.x -
              forNodePositioned.width / 2 -
              baseX +
              padding;
            const forNodeY =
              forNodePositioned.y -
              forNodePositioned.height / 2 -
              baseY +
              padding;

            // 使用更新后的容器宽度（来自 updatedContainerSizes）
            const containerSize = updatedContainerSizes.get(node.id);
            const containerWidth = containerSize
              ? containerSize.width
              : getNodeApproxWidth(node);

            // 计算居中的 x 位置：for 节点中心 - 容器宽度/2
            const forNodeCenterX = forNodeX + forNodePositioned.width / 2;
            const centeredX = forNodeCenterX - containerWidth / 2;

            return {
              ...node,
              position: {
                x: centeredX,
                y: forNodeY + forNodePositioned.height + forNodeSpacing,
              },
            };
          }
        }

        return node;
      });
    });

    console.log(`[AutoLayout Plugin] ✅ 自动布局完成！`);
    console.log(`  - 顶层节点: ${positionedNodes.length} 个`);
    console.log(`  - For 循环容器: ${containerForNodeMap.size} 个`);
    console.log(
      `  - 容器内节点: ${Array.from(containerChildPositions.values()).reduce(
        (sum, map) => sum + map.size,
        0
      )} 个`
    );

    // 等待 DOM 更新
    await nextTick();

    // 自动适应视图
    if (shouldFitView && typeof vueflow.fitView === "function") {
      await vueflow.fitView({
        padding: fitViewPadding,
        duration: fitViewDuration,
      });
      console.log("[AutoLayout Plugin] 已自动适应视图");
    }

    // 触发事件通知
    if (core.events) {
      core.events.emit("canvas:auto-layout", {
        nodeCount: positionedNodes.length,
        direction,
      });
    }
  }

  return {
    config: {
      id: "auto-layout",
      name: "自动布局",
      description: "使用 Dagre 算法自动排列画布中的节点",
      enabled: true,
      version: "1.0.0",
      author: "AI Assistant",
    },

    shortcuts: [
      {
        key: "ctrl+shift+l",
        description: "执行自动布局",
        handler: () => {
          executeAutoLayout();
        },
      },
    ],

    setup(context: PluginContext) {
      pluginContext = context;

      // 将自动布局方法暴露到上下文（可选）
      (context as any).autoLayout = executeAutoLayout;

      // 监听自动布局请求事件
      if (context.core.events) {
        context.core.events.on(
          "canvas:request-auto-layout",
          (options?: AutoLayoutOptions) => {
            executeAutoLayout(options);
          }
        );
      }

      console.log("[AutoLayout Plugin] 自动布局插件已启用");
      console.log(
        "[AutoLayout Plugin] 使用方式: 触发 canvas:request-auto-layout 事件或按快捷键 Ctrl+Shift+L"
      );
    },

    cleanup() {
      pluginContext = null;
      console.log("[AutoLayout Plugin] 自动布局插件已清理");
    },
  };
}
