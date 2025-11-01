import { BaseNode } from "@node-executor/core";
import type { PortDefinition } from "@node-executor/core";
import type { MCPClient } from "../../types.ts";

/**
 * 添加书签节点
 * 添加新书签
 */
export class AddBookmarkNode extends BaseNode {
  readonly type = "addBookmark";
  readonly label = "添加书签";
  readonly description = "添加新书签";
  readonly category = "数据管理";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "title",
        name: "标题",
        type: "string",
        required: false,
      },
      {
        id: "url",
        name: "URL",
        type: "string",
        required: false,
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "bookmark",
        name: "书签",
        type: "object",
      },
    ];
  }

  protected getDefaultConfig(): Record<string, any> {
    return {};
  }

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    client: MCPClient
  ): Promise<any> {
    const options: any = {};

    if (config.title) {
      options.title = config.title;
    }

    if (config.url) {
      options.url = config.url;
    }

    const response = await client.addBookmark(options);

    if (!response.success) {
      throw new Error(response.error?.message || "添加书签失败");
    }

    const payload = response.result;

    return {
      outputs: {
        bookmark: payload,
      },
      raw: payload,
      summary: options.title
        ? `已添加书签「${options.title}」`
        : "添加书签成功",
    };
  }
}
