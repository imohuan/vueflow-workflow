import { BaseNode } from "@browser-nodes/core";
import type { NodeData, PortDefinition } from "@/typings/nodeEditor";

export interface EndNodeConfig {
  /** 是否返回输入作为最终结果 */
  returnInput: boolean;
  /** 自定义结束摘要 */
  summary?: string;
}

/**
 * 结束节点
 * 明确标识流程结束
 */
export class EndNode extends BaseNode {
  readonly type = "end";
  readonly label = "结束";
  readonly description = "工作流的结束节点";
  readonly category = "流程控制";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "input",
        name: "输入",
        type: "any",
        isPort: true,
        description: "接收上一个节点的执行结果",
      },
      {
        id: "returnInput",
        name: "返回输入结果",
        type: "boolean",
        description: "开启后将输入作为最终输出返回",
      },
      {
        id: "summary",
        name: "结束摘要",
        type: "string",
        description: "可选，展示在执行日志中的描述信息",
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [];
  }

  protected getDefaultConfig(): EndNodeConfig {
    return {
      returnInput: true,
      summary: "流程结束",
    };
  }

  override createNodeData(): NodeData {
    return {
      config: this.getDefaultConfig(),
      inputs: this.defineInputs(),
      outputs: [],
      label: this.label,
      category: this.category,
      variant: this.type,
    };
  }

  async execute(
    config: EndNodeConfig,
    inputs: Record<string, any>,
    _client: any
  ): Promise<any> {
    const value = config.returnInput ? inputs.input ?? null : config;
    return {
      raw: value,
      summary: config.summary || "流程结束",
    };
  }
}
