import { BaseNode } from "../BaseNode";
import type { PortDefinition } from "@/typings/nodeEditor";
import type { MCPClient } from "@/core/mcp-client";

/**
 * 搜索历史记录节点
 * 搜索浏览器历史记录
 */
export class SearchHistoryNode extends BaseNode {
  readonly type = "searchHistory";
  readonly label = "搜索历史记录";
  readonly description = "搜索浏览器历史记录";
  readonly category = "数据管理";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "query",
        name: "搜索查询",
        type: "string",
        required: false,
      },
      {
        id: "maxResults",
        name: "最大结果数",
        type: "number",
        required: false,
      },
      {
        id: "startTime",
        name: "开始时间",
        type: "number",
        required: false,
      },
      {
        id: "endTime",
        name: "结束时间",
        type: "number",
        required: false,
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "history",
        name: "历史记录",
        type: "array",
      },
    ];
  }

  protected getDefaultConfig(): Record<string, any> {
    return {
      maxResults: 100,
    };
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

    if (config.maxResults !== undefined) {
      options.maxResults = config.maxResults;
    }

    if (config.startTime !== undefined) {
      options.startTime = config.startTime;
    }

    if (config.endTime !== undefined) {
      options.endTime = config.endTime;
    }

    const response = await client.searchHistory(options);

    if (!response.success) {
      throw new Error(response.error?.message || "搜索历史记录失败");
    }

    const payload = response.result;

    return {
      outputs: {
        history: payload,
      },
      raw: payload,
      summary: Array.isArray(payload)
        ? `找到 ${payload.length} 条历史记录`
        : undefined,
    };
  }
}
