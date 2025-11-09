/**
 * VueFlow 核心逻辑 Hook
 * 封装 VueFlow 的核心功能和状态管理
 */

import { ref, watch, type Ref } from "vue";
import { useVueFlow, type Node, type Edge } from "@vue-flow/core";
import { useCanvasStore } from "../../../stores/canvas";
import { useVueFlowEvents } from "../events/useVueFlowEvents";
import type { PluginManager } from "../plugins";

export interface UseVueFlowCoreOptions {
  /** 是否启用 Pinia Store 同步 */
  enableStoreSync?: boolean;
  /** 是否启用事件通知 */
  enableEvents?: boolean;
  /** 插件管理器（用于调用插件钩子） */
  pluginManager?: PluginManager;
}

/**
 * VueFlow 核心逻辑
 */
export function useVueFlowCore(options: UseVueFlowCoreOptions = {}) {
  const {
    enableStoreSync = true,
    enableEvents = true,
    pluginManager,
  } = options;

  // Canvas Store
  const canvasStore = useCanvasStore();

  // 事件系统
  const events = enableEvents ? useVueFlowEvents() : null;

  // VueFlow 实例
  const vueflow = useVueFlow();
  const { fitView, project, addNodes, addEdges } = vueflow;

  // VueFlow 数据
  const nodes = ref<Node[]>([]) as Ref<Node[]>;
  const edges = ref<Edge[]>([]) as Ref<Edge[]>;

  /**
   * 初始化 VueFlow
   */
  function initialize() {
    // 从 Store 加载初始数据
    if (enableStoreSync) {
      syncFromStore();
      setupStoreWatchers();
    }
  }

  /**
   * 从 Store 同步数据到 VueFlow
   */
  function syncFromStore() {
    nodes.value = canvasStore.nodes as unknown as Node[];
    edges.value = canvasStore.edges as unknown as Edge[];
  }

  /**
   * 设置 Store 监听器
   */
  function setupStoreWatchers() {
    // 防抖计时器
    let syncToStoreTimer: number | null = null;
    const SYNC_DEBOUNCE_MS = 150; // 防抖延迟

    // 防抖函数：同步到 Store
    const debouncedSyncToStore = (updater: () => void) => {
      if (syncToStoreTimer !== null) {
        clearTimeout(syncToStoreTimer);
      }
      syncToStoreTimer = window.setTimeout(updater, SYNC_DEBOUNCE_MS);
    };
    // 监听当前工作流 ID 变化，切换工作流时立即同步
    watch(
      () => canvasStore.currentWorkflowId,
      (newId, oldId) => {
        // 只在工作流 ID 真正变化时触发
        if (newId !== oldId) {
          syncFromStore();

          // 通知插件：工作流已切换（让 historyPlugin 重新初始化）
          if (events) {
            events.emit("workflow:switched", {
              workflowId: newId,
              previousWorkflowId: oldId,
            });
          }
        }
      }
    );

    // 监听 Store 变化 -> 同步到 VueFlow（浅层监听，仅在引用变化时触发）
    watch(
      () => canvasStore.nodes,
      (newNodes) => {
        nodes.value = newNodes as unknown as Node[];
      }
    );

    watch(
      () => canvasStore.edges,
      (newEdges) => {
        edges.value = newEdges as unknown as Edge[];
      }
    );

    // 监听 VueFlow 变化 -> 同步回 Store（使用防抖，避免频繁更新）
    // 监听数组长度变化，避免 deep watch
    watch(
      () => nodes.value.length,
      () => {
        debouncedSyncToStore(() => {
          canvasStore.updateNodes(nodes.value as any);
          if (events) {
            events.emit("canvas:viewport-changed", {
              x: 0,
              y: 0,
              zoom: 1,
            });
          }
        });
      }
    );

    // 监听节点位置/数据变化（使用简化的序列化）
    watch(
      () =>
        nodes.value
          .map((n) => `${n.id}:${n.position.x}:${n.position.y}`)
          .join(","),
      () => {
        debouncedSyncToStore(() => {
          canvasStore.updateNodes(nodes.value as any);
        });
      }
    );

    watch(
      () => edges.value.length,
      () => {
        debouncedSyncToStore(() => {
          canvasStore.updateEdges(edges.value as any);
        });
      }
    );
  }

  /**
   * 添加节点
   */
  function addNode(node: Node) {
    addNodes([node]);

    if (events) {
      events.emit("node:added", { node });
    }
  }

  /**
   * 删除节点
   */
  function deleteNode(nodeId: string, enableHook = true) {
    // 调用插件钩子：节点删除前
    if (pluginManager && enableHook) {
      const result = pluginManager.callHook("beforeNodeDelete", nodeId);
      // 如果钩子返回 false，则阻止删除
      if (result === false) {
        console.log(`[VueFlowCore] 插件阻止了节点删除: ${nodeId}`);
        return;
      }
    }

    // 删除节点
    nodes.value = nodes.value.filter((n: Node) => n.id !== nodeId);

    // 删除与该节点相关的所有边
    edges.value = edges.value.filter(
      (e: Edge) => e.source !== nodeId && e.target !== nodeId
    );

    // 调用插件钩子：节点删除后
    if (pluginManager && enableHook) {
      pluginManager.callHook("afterNodeDelete", nodeId);
    }

    if (events) {
      events.emit("node:deleted", { nodeId });
    }
  }

  /**
   * 添加边
   */
  function addEdge(edge: Edge) {
    addEdges([edge]);

    if (events) {
      events.emit("edge:added", { edge });
    }
  }

  /**
   * 删除边
   */
  function deleteEdge(edgeId: string, enableHook = true) {
    // 调用插件钩子：边删除前
    if (pluginManager && enableHook) {
      const result = pluginManager.callHook("beforeEdgeDelete", edgeId);
      // 如果钩子返回 false，则阻止删除
      if (result === false) {
        console.log(`[VueFlowCore] 插件阻止了边删除: ${edgeId}`);
        return;
      }
    }

    edges.value = edges.value.filter((e: Edge) => e.id !== edgeId);

    // 调用插件钩子：边删除后
    if (pluginManager) {
      pluginManager.callHook("afterEdgeDelete", edgeId);
    }

    if (events) {
      events.emit("edge:deleted", { edgeId });
    }
  }

  /**
   * 批量更新边
   */
  function updateEdges(updater: (edges: Edge[]) => Edge[]) {
    edges.value = updater(edges.value);
  }

  /**
   * 批量更新节点
   */
  function updateNodes(updater: (nodes: Node[]) => Node[]) {
    nodes.value = updater(nodes.value);
  }

  /**
   * 清空画布
   */
  function clearCanvas() {
    nodes.value = [];
    edges.value = [];

    if (events) {
      events.emit("canvas:cleared", undefined as any);
    }
  }

  /**
   * 适应视图
   */
  async function fitViewToCanvas(options?: {
    padding?: number;
    duration?: number;
  }) {
    await fitView({
      padding: options?.padding ?? 0.2,
      duration: options?.duration ?? 300,
    });

    if (events) {
      events.emit("canvas:fit-view", { padding: options?.padding });
    }
  }

  /**
   * 获取画布中心点坐标
   */
  function getCanvasCenter() {
    const viewport = project({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    return viewport;
  }

  // 初始化
  initialize();

  return {
    // 数据
    nodes,
    edges,

    // VueFlow 实例方法
    fitView,
    project,
    vueflow,

    // 自定义方法
    addNode,
    deleteNode,
    addEdge,
    deleteEdge,
    updateEdges,
    updateNodes,
    clearCanvas,
    fitViewToCanvas,
    getCanvasCenter,
    syncFromStore,

    // 事件系统
    events,
  };
}
