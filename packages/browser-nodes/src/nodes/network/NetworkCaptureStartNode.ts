import { BaseNode } from "../base-node.ts";
import type { PortDefinition, WorkflowExecutionContext } from "../base-node.ts";
import type { MCPClient } from "../../types.ts";

/**
 * 开始网络捕获节点
 * 开始监听网络请求
 */
export class NetworkCaptureStartNode extends BaseNode {
  readonly type = "networkCaptureStart";
  readonly label = "开始网络捕获";
  readonly description = "开始监听网络请求";
  readonly category = "网络监控";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "filter",
        name: "过滤器",
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

    const options: any = {};

    if (config.filter) {
      options.filter = config.filter;
    }

    const response = await client.networkCaptureStart(options);

    if (!response.success) {
      throw new Error(response.error?.message || "开始网络捕获失败");
    }

    const payload = response.result;

    return {
      outputs: {
        result: payload,
      },
      raw: payload,
      summary: "已开启网络捕获",
    };
  }
}
