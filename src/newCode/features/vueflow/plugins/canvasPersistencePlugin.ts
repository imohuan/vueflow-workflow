/**
 * Canvas 持久化插件
 * 自动将画布数据保存到 localStorage，并在启动时恢复
 */

import { watch } from "vue";
import type { VueFlowPlugin, PluginContext } from "./types";
import { useCanvasStore } from "@/newCode/stores/canvas";
import { storeToRefs } from "pinia";

/** localStorage 存储键 */
const STORAGE_KEY = "canvas-state";

/**
 * 创建 Canvas 持久化插件
 */
export function createCanvasPersistencePlugin(): VueFlowPlugin {
  let stopWatchers: Array<() => void> = [];
  let saveTimer: number | null = null;
  let beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;

  /**
   * 保存画布状态到 localStorage
   */
  function saveToLocalStorage(canvasStore: ReturnType<typeof useCanvasStore>) {
    try {
      const state = {
        nodes: canvasStore.nodes,
        edges: canvasStore.edges,
        lastNodeResults: canvasStore.lastNodeResults,
        timestamp: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      console.log("[CanvasPersistence Plugin] 画布状态已保存");
    } catch (error) {
      console.error("[CanvasPersistence Plugin] 保存失败:", error);
    }
  }

  /**
   * 从 localStorage 加载画布状态
   */
  function loadFromLocalStorage(
    canvasStore: ReturnType<typeof useCanvasStore>
  ): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        console.log("[CanvasPersistence Plugin] 没有找到已保存的画布状态");
        return false;
      }

      const state = JSON.parse(stored);

      // 恢复节点和边
      if (state.nodes && Array.isArray(state.nodes)) {
        canvasStore.nodes = state.nodes;
      }
      if (state.edges && Array.isArray(state.edges)) {
        canvasStore.edges = state.edges;
      }
      if (state.lastNodeResults && Array.isArray(state.lastNodeResults)) {
        canvasStore.lastNodeResults = state.lastNodeResults;
      }

      console.log(
        `[CanvasPersistence Plugin] 画布状态已恢复 (${
          state.nodes?.length || 0
        } 个节点, ${state.edges?.length || 0} 条连线)`
      );
      return true;
    } catch (error) {
      console.error("[CanvasPersistence Plugin] 加载失败:", error);
      return false;
    }
  }

  /**
   * 防抖保存（避免频繁写入造成卡顿）
   */
  function debouncedSave(canvasStore: ReturnType<typeof useCanvasStore>) {
    // 清除之前的定时器
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
    }

    // 设置新的定时器（500ms 延迟）
    saveTimer = window.setTimeout(() => {
      saveToLocalStorage(canvasStore);
      saveTimer = null;
    }, 500);
  }

  return {
    config: {
      id: "canvas-persistence",
      name: "Canvas 持久化插件",
      description: "自动将画布数据保存到 localStorage，并在启动时恢复",
      enabled: true,
      version: "1.0.0",
    },

    setup(_context: PluginContext) {
      console.log("[CanvasPersistence Plugin] 插件已初始化");

      const canvasStore = useCanvasStore();
      const { nodes, edges } = storeToRefs(canvasStore);

      // 启动时加载已保存的状态
      loadFromLocalStorage(canvasStore);

      // 监听 nodes 和 edges 变化，使用防抖保存
      const stopNodesWatcher = watch(
        () => [nodes.value, edges.value],
        () => {
          debouncedSave(canvasStore);
        },
        { deep: true }
      );

      stopWatchers.push(stopNodesWatcher);

      // 页面卸载前立即保存（退出页面或刷新时）
      beforeUnloadHandler = (_e: BeforeUnloadEvent) => {
        // 取消待执行的防抖保存
        if (saveTimer !== null) {
          clearTimeout(saveTimer);
          saveTimer = null;
        }
        // 立即保存当前状态
        saveToLocalStorage(canvasStore);
        console.log("[CanvasPersistence Plugin] 页面卸载前已保存状态");
      };

      window.addEventListener("beforeunload", beforeUnloadHandler);
    },

    cleanup(_context: PluginContext) {
      console.log("[CanvasPersistence Plugin] 插件已清理");

      // 清除定时器
      if (saveTimer !== null) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }

      // 移除页面卸载监听器
      if (beforeUnloadHandler) {
        window.removeEventListener("beforeunload", beforeUnloadHandler);
        beforeUnloadHandler = null;
      }

      // 停止所有监听器
      stopWatchers.forEach((stop) => stop());
      stopWatchers = [];
    },

    hooks: {
      onInstall(_context: PluginContext) {
        console.log("[CanvasPersistence Plugin] 插件已安装");
      },

      onUninstall(_context: PluginContext) {
        console.log("[CanvasPersistence Plugin] 插件已卸载");

        // 卸载时执行最后一次保存
        const canvasStore = useCanvasStore();
        saveToLocalStorage(canvasStore);
      },
    },
  };
}
