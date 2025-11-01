import { BaseNode } from "@browser-nodes/core";
import type { NodeData, PortDefinition } from "@/typings/nodeEditor";

export interface StartNodeConfig {
  /** 初始输出数据 */
  initialPayload: unknown;
}

/**
 * 开始节点
 * 工作流入口，提供初始输出数据
 */
export class StartNode extends BaseNode {
  readonly type = "start";
  readonly label = "开始";
  readonly description = "工作流的入口节点";
  readonly category = "流程控制";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "initialPayload",
        name: "初始数据",
        type: "any",
        description: "作为流程上下文传递给后续节点，可为空",
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "next",
        name: "输出",
        type: "any",
        isPort: true,
        description: "传递给下一个节点的数据",
      },
    ];
  }

  protected getDefaultConfig(): StartNodeConfig {
    return {
      initialPayload: null,
    };
  }

  override createNodeData(): NodeData {
    return {
      config: this.getDefaultConfig(),
      inputs: this.defineInputs(),
      outputs: this.defineOutputs(),
      label: this.label,
      category: this.category,
      variant: this.type,
    };
  }

  async execute(
    config: StartNodeConfig,
    _inputs: Record<string, any>,
    _client: any
  ): Promise<any> {
    const payload = config.initialPayload ?? null;
    return {
      outputs: {
        next: payload,
      },
      raw: payload,
      summary: "流程开始",
    };
  }
}
