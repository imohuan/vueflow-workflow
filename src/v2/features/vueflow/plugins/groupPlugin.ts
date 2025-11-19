/**
 * Group 节点插件
 * 实现分组节点的父子关系管理
 * 支持：
 * 1. 拖拽普通节点时，判断是否完全在分组内，如果是则设置 parent
 * 2. 拖拽分组节点时，检查分组内的节点，自动设置/移除 parent 关系
 * 3. 调整分组大小时，检查分组内的节点，自动设置/移除 parent 关系
 */

import type { VueFlowPlugin, PluginContext } from "./types";
import type { ComputedRef } from "vue";
import type { GraphNode, Node, Rect } from "@vue-flow/core";
import { getRectOfNodes } from "@vue-flow/core";
import { debounce } from "lodash-es";
import { onKeyStroke } from "@vueuse/core";
import { GROUP_CONTAINER_CONFIG } from "../../../config/nodeConfig";
import { useCanvasStore } from "../../../stores/canvas";
import type { NodeMetadataItem } from "../executor/types";

interface GroupPluginOptions {
  enableShortcut?: ComputedRef<boolean>;
}

const MIN_GROUP_WIDTH = GROUP_CONTAINER_CONFIG.minWidth;
const MIN_GROUP_HEIGHT = GROUP_CONTAINER_CONFIG.minHeight;
const GROUP_SYNC_DELAY = GROUP_CONTAINER_CONFIG.syncDelay;
const GROUP_PADDING = GROUP_CONTAINER_CONFIG.padding;
const GROUP_HEADER_HEIGHT = GROUP_CONTAINER_CONFIG.headerHeight;
const GROUP_TOP_OFFSET = GROUP_HEADER_HEIGHT + GROUP_PADDING.top;

function getNodeMetadataByType(nodeType: string): NodeMetadataItem | null {
  try {
    const canvasStore = useCanvasStore();
    const metadata = canvasStore.availableNodes.find(
      (node) => node.type === nodeType
    );
    return metadata ?? null;
  } catch (error) {
    console.warn(
      `[GroupPlugin] 获取节点元数据失败 (${nodeType})`,
      (error as Error)?.message || error
    );
    return null;
  }
}

function getDefaultParamsFromMetadata(metadata: NodeMetadataItem | null) {
  if (!metadata?.inputs?.length) {
    return {};
  }
  return metadata.inputs.reduce<Record<string, any>>((acc, input) => {
    acc[input.name] = input.defaultValue;
    return acc;
  }, {});
}

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

/**
 * 获取节点的边界信息
 */
function getNodeBounds(node: Node): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const nodeAny = node as any;
  const computedPosition =
    nodeAny?.computedPosition ?? nodeAny?.positionAbsolute ?? node.position;

  const x = typeof computedPosition?.x === "number" ? computedPosition.x : 0;
  const y = typeof computedPosition?.y === "number" ? computedPosition.y : 0;

  let width =
    parseDimension(nodeAny?.dimensions?.width) ??
    parseDimension(node.width) ??
    parseDimension(nodeAny?.data?.style?.bodyStyle?.width) ??
    parseDimension(nodeAny?.data?.width) ??
    300;

  let height =
    parseDimension(nodeAny?.dimensions?.height) ??
    parseDimension(node.height) ??
    parseDimension(nodeAny?.data?.style?.bodyStyle?.height) ??
    parseDimension(nodeAny?.data?.height) ??
    200;

  console.log(`[GroupPlugin] getNodeBounds ${node.id}:`, {
    x,
    y,
    width,
    height,
    nodeWidth: node.width,
    nodeHeight: node.height,
    computedPosition,
    dataWidth: (node.data as any)?.width,
    dataHeight: (node.data as any)?.height,
  });

  return { x, y, width, height };
}

function calculateManualBounds(nodes: Node[]): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const bounds = getNodeBounds(node);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  });

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 0),
    height: Math.max(maxY - minY, 0),
  };
}

function getSelectionBounds(nodes: GraphNode[]): Rect | null {
  if (!nodes.length) {
    return null;
  }

  try {
    const rect = getRectOfNodes(nodes);
    if (rect && Number.isFinite(rect.width) && Number.isFinite(rect.height)) {
      return rect;
    }
  } catch (error) {
    console.warn("[GroupPlugin] 无法通过 getRectOfNodes 计算选区", error);
  }

  return calculateManualBounds(nodes);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName?.toLowerCase();
  if (!tagName) return false;

  if (target.isContentEditable) {
    return true;
  }

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.getAttribute("role") === "textbox"
  );
}

