/**
 * 连接验证工具函数
 * 用于验证节点连接是否有效
 */

import type { Ref } from "vue";
import type { Connection, Edge, Node } from "@vue-flow/core";
import { get } from "lodash-es";

/**
 * 验证容器连接规则（独立工具函数，可在多处复用）
 * 禁止容器内部节点连接外部节点（除了父容器的端口）
 *
 * @param connection 连接对象
 * @param nodes 节点数组
 * @returns 连接是否符合容器规则
 */
export function validateContainerConnection(
  connection: {
    source: string;
    sourceHandle?: string | null;
    target: string;
    targetHandle?: string | null;
  },
  nodes: Node[]
): boolean {
  // 禁止连接到 loop-in 端口
  if (connection.targetHandle === "loop-in") {
    return false;
  }

  // 禁止连接到同一个节点
  if (connection.source === connection.target) {
    return false;
  }

  const map = new Map<string, Node>();
  nodes.forEach((n) => map.set(n.id, n));
  const sourceNode = map.get(connection.source);
  const targetNode = map.get(connection.target);
  const sourceParentId = get(sourceNode, "parentNode", "");
  const targetParentId = get(targetNode, "parentNode", "");
  const sourceParentNode = sourceParentId ? map.get(sourceParentId) : null;
  const targetParentNode = targetParentId ? map.get(targetParentId) : null;

  // 如果有任一节点在容器内
  if (sourceParentId || targetParentId) {
    // 允许同一容器内的节点互相连接
    if (sourceParentId && targetParentId && sourceParentId === targetParentId) {
      return true;
    }

    // 允许容器内节点连接到父容器（forLoopContainer）的端口
    if (
      sourceParentId &&
      targetNode?.type === "forLoopContainer" &&
      targetNode?.id === sourceParentId
    ) {
      return true;
    }

    // 允许父容器连接到其内部节点
    if (
      targetParentId &&
      sourceNode?.type === "forLoopContainer" &&
      sourceNode?.id === targetParentId
    ) {
      return true;
    }

    // 允许 group 节点互相连接， group 中的节点就和普通节点相同
    const isSourceGroup = sourceParentId
      ? sourceParentNode?.type === "group"
      : true;
    const isTargetGroup = targetParentId
      ? targetParentNode?.type === "group"
      : true;
    if (isSourceGroup && isTargetGroup) return true;

    return false;
  }
  return true;
}

/**
 * 创建连接验证函数
 * @param edges 边数组的响应式引用
 * @returns 验证函数
 */
export function useConnectionValidation(edges: Ref<Edge[]>) {
  /**
   * 验证连接是否有效
   * @param connection 连接对象
   * @returns 连接是否有效
   */
  function validateConnection(connection: Connection): boolean {
    // 检查连接是否已存在
    const exists = edges.value.some(
      (edge: Edge) =>
        edge.source === connection.source &&
        edge.sourceHandle === connection.sourceHandle &&
        edge.target === connection.target &&
        edge.targetHandle === connection.targetHandle
    );
    // 只要连接不存在且不是同一个节点，就是有效的
    return !exists && connection.source !== connection.target;
  }

  return {
    validateConnection,
  };
}
