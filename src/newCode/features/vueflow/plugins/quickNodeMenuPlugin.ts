/**
 * 快捷节点菜单插件
 * 当连接失败时，在鼠标位置显示快捷节点添加菜单
 * - 边编辑失败时显示菜单
 * - 直接拖拽连接线但未连接到目标时显示菜单
 * - 记录临时连接信息，用于后续创建节点和连接
 */

import type { VueFlowPlugin, PluginContext } from "./types";
import { ref } from "vue";

/**
 * 临时连接信息
 */
export interface TemporaryConnection {
  /** 源节点 ID */
  source: string;
  /** 源端口 ID */
  sourceHandle?: string | null;
  /** 鼠标位置（屏幕坐标） */
  position: { x: number; y: number };
}

/**
 * 快捷节点菜单插件选项
 */
export interface QuickNodeMenuPluginOptions {
  /**
   * 是否在边编辑失败时显示菜单
   * @default true
   */
  showOnEdgeUpdateFail?: boolean;
  /**
   * 是否在连接失败时显示菜单
   * @default true
   */
  showOnConnectionFail?: boolean;
}

/**
 * 创建快捷节点菜单插件
 */
export function createQuickNodeMenuPlugin(
  options: QuickNodeMenuPluginOptions = {}
): VueFlowPlugin {
  const { showOnEdgeUpdateFail = true, showOnConnectionFail = true } = options;

  // 临时连接信息
  const temporaryConnection = ref<TemporaryConnection | null>(null);
  // 记录连接开始的源节点和端口
  const connectStartInfo = ref<{
    nodeId: string;
    handleId?: string | null;
  } | null>(null);
  // 记录连接是否成功
  const connectionSuccessful = ref<boolean>(false);

  /**
   * 显示快捷节点菜单
   */
  function showQuickNodeMenu(
    context: PluginContext,
    position: { x: number; y: number },
    connection?: {
      source: string;
      sourceHandle?: string | null;
    }
  ) {
    temporaryConnection.value = connection
      ? {
          source: connection.source,
          sourceHandle: connection.sourceHandle,
          position,
        }
      : null;

    console.log(`[Quick Node Menu Plugin] 显示快捷菜单`, {
      position,
      connection,
    });

    // 通过事件总线通知显示菜单
    context.core.events?.emit("ui:show-quick-node-menu", {
      position,
      connection,
    });
  }

  /**
   * 隐藏快捷节点菜单
   */
  function hideQuickNodeMenu(context: PluginContext) {
    temporaryConnection.value = null;
    console.log(`[Quick Node Menu Plugin] 隐藏快捷菜单`);
    context.core.events?.emit("ui:hide-quick-node-menu", undefined);
  }

  /**
   * 处理连接开始
   */
  function onConnectStart(_context: PluginContext, event: any) {
    const { nodeId, handleId } = event;
    connectStartInfo.value = { nodeId, handleId };
    connectionSuccessful.value = false;
    console.log(`[Quick Node Menu Plugin] 连接开始:`, { nodeId, handleId });
  }

  /**
   * 处理连接成功
   */
  function onConnect(_context: PluginContext, event: any) {
    connectionSuccessful.value = true;
    console.log(`[Quick Node Menu Plugin] 连接成功，事件:`, event);
  }

  /**
   * 处理连接结束
   */
  function onConnectEnd(context: PluginContext, event: any) {
    const mouseEvent =
      (event && "clientX" in event ? event : (event?.event as MouseEvent)) ??
      null;

    console.log(`[Quick Node Menu Plugin] 连接结束:`, {
      connectionSuccessful: connectionSuccessful.value,
      connectStartInfo: connectStartInfo.value,
      hasMouseEvent: Boolean(mouseEvent),
    });

    if (!showOnConnectionFail) {
      connectStartInfo.value = null;
      connectionSuccessful.value = false;
      return;
    }

    const finalize = () => {
      if (!connectionSuccessful.value && connectStartInfo.value) {
        const position = mouseEvent
          ? { x: mouseEvent.clientX, y: mouseEvent.clientY }
          : (context.shared as any)._lastMousePosition;

        if (position) {
          console.log(`[Quick Node Menu Plugin] 连接失败，显示快捷菜单`);
          showQuickNodeMenu(context, position, {
            source: connectStartInfo.value.nodeId,
            sourceHandle: connectStartInfo.value.handleId,
          });
        } else {
          console.warn(
            `[Quick Node Menu Plugin] 无法获取鼠标位置，跳过显示快捷菜单`
          );
        }
      }

      connectStartInfo.value = null;
      connectionSuccessful.value = false;
    };

    // 延迟到下一帧，确保 edge:connected 先执行
    if (typeof window !== "undefined") {
      requestAnimationFrame(finalize);
    } else {
      setTimeout(finalize, 0);
    }
  }

  /**
   * 处理边更新结束
   */
  function onEdgeUpdateEnd(context: PluginContext, event: { edge: any }) {
    console.log(`[Quick Node Menu Plugin] 边更新结束:`, event);

    // 如果没有启用边编辑失败显示菜单，直接返回
    if (!showOnEdgeUpdateFail) {
      return;
    }

    // 从 edgeEditPlugin 的 shared 中获取更新状态
    const edgeEditShared = context.shared["edge-edit"] as any;
    if (!edgeEditShared) {
      console.warn(
        `[Quick Node Menu Plugin] edge-edit 插件未启用，无法获取更新状态`
      );
      return;
    }

    // 检查边更新是否成功
    // 由于 edgeUpdateSuccessful 在 edgeEditPlugin 中是 ref，这里通过其他方式判断
    // 我们监听边是否被删除来判断更新失败

    // 等待下一帧检查边是否还存在
    setTimeout(() => {
      const edges = context.core.edges.value;
      const edgeExists = edges.some((e: any) => e.id === event.edge.id);

      console.log(`[Quick Node Menu Plugin] 边是否仍存在:`, {
        edgeId: event.edge.id,
        exists: edgeExists,
      });

      // 如果边不存在了，说明更新失败被删除，显示快捷菜单
      if (!edgeExists) {
        // 获取最后的鼠标位置（通过监听鼠标事件）
        // 这里我们使用一个全局监听器记录鼠标位置
        const lastMousePosition = (context.shared as any)._lastMousePosition;
        if (lastMousePosition) {
          showQuickNodeMenu(context, lastMousePosition, {
            source: event.edge.source,
            sourceHandle: event.edge.sourceHandle,
          });
        }
      }
    }, 10);
  }

  /**
   * 全局鼠标移动监听器，记录最后的鼠标位置
   */
  function setupGlobalMouseTracking(context: PluginContext) {
    const handleMouseMove = (e: MouseEvent) => {
      (context.shared as any)._lastMousePosition = {
        x: e.clientX,
        y: e.clientY,
      };
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }

  return {
    config: {
      id: "quick-node-menu",
      name: "快捷节点菜单",
      description: "连接失败时显示快捷节点添加菜单",
      enabled: true,
      version: "1.0.0",
    },

    setup(context: PluginContext) {
      if (!context.core.events) {
        console.warn("[Quick Node Menu Plugin] 事件系统不可用，插件无法启用");
        return;
      }

      // 设置全局鼠标跟踪
      const cleanupMouseTracking = setupGlobalMouseTracking(context);

      // 暴露 API 到 shared
      context.shared["quick-node-menu"] = {
        /** 获取临时连接信息 */
        getTemporaryConnection: () => temporaryConnection.value,
        /** 手动显示菜单 */
        show: (
          position: { x: number; y: number },
          connection?: { source: string; sourceHandle?: string | null }
        ) => showQuickNodeMenu(context, position, connection),
        /** 手动隐藏菜单 */
        hide: () => hideQuickNodeMenu(context),
      };

      // 监听连接开始、成功和结束
      context.core.events.on("edge:connect-start", (event: any) => {
        onConnectStart(context, event);
      });

      context.core.events.on("edge:connected", (event: any) => {
        onConnect(context, event);
      });

      context.core.events.on("edge:connect-end", (event: any) => {
        onConnectEnd(context, event);
      });

      // 监听边更新结束
      if (showOnEdgeUpdateFail) {
        context.core.events.on("edge:update-end", (event: any) => {
          onEdgeUpdateEnd(context, event);
        });
      }

      console.log("[Quick Node Menu Plugin] 快捷节点菜单插件已启用");
      console.log(
        `[Quick Node Menu Plugin] 边编辑失败显示: ${showOnEdgeUpdateFail}`
      );
      console.log(
        `[Quick Node Menu Plugin] 连接失败显示: ${showOnConnectionFail}`
      );

      // 返回清理函数
      return () => {
        cleanupMouseTracking();
      };
    },

    cleanup() {
      temporaryConnection.value = null;
      connectStartInfo.value = null;
      connectionSuccessful.value = false;
      console.log("[Quick Node Menu Plugin] 快捷节点菜单插件已清理");
    },
  };
}
