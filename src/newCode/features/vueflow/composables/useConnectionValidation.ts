/**
 * 连接验证工具函数
 * 用于验证节点连接是否有效
 */

import type { Ref } from "vue";
import type { Connection, Edge } from "@vue-flow/core";

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
