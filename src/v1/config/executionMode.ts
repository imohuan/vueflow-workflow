/**
 * 工作流执行模式配置
 */

export type ExecutionMode = "worker" | "server";

export interface ExecutionModeConfig {
  /** 执行模式 */
  mode: ExecutionMode;
  /** 服务器地址（仅在 server 模式下使用） */
  serverUrl: string;
}

/** 默认配置 */
export const DEFAULT_EXECUTION_CONFIG: ExecutionModeConfig = {
  mode: "worker",
  serverUrl: "ws://localhost:3001",
};

/** 本地存储键名 */
const STORAGE_KEY = "workflow-execution-mode";

/**
 * 从 URL query 参数读取配置
 */
export function getConfigFromURL(): Partial<ExecutionModeConfig> | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const config: Partial<ExecutionModeConfig> = {};

    const mode = params.get("mode");
    if (mode === "worker" || mode === "server") {
      config.mode = mode;
    }

    const serverUrl = params.get("serverUrl");
    if (serverUrl) {
      config.serverUrl = decodeURIComponent(serverUrl);
    }

    return Object.keys(config).length > 0 ? config : null;
  } catch (error) {
    console.error("从 URL 读取配置失败:", error);
    return null;
  }
}

/**
 * 将配置同步到 URL query 参数
 */
export function syncConfigToURL(config: ExecutionModeConfig): void {
  try {
    const params = new URLSearchParams(window.location.search);

    params.set("mode", config.mode);
    params.set("serverUrl", encodeURIComponent(config.serverUrl));

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  } catch (error) {
    console.error("同步配置到 URL 失败:", error);
  }
}

/** 获取执行模式配置（优先从 URL 读取） */
export function getExecutionModeConfig(): ExecutionModeConfig {
  // 1. 尝试从 URL 读取
  const urlConfig = getConfigFromURL();
  if (urlConfig) {
    const finalConfig = { ...DEFAULT_EXECUTION_CONFIG, ...urlConfig };
    // 仅保存到 localStorage，不触发 URL 同步
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finalConfig));
    } catch (error) {
      console.error("保存执行模式配置失败:", error);
    }
    return finalConfig;
  }

  // 2. 从 localStorage 读取
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("读取执行模式配置失败:", error);
  }

  // 3. 返回默认配置
  return DEFAULT_EXECUTION_CONFIG;
}

/** 保存执行模式配置（同时同步到 URL） */
export function saveExecutionModeConfig(config: ExecutionModeConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    syncConfigToURL(config);
  } catch (error) {
    console.error("保存执行模式配置失败:", error);
  }
}
