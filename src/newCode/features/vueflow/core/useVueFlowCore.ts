/**
 * VueFlow 核心逻辑 Hook
 * 封装 VueFlow 的核心功能和状态管理
 */

import { ref, watch, type Ref } from "vue";
import { useVueFlow, type Node, type Edge } from "@vue-flow/core";
import { useCanvasStore } from "@/newCode/stores/canvas";
import { useVueFlowEvents } from "../events/useVueFlowEvents";

export interface UseVueFlowCoreOptions {
  /** 是否启用 Pinia Store 同步 */
  enableStoreSync?: boolean;
  /** 是否启用事件通知 */
  enableEvents?: boolean;
}

/**
 * VueFlow 核心逻辑
 */
export function useVueFlowCore(options: UseVueFlowCoreOptions = {}) {
  const { enableStoreSync = true, enableEvents = true } = options;

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

    // 监听 Store 变化 -> 同步到 VueFlow
    watch(
      () => canvasStore.nodes,
      (newNodes) => {
        nodes.value = newNodes as unknown as Node[];
      },
      { deep: true }
    );

    watch(
      () => canvasStore.edges,
      (newEdges) => {
        edges.value = newEdges as unknown as Edge[];
      },
      { deep: true }
    );

    // 监听 VueFlow 变化 -> 同步回 Store
    watch(
      nodes,
      (newNodes) => {
        if (JSON.stringify(newNodes) !== JSON.stringify(canvasStore.nodes)) {
          // 使用更新方法而不是直接赋值（因为 nodes 现在是计算属性）
          canvasStore.updateNodes(newNodes as any);

          // 触发事件
          if (events) {
            events.emit("canvas:viewport-changed", {
              x: 0,
              y: 0,
              zoom: 1,
            });
          }
        }
      },
      { deep: true }
    );

    watch(
      edges,
      (newEdges) => {
        if (JSON.stringify(newEdges) !== JSON.stringify(canvasStore.edges)) {
          // 使用更新方法而不是直接赋值（因为 edges 现在是计算属性）
          canvasStore.updateEdges(newEdges as any);
        }
      },
      { deep: true }
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
  function deleteNode(nodeId: string) {
    // 删除节点
    nodes.value = nodes.value.filter((n: Node) => n.id !== nodeId);

    // 删除与该节点相关的所有边
    edges.value = edges.value.filter(
      (e: Edge) => e.source !== nodeId && e.target !== nodeId
    );

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
  function deleteEdge(edgeId: string) {
    edges.value = edges.value.filter((e: Edge) => e.id !== edgeId);

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
