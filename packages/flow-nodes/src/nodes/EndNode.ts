import {
  BaseFlowNode,
  type PortConfig,
  type NodeStyleConfig,
  type NodeExecutionContext,
  type NodeExecutionResult,
} from "../BaseFlowNode";

/**
 * 结束节点
 * 工作流的终点，只有输入端口，没有输出端口
 */
export class EndNode extends BaseFlowNode {
  readonly type = "end";
  readonly label = "结束";
  readonly description = "工作流程的结束节点";
  readonly category = "流程控制";

  protected defineInputs(): PortConfig[] {
    return [
      {
        name: "input",
        type: "any",
        description: "接收任意输入",
        required: false,
      },
    ];
  }

  protected defineOutputs(): PortConfig[] {
    // 结束节点没有输出端口
    return [];
  }

  protected getStyleConfig(): NodeStyleConfig {
    return {
      headerColor: ["#ef4444", "#dc2626"],
      icon: "stop",
      showIcon: true,
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    // 结束节点接收输入并返回成功
    const input = this.getInput(inputs, "input", null);

    return {
      success: true,
      summary: "工作流结束",
      outputs: {},
      raw: {
        completed: true,
        timestamp: Date.now(),
        finalInput: input,
      },
    };
  }
}
