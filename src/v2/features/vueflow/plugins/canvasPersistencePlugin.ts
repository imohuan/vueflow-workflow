/**
 * Canvas 视图状态持久化插件
 * 保存画布的视图状态（执行结果、FPS 等），工作流数据由 workflowStore 管理
 */

import { watch } from "vue";
import type { VueFlowPlugin, PluginContext } from "./types";
import { useCanvasStore } from "../../../stores/canvas";

/** localStorage 存储键 */
const STORAGE_KEY = "canvas-view-state";

/**
 * 画布视图状态
 */
interface CanvasViewState {
  /** 执行结果预览 */
  lastNodeResults: Array<{ id: string; timestamp: string; preview: string }>;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 创建 Canvas 持久化插件
 *
 * 注意：此插件只保存视图状态，不保存 nodes 和 edges
 * nodes 和 edges 由 workflowStore 自动持久化
 */
export function createCanvasPersistencePlugin(): VueFlowPlugin {
  let stopWatchers: Array<() => void> = [];
  let saveTimer: number | null = null;
  let beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;

  /**
   * 保存画布视图状态到 localStorage
   */
  function saveToLocalStorage(canvasStore: ReturnType<typeof useCanvasStore>) {
    try {
      const state: CanvasViewState = {
        lastNodeResults: canvasStore.lastNodeResults,
        timestamp: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      console.log("[CanvasPersistence Plugin] 画布视图状态已保存");
    } catch (error) {
      console.error("[CanvasPersistence Plugin] 保存失败:", error);
    }
  }

  /**
   * 从 localStorage 加载画布视图状态
   */
  function loadFromLocalStorage(
    canvasStore: ReturnType<typeof useCanvasStore>
  ): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        console.log("[CanvasPersistence Plugin] 没有找到已保存的画布视图状态");
        return false;
      }

      const state: CanvasViewState = JSON.parse(stored);

      // 恢复执行结果预览
      if (state.lastNodeResults && Array.isArray(state.lastNodeResults)) {
        canvasStore.lastNodeResults = state.lastNodeResults;
      }

      console.log(
        `[CanvasPersistence Plugin] 画布视图状态已恢复 (${
          state.lastNodeResults?.length || 0
        } 条执行记录)`
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
      name: "Canvas 视图持久化插件",
      description:
        "自动保存画布视图状态（执行结果等）到 localStorage。注意：工作流数据由 workflowStore 管理。",
      enabled: true,
      version: "2.0.0",
    },

    setup(_context: PluginContext) {
      console.log("[CanvasPersistence Plugin] 插件已初始化");

      const canvasStore = useCanvasStore();

      // 清理旧的存储键（如果存在）
      const oldStorageKey = "canvas-state";
      if (localStorage.getItem(oldStorageKey)) {
        console.log("[CanvasPersistence Plugin] 检测到旧的存储格式，已清理");
        localStorage.removeItem(oldStorageKey);
      }

      // 启动时加载已保存的视图状态
      loadFromLocalStorage(canvasStore);

      // 监听执行结果变化，使用防抖保存（只监听长度，避免 deep watch）
      const stopResultsWatcher = watch(
        () => canvasStore.lastNodeResults.length,
        () => {
          debouncedSave(canvasStore);
        }
      );

      stopWatchers.push(stopResultsWatcher);

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
