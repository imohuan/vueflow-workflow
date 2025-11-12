/**
 * 编辑器配置 Store
 * 管理画布、执行等全局配置
 */

import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { getContext } from "@/v2/context";

/**
 * 编辑器配置接口
 */
export interface EditorConfig {
  /** 是否自动保存 */
  autoSave: boolean;
  /** 网格尺寸，单位 px */
  gridSize: number;
  /** 是否吸附到网格 */
  snapToGrid: boolean;

  /** 执行模式（worker 本地/ server 远程） */
  executionMode: "worker" | "server";
  /** 远程服务地址 */
  serverUrl: string;
  /** 最大并发任务数 */
  maxConcurrent: number;

  /** 默认缩放比例 */
  defaultZoom: number;
  /** 最小缩放倍率 */
  minZoom: number;
  /** 最大缩放倍率 */
  maxZoom: number;

  /** 连线类型 */
  edgeType: "default" | "straight" | "step" | "smoothstep" | "custom";
  /** 连线宽度 */
  edgeWidth: number;
  /** 连线颜色 */
  edgeColor: string;
  /** 连线激活颜色 */
  edgeActiveColor: string;
  /** 连线动画开关 */
  edgeAnimation: boolean;
  /** 是否显示箭头 */
  edgeShowArrow: boolean;

  /** 是否显示背景网格 */
  showGrid: boolean;
  /** 网格类型（点/线） */
  gridType: "dots" | "lines";
  /** 网格间距，单位 px */
  gridGap: number;
  /** 背景颜色 */
  bgColor: string;
  /** 网格颜色 */
  gridColor: string;

  /** 是否显示小地图 */
  showMiniMap: boolean;

  /** 自动布局方向（LR: 从左到右，RL: 右到左，TB: 上到下，BT: 下到上） */
  autoLayoutDirection: "LR" | "RL" | "TB" | "BT";
  /** 同列节点间距（LR/RL模式下为垂直间距，TB/BT模式下为水平间距） */
  autoLayoutNodeSpacing: number;
  /** 列间距（LR/RL模式下为水平间距，TB/BT模式下为垂直间距） */
  autoLayoutRankSpacing: number;
  /** 自动布局整体边距 px */
  autoLayoutPadding: number;
  /** 布局后自动适应视图 */
  autoLayoutFitView: boolean;
  /** 适应视图内边距（0~1） */
  autoLayoutFitViewPadding: number;
  /** 适应视图动画时长（毫秒） */
  autoLayoutFitViewDuration: number;
}

/**
 * 默认配置
 */
export const DEFAULT_EDITOR_CONFIG: EditorConfig = {
  // 常规设置
  autoSave: true,
  gridSize: 20,
  snapToGrid: false,

  // 执行模式
  executionMode: "worker",
  serverUrl: "http://localhost:3000",
  maxConcurrent: 3,

  // 画布缩放
  defaultZoom: 1,
  minZoom: 0.1,
  maxZoom: 4,

  // 画布设置 - 连线
  edgeType: "default",
  edgeWidth: 2,
  edgeColor: "#94a3b8",
  edgeActiveColor: "#3b82f6",
  edgeAnimation: false,
  edgeShowArrow: true,

  // 画布设置 - 背景
  showGrid: true,
  gridType: "dots",
  gridGap: 20,
  bgColor: "#ffffff",
  gridColor: "#e2e8f0",

  // 画布设置 - UI
  showMiniMap: false,

  // 自动布局配置
  autoLayoutDirection: "LR",
  autoLayoutNodeSpacing: 50,
  autoLayoutRankSpacing: 80,
  autoLayoutPadding: 120,
  autoLayoutFitView: true,
  autoLayoutFitViewPadding: 0.2,
  autoLayoutFitViewDuration: 400,
};

/**
 * Storage Key & Namespace
 */
const STORAGE_KEY = "editorConfig";
const NAMESPACE = "v2";

/**
 * 从缓存加载配置（异步）
 */
async function loadConfigFromStorageAsync(): Promise<EditorConfig> {
  try {
    const ctx = getContext();
    const saved = await ctx.cache.read<EditorConfig>(STORAGE_KEY, {
      namespace: NAMESPACE,
    });
    if (saved) {
      return { ...DEFAULT_EDITOR_CONFIG, ...saved };
    }
  } catch (error) {
    console.error("[EditorConfig Store] 加载配置失败:", error);
  }
  return { ...DEFAULT_EDITOR_CONFIG };
}

/**
 * 保存配置到缓存（异步）
 */
async function saveConfigToStorageAsync(config: EditorConfig): Promise<void> {
  try {
    const ctx = getContext();
    await ctx.cache.save(STORAGE_KEY, config, { namespace: NAMESPACE });
  } catch (error) {
    console.error("[EditorConfig Store] 保存配置失败:", error);
  }
}

/**
 * 编辑器配置 Store
 */
export const useEditorConfigStore = defineStore("editorConfig", () => {
  // 配置状态
  const init = ref(false);
  const config = ref<EditorConfig>({ ...DEFAULT_EDITOR_CONFIG });
  // 异步水合
  (async () => {
    config.value = await loadConfigFromStorageAsync();

    // 检查 URL 查询参数中是否有 serverUrl，如果有则切换到 server 模式
    const urlParams = new URLSearchParams(window.location.href.split("?")[1]);
    const serverUrlFromQuery = urlParams.get("serverUrl");
    console.log(urlParams, serverUrlFromQuery);

    if (serverUrlFromQuery) {
      config.value.executionMode = "server";
      config.value.serverUrl = serverUrlFromQuery;
    }
    init.value = true;
  })();

  // 防抖计时器
  let saveTimer: number | null = null;
  const SAVE_DEBOUNCE_MS = 500; // 防抖延迟 500ms

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

  // 监听配置变化，自动保存到 localStorage（使用防抖，减少写入频率）
  watch(
    config,
    (newConfig) => {
      if (saveTimer !== null) {
        clearTimeout(saveTimer);
      }
      saveTimer = window.setTimeout(() => {
        void saveConfigToStorageAsync(newConfig);
        saveTimer = null;
      }, SAVE_DEBOUNCE_MS);
    },
    { deep: true, flush: "post" }
  );

  /**
   * 检查是否已初始化完成
   */
  async function ready(): Promise<boolean> {
    while (!init.value) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return true;
  }

  return {
    init,
    config,
    updateConfig,
    resetConfig,
    exportConfig,
    importConfig,
    ready,
  };
});
