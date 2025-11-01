import { BaseNode } from "@workflow-imohuan/node-executor";
import type {
  PortDefinition,
  WorkflowExecutionContext,
} from "@workflow-imohuan/node-executor";
import type { MCPClient } from "../../types.ts";

/**
 * 浏览器历史导航节点
 * 执行浏览器的前进或后退操作
 */
export class GoBackOrForwardNode extends BaseNode {
  readonly type = "goBackOrForward";
  readonly label = "前进/后退";
  readonly description = "浏览器历史记录前进或后退";
  readonly category = "浏览器管理";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "isForward",
        name: "是否前进",
        type: "boolean",
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
      isForward: false,
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

    const isForward = inputs.isForward ?? config.isForward ?? false;

    const response = await client.goBackOrForward(isForward);

    if (!response.success) {
      throw new Error(response.error?.message || "历史导航失败");
    }

    const payload = response.result;

    return {
      outputs: {
        result: payload,
      },
      raw: payload,
      summary: isForward ? "前进一步" : "后退一步",
    };
  }
}
