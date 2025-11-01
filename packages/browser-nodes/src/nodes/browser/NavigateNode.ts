import { BaseNode } from "@node-executor/core";
import type {
  PortDefinition,
  WorkflowExecutionContext,
} from "@node-executor/core";
import type { MCPClient } from "../../types.ts";

/**
 * 导航节点
 * 导航到指定 URL
 */
export class NavigateNode extends BaseNode {
  readonly type = "navigate";
  readonly label = "导航到URL";
  readonly description = "导航到指定的 URL 地址";
  readonly category = "浏览器管理";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "url",
        name: "URL",
        type: "string",
        required: true,
      },
      {
        id: "tabId",
        name: "标签页ID",
        type: "number",
        required: false,
      },
      {
        id: "waitForLoad",
        name: "等待加载",
        type: "boolean",
        required: false,
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "result",
        name: "结果",
        type: "any",
      },
    ];
  }

  protected getDefaultConfig(): Record<string, any> {
    return {
      url: "https://www.baidu.com",
      waitForLoad: true,
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

    if (config.tabId) {
      options.tabId = config.tabId;
    }

    if (config.waitForLoad !== undefined) {
      options.waitForLoad = config.waitForLoad;
    }

    const response = await client.navigate(url, options);

    if (!response.success) {
      throw new Error(response.error?.message || "导航失败");
    }

    const payload = response.result;

    return {
      outputs: {
        result: payload,
      },
      raw: payload,
      summary: url ? `已导航到 ${url}` : undefined,
    };
  }
}
