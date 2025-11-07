import {
  BaseFlowNode,
  type PortConfig,
  type NodeStyleConfig,
  type NodeExecutionContext,
  type NodeExecutionResult,
} from "../BaseFlowNode";

/**
 * 笔记节点
 * 用于在工作流中添加注释和说明，不影响执行流程
 */
export class NoteNode extends BaseFlowNode {
  readonly type = "note";
  readonly label = "笔记";
  readonly description = "在工作流中添加注释和说明";
  readonly category = "工具";

  protected defineInputs(): PortConfig[] {
    // 笔记节点没有输入端口
    return [];
  }

  protected defineOutputs(): PortConfig[] {
    // 笔记节点没有输出端口
    return [];
  }

  protected getStyleConfig(): NodeStyleConfig {
    return {
      headerColor: "#fbbf24",
      icon: "📝",
      showIcon: true,
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    // 笔记节点不执行任何操作，直接返回成功
    return {
      success: true,
      summary: "笔记节点（跳过执行）",
      outputs: {},
    };
  }
}
