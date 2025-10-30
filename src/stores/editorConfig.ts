/**
 * 编辑器配置 Store - 使用 localStorage 持久化
 */
import { defineStore } from "pinia";
import { useLocalStorage } from "@vueuse/core";
import { editorConfigSchema } from "@/config/editorConfig";

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

  // 使用 localStorage 持久化配置
  const defaults = getDefaultConfig();

  const config = useLocalStorage<Record<string, any>>(
    "editorConfig:settings",
    defaults
  );

  config.value = {
    ...defaults,
    ...config.value,
  };

  /**
   * 更新配置项
   */
  function updateConfig(key: string, value: any) {
    config.value[key] = value;
  }

  /**
   * 批量更新配置
   */
  function updateConfigs(updates: Record<string, any>) {
    Object.keys(updates).forEach((key) => {
      config.value[key] = updates[key];
    });
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
