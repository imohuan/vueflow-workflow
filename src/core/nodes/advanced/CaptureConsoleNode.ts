import { BaseNode } from "../BaseNode";
import type { PortDefinition } from "@/typings/nodeEditor";
import type { MCPClient } from "@/core/mcp-client";

/**
 * 捕获控制台节点
 * 捕获浏览器控制台输出
 */
export class CaptureConsoleNode extends BaseNode {
  readonly type = "captureConsole";
  readonly label = "捕获控制台";
  readonly description = "捕获浏览器控制台输出";
  readonly category = "高级功能";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "url",
        name: "URL",
        type: "string",
        required: false,
      },
      {
        id: "includeExceptions",
        name: "包含异常",
        type: "boolean",
        required: false,
      },
      {
        id: "maxMessages",
        name: "最大消息数",
        type: "number",
        required: false,
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "console",
        name: "控制台输出",
        type: "array",
      },
    ];
  }

  protected getDefaultConfig(): Record<string, any> {
    return {
      includeExceptions: true,
      maxMessages: 100,
    };
  }

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    client: MCPClient
  ): Promise<any> {
    const options: any = {};

    if (config.url) {
      options.url = config.url;
    }

    if (config.includeExceptions !== undefined) {
      options.includeExceptions = config.includeExceptions;
    }

    if (config.maxMessages !== undefined) {
      options.maxMessages = config.maxMessages;
    }

    const response = await client.captureConsole(options);

    if (!response.success) {
      throw new Error(response.error?.message || "捕获控制台失败");
    }

    const payload = response.result;

    return {
      outputs: {
        console: payload,
      },
      raw: payload,
      summary: Array.isArray(payload)
        ? `捕获 ${payload.length} 条控制台消息`
        : undefined,
    };
  }
}
