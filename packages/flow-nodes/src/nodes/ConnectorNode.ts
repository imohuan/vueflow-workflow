import {
  BaseFlowNode,
  type PortConfig,
  type NodeStyleConfig,
  type NodeExecutionContext,
  type NodeExecutionResult,
} from "../BaseFlowNode";

/**
 * 连接节点
 * 用于优化连接线布局，执行时直接返回 undefined
 */
export class ConnectorNode extends BaseFlowNode {
  readonly type = "connector";
  readonly label = "连接";
  readonly description = "用于优化连接线布局，执行时返回 undefined";
  readonly category = "工具";

  protected defineInputs(): PortConfig[] {
    // 连接节点没有输入端口
    return [];
  }

  protected defineOutputs(): PortConfig[] {
    return [
      {
        name: "output",
        type: "any",
        description: "输出数据（undefined）",
      },
    ];
  }

  protected getStyleConfig(): NodeStyleConfig {
    return {};
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    // 直接返回 undefined
    return this.createOutput(
      {
        output: undefined,
      },
      undefined,
      "连接节点：已返回 undefined"
    );
  }
}
