import { createHttpContext } from "./httpContext";
import { createLocalStorageContext } from "./localStorageContext";
import type { GlobalContext } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __CONTEXT_HANDLER__: GlobalContext;
  // eslint-disable-next-line no-var
  var __GLOBAL_CONTEXT__: GlobalContext | undefined;
}

export function enableHttp(): boolean {
  if (typeof window === "undefined") return false;
  let serverUrl: string | undefined;
  // 尝试从 window.httpApi 获取
  if ((window as any)?.httpApi?.url) {
    serverUrl = (window as any).httpApi.url;
  } else {
    const queryString = window.location.href.split("?")[1];
    if (queryString) {
      const params = new URLSearchParams(queryString);
      serverUrl = params.get("httpUrl") || undefined;
    }
  }
  if (!serverUrl) return false;
  return true;
}

function initializeContext(): GlobalContext {
  if (enableHttp()) {
    return createHttpContext();
  }

  // 如果全局注入了特定的 handler（例如，在 Electron/Tauri 环境中），
  // 则使用 HTTP 上下文与后端通信。
  if (globalThis.__CONTEXT_HANDLER__) {
    console.log("🚀 Initializing with HTTP context...");
    return globalThis.__CONTEXT_HANDLER__;
  }

  // 否则，默认使用基于 localStorage 的本地上下文。
  console.log("🚀 Initializing with LocalStorage context...");
  return createLocalStorageContext();
}

// 创建并缓存全局唯一的上下文实例
if (!globalThis.__GLOBAL_CONTEXT__) {
  globalThis.__GLOBAL_CONTEXT__ = initializeContext();
}

/**
 * 获取全局上下文实例
 * @returns The global context instance for the application.
 */
export const getContext = (): GlobalContext => {
  return globalThis.__GLOBAL_CONTEXT__!;
};
