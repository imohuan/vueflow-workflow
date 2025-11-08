/**
 * 自动布局插件
 * 使用 Dagre 算法自动排列画布中的节点
 * 参考 NodeEditor.vue 的实现方式
 */

import type { VueFlowPlugin, PluginContext } from "./types";
import type { Node, Edge } from "@vue-flow/core";
import { nextTick } from "vue";
import dagre from "@dagrejs/dagre";

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
    if (node.type === "loopContainer") {
      return 300;
    }
    return 160;
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
    const shouldFitView = options.fitView ?? true;
    const fitViewPadding = options.fitViewPadding ?? 0.2;
    const fitViewDuration = options.fitViewDuration ?? 400;

    // 只对顶层节点进行布局（不包含容器内的子节点）
    const topLevelNodes = nodes.value.filter((node) => !node.parentNode);

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

    // 添加节点到图中
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

    // 应用新的位置（加上 padding）
    core.updateNodes((currentNodes: Node[]) => {
      return currentNodes.map((node) => {
        const positioned = positionedNodes.find((pn) => pn.node.id === node.id);
        if (!positioned) {
          return node;
        }

        const newX = positioned.x - positioned.width / 2 - baseX + padding;
        const newY = positioned.y - positioned.height / 2 - baseY + padding;

        return {
          ...node,
          position: {
            x: newX,
            y: newY,
          },
        };
      });
    });

    console.log(
      `[AutoLayout Plugin] 自动布局完成，共布局 ${positionedNodes.length} 个节点`
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
