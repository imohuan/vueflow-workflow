import { BaseNode } from "@workflow-imohuan/node-executor";
import type {
  PortDefinition,
  WorkflowExecutionContext,
} from "@workflow-imohuan/node-executor";
import type { MCPClient } from "../../types.ts";

/**
 * 网络请求节点
 * 发送自定义 HTTP 请求
 */
export class NetworkRequestNode extends BaseNode {
  readonly type = "networkRequest";
  readonly label = "发送HTTP请求";
  readonly description = "发送自定义 HTTP 请求";
  readonly category = "网络监控";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "url",
        name: "URL",
        type: "string",
        required: true,
      },
      {
        id: "method",
        name: "请求方法",
        type: "string",
        required: false,
      },
      {
        id: "headers",
        name: "请求头",
        type: "object",
        required: false,
      },
      {
        id: "body",
        name: "请求体",
        type: "string",
        required: false,
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "response",
        name: "响应",
        type: "any",
      },
    ];
  }

  protected getDefaultConfig(): Record<string, any> {
    return {
      url: "https://api.example.com",
      method: "GET",
    };
  }

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    context: WorkflowExecutionContext
  ): Promise<any> {
    const client = context.mcpClient as MCPClient;
    if (!client) {
      throw new Error("MCP 客户端未初始化，请先使用初始化MCP服务节点");
    }

    const url = inputs.url || config.url;
    const options: any = {};

    if (config.method) {
      options.method = config.method;
    }

    if (config.headers) {
      options.headers = config.headers;
    }

    if (config.body) {
      options.body = config.body;
    }

    const response = await client.networkRequest(url, options);

    if (!response.success) {
      throw new Error(response.error?.message || "网络请求失败");
    }

    const payload = response.result;

    return {
      outputs: {
        response: payload,
      },
      raw: payload,
      summary: `${options.method || "GET"} ${url}`,
    };
  }
}
