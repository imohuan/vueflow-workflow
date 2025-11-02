import { BaseNode } from "../base-node.ts";
import type { PortDefinition, WorkflowExecutionContext } from "../base-node.ts";
import type { MCPClient } from "../../types.ts";

/**
 * 键盘输入节点
 * 模拟键盘输入
 */
export class KeyboardNode extends BaseNode {
  readonly type = "keyboard";
  readonly label = "键盘输入";
  readonly description = "模拟键盘输入";
  readonly category = "交互操作";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "keys",
        name: "按键",
        type: "string",
        required: true,
      },
      {
        id: "selector",
        name: "选择器",
        type: "string",
        required: false,
      },
      {
        id: "delay",
        name: "延迟(ms)",
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
      keys: "",
      delay: 0,
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

    const keys = inputs.keys || config.keys;

    if (!keys) {
      throw new Error("按键不能为空");
    }

    const options: any = {};

    if (config.selector) {
      options.selector = config.selector;
    }

    if (config.delay !== undefined) {
      options.delay = config.delay;
    }

    const response = await client.keyboard(keys, options);

    if (!response.success) {
      throw new Error(response.error?.message || "键盘输入失败");
    }

    const payload = response.result;

    return {
      outputs: {
        result: payload,
      },
      raw: payload,
      summary: `模拟按键: ${keys}`,
    };
  }
}
