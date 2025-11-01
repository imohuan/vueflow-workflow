import { BaseNode } from "@node-executor/core";
import type {
  PortDefinition,
  WorkflowExecutionContext,
} from "@node-executor/core";
import type { MCPClient } from "../../types.ts";

/**
 * 发送命令到注入脚本节点
 * 向注入的脚本发送命令
 */
export class SendCommandToInjectScriptNode extends BaseNode {
  readonly type = "sendCommandToInjectScript";
  readonly label = "发送命令到脚本";
  readonly description = "向注入的脚本发送命令";
  readonly category = "高级功能";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "eventName",
        name: "事件名",
        type: "string",
        required: true,
      },
      {
        id: "payload",
        name: "数据",
        type: "string",
        required: false,
      },
      {
        id: "tabId",
        name: "标签页ID",
        type: "number",
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
    return {
      eventName: "",
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

    const eventName = inputs.eventName || config.eventName;

    if (!eventName) {
      throw new Error("事件名不能为空");
    }

    const payload = inputs.payload || config.payload;
    const tabId = inputs.tabId || config.tabId;

    const response = await client.sendCommandToInjectScript(
      eventName,
      payload,
      tabId
    );

    if (!response.success) {
      throw new Error(response.error?.message || "发送命令失败");
    }

    const resultPayload = response.result;

    return {
      outputs: {
        result: resultPayload,
      },
      raw: resultPayload,
      summary: `已发送事件 ${eventName}`,
    };
  }
}
