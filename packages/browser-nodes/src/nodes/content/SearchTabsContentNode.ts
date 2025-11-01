import { BaseNode } from "@workflow-imohuan/node-executor";
import type {
  PortDefinition,
  WorkflowExecutionContext,
} from "@workflow-imohuan/node-executor";
import type { MCPClient } from "../../types.ts";

/**
 * 搜索标签页内容节点
 * 跨标签页进行语义搜索
 */
export class SearchTabsContentNode extends BaseNode {
  readonly type = "searchTabsContent";
  readonly label = "搜索标签页内容";
  readonly description = "跨标签页进行语义搜索";
  readonly category = "内容分析";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "query",
        name: "搜索查询",
        type: "string",
        required: true,
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "results",
        name: "搜索结果",
        type: "array",
      },
    ];
  }

  protected getDefaultConfig(): Record<string, any> {
    return {
      query: "",
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

    const query = inputs.query || config.query;

    if (!query) {
      throw new Error("搜索查询不能为空");
    }

    const response = await client.searchTabsContent(query);

    if (!response.success) {
      throw new Error(response.error?.message || "搜索标签页内容失败");
    }

    const payload = response.result;

    return {
      outputs: {
        results: payload,
      },
      raw: payload,
      summary: Array.isArray(payload)
        ? `匹配 ${payload.length} 条记录`
        : undefined,
    };
  }
}
