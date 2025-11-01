import { BaseNode } from "@workflow-imohuan/node-executor";
import type {
  PortDefinition,
  WorkflowExecutionContext,
} from "@workflow-imohuan/node-executor";
import type { MCPClient } from "../../types.ts";

/**
 * 删除书签节点
 * 删除指定书签
 */
export class DeleteBookmarkNode extends BaseNode {
  readonly type = "deleteBookmark";
  readonly label = "删除书签";
  readonly description = "删除指定书签";
  readonly category = "数据管理";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "bookmarkId",
        name: "书签ID",
        type: "string",
        required: true,
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
      bookmarkId: "",
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

    const bookmarkId = inputs.bookmarkId || config.bookmarkId;

    if (!bookmarkId) {
      throw new Error("书签ID不能为空");
    }

    const response = await client.deleteBookmark({ bookmarkId });

    if (!response.success) {
      throw new Error(response.error?.message || "删除书签失败");
    }

    const payload = response.result;

    return {
      outputs: {
        result: payload,
      },
      raw: payload,
      summary: `已删除书签 ${bookmarkId}`,
    };
  }
}
