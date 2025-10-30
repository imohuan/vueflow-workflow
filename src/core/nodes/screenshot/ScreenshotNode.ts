import { BaseNode } from "../BaseNode";
import type { PortDefinition } from "@/typings/nodeEditor";
import type { MCPClient } from "@/core/mcp-client";

/**
 * 截图节点
 * 对当前页面或指定区域进行截图
 */
export class ScreenshotNode extends BaseNode {
  readonly type = "screenshot";
  readonly label = "截图";
  readonly description = "对当前页面或指定区域进行截图";
  readonly category = "截图和视觉";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "fullPage",
        name: "全页截图",
        type: "boolean",
        required: false,
      },
      {
        id: "quality",
        name: "质量",
        type: "number",
        required: false,
      },
      {
        id: "format",
        name: "格式",
        type: "string",
        required: false,
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "screenshot",
        name: "截图数据",
        type: "string",
      },
    ];
  }

  protected getDefaultConfig(): Record<string, any> {
    return {
      fullPage: false,
      quality: 90,
      format: "png",
    };
  }

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    client: MCPClient
  ): Promise<any> {
    const options: any = {};

    if (config.fullPage !== undefined) {
      options.fullPage = config.fullPage;
    }

    if (config.quality !== undefined) {
      options.quality = config.quality;
    }

    if (config.format) {
      options.format = config.format;
    }

    const response = await client.screenshot(options);

    if (!response.success) {
      throw new Error(response.error?.message || "截图失败");
    }

    const payload = response.result;

    return {
      outputs: {
        screenshot: payload,
      },
      raw: payload,
      summary: "截图完成",
    };
  }
}
