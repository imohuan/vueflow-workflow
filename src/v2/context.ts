/* eslint-disable @typescript-eslint/no-explicit-any */
import mitt from "mitt";

import { injectHttpCacheHandler } from "./cache-handler-client";
injectHttpCacheHandler();

// 全局通用上下文，提供可覆盖的异步缓存读写接口与事件订阅能力
// 其他模块可通过覆盖 handler，将数据保存到任意介质（本地、IndexedDB、服务端、数据库等）

export type CacheSaveOptions = {
  /** 过期时间（毫秒）。默认不过期，由具体 handler 决定是否支持 */
  ttlMs?: number;
  /** 命名空间，用于区分不同业务域 */
  namespace?: string;
};

export interface CacheHandler {
  get<T = unknown>(
    key: string,
    options?: Omit<CacheSaveOptions, "ttlMs">
  ): Promise<T | undefined>;
  set<T = unknown>(
    key: string,
    value: T,
    options?: CacheSaveOptions
  ): Promise<void>;
  remove(key: string, options?: Omit<CacheSaveOptions, "ttlMs">): Promise<void>;
  clear?(options?: { namespace?: string }): Promise<void>;
}

type CacheEventName = "save" | "read" | "remove" | "clear";

export interface CacheEventPayload {
  key?: string;
  value?: unknown;
  options?: CacheSaveOptions | { namespace?: string };
  result?: unknown;
  error?: unknown;
}

type Listener = (payload: CacheEventPayload) => void | Promise<void>;

export interface GlobalContext {
  cache: {
    /** 当前生效的缓存处理器（可被 setHandler 覆盖） */
    handler: CacheHandler;
    /** 覆盖缓存处理器 */
    setHandler: (handler: CacheHandler) => void;
    /** 异步保存 */
    save: <T = unknown>(
      key: string,
      value: T,
      options?: CacheSaveOptions
    ) => Promise<void>;
    /** 异步读取 */
    read: <T = unknown>(
      key: string,
      options?: Omit<CacheSaveOptions, "ttlMs">
    ) => Promise<T | undefined>;
    /** 异步删除 */
    remove: (
      key: string,
      options?: Omit<CacheSaveOptions, "ttlMs">
    ) => Promise<void>;
    /** 清空（按命名空间或全量） */
    clear: (options?: { namespace?: string }) => Promise<void>;
    /** 订阅读写事件 */
    subscribe: (event: CacheEventName, listener: Listener) => () => void;
  };
}

declare global {
  // 将 __CONTEXT__ 暴露到 globalThis，便于任意位置覆盖或调用
  // eslint-disable-next-line no-var
  var __CONTEXT__: GlobalContext | undefined;
  var __CONTEXT__HANDLER__: CacheHandler | undefined;
}

// ---------- 默认本地存储实现（localStorage，带可选 namespace 与 ttl） ----------

const DEFAULT_NAMESPACE = "app";

function buildStorageKey(key: string, namespace?: string): string {
  const ns = namespace || DEFAULT_NAMESPACE;
  return `ctx:${ns}:${key}`;
}

type PersistPackage<T = unknown> = {
  value: T;
  /** 绝对过期时间戳（毫秒），undefined 表示永不过期 */
  expireAt?: number;
};

const localStorageHandler: CacheHandler = {
  async get<T = unknown>(
    key: string,
    options?: Omit<CacheSaveOptions, "ttlMs">
  ) {
    try {
      const k = buildStorageKey(key, options?.namespace);
      const raw = globalThis.localStorage?.getItem(k);
      if (!raw) return undefined;
      const pkg = JSON.parse(raw) as PersistPackage<T>;
      if (typeof pkg?.expireAt === "number" && Date.now() > pkg.expireAt) {
        // 过期自动清理
        globalThis.localStorage?.removeItem(k);
        return undefined;
      }
      return pkg?.value as T;
    } catch {
      return undefined;
    }
  },
  async set<T = unknown>(key: string, value: T, options?: CacheSaveOptions) {
    const k = buildStorageKey(key, options?.namespace);
    const pkg: PersistPackage<T> = {
      value,
      expireAt: options?.ttlMs ? Date.now() + options.ttlMs : undefined,
    };
    globalThis.localStorage?.setItem(k, JSON.stringify(pkg));
  },
  async remove(key: string, options?: Omit<CacheSaveOptions, "ttlMs">) {
    const k = buildStorageKey(key, options?.namespace);
    globalThis.localStorage?.removeItem(k);
  },
  async clear(options) {
    const prefix = `ctx:${options?.namespace || DEFAULT_NAMESPACE}:`;
    const ls = globalThis.localStorage;
    if (!ls) return;
    const toRemove: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const storageKey = ls.key(i);
      if (storageKey && storageKey.startsWith(prefix)) {
        toRemove.push(storageKey);
      }
    }
    for (const k of toRemove) ls.removeItem(k);
  },
};

// ---------- 事件中心（mitt 实现） ----------
type CacheEvents = {
  save: CacheEventPayload;
  read: CacheEventPayload;
  remove: CacheEventPayload;
  clear: CacheEventPayload;
};

// ---------- 全局上下文初始化 ----------

function createGlobalContext(): GlobalContext {
  const emitter = mitt<CacheEvents>();
  let handler: CacheHandler = localStorageHandler;

  return {
    cache: {
      get handler() {
        return handler;
      },
      setHandler(next: CacheHandler) {
        handler = next;
      },
      async save<T = unknown>(
        key: string,
        value: T,
        options?: CacheSaveOptions
      ) {
        try {
          await handler.set<T>(key, value, options);
          emitter.emit("save", { key, value, options });
        } catch (error) {
          emitter.emit("save", { key, value, options, error });
          throw error;
        }
      },
      async read<T = unknown>(
        key: string,
        options?: Omit<CacheSaveOptions, "ttlMs">
      ) {
        try {
          const result = await handler.get<T>(key, options);
          emitter.emit("read", { key, options, result });
          return result;
        } catch (error) {
          emitter.emit("read", { key, options, error });
          throw error;
        }
      },
      async remove(key: string, options?: Omit<CacheSaveOptions, "ttlMs">) {
        try {
          await handler.remove(key, options);
          emitter.emit("remove", { key, options });
        } catch (error) {
          emitter.emit("remove", { key, options, error });
          throw error;
        }
      },
      async clear(options?: { namespace?: string }) {
        try {
          if (typeof handler.clear === "function") {
            await handler.clear(options);
          }
          emitter.emit("clear", { options });
        } catch (error) {
          emitter.emit("clear", { options, error });
          throw error;
        }
      },
      subscribe(event: CacheEventName, listener: Listener) {
        emitter.on(event, listener as (payload: CacheEventPayload) => void);
        return () =>
          emitter.off(event, listener as (payload: CacheEventPayload) => void);
      },
    },
  };
}

// 只在未初始化时创建，避免被重复覆盖
if (!globalThis.__CONTEXT__) {
  globalThis.__CONTEXT__ = createGlobalContext();

  if (globalThis.__CONTEXT__HANDLER__) {
    console.log("🚀 ~ 加载上下文处理器:", globalThis.__CONTEXT__HANDLER__);
    globalThis.__CONTEXT__.cache.setHandler(globalThis.__CONTEXT__HANDLER__);
  }
}

export const getContext = () => {
  return globalThis.__CONTEXT__!;
};
