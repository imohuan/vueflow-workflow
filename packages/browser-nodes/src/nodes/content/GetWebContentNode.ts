import { BaseNode } from "@node-executor/core";
import type {
  PortDefinition,
  WorkflowExecutionContext,
} from "@node-executor/core";
import type { MCPClient } from "../../types.ts";

/**
 * 获取网页内容节点
 * 获取当前页面的文本内容
 */
export class GetWebContentNode extends BaseNode {
  readonly type = "getWebContent";
  readonly label = "获取网页内容";
  readonly description = "获取当前页面的文本内容";
  readonly category = "内容分析";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "selector",
        name: "选择器",
        type: "string",
        required: false,
      },
      {
        id: "includeHTML",
        name: "包含HTML",
        type: "boolean",
        required: false,
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "content",
        name: "内容",
        type: "string",
      },
    ];
  }

  protected getDefaultConfig(): Record<string, any> {
    return {
      includeHTML: false,
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

    const options: any = {};

    if (config.selector) {
      options.selector = config.selector;
    }

    if (config.includeHTML !== undefined) {
      options.includeHTML = config.includeHTML;
    }

    const response = await client.getWebContent(options);

    if (!response.success) {
      throw new Error(response.error?.message || "获取网页内容失败");
    }

    const payload = response.result;

    return {
      outputs: {
        content: payload,
      },
      raw: payload,
      summary: config.selector
        ? `已获取 ${config.selector} 匹配内容`
        : "已获取页面内容",
    };
  }
}
