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
        defaultValue: {},
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

      // 验证必填参数
      const validation = this.validateInputs(inputs);
      if (!validation.valid) {
        return this.createError(validation.errors.join("; "));
      }

      // 检查是否中止
      if (context.signal?.aborted) {
        return this.createError("请求已中止");
      }

      // 构造请求配置
      const fetchOptions: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        signal: context.signal,
      };

      // 添加请求体（仅对 POST/PUT/PATCH）
      if (["POST", "PUT", "PATCH"].includes(method) && body !== undefined) {
        fetchOptions.body =
          typeof body === "string" ? body : JSON.stringify(body);
      }

      // 创建超时控制器
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // 发送请求
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 解析响应
        let data: any;
        const contentType = response.headers.get("content-type");

        if (contentType?.includes("application/json")) {
          data = await response.json();
        } else if (contentType?.includes("text/")) {
          data = await response.text();
        } else {
          data = await response.blob();
        }

        // 获取响应头
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        // 判断是否成功
        const isSuccess = response.ok; // status 在 200-299 范围

        return this.createOutput(
          {
            data,
            status: response.status,
            headers: responseHeaders,
            success: isSuccess,
          },
          data,
          `${method} ${url} - ${response.status} ${response.statusText}`
        );
      } catch (error) {
        clearTimeout(timeoutId);

        if ((error as Error).name === "AbortError") {
          return this.createError("请求超时");
        }

        throw error;
      }
    } catch (error) {
      return this.createError(error as Error);
    }
  }
}

/**
 * JSON 解析节点
 */
export class JsonParseNode extends BaseFlowNode {
  readonly type = "json-parse";
  readonly label = "JSON 解析";
  readonly description = "将 JSON 字符串解析为对象";
  readonly category = "数据处理";

  protected defineInputs(): PortConfig[] {
    return [
      {
        name: "json",
        type: "string",
        description: "JSON 字符串",
        required: true,
      },
    ];
  }

  protected defineOutputs(): PortConfig[] {
    return [
      {
        name: "data",
        type: "object",
        description: "解析后的对象",
      },
    ];
  }

  protected getStyleConfig(): NodeStyleConfig {
    return {
      headerColor: "#8b5cf6",
      icon: "📋",
      showIcon: true,
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      const json = this.getInput<string>(inputs, "json", "");

      const validation = this.validateInputs(inputs);
      if (!validation.valid) {
        return this.createError(validation.errors.join("; "));
      }

      const data = JSON.parse(json);

      return this.createOutput(data, data, "解析成功");
    } catch (error) {
      return this.createError(`JSON 解析失败: ${(error as Error).message}`);
    }
  }
}

/**
 * 对象取值节点
 */
export class ObjectGetNode extends BaseFlowNode {
  readonly type = "object-get";
  readonly label = "对象取值";
  readonly description = "从对象中提取指定路径的值";
  readonly category = "数据处理";

  protected defineInputs(): PortConfig[] {
    return [
      {
        name: "object",
        type: "object",
        description: "输入对象",
        required: true,
      },
      {
        name: "path",
        type: "string",
        description: '对象路径（如 "user.name" 或 "items[0].id"）',
        required: true,
      },
      {
        name: "defaultValue",
        type: "any",
        description: "默认值（路径不存在时返回）",
      },
    ];
  }

  protected defineOutputs(): PortConfig[] {
    return [
      {
        name: "value",
        type: "any",
        description: "提取的值",
      },
    ];
  }

  protected getStyleConfig(): NodeStyleConfig {
    return {
      headerColor: "#f59e0b",
      icon: "🔑",
      showIcon: true,
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      const object = this.getInput<Record<string, any>>(inputs, "object");
      const path = this.getInput<string>(inputs, "path", "");
      const defaultValue = this.getInput(inputs, "defaultValue");

      const validation = this.validateInputs(inputs);
      if (!validation.valid) {
        return this.createError(validation.errors.join("; "));
      }

      // 解析路径并获取值
      const value = this.getValueByPath(object, path, defaultValue);

      return this.createOutput(value, value, `提取路径: ${path}`);
    } catch (error) {
      return this.createError(error as Error);
    }
  }

  /**
   * 通过路径获取对象的值
   * 支持点号和方括号语法，如 "user.name" 或 "items[0].id"
   */
  private getValueByPath(obj: any, path: string, defaultValue?: any): any {
    if (!obj || !path) return defaultValue;

    // 将路径拆分为数组，支持 "a.b" 和 "a[0].b" 语法
    const keys = path
      .replace(/\[(\w+)\]/g, ".$1") // 将 [0] 转换为 .0
      .split(".")
      .filter((key) => key.length > 0);

    let result = obj;
    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue;
      }
      result = result[key];
    }

    return result === undefined ? defaultValue : result;
  }
}
