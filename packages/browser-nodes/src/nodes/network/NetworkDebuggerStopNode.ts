import { BaseNode } from "@workflow-imohuan/node-executor";
import type {
  PortDefinition,
  WorkflowExecutionContext,
} from "@workflow-imohuan/node-executor";
import type { MCPClient } from "../../types.ts";

/**
 * 停止调试器网络捕获节点
 * 停止监听并获取捕获的网络数据（含响应体）
 */
export class NetworkDebuggerStopNode extends BaseNode {
  readonly type = "networkDebuggerStop";
  readonly label = "停止调试器捕获";
  readonly description = "停止监听并获取捕获的网络数据（含响应体）";
  readonly category = "网络监控";

  protected defineInputs(): PortDefinition[] {
    return [];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "requests",
        name: "网络请求",
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

    const response = await client.networkDebuggerStop();

    if (!response.success) {
      throw new Error(response.error?.message || "停止调试器捕获失败");
    }

    const payload = response.result;

    return {
      outputs: {
        requests: payload,
      },
      raw: payload,
      summary: Array.isArray(payload)
        ? `捕获到 ${payload.length} 条调试记录`
        : undefined,
    };
  }
}
