import {
  BaseFlowNode,
  type PortConfig,
  type NodeStyleConfig,
  type NodeExecutionContext,
  type NodeExecutionResult,
} from "../BaseFlowNode";

/**
 * 开始节点
 * 工作流的起点，没有输入端口，只有输出端口
 */
export class StartNode extends BaseFlowNode {
  readonly type = "start";
  readonly label = "开始";
  readonly description = "工作流程的起始节点";
  readonly category = "流程控制";

  protected defineInputs(): PortConfig[] {
    // 开始节点没有输入端口
    return [];
  }

  protected defineOutputs(): PortConfig[] {
    return [
      {
        name: "output",
        type: "any",
        description: "开始信号",
      },
    ];
  }

  protected getStyleConfig(): NodeStyleConfig {
    return {
      headerColor: ["#10b981", "#059669"],
      icon: "start",
      showIcon: true,
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    // 开始节点直接返回成功，传递一个开始时间戳
    console.log("[StartNode execute]", context);

    return this.createOutput({
      output: {
        started: true,
        timestamp: Date.now(),
        workflowId: context.workflow?.workflowId,
      },
    });
  }
}
