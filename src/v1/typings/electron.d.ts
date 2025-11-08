/**
 * Electron API 类型声明
 */

/** 插件信息 */
export interface ExtensionInfo {
  /** 插件 ID */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version?: string;
  /** 插件 manifest 内容 */
  manifest?: Record<string, any>;
  /** 插件路径 */
  path?: string;
}

/** 加载插件响应 */
export interface LoadExtensionResponse {
  /** 是否成功 */
  success: boolean;
  /** 插件信息 */
  extension?: {
    id: string;
    name: string;
  };
  /** 错误信息 */
  error?: string;
}

/** Electron API 接口 */
export interface ElectronAPI {
  /**
   * 加载插件
   * @param extensionPath - 插件路径（可选，不传会打开文件选择对话框）
   */
  loadExtension: (extensionPath?: string) => Promise<LoadExtensionResponse>;

  /** 打开插件的 popup 页面 */
  openPopup: () => void;

  /** 卸载插件 */
  unloadExtension: () => void;

  /** 获取当前加载的插件信息 */
  getExtensionInfo: () => Promise<ExtensionInfo | null>;

  /** 监听插件加载事件 */
  onExtensionLoaded: (callback: (data: ExtensionInfo) => void) => void;

  /** 监听插件卸载事件 */
  onExtensionUnloaded: (callback: () => void) => void;

  /** 移除所有监听器 */
  removeAllListeners: () => void;
}

/** 扩展 Window 接口 */
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
