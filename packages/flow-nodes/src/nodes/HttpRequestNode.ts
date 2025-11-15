import axios, { AxiosRequestConfig, AxiosError } from "axios";
import {
  BaseFlowNode,
  type PortConfig,
  type NodeStyleConfig,
  type NodeExecutionContext,
  type NodeExecutionResult,
} from "../BaseFlowNode";

/**
 * HTTP 请求方法类型
 */
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * HTTP 请求节点
 * 用于发送 HTTP 请求
 */
export class HttpRequestNode extends BaseFlowNode {
  readonly type = "http-request";
  readonly label = "HTTP 请求";
  readonly description = "发送 HTTP 请求并返回响应";
  readonly category = "网络";

  protected defineInputs(): PortConfig[] {
    return [
      {
        name: "url",
        type: "string",
        description: "请求 URL",
        required: true,
      },
      {
        name: "method",
        type: "string",
        description: "请求方法（GET/POST/PUT/DELETE/PATCH）",
        defaultValue: "GET",
      },
      {
        name: "headers",
        type: "object",
        description: "请求头（JSON 对象）",
        defaultValue: "{}",
      },
      {
        name: "body",
        type: "any",
        description: "请求体（POST/PUT/PATCH 时使用）",
      },
      {
        name: "timeout",
        type: "number",
        description: "超时时间（毫秒）",
        defaultValue: 30000,
      },
      {
        name: "retryCount",
        type: "number",
        description: "重试次数（失败时自动重试）",
        defaultValue: 0,
      },
      {
        name: "retryDelay",
        type: "number",
        description: "重试间隔时间（毫秒），0 表示使用指数退避",
        defaultValue: 0,
      },
    ];
  }

  protected defineOutputs(): PortConfig[] {
    return [
      {
        name: "data",
        type: "any",
        description: "响应数据",
      },
      {
        name: "status",
        type: "number",
        description: "HTTP 状态码",
      },
      {
        name: "headers",
        type: "object",
        description: "响应头",
      },
      {
        name: "success",
        type: "boolean",
        description: "请求是否成功（状态码 2xx）",
      },
    ];
  }

  protected getStyleConfig(): NodeStyleConfig {
    return {
      headerColor: ["#3b82f6", "#06b6d4"], // 蓝色到青色渐变
      icon: "🌐",
      showIcon: true,
      bodyStyle: {
        minWidth: "240px",
      },
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      // 获取输入参数
      const url = this.getInput<string>(inputs, "url");
      const method = this.getInput<HttpMethod>(inputs, "method", "GET");
      const headers = this.getInput<Record<string, string>>(
        inputs,
        "headers",
        {}
      );
      const body = this.getInput(inputs, "body");
      const timeout = this.getInput<number>(inputs, "timeout", 30000);
      const retryCount = this.getInput<number>(inputs, "retryCount", 0);
      const retryDelay = this.getInput<number>(inputs, "retryDelay", 0);

      // 验证必填参数
      const validation = this.validateInputs(inputs);
      if (!validation.valid) {
        return this.createError(validation.errors.join("; "));
      }

      // 检查是否中止
      if (context.signal?.aborted) {
        return this.createError("请求已中止");
      }

      // 构造 axios 请求配置
      const axiosConfig: AxiosRequestConfig = {
        method: method.toLowerCase() as any,
        url,
        timeout,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        signal: context.signal,
      };

      // 添加请求体（仅对 POST/PUT/PATCH）
      if (["POST", "PUT", "PATCH"].includes(method) && body !== undefined) {
        axiosConfig.data = body;
      }

      // 实现重试逻辑
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
          // 检查是否中止
          if (context.signal?.aborted) {
            return this.createError("请求已中止");
          }

          // 发送请求
          const response = await axios(axiosConfig);

          // 获取响应数据
          const data = response.data;

          // 获取响应头
          const responseHeaders: Record<string, string> = {};
          Object.keys(response.headers).forEach((key) => {
            const value = response.headers[key];
            if (typeof value === "string") {
              responseHeaders[key] = value;
            } else if (Array.isArray(value) && value.length > 0) {
              responseHeaders[key] = value[0];
            }
          });

          // 判断是否成功（状态码 2xx）
          const isSuccess = response.status >= 200 && response.status < 300;

          return this.createOutput(
            {
              data,
              status: response.status,
              headers: responseHeaders,
              success: isSuccess,
            },
            data,
            `${method} ${url} - ${response.status} ${response.statusText || ""}`
          );
        } catch (error) {
          lastError = error as Error;

          // 如果是最后一次尝试，直接抛出错误
          if (attempt === retryCount) {
            break;
          }

          // 检查错误类型，决定是否重试
          const axiosError = error as AxiosError;
          if (axiosError.response) {
            // 有响应的情况，根据状态码决定是否重试
            const status = axiosError.response.status;
            // 只对服务器错误（5xx）或请求过快（429）进行重试
            if (status < 500 && status !== 429) {
              break;
            }
          } else if (axiosError.code === "ECONNABORTED") {
            // 超时错误，可以重试
          } else if (axiosError.code === "ERR_NETWORK") {
            // 网络错误，可以重试
          } else if (axiosError.code === "ERR_CANCELED") {
            // 请求被取消，不重试
            return this.createError("请求已中止");
          } else {
            // 其他错误，根据具体情况决定是否重试
            // 默认不重试
            break;
          }

          // 等待后重试
          if (attempt < retryCount) {
            let delay: number;
            if (retryDelay > 0) {
              // 使用配置的固定延迟时间
              delay = retryDelay;
            } else {
              // 使用指数退避算法（默认）
              delay = Math.min(1000 * Math.pow(2, attempt), 10000);
            }
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      // 所有重试都失败，返回错误
      if (lastError) {
        const axiosError = lastError as AxiosError;
        if (axiosError.response) {
          return this.createError(
            `请求失败: ${axiosError.response.status} ${
              axiosError.response.statusText || ""
            }`
          );
        } else if (axiosError.code === "ECONNABORTED") {
          return this.createError("请求超时");
        } else if (axiosError.code === "ERR_NETWORK") {
          return this.createError("网络错误");
        } else {
          return this.createError(axiosError.message || "请求失败");
        }
      }

      return this.createError("请求失败");
    } catch (error) {
      return this.createError(error as Error);
    }
  }
}
