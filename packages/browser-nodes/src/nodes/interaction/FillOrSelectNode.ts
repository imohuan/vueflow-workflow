import { BaseNode } from "@workflow-imohuan/node-executor";
import type {
  PortDefinition,
  WorkflowExecutionContext,
} from "@workflow-imohuan/node-executor";
import type { MCPClient } from "../../types.ts";

/**
 * 填充或选择节点
 * 填充表单或选择选项
 */
export class FillOrSelectNode extends BaseNode {
  readonly type = "fillOrSelect";
  readonly label = "填充/选择";
  readonly description = "填充表单或选择选项";
  readonly category = "交互操作";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "selector",
        name: "选择器",
        type: "string",
        required: true,
      },
      {
        id: "value",
        name: "值",
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
      selector: "",
      value: "",
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

    const selector = inputs.selector || config.selector;
    const value = inputs.value || config.value;

    if (!selector) {
      throw new Error("选择器不能为空");
    }

    if (!value) {
      throw new Error("值不能为空");
    }

    const response = await client.fillOrSelect(selector, value);

    if (!response.success) {
      throw new Error(response.error?.message || "填充或选择失败");
    }

    const payload = response.result;

    return {
      outputs: {
        result: payload,
      },
      raw: payload,
      summary: `已填充 ${selector}`,
    };
  }
}
