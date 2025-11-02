import { BaseNode } from "../base-node.ts";
import type { PortDefinition, WorkflowExecutionContext } from "../base-node.ts";
import type { MCPClient } from "../../types.ts";

/**
 * 获取窗口和标签页节点
 * 获取所有浏览器窗口和标签页信息
 */
export class GetWindowsAndTabsNode extends BaseNode {
  readonly type = "getWindowsAndTabs";
  readonly label = "获取窗口和标签页";
  readonly description = "获取所有浏览器窗口和标签页信息";
  readonly category = "浏览器管理";

  protected defineInputs(): PortDefinition[] {
    return [];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "windows",
        name: "窗口列表",
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
    context: WorkflowExecutionContext
  ): Promise<any> {
    const client = context.mcpClient as MCPClient;
    if (!client) {
      throw new Error("MCP 客户端未初始化，请先使用初始化MCP服务节点");
    }

    const response = await client.getWindowsAndTabs();

    if (!response.success) {
      throw new Error(response.error?.message || "获取窗口和标签页失败");
    }

    const payload = response.result;

    return {
      outputs: {
        windows: payload,
      },
      raw: payload,
      summary: Array.isArray(payload)
        ? `共 ${payload.length} 个窗口`
        : undefined,
    };
  }
}