function buildGroupNode(bounds: Rect): Node {
  const groupMetadata = getNodeMetadataByType("group");
  const metadataParams = getDefaultParamsFromMetadata(groupMetadata);

  const expandedBounds = {
    x: bounds.x - GROUP_PADDING.left,
    y: bounds.y - GROUP_TOP_OFFSET,
    width: bounds.width + GROUP_PADDING.left + GROUP_PADDING.right,
    height: bounds.height + GROUP_TOP_OFFSET + GROUP_PADDING.bottom,
  };

  const normalized = {
    x: Math.floor(expandedBounds.x),
    y: Math.floor(expandedBounds.y),
    width: Math.max(Math.ceil(expandedBounds.width), MIN_GROUP_WIDTH),
    height: Math.max(Math.ceil(expandedBounds.height), MIN_GROUP_HEIGHT),
  };

  const id = `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  return {
    id,
    type: "group",
    position: {
      x: normalized.x,
      y: normalized.y,
    },
    width: normalized.width,
    height: normalized.height,
    data: {
      nodeType: "group",
      label: groupMetadata?.label ?? "分组",
      description: groupMetadata?.description ?? "",
      inputs: groupMetadata?.inputs ?? [],
      outputs: groupMetadata?.outputs ?? [],
      params:
        Object.keys(metadataParams).length > 0
          ? metadataParams
          : {
              title: "分组",
              description: "",
              opacity: 30,
              backgroundColor: "#8b5cf6",
              borderColor: "#8b5cf6",
            },
      style: {
        ...(groupMetadata?.style ?? {}),
        bodyStyle: {
          ...(groupMetadata?.style?.bodyStyle ?? {}),
        },
      },
    },
  } as Node;
}

function createGroupViaSelection(
  context: PluginContext,
  pendingTimers: Set<number>
): boolean {
  const selectedNodes = (context.vueflow.getSelectedNodes?.value ??
    []) as GraphNode[];

  if (!selectedNodes.length) {
    console.log("[GroupPlugin] Ctrl+G：当前没有选中的节点，跳过创建");
    return false;
  }

  const selectionBounds = getSelectionBounds(selectedNodes);

  if (
    !selectionBounds ||
    !Number.isFinite(selectionBounds.width) ||
    !Number.isFinite(selectionBounds.height)
  ) {
    console.warn("[GroupPlugin] Ctrl+G：无法获取选区大小，创建失败", {
      selectionBounds,
      selectedCount: selectedNodes.length,
    });
    return false;
  }

  const groupNode = buildGroupNode(selectionBounds);

  console.log("[GroupPlugin] Ctrl+G：创建分组节点", {
    groupId: groupNode.id,
    selectionBounds,
    targetWidth: groupNode.width,
    targetHeight: groupNode.height,
  });

  context.core.addNode(groupNode);
  context.vueflow.updateNodeInternals?.([groupNode.id]);

  if (typeof window !== "undefined") {
    const timerId = window.setTimeout(() => {
      updateGroupChildren(context, groupNode.id);
      pendingTimers.delete(timerId);
    }, GROUP_SYNC_DELAY);
    pendingTimers.add(timerId);
  } else {
    updateGroupChildren(context, groupNode.id);
  }

  return true;
}

function isShortcutAvailable(options?: GroupPluginOptions): boolean {
  if (!options?.enableShortcut) {
    return true;
  }
  return Boolean(options.enableShortcut.value);
}

function registerCtrlGShortcut(
  context: PluginContext,
  options: GroupPluginOptions,
  pendingTimers: Set<number>
) {
  return onKeyStroke(
    "g",
    (event) => {
      if (!isShortcutAvailable(options)) {
        return;
      }

      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      const created = createGroupViaSelection(context, pendingTimers);
      if (created) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    {
      dedupe: true,
    }
  );
}

/**
 * 检查节点是否完全在分组内
 * 使用 VueFlow 的 getIntersectingNodes API 进行检测
 */
function isNodeCompletelyInGroup(
  node: Node,
  groupNode: Node,
  vueflowApi: any
): boolean {
  if (node.id === groupNode.id) return false;
  // 跳过 for 循环容器节点
  if (node.type === "for-loop-container") return false;
  // 跳过已经是该分组的子节点的节点
  if (node.parentNode === groupNode.id) return true;

  // 使用 VueFlow 的 getIntersectingNodes 检测交集
  const intersectingNodes = vueflowApi.getIntersectingNodes?.(groupNode) || [];
  const isIntersecting = intersectingNodes.some((n: Node) => n.id === node.id);

  console.log(`[GroupPlugin] 节点 ${node.id} 交集检查:`, {
    groupId: groupNode.id,
    isIntersecting,
    intersectingCount: intersectingNodes.length,
  });

  return isIntersecting;
}

/**
 * 检查节点是否与分组有交集
 * 直接使用 VueFlow 实例提供的 getIntersectingNodes
 */
function hasNodeGroupIntersection(
  node: Node,
  groupNode: Node,
  vueflowApi: any
): boolean {
  if (node.id === groupNode.id) return false;

  const intersectingNodes = vueflowApi.getIntersectingNodes?.(groupNode) || [];
  const isIntersecting = intersectingNodes.some(
    (intersectingNode: Node) => intersectingNode.id === node.id
  );

  console.log(`[GroupPlugin] 检查节点与分组交集`, {
    nodeId: node.id,
    groupId: groupNode.id,
    intersectingCount: intersectingNodes.length,
    isIntersecting,
  });

  return isIntersecting;
}

/**
 * 更新分组内的节点 parent 关系
 * 设置 parent 时，同时将坐标转换为相对于分组的相对坐标
 * 移除 parent 时，将坐标转换为绝对坐标
 */
function updateGroupChildren(context: PluginContext, groupId: string) {
  const { nodes, updateNodes } = context.core;
  const groupNode = nodes.value.find((n) => n.id === groupId);

  if (!groupNode || groupNode.type !== "group") {
    console.log("[GroupPlugin] 分组节点不存在或类型错误", groupId);
    return;
  }

  console.log("[GroupPlugin] 更新分组内的节点 parent 关系", groupId);
  const groupBounds = getNodeBounds(groupNode);
  console.log("[GroupPlugin] 分组节点信息:", {
    id: groupNode.id,
    position: groupNode.position,
    width: groupBounds.width,
    height: groupBounds.height,
  });

  let hasChanges = false;

  updateNodes((allNodes: Node[]) => {
    const nextNodes = allNodes.map((node) => {
      if (node.id === groupId) return node;

      // 禁止 group 嵌套：如果节点是 group 类型，跳过
      if (node.type === "group") {
        return node;
      }

      const isInGroup = isNodeCompletelyInGroup(
        node,
        groupNode,
        context.vueflow
      );
      const currentParent = node.parentNode;
      // 打印所有节点信息用于调试
      console.log(
        `[GroupPlugin] 检查节点 ${node.id}:`,
        {
          type: node.type,
          position: node.position,
          width: node.width,
          height: node.height,
          parentNode: node.parentNode,
          isInGroup,
        },
        currentParent === groupId
      );

      let nextNode = node;

      // 如果节点应该在分组内，且没有任何 parent，则设置
      // 如果节点已经有其他 parent，则不更新
      if (isInGroup && !currentParent) {
        console.log(
          `[GroupPlugin] 设置节点 ${node.id} 的 parent 为 ${groupId}`
        );
        hasChanges = true;

        // 计算相对位置：节点的绝对坐标 - 分组的绝对坐标
        const relativeX = node.position.x - groupNode.position.x;
        const relativeY = node.position.y - groupNode.position.y;

        console.log(
          `[GroupPlugin] 坐标转换 - 节点 ${node.id}: 绝对 (${node.position.x}, ${node.position.y}) -> 相对 (${relativeX}, ${relativeY})`
        );

        nextNode = {
          ...nextNode,
          parentNode: groupId,
          position: { x: relativeX, y: relativeY },
        };
      } else if (currentParent === groupId) {
        // 如果节点有该分组作为 parent，检查是否移出了分组
        // 检查节点是否与分组有交集（节点坐标是相对的）
        const hasIntersection = hasNodeGroupIntersection(
          nextNode,
          groupNode,
          context.vueflow
        );

        if (!hasIntersection) {
          console.log(`[GroupPlugin] 移除节点 ${node.id} 的 parent`);
          hasChanges = true;

          // 计算绝对位置：节点的相对坐标 + 分组的绝对坐标
          const absoluteX = groupNode.position.x + node.position.x;
          const absoluteY = groupNode.position.y + node.position.y;

          console.log(
            `[GroupPlugin] 坐标转换 - 节点 ${node.id}: 相对 (${node.position.x}, ${node.position.y}) -> 绝对 (${absoluteX}, ${absoluteY})`
          );

          nextNode = {
            ...nextNode,
            parentNode: undefined,
            position: { x: absoluteX, y: absoluteY },
          };
        }
      }

      return nextNode;
    });
    return nextNodes;
  });

  if (!hasChanges) {
    console.log("[GroupPlugin] 没有需要更新的节点");
  }
}

/**
 * 创建 Group 插件
 */
export function createGroupPlugin(
  options: GroupPluginOptions = {}
): VueFlowPlugin {
  type GroupEventCleanup = (() => void) | { off?: () => void } | null;

  let unsubscribeGroupDragEnd: GroupEventCleanup = null;
  let unsubscribeNodeDragStop: GroupEventCleanup = null;
  let handleNodeDragStop: ReturnType<typeof debounce> | null = null;
  let stopCtrlGListener: (() => void) | null = null;
  const pendingGroupSyncTimers = new Set<number>();

  return {
    config: {
      id: "group",
      name: "Group Node Plugin",
      description: "管理分组节点的父子关系",
      enabled: true,
      version: "1.0.0",
    },

    shortcuts: [
      {
        key: "ctrl+g",
        description: "根据当前选区创建分组节点",
        handler: (context) => {
          if (!isShortcutAvailable(options)) {
            return;
          }
          createGroupViaSelection(context, pendingGroupSyncTimers);
        },
      },
    ],

    setup(context: PluginContext) {
      // 监听分组拖拽结束或 resize 结束
      const handleGroupDragEnd = (data: { nodeId: string }) => {
        console.log("[GroupPlugin] 分组拖拽/resize 结束:", data.nodeId);

        // 拖拽结束后，更新该分组内的节点 parent 关系
        updateGroupChildren(context, data.nodeId);
      };

      // 检查所有分组节点的 parent 关系
      const checkGroupParentRelations = () => {
        console.log("[GroupPlugin] 开始检查所有分组节点");

        // 首先检查有 parent 的节点是否移出了分组
        // checkAndRemoveOutOfGroupParent(context);

        // 获取所有分组节点
        const { nodes } = context.core;
        const groupNodes = nodes.value.filter((n) => n.type === "group");

        console.log(`[GroupPlugin] 找到 ${groupNodes.length} 个分组节点`);

        // 对每个分组，检查其内部节点是否需要更新 parent 关系
        groupNodes.forEach((groupNode) => {
          updateGroupChildren(context, groupNode.id);
        });
      };

      // 使用 debounce 优化节点拖拽结束的处理，避免频繁执行
      handleNodeDragStop = debounce(checkGroupParentRelations, 50);

      // 使用事件系统监听分组拖拽结束
      const groupEventCleanup = context.core.events?.on(
        "group-node:drag-end",
        handleGroupDragEnd
      );
      unsubscribeGroupDragEnd = (groupEventCleanup ??
        null) as GroupEventCleanup;

      // 监听节点拖拽结束
      const nodeDragStopCleanup =
        context.vueflow.onNodeDragStop?.(handleNodeDragStop);
      unsubscribeNodeDragStop = (nodeDragStopCleanup ??
        null) as GroupEventCleanup;

      stopCtrlGListener = registerCtrlGShortcut(
        context,
        options,
        pendingGroupSyncTimers
      );

      console.log("[GroupPlugin] Ctrl+G 快捷键已启用");
    },

    cleanup() {
      if (typeof unsubscribeGroupDragEnd === "function") {
        unsubscribeGroupDragEnd();
      } else {
        (unsubscribeGroupDragEnd as any)?.off?.();
      }
      unsubscribeGroupDragEnd = null;

      if (typeof unsubscribeNodeDragStop === "function") {
        unsubscribeNodeDragStop();
      } else {
        (unsubscribeNodeDragStop as any)?.off?.();
      }
      unsubscribeNodeDragStop = null;

      handleNodeDragStop?.cancel();
      handleNodeDragStop = null;

      stopCtrlGListener?.();
      stopCtrlGListener = null;

      pendingGroupSyncTimers.forEach((timerId) => {
        clearTimeout(timerId);
      });
      pendingGroupSyncTimers.clear();

      console.log("[GroupPlugin] 事件与快捷键监听已清理");
    },

    hooks: {
      afterNodeAdd(context: PluginContext, node: Node) {
        // 禁止 group 嵌套：如果新节点是 group 类型，不设置 parent
        if (node.type === "group") {
          console.log(
            `[GroupPlugin] Group 节点 ${node.id} 不允许嵌套，跳过 parent 设置`
          );
          return;
        }

        // 新节点添加后，检查是否应该设置 parent
        const { nodes, updateNodes } = context.core;
        const groupNodes = nodes.value.filter((n) => n.type === "group");

        for (const groupNode of groupNodes) {
          if (isNodeCompletelyInGroup(node, groupNode, context.vueflow)) {
            // 只设置 parent，不修改坐标（由 VueFlow 自动处理）
            updateNodes((allNodes: Node[]) =>
              allNodes.map((n) =>
                n.id === node.id
                  ? {
                      ...n,
                      parentNode: groupNode.id,
                    }
                  : n
              )
            );
            break;
          }
        }
      },
    },
  };
}
