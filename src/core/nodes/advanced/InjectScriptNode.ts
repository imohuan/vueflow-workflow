import { BaseNode } from "../BaseNode";
import type { PortDefinition } from "@/typings/nodeEditor";
import type { MCPClient } from "@/core/mcp-client";

/**
 * 注入脚本节点
 * 向网页注入 JavaScript 代码
 */
export class InjectScriptNode extends BaseNode {
  readonly type = "injectScript";
  readonly label = "注入脚本";
  readonly description = "向网页注入 JavaScript 代码";
  readonly category = "高级功能";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "jsScript",
        name: "JS代码",
        type: "string",
        required: true,
      },
      {
        id: "type",
        name: "执行环境",
        type: "string",
        required: true,
      },
      {
        id: "url",
        name: "URL",
        type: "string",
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
      jsScript: "console.log('Hello World');",
      type: "ISOLATED",
    };
  }

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    client: MCPClient
  ): Promise<any> {
    const jsScript = inputs.jsScript || config.jsScript;
    const type = inputs.type || config.type;

    if (!jsScript) {
      throw new Error("JS代码不能为空");
    }

    if (type !== "ISOLATED" && type !== "MAIN") {
      throw new Error("执行环境必须是 ISOLATED 或 MAIN");
    }

    const url = inputs.url || config.url;

    const response = await client.injectScript(jsScript, type, url);

    if (!response.success) {
      throw new Error(response.error?.message || "注入脚本失败");
    }

    const payload = response.result;

    return {
      outputs: {
        result: payload,
      },
      raw: payload,
      summary: `脚本已注入(${type})`,
    };
  }
}
