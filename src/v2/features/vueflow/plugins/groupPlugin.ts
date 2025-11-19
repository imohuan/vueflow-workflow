/**
 * Group 节点插件
 * 实现分组节点的父子关系管理
 * 支持：
 * 1. 拖拽普通节点时，判断是否完全在分组内，如果是则设置 parent
 * 2. 拖拽分组节点时，检查分组内的节点，自动设置/移除 parent 关系
 * 3. 调整分组大小时，检查分组内的节点，自动设置/移除 parent 关系
 */

import type { VueFlowPlugin, PluginContext } from "./types";
import type { Node } from "@vue-flow/core";
import { debounce } from "lodash-es";

/**
 * 获取节点的边界信息
 */
function getNodeBounds(node: Node): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  // 处理 Proxy 对象，获取实际的 position 值
  const position = node.position;
  const x = typeof position.x === "number" ? position.x : 0;
  const y = typeof position.y === "number" ? position.y : 0;

  // 获取宽高，优先从 node.data 中读取，然后是 node.width/height，最后使用默认值
  let width = 300;
  let height = 200;

  // 先尝试从 node.width/height 读取
  if (typeof node.width === "number") {
    width = node.width;
  }
  if (typeof node.height === "number") {
    height = node.height;
  }

  console.log(`[GroupPlugin] getNodeBounds ${node.id}:`, {
    x,
    y,
    width,
    height,
    nodeWidth: node.width,
    nodeHeight: node.height,
    dataWidth: (node.data as any)?.width,
    dataHeight: (node.data as any)?.height,
  });

  return { x, y, width, height };
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

  updateNodes((allNodes: Node[]) =>
    allNodes.map((node) => {
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

        return {
          ...node,
          parentNode: groupId,
          position: { x: relativeX, y: relativeY },
        };
      }

      // 如果节点有该分组作为 parent，检查是否移出了分组
      if (currentParent === groupId) {
        // 检查节点是否与分组有交集（节点坐标是相对的）
        const hasIntersection = hasNodeGroupIntersection(
          node,
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

          return {
            ...node,
            parentNode: undefined,
            position: { x: absoluteX, y: absoluteY },
          };
        }
      }

      return node;
    })
  );

  if (!hasChanges) {
    console.log("[GroupPlugin] 没有需要更新的节点");
  }
}

/**
 * 创建 Group 插件
 */
export function createGroupPlugin(): VueFlowPlugin {
  return {
    config: {
      id: "group",
      name: "Group Node Plugin",
      description: "管理分组节点的父子关系",
      enabled: true,
      version: "1.0.0",
    },

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
      const handleNodeDragStop = debounce(checkGroupParentRelations, 50);

      // 使用事件系统监听分组拖拽结束
      const unsubscribeGroupDragEnd = context.core.events?.on(
        "group-node:drag-end",
        handleGroupDragEnd
      );

      // 监听节点拖拽结束
      const unsubscribeNodeDragStop =
        context.vueflow.onNodeDragStop?.(handleNodeDragStop);

      return () => {
        // 清理事件监听器
        (unsubscribeGroupDragEnd as any)?.off?.();
        (unsubscribeNodeDragStop as any)?.();
        // 取消待处理的 debounce 调用
        handleNodeDragStop.cancel();
      };
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
