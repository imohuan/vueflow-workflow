/**
 * 边编辑插件
 * 支持拖拽编辑边的连接端点
 * - 拖拽边的端点可以重新连接到其他端口
 * - 如果没有连接到有效端口则删除边
 * - 可以重连回原来的端口
 */

import type { VueFlowPlugin, PluginContext } from "./types";
import type { Edge, EdgeUpdateEvent } from "@vue-flow/core";
import { ref } from "vue";

/**
 * 边验证函数类型
 * @param edge - 原始边
 * @param newConnection - 新的连接信息
 * @returns 是否有效
 */
export type EdgeValidationFn = (
  edge: Edge,
  newConnection: {
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }
) => boolean;

/**
 * 边编辑插件选项
 */
export interface EdgeEditPluginOptions {
  /**
   * 边验证函数
   * 用于验证新连接是否有效
   */
  validateEdge?: EdgeValidationFn;
  /**
   * 是否允许重连回原端口
   * @default true
   */
  allowReconnectToOriginal?: boolean;
}

/**
 * 创建边编辑插件
 */
export function createEdgeEditPlugin(
  options: EdgeEditPluginOptions = {}
): VueFlowPlugin {
  const { validateEdge, allowReconnectToOriginal = true } = options;

  // 边更新状态
  const updatingEdgeId = ref<string | null>(null);
  const edgeUpdateSuccessful = ref<boolean>(false);
  const originalEdge = ref<Edge | null>(null);

  /**
   * 检查边是否已存在
   */
  function hasExistingEdge(
    edges: Edge[],
    connection: {
      source: string;
      target: string;
      sourceHandle?: string | null;
      targetHandle?: string | null;
    },
    excludeEdgeId?: string
  ): boolean {
    return edges.some(
      (e: Edge) =>
        e.id !== excludeEdgeId &&
        e.source === connection.source &&
        e.target === connection.target &&
        e.sourceHandle === connection.sourceHandle &&
        e.targetHandle === connection.targetHandle
    );
  }

  /**
   * 默认边验证函数
   */
  function defaultValidateEdge(
    edges: Edge[],
    edge: Edge,
    newConnection: {
      source: string;
      target: string;
      sourceHandle?: string | null;
      targetHandle?: string | null;
    }
  ): boolean {
    // 检查是否已存在相同连接
    if (hasExistingEdge(edges, newConnection, edge.id)) {
      console.log(`[Edge Edit Plugin] 已存在相同连接，验证失败`);
      return false;
    }

    // 如果提供了自定义验证函数，使用它
    if (validateEdge) {
      const customResult = validateEdge(edge, newConnection);
      console.log(`[Edge Edit Plugin] 自定义验证函数结果:`, customResult);
      return customResult;
    }

    return true;
  }

  /**
   * 处理边更新开始
   */
  function onEdgeUpdateStart(_context: PluginContext, event: { edge: Edge }) {
    const { edge } = event;
    updatingEdgeId.value = edge.id;
    edgeUpdateSuccessful.value = false;
    originalEdge.value = { ...edge };

    console.log(`[Edge Edit Plugin] 开始编辑边: ${edge.id}`, {
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    });
  }

  /**
   * 处理边更新
   */
  function onEdgeUpdate(
    context: PluginContext,
    { edge, connection }: EdgeUpdateEvent
  ) {
    const edges = context.core.edges.value;

    const newConnection = {
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? null,
      targetHandle: connection.targetHandle ?? null,
    };

    console.log(`[Edge Edit Plugin] 边更新:`, {
      edgeId: edge.id,
      newConnection,
      originalEdge: originalEdge.value,
      allowReconnectToOriginal,
    });

    // 检查是否重连回原端口
    if (allowReconnectToOriginal && originalEdge.value) {
      const orig = originalEdge.value;
      const isReconnectToOriginal =
        orig.source === newConnection.source &&
        orig.target === newConnection.target &&
        orig.sourceHandle === newConnection.sourceHandle &&
        orig.targetHandle === newConnection.targetHandle;

      console.log(
        `[Edge Edit Plugin] 是否重连回原端口:`,
        isReconnectToOriginal
      );

      if (isReconnectToOriginal) {
        edgeUpdateSuccessful.value = true;
        console.log(`[Edge Edit Plugin] 允许重连回原端口: ${edge.id}`);
        return; // 直接返回，不需要更新边（因为位置没变）
      }
    }

    // 验证新连接
    const isValid = defaultValidateEdge(edges, edge, newConnection);

    if (!isValid) {
      console.log(`[Edge Edit Plugin] 边更新验证失败: ${edge.id}`);
      edgeUpdateSuccessful.value = false;
      return;
    }

    // 更新边
    context.core.edges.value = edges.map((e: Edge) =>
      e.id === edge.id
        ? {
            ...e,
            source: connection.source,
            target: connection.target,
            sourceHandle: connection.sourceHandle,
            targetHandle: connection.targetHandle,
          }
        : e
    );

    edgeUpdateSuccessful.value = true;
    console.log(`[Edge Edit Plugin] 边更新成功: ${edge.id}`);
  }

  /**
   * 处理边更新结束
   */
  function onEdgeUpdateEnd(context: PluginContext, event: { edge: Edge }) {
    const { edge } = event;

    console.log(`[Edge Edit Plugin] 边更新结束:`, {
      edgeId: edge.id,
      updateSuccessful: edgeUpdateSuccessful.value,
    });

    // 如果更新未成功，删除该边
    if (!edgeUpdateSuccessful.value) {
      const edges = context.core.edges.value;
      context.core.edges.value = edges.filter((e: Edge) => e.id !== edge.id);
      console.log(`[Edge Edit Plugin] 边更新失败，已删除: ${edge.id}`);
    } else {
      console.log(`[Edge Edit Plugin] 边更新完成: ${edge.id}`);
    }

    // 重置状态
    updatingEdgeId.value = null;
    edgeUpdateSuccessful.value = false;
    originalEdge.value = null;
  }

  return {
    config: {
      id: "edge-edit",
      name: "边编辑",
      description: "支持拖拽编辑边的连接端点",
      enabled: true,
      version: "1.0.0",
    },

    setup(context: PluginContext) {
      if (!context.core.events) {
        console.warn("[Edge Edit Plugin] 事件系统不可用，插件无法启用");
        return;
      }

      // 暴露状态到共享区，供其他插件使用
      context.shared["edge-edit"] = {
        /** 标记边更新成功（供其他插件调用，如 Ctrl 连接完成后） */
        markUpdateSuccessful: () => {
          edgeUpdateSuccessful.value = true;
          console.log(
            `[Edge Edit Plugin] 其他插件标记更新成功: ${updatingEdgeId.value}`
          );
        },
      };

      // 监听边编辑事件
      context.core.events.on("edge:update-start", (event: any) => {
        onEdgeUpdateStart(context, event);
      });

      context.core.events.on("edge:update", (event: any) => {
        onEdgeUpdate(context, event);
      });

      context.core.events.on("edge:update-end", (event: any) => {
        onEdgeUpdateEnd(context, event);
      });

      console.log("[Edge Edit Plugin] 边编辑插件已启用");
      console.log(
        `[Edge Edit Plugin] 允许重连回原端口: ${allowReconnectToOriginal}`
      );
    },

    cleanup() {
      // 清理状态
      updatingEdgeId.value = null;
      edgeUpdateSuccessful.value = false;
      originalEdge.value = null;
      console.log("[Edge Edit Plugin] 边编辑插件已清理");
    },
  };
}
