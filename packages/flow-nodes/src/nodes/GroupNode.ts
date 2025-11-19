import {
  BaseFlowNode,
  type PortConfig,
  type NodeStyleConfig,
  type NodeExecutionContext,
  type NodeExecutionResult,
} from "../BaseFlowNode";

/**
 * 分组节点配置接口
 */
export interface GroupNodeConfig {
  title?: string;
  description?: string;
  borderColor?: string;
  backgroundColor?: string;
}

/**
 * 分组节点
 * 用于在工作流中创建逻辑分组，可以包含其他节点
 * 支持拖拽调整大小，标题栏可拖拽移动
 */
export class GroupNode extends BaseFlowNode {
  readonly type = "group";
  readonly label = "分组";
  readonly description = "创建一个可以包含其他节点的分组容器";
  readonly category = "工具";

  protected defineInputs(): PortConfig[] {
    return [
      {
        name: "title",
        type: "string",
        description: "分组标题",
        defaultValue: "分组",
      },
      {
        name: "description",
        type: "string",
        description: "分组说明",
        defaultValue: "",
      },
      {
        name: "backgroundColor",
        type: "color",
        description: "背景颜色",
        defaultValue: "#8B5CF61C",
      },
      {
        name: "borderColor",
        type: "color",
        description: "边框颜色",
        defaultValue: "#8b5cf6",
      },
    ];
  }

  protected defineOutputs(): PortConfig[] {
    // 分组节点没有输出端口
    return [];
  }

  protected getStyleConfig(): NodeStyleConfig {
    return {
      headerColor: ["#8b5cf6", "#7c3aed"], // 紫色渐变
      icon: "folder",
      showIcon: true,
      bodyStyle: {
        minWidth: "300px",
        minHeight: "200px",
      },
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    // 分组节点不执行任何操作，直接返回成功
    return {
      success: true,
      summary: "分组节点（跳过执行）",
      outputs: {},
    };
  }
}
