import { BaseNode } from "@node-executor/core";
import type { PortDefinition } from "@node-executor/core";
import type { MCPClient } from "../../types.ts";

/**
 * 搜索书签节点
 * 搜索浏览器书签
 */
export class SearchBookmarksNode extends BaseNode {
  readonly type = "searchBookmarks";
  readonly label = "搜索书签";
  readonly description = "搜索浏览器书签";
  readonly category = "数据管理";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "query",
        name: "搜索查询",
        type: "string",
        required: false,
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "bookmarks",
        name: "书签列表",
        type: "array",
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

    if (config.query) {
      options.query = config.query;
    }

    const response = await client.searchBookmarks(options);

    if (!response.success) {
      throw new Error(response.error?.message || "搜索书签失败");
    }

    const payload = response.result;

    return {
      outputs: {
        bookmarks: payload,
      },
      raw: payload,
      summary: Array.isArray(payload)
        ? `找到 ${payload.length} 个书签`
        : undefined,
    };
  }
}
