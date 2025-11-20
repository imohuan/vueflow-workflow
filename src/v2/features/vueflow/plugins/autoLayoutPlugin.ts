/**
 * 自动布局插件
 * 使用 Dagre 算法自动排列画布中的节点
 * 参考 NodeEditor.vue 的实现方式
 */

import type { VueFlowPlugin, PluginContext } from "./types";
import type { Node, Edge } from "@vue-flow/core";
import { nextTick } from "vue";
import dagre from "@dagrejs/dagre";
import {
  CONTAINER_CONFIG,
  GROUP_CONTAINER_CONFIG,
} from "../../../config/nodeConfig";

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

interface ContainerLayoutConfig {
  headerHeight: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  minWidth: number;
  minHeight: number;
}

const DEFAULT_CONTAINER_LAYOUT: ContainerLayoutConfig = {
  headerHeight: CONTAINER_CONFIG.headerHeight,
  padding: {
    top: CONTAINER_CONFIG.padding.top,
    right: CONTAINER_CONFIG.padding.right,
    bottom: CONTAINER_CONFIG.padding.bottom,
    left: CONTAINER_CONFIG.padding.left,
  },
  minWidth: CONTAINER_CONFIG.minWidth,
  minHeight: CONTAINER_CONFIG.minHeight,
};

const GROUP_CONTAINER_LAYOUT: ContainerLayoutConfig = {
  headerHeight: GROUP_CONTAINER_CONFIG.headerHeight,
  padding: {
    top: GROUP_CONTAINER_CONFIG.padding.top,
    right: GROUP_CONTAINER_CONFIG.padding.right,
    bottom: GROUP_CONTAINER_CONFIG.padding.bottom,
    left: GROUP_CONTAINER_CONFIG.padding.left,
  },
  minWidth: GROUP_CONTAINER_CONFIG.minWidth,
  minHeight: GROUP_CONTAINER_CONFIG.minHeight,
};

function getContainerLayoutConfig(
  container?: Node | null
): ContainerLayoutConfig {
  if (container?.type === "group") {
    return GROUP_CONTAINER_LAYOUT;
  }
  return DEFAULT_CONTAINER_LAYOUT;
}

/**
 * 创建自动布局插件
 */
