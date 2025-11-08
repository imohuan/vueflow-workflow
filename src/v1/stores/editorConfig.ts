/**
 * 编辑器配置 Store - 使用 localStorage 持久化
 */
import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { editorConfigSchema } from "../config/editorConfig";

/**
 * 从 URL query 参数读取配置
 */
function getConfigFromURL(): Record<string, any> {
  const params = new URLSearchParams(window.location.search);
  const urlConfig: Record<string, any> = {};

  editorConfigSchema.forEach((section) => {
    section.items.forEach((item) => {
      const value = params.get(item.key);
      if (value !== null) {
        // 根据类型解析值
        switch (item.type) {
          case "checkbox":
            urlConfig[item.key] = value === "true" || value === "1";
            break;
          case "range":
            urlConfig[item.key] = parseFloat(value);
            break;
          case "color":
            urlConfig[item.key] = value;
            break;
          case "select":
            urlConfig[item.key] = value;
            break;
        }
      }
    });
  });

  return urlConfig;
}

/**
 * 将配置同步到 URL query 参数
 */
function syncConfigToURL(config: Record<string, any>): void {
  try {
    const params = new URLSearchParams(window.location.search);

    // 保留执行模式相关参数
    const mode = params.get("mode");
    const serverUrl = params.get("serverUrl");

    // 清空旧参数
    const newParams = new URLSearchParams();
    if (mode) newParams.set("mode", mode);
    if (serverUrl) newParams.set("serverUrl", serverUrl);

    // 只同步非默认值的配置到 URL
    editorConfigSchema.forEach((section) => {
      section.items.forEach((item) => {
        const value = config[item.key];
        if (value !== undefined && value !== item.defaultValue) {
          newParams.set(item.key, String(value));
        }
      });
    });

    const newUrl = `${window.location.pathname}?${newParams.toString()}`;
    window.history.replaceState({}, "", newUrl);
  } catch (error) {
    console.error("同步配置到 URL 失败:", error);
  }
}

export const useEditorConfigStore = defineStore("editorConfig", () => {
  // 获取默认配置
  function getDefaultConfig(): Record<string, any> {
    const defaults: Record<string, any> = {};
    editorConfigSchema.forEach((section) => {
      section.items.forEach((item) => {
        defaults[item.key] = item.defaultValue;
      });
    });
    // 额外配置项（不在 schema 中的）
    defaults.snapGrid = [15, 15];
    return defaults;
  }

  // 获取初始配置：默认 -> localStorage -> URL
  const defaults = getDefaultConfig();
  const urlConfig = getConfigFromURL();

  const config = useLocalStorage<Record<string, any>>(
    "editorConfig:settings",
    defaults
  );

  // 合并配置：默认 -> localStorage -> URL（优先级递增）
  config.value = {
    ...defaults,
    ...config.value,
    ...urlConfig,
  };

  // 首次加载时同步到 URL
  syncConfigToURL(config.value);

  /**
   * 更新配置项
   */
  function updateConfig(key: string, value: any) {
    config.value[key] = value;
    syncConfigToURL(config.value);
  }

  /**
   * 批量更新配置
   */
  function updateConfigs(updates: Record<string, any>) {
    Object.keys(updates).forEach((key) => {
      config.value[key] = updates[key];
    });
    syncConfigToURL(config.value);
  }

  /**
   * 重置为默认配置
   */
  function resetToDefaults() {
    config.value = getDefaultConfig();
  }

  return {
    config,
    updateConfig,
    updateConfigs,
    resetToDefaults,
  };
});
