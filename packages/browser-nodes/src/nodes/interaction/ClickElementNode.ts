import { BaseNode } from "../base-node.ts";
import type { PortDefinition, WorkflowExecutionContext } from "../base-node.ts";
import type { MCPClient } from "../../types.ts";

/**
 * 点击元素节点
 * 点击页面上的元素或坐标
 */
export class ClickElementNode extends BaseNode {
  readonly type = "clickElement";
  readonly label = "点击元素";
  readonly description = "点击页面上的元素或坐标";
  readonly category = "交互操作";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "selector",
        name: "选择器",
        type: "string",
        required: false,
      },
      {
        id: "coordinates",
        name: "坐标",
        type: "object",
        required: false,
      },
      {
        id: "waitForNavigation",
        name: "等待导航",
        type: "boolean",
        required: false,
      },
      {
        id: "timeout",
        name: "超时时间",
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
      waitForNavigation: false,
      timeout: 5000,
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

    const options: any = {};

    if (config.selector) {
      options.selector = config.selector;
    }

    if (config.coordinates) {
      options.coordinates = config.coordinates;
    }

    if (config.waitForNavigation !== undefined) {
      options.waitForNavigation = config.waitForNavigation;
    }

    if (config.timeout !== undefined) {
      options.timeout = config.timeout;
    }

    if (!options.selector && !options.coordinates) {
      throw new Error("必须提供选择器或坐标");
    }

    const response = await client.clickElement(options);

    if (!response.success) {
      throw new Error(response.error?.message || "点击元素失败");
    }

    const payload = response.result;

    return {
      outputs: {
        result: payload,
      },
      raw: payload,
      summary: options.selector
        ? `点击元素 ${options.selector}`
        : "点击指定坐标",
    };
  }
}
