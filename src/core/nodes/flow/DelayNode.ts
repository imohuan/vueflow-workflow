import { BaseNode } from "../BaseNode";
import type { NodeData, PortDefinition } from "@/typings/nodeEditor";
import type { MCPClient } from "@/core/mcp-client";

export interface DelayNodeConfig {
  /** 延迟时间（毫秒） */
  delay: number;
  /** 是否传递输入数据 */
  passthrough: boolean;
}

/**
 * 延迟节点
 * 等待指定时间后继续执行，用于调试或控制执行速度
 */
export class DelayNode extends BaseNode {
  readonly type = "delay";
  readonly label = "延迟";
  readonly description = "等待指定时间后继续执行";
  readonly category = "流程控制";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "delay",
        name: "延迟时间(ms)",
        type: "number",
        description: "延迟的毫秒数，默认1000ms",
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "output",
        name: "输出",
        type: "any",
        description: "延迟后输出的数据",
      },
    ];
  }

  protected getDefaultConfig(): DelayNodeConfig {
    return {
      delay: 1000, // 默认延迟1秒
      passthrough: true, // 默认传递输入数据
    };
  }

  async execute(
    config: DelayNodeConfig,
    inputs: Record<string, any>,
    _client: MCPClient
  ): Promise<any> {
    const delayTime = config.delay || 1000;

    // 等待指定时间
    await new Promise((resolve) => setTimeout(resolve, delayTime));

    // 决定输出什么数据
    const outputData = { delayed: true };

    return {
      outputs: {
        output: outputData,
      },
      raw: outputData,
      summary: `已延迟 ${delayTime}ms`,
    };
  }
}
