import { BaseNode } from "../BaseNode";
import type { PortDefinition } from "@/typings/nodeEditor";
import type { MCPClient } from "@/core/mcp-client";

/**
 * 获取可交互元素节点
 * 获取页面上的可交互元素
 */
export class GetInteractiveElementsNode extends BaseNode {
  readonly type = "getInteractiveElements";
  readonly label = "获取可交互元素";
  readonly description = "获取页面上的可交互元素";
  readonly category = "内容分析";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "textQuery",
        name: "文本查询",
        type: "string",
        required: false,
      },
      {
        id: "selector",
        name: "选择器",
        type: "string",
        required: false,
      },
      {
        id: "includeCoordinates",
        name: "包含坐标",
        type: "boolean",
        required: false,
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "elements",
        name: "元素列表",
        type: "array",
      },
    ];
  }

  protected getDefaultConfig(): Record<string, any> {
    return {
      includeCoordinates: true,
    };
  }

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    client: MCPClient
  ): Promise<any> {
    const options: any = {};

    if (config.textQuery) {
      options.textQuery = config.textQuery;
    }

    if (config.selector) {
      options.selector = config.selector;
    }

    if (config.includeCoordinates !== undefined) {
      options.includeCoordinates = config.includeCoordinates;
    }

    const response = await client.getInteractiveElements(options);

    if (!response.success) {
      throw new Error(response.error?.message || "获取可交互元素失败");
    }

    const payload = response.result;

    return {
      outputs: {
        elements: payload,
      },
      raw: payload,
      summary: Array.isArray(payload)
        ? `检测到 ${payload.length} 个元素`
        : undefined,
    };
  }
}
