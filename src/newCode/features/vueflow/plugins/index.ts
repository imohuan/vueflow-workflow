/**
 * VueFlow 插件系统
 * 用于扩展画布功能（如复制粘贴、历史记录、自动布局等）
 */

import { ref, type Ref } from "vue";
import type { VueFlowPlugin, PluginContext } from "./types";

export * from "./types";
export { createCopyPastePlugin } from "./copyPastePlugin";
export { createConfigSyncPlugin } from "./configSyncPlugin";
export { createCanvasPersistencePlugin } from "./canvasPersistencePlugin";

/**
 * 插件管理器
 */
export class PluginManager {
  private plugins: Map<string, VueFlowPlugin> = new Map();
  private enabledPlugins: Ref<Set<string>> = ref(new Set());
  private context: PluginContext | null = null;

  /**
   * 设置插件上下文
   */
  setContext(context: PluginContext): void {
    this.context = context;
  }

  /**
   * 注册插件
   */
  register(plugin: VueFlowPlugin): void {
    this.plugins.set(plugin.config.id, plugin);

    // 如果插件默认启用，则自动启用
    if (plugin.config.enabled) {
      this.enable(plugin.config.id);
    }

    console.log(`[Plugin Manager] 插件已注册: ${plugin.config.name}`);
  }

  /**
   * 启用插件
   */
  enable(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`[Plugin Manager] 插件不存在: ${pluginId}`);
      return;
    }

    if (this.enabledPlugins.value.has(pluginId)) {
      return;
    }

    // 调用插件的 setup 方法
    if (plugin.setup && this.context) {
      plugin.setup(this.context);
    }

    // 调用插件的 onInstall 钩子
    if (plugin.hooks?.onInstall && this.context) {
      plugin.hooks.onInstall(this.context);
    }

    this.enabledPlugins.value.add(pluginId);
    console.log(`[Plugin Manager] 插件已启用: ${plugin.config.name}`);
  }

  /**
   * 禁用插件
   */
  disable(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`[Plugin Manager] 插件不存在: ${pluginId}`);
      return;
    }

    if (!this.enabledPlugins.value.has(pluginId)) {
      return;
    }

    // 调用插件的 cleanup 方法
    if (plugin.cleanup && this.context) {
      plugin.cleanup(this.context);
    }

    // 调用插件的 onUninstall 钩子
    if (plugin.hooks?.onUninstall && this.context) {
      plugin.hooks.onUninstall(this.context);
    }

    this.enabledPlugins.value.delete(pluginId);
    console.log(`[Plugin Manager] 插件已禁用: ${plugin.config.name}`);
  }

  /**
   * 切换插件状态
   */
  toggle(pluginId: string): void {
    if (this.isEnabled(pluginId)) {
      this.disable(pluginId);
    } else {
      this.enable(pluginId);
    }
  }

  /**
   * 检查插件是否启用
   */
  isEnabled(pluginId: string): boolean {
    return this.enabledPlugins.value.has(pluginId);
  }

  /**
   * 获取插件
   */
  getPlugin(pluginId: string): VueFlowPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): VueFlowPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取已启用的插件
   */
  getEnabledPlugins(): VueFlowPlugin[] {
    return this.getAllPlugins().filter((plugin) =>
      this.isEnabled(plugin.config.id)
    );
  }

  /**
   * 获取所有快捷键
   */
  getAllShortcuts() {
    return this.getEnabledPlugins().flatMap((plugin) => plugin.shortcuts || []);
  }
}

/**
 * 创建插件管理器
 */
export function createPluginManager(): PluginManager {
  return new PluginManager();
}