export function createAutoLayoutPlugin(): VueFlowPlugin {
  let pluginContext: PluginContext | null = null;

  /**
   * 获取节点的近似宽度
   */
  function parseDimension(value: unknown): number | null {
    if (typeof value === "number" && !Number.isNaN(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  function getNodeApproxWidth(node: Node): number {
    const nodeAny = node as any;
    const parsedWidth =
      parseDimension(nodeAny?.dimensions?.width) ??
      parseDimension(nodeAny?.width) ??
      parseDimension(nodeAny?.data?.style?.bodyStyle?.width) ??
      parseDimension(nodeAny?.data?.width);

    if (parsedWidth != null) {
      return parsedWidth;
    }

    if (node.type === "loopContainer") {
      return 400;
    }
    if (node.type === "group") {
      return GROUP_CONTAINER_CONFIG.minWidth;
    }
    return 260;
  }

  /**
   * 获取节点的近似高度
   */
  function getNodeApproxHeight(node: Node): number {
    const nodeAny = node as any;
    const parsedHeight =
      parseDimension(nodeAny?.dimensions?.height) ??
      parseDimension(nodeAny?.height) ??
      parseDimension(nodeAny?.data?.style?.bodyStyle?.height) ??
      parseDimension(nodeAny?.data?.height);

    if (parsedHeight != null) {
      return parsedHeight;
    }

    if (node.type === "loopContainer" || node.type === "forLoopContainer") {
      return 300;
    }
    if (node.type === "group") {
      return GROUP_CONTAINER_CONFIG.minHeight;
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
    container: Node,
    nodes: Node[],
    edges: Edge[],
    options: {
      direction: DagreLayoutDirection;
      nodesep: number;
      ranksep: number;
    },
    layoutConfig: ContainerLayoutConfig,
    allowedNodeIds?: Set<string>
  ): {
    positions: Map<string, { x: number; y: number }>;
    requiredSize: { width: number; height: number } | null;
  } {
    const containerId = container.id;
    const result = new Map<string, { x: number; y: number }>();

    // 获取容器内的所有子节点
    const childNodes = nodes.filter(
      (n) =>
        n.parentNode === containerId &&
        (!allowedNodeIds || allowedNodeIds.has(n.id))
    );

    if (childNodes.length === 0) {
      return { positions: result, requiredSize: null };
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
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    childNodes.forEach((node) => {
      const dagreNode = graph.node(node.id);
      if (!dagreNode) return;

      const width = dagreNode.width;
      const height = dagreNode.height;
      const left = dagreNode.x - width / 2;
      const top = dagreNode.y - height / 2;
      const right = dagreNode.x + width / 2;
      const bottom = dagreNode.y + height / 2;

      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, right);
      maxY = Math.max(maxY, bottom);
    });

    const baseX = Number.isFinite(minX) ? minX : 0;
    const baseY = Number.isFinite(minY) ? minY : 0;
    const contentWidth =
      Number.isFinite(maxX) && Number.isFinite(minX) ? maxX - minX : 0;
    const contentHeight =
      Number.isFinite(maxY) && Number.isFinite(minY) ? maxY - minY : 0;

    // 计算相对位置（相对于容器左上角，考虑容器的 padding 和 header）
    childNodes.forEach((node) => {
      const dagreNode = graph.node(node.id);
      if (!dagreNode) return;

      const relativeX =
        dagreNode.x - dagreNode.width / 2 - baseX + layoutConfig.padding.left;
      const relativeY =
        dagreNode.y -
        dagreNode.height / 2 -
        baseY +
        layoutConfig.headerHeight +
        layoutConfig.padding.top;

      result.set(node.id, { x: relativeX, y: relativeY });
    });

    return {
      positions: result,
      requiredSize: {
        width: Math.max(
          contentWidth + layoutConfig.padding.left + layoutConfig.padding.right,
          layoutConfig.minWidth
        ),
        height: Math.max(
          contentHeight +
            layoutConfig.headerHeight +
            layoutConfig.padding.top +
            layoutConfig.padding.bottom,
          layoutConfig.minHeight
        ),
      },
    };
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

    const selectedNodes = (vueflow.getSelectedNodes?.value ?? []) as Node[];
    const partialLayout = selectedNodes.length > 1;
    const allowedNodeIds = new Set(
      (partialLayout ? selectedNodes : nodes.value).map((n) => n.id)
    );
    const nodeMap = new Map(
      nodes.value.map((node) => [node.id, node] as const)
    );
    const groupNodeIds = new Set(
      nodes.value.filter((node) => node.type === "group").map((node) => node.id)
    );
    const childToGroupMap = new Map<string, string>();
    nodes.value.forEach((node) => {
      if (node.parentNode && groupNodeIds.has(node.parentNode)) {
        childToGroupMap.set(node.id, node.parentNode);
      }
    });

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
    const containerSizeRequirements = new Map<
      string,
      { width: number; height: number }
    >();

    const containersToLayout = new Set<string>();
    nodes.value.forEach((n) => {
      if (n.parentNode && allowedNodeIds.has(n.id)) {
        containersToLayout.add(n.parentNode);
      }
    });

    containersToLayout.forEach((containerId) => {
      const containerNode = nodeMap.get(containerId);
      if (!containerNode) {
        return;
      }
      console.log(
        "[AutoLayout Plugin] 处理容器布局",
        containerId,
        containerNode.type
      );
      const childLayout = layoutContainerChildren(
        containerNode,
        nodes.value,
        partialLayout
          ? edges.value.filter(
              (e: Edge) =>
                allowedNodeIds.has(e.source) && allowedNodeIds.has(e.target)
            )
          : edges.value,
        {
          direction,
          nodesep: nodesep * 0.8,
          ranksep: ranksep * 0.7,
        },
        getContainerLayoutConfig(containerNode),
        allowedNodeIds
      );
      containerChildPositions.set(containerId, childLayout.positions);

      if (
        !partialLayout &&
        containerNode.type === "group" &&
        childLayout.requiredSize
      ) {
        containerSizeRequirements.set(containerId, childLayout.requiredSize);
        console.log(
          "[AutoLayout Plugin] 分组尺寸需求",
          containerId,
          childLayout.requiredSize
        );
      }
    });

    // 应用容器内子节点的位置
    if (containerChildPositions.size > 0) {
      const resizedGroups = new Set<string>();

      // 先更新子节点位置
      core.updateNodes((currentNodes: Node[]) => {
        return currentNodes.map((node) => {
          if (
            node.parentNode &&
            containerChildPositions.has(node.parentNode) &&
            (!partialLayout || allowedNodeIds.has(node.id))
          ) {
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

      // 然后单独更新分组节点尺寸（使用 vueflow.updateNode 确保 VueFlow 正确识别）
      containerSizeRequirements.forEach((targetSize, groupId) => {
        const groupNode = nodeMap.get(groupId);
        if (
          groupNode &&
          groupNode.type === "group" &&
          (!partialLayout || allowedNodeIds.has(groupId))
        ) {
          console.log(
            "[AutoLayout Plugin] 调整分组尺寸",
            groupId,
            "目标",
            targetSize,
            "当前",
            {
              width: (groupNode as any).width,
              height: (groupNode as any).height,
              dataWidth: (groupNode as any)?.data?.style?.bodyStyle?.width,
              dataHeight: (groupNode as any)?.data?.style?.bodyStyle?.height,
            }
          );

          // 使用 vueflow.updateNode 更新节点，只更新 width 和 height
          // 不修改 data.style.bodyStyle，避免干扰拖拽调整大小的功能
          vueflow.updateNode?.(groupId, {
            width: targetSize.width,
            height: targetSize.height,
          });

          resizedGroups.add(groupId);
        }
      });

      // 等待 DOM 更新
      await nextTick();

      // 触发 updateNodeInternals 让 VueFlow 重新计算节点内部结构
      if (resizedGroups.size > 0) {
        vueflow.updateNodeInternals?.(Array.from(resizedGroups));
        // 再次等待确保 DOM 完全更新
        await nextTick();
      }

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
      containerChildPositions.forEach((_pos, containerId) => {
        if (!partialLayout || allowedNodeIds.has(containerId)) {
          const containerNode = nodeMap.get(containerId);
          if (
            containerNode &&
            (containerNode.type === "forLoopContainer" ||
              containerNode.type === "loopContainer")
          ) {
            forLoopPlugin.updateContainerBounds(containerId);
          }
        }
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
    const topLevelNodes = nodes.value.filter((node) => {
      // 排除有父节点的子节点
      if (node.parentNode) return false;
      // 排除 for 节点的容器（它们会被单独处理）
      if (containerForNodeMap.has(node.id)) return false;
      if (partialLayout && !allowedNodeIds.has(node.id)) return false;
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
    const edgeSource = partialLayout
      ? edges.value.filter(
          (e: Edge) =>
            allowedNodeIds.has(e.source) && allowedNodeIds.has(e.target)
        )
      : edges.value;

    const resolveTopLevelNodeId = (nodeId: string): string | null => {
      const groupId = childToGroupMap.get(nodeId);
      if (groupId) {
        if (partialLayout && !allowedNodeIds.has(groupId)) {
          return null;
        }
        return groupId;
      }

      if (!topLevelNodeIds.has(nodeId)) {
        return null;
      }

      if (partialLayout && !allowedNodeIds.has(nodeId)) {
        return null;
      }

      return nodeId;
    };

    edgeSource.forEach((edge: Edge) => {
      const sourceId = resolveTopLevelNodeId(edge.source);
      const targetId = resolveTopLevelNodeId(edge.target);

      if (
        sourceId &&
        targetId &&
        sourceId !== targetId &&
        topLevelNodeIds.has(sourceId) &&
        topLevelNodeIds.has(targetId)
      ) {
        graph.setEdge(sourceId, targetId);
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
    // 计算整体水平偏移：以参与布局集合中最左节点为锚，保持其原始 X
    let offsetX = 0;
    if (positionedNodes.length > 0) {
      const currentPositions = new Map<string, number>();
      nodes.value.forEach((n) => {
        currentPositions.set(n.id, n.position?.x ?? 0);
      });
      const anchorCandidate = positionedNodes
        .map((pn) => ({
          id: pn.node.id,
          x: currentPositions.get(pn.node.id) ?? 0,
        }))
        .reduce((min, cur) => (cur.x < min.x ? cur : min));
      const anchorPos = positionedNodes.find(
        (pn) => pn.node.id === anchorCandidate.id
      )!;
      const anchorNewX = anchorPos.x - anchorPos.width / 2 - baseX + padding;
      offsetX = (anchorCandidate.x ?? 0) - anchorNewX;
    }
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
        if (positioned && (!partialLayout || allowedNodeIds.has(node.id))) {
          const newX =
            positioned.x - positioned.width / 2 - baseX + padding + offsetX;
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
        if (
          containerForNodeMap.has(node.id) &&
          (!partialLayout || allowedNodeIds.has(node.id))
        ) {
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
            const centeredX = forNodeCenterX - containerWidth / 2 + offsetX;

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
