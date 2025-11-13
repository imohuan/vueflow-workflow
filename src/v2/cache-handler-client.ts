import type { CacheHandler, CacheSaveOptions } from "./context";

const DEFAULT_SERVER_URL = "http://localhost:3001";

interface HttpCacheHandlerOptions {
  serverUrl?: string;
}

interface InvokeResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ErrorResponse {
  error?: string;
}

/**
 * 创建 HTTP 缓存处理器
 * @param options - 配置选项
 * @param options.serverUrl - 服务器地址，默认 http://localhost:3001
 * @returns 返回符合 CacheHandler 接口的对象
 */
export function createHttpCacheHandler(
  options: HttpCacheHandlerOptions = {}
): CacheHandler {
  const serverUrl = options.serverUrl || DEFAULT_SERVER_URL;

  /**
   * 发送请求到服务端
   * @param channel - 操作通道
   * @param args - 操作参数
   * @returns 返回操作结果
   */
  async function invoke<T = unknown>(
    channel: string,
    args: unknown[] = []
  ): Promise<T> {
    const requestUrl = `${serverUrl}/api/invoke`;
    const requestBody = { channel, args };

    console.log(`[缓存请求] 发送到: ${requestUrl}`);
    console.log(`[缓存请求] 操作: ${channel}`);
    console.log(`[缓存请求] 参数:`, args);

    try {
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log(`[缓存响应] 状态码: ${response.status}`);
      console.log(`[缓存响应] 状态: ${response.ok ? "成功" : "失败"}`);

      if (!response.ok) {
        let errorData: ErrorResponse;
        try {
          errorData = await response.json();
          console.log(`[缓存响应] 错误数据:`, errorData);
        } catch {
          errorData = { error: `HTTP ${response.status}` };
          console.log(
            `[缓存响应] 无法解析错误响应，状态码: ${response.status}`
          );
        }
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result: InvokeResponse<T> = await response.json();
      console.log(`[缓存响应] 成功:`, result);

      if (!result.success) {
        throw new Error(result.error || "操作失败");
      }

      return result.data as T;
    } catch (error) {
      console.error(`缓存操作失败 [${channel}]:`, error);
      throw error;
    }
  }

  return {
    /**
     * 获取缓存值
     * @param key - 键名
     * @param options - 选项
     * @returns 返回缓存值或 undefined
     */
    async get<T = unknown>(
      key: string,
      options?: Omit<CacheSaveOptions, "ttlMs">
    ): Promise<T | undefined> {
      try {
        const result = await invoke<{ value: T }>("cache:get", [key, options]);
        return result.value;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `[缓存] 读取失败，将使用本地存储作为备选 [${key}]:`,
          errorMessage
        );
        return undefined;
      }
    },

    /**
     * 设置缓存值
     * @param key - 键名
     * @param value - 值
     * @param options - 选项
     */
    async set<T = unknown>(
      key: string,
      value: T,
      options?: CacheSaveOptions
    ): Promise<void> {
      try {
        await invoke("cache:set", [key, value, options]);
      } catch (error) {
        console.error("保存缓存失败:", error);
        throw error;
      }
    },

    /**
     * 删除缓存
     * @param key - 键名
     * @param options - 选项
     */
    async remove(
      key: string,
      options?: Omit<CacheSaveOptions, "ttlMs">
    ): Promise<void> {
      try {
        await invoke("cache:remove", [key, options]);
      } catch (error) {
        console.error("删除缓存失败:", error);
        throw error;
      }
    },

    /**
     * 清空缓存
     * @param options - 选项
     */
    async clear(options?: { namespace?: string }): Promise<void> {
      try {
        await invoke("cache:clear", [options]);
      } catch (error) {
        console.error("清空缓存失败:", error);
        throw error;
      }
    },
  };
}

/**
 * 在浏览器中注入 HTTP 缓存处理器
 */
export function injectHttpCacheHandler(): void {
  if (typeof window === "undefined") return;

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

  if (!serverUrl) return;
  (globalThis as any).__CONTEXT__HANDLER__ = createHttpCacheHandler({
    serverUrl,
  });
}

export default createHttpCacheHandler;
