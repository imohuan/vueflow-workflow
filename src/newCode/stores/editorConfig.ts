/**
 * 编辑器配置 Store
 * 管理画布、执行等全局配置
 */

import { defineStore } from "pinia";
import { ref, watch } from "vue";

/**
 * 编辑器配置接口
 */
export interface EditorConfig {
  // 常规设置
  autoSave: boolean;
  gridSize: number;
  snapToGrid: boolean;

  // 执行模式
  executionMode: "worker" | "server";
  serverUrl: string;
  maxConcurrent: number;

  // 画布缩放
  defaultZoom: number;
  minZoom: number;
  maxZoom: number;

  // 画布设置 - 连线
  edgeType: "default" | "bezier";
  edgeWidth: number;
  edgeColor: string;
  edgeActiveColor: string;
  edgeAnimation: boolean;

  // 画布设置 - 背景
  showGrid: boolean;
  gridType: "dots" | "lines";
  gridGap: number;
  bgColor: string;
  gridColor: string;
}

/**
 * 默认配置
 */
export const DEFAULT_EDITOR_CONFIG: EditorConfig = {
  // 常规设置
  autoSave: true,
  gridSize: 20,
  snapToGrid: true,

  // 执行模式
  executionMode: "worker",
  serverUrl: "http://localhost:3000",
  maxConcurrent: 3,

  // 画布缩放
  defaultZoom: 1,
  minZoom: 0.1,
  maxZoom: 4,

  // 画布设置 - 连线
  edgeType: "bezier",
  edgeWidth: 2,
  edgeColor: "#94a3b8",
  edgeActiveColor: "#3b82f6",
  edgeAnimation: true,

  // 画布设置 - 背景
  showGrid: true,
  gridType: "dots",
  gridGap: 20,
  bgColor: "#ffffff",
  gridColor: "#e2e8f0",
};

/**
 * LocalStorage Key
 */
const STORAGE_KEY = "editorConfig";

/**
 * 从 localStorage 加载配置
 */
function loadConfigFromStorage(): EditorConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_EDITOR_CONFIG, ...parsed };
    }
  } catch (error) {
    console.error("[EditorConfig Store] 加载配置失败:", error);
  }
  return { ...DEFAULT_EDITOR_CONFIG };
}

/**
 * 保存配置到 localStorage
 */
function saveConfigToStorage(config: EditorConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error("[EditorConfig Store] 保存配置失败:", error);
  }
}

/**
 * 编辑器配置 Store
 */
export const useEditorConfigStore = defineStore("editorConfig", () => {
  // 配置状态
  const config = ref<EditorConfig>(loadConfigFromStorage());

  /**
   * 更新配置
   */
  function updateConfig(partial: Partial<EditorConfig>): void {
    config.value = { ...config.value, ...partial };
  }

  /**
   * 重置配置为默认值
   */
  function resetConfig(): void {
    config.value = { ...DEFAULT_EDITOR_CONFIG };
  }

  /**
   * 导出配置
   */
  function exportConfig(): string {
    return JSON.stringify(config.value, null, 2);
  }

  /**
   * 导入配置
   */
  function importConfig(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      config.value = { ...DEFAULT_EDITOR_CONFIG, ...parsed };
      return true;
    } catch (error) {
      console.error("[EditorConfig Store] 导入配置失败:", error);
      return false;
    }
  }

  // 监听配置变化，自动保存到 localStorage
  watch(
    config,
    (newConfig) => {
      saveConfigToStorage(newConfig);
    },
    { deep: true }
  );

  return {
    config,
    updateConfig,
    resetConfig,
    exportConfig,
    importConfig,
  };
});
