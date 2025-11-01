import { BaseNode } from "@node-executor/core";
import type {
  PortDefinition,
  WorkflowExecutionContext,
} from "@node-executor/core";
import type { MCPClient } from "../../types.ts";

/**
 * 关闭标签页节点
 * 关闭指定的标签页或窗口
 */
export class CloseTabsNode extends BaseNode {
  readonly type = "closeTabs";
  readonly label = "关闭标签页";
  readonly description = "关闭指定的标签页或窗口";
  readonly category = "浏览器管理";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "tabIds",
        name: "标签页ID列表",
        type: "array",
        required: false,
      },
      {
        id: "windowIds",
        name: "窗口ID列表",
        type: "array",
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
    return {};
  }

  async execute(
    config: Record<string, any>,
    _inputs: Record<string, any>,
    context: WorkflowExecutionContext
  ): Promise<any> {
    const client = context.mcpClient as MCPClient;
    if (!client) {
      throw new Error("MCP 客户端未初始化，请先使用初始化MCP服务节点");
    }

    const options: any = {};

    if (config.tabIds) {
      options.tabIds = Array.isArray(config.tabIds)
        ? config.tabIds
        : [config.tabIds];
    }

    if (config.windowIds) {
      options.windowIds = Array.isArray(config.windowIds)
        ? config.windowIds
        : [config.windowIds];
    }

    const response = await client.closeTabs(options);

    if (!response.success) {
      throw new Error(response.error?.message || "关闭标签页失败");
    }

    const payload = response.result;

    return {
      outputs: {
        result: payload,
      },
      raw: payload,
      summary: Array.isArray(options.tabIds)
        ? `已关闭 ${options.tabIds.length} 个标签`
        : undefined,
    };
  }
}
