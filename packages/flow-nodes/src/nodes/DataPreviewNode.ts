import {
  BaseFlowNode,
  type PortConfig,
  type NodeStyleConfig,
  type NodeExecutionContext,
  type NodeExecutionResult,
} from "../BaseFlowNode";

/**
 * 数据预览节点
 * 用于预览任意数据，接收输入并直接输出，方便调试和查看数据内容
 */
export class DataPreviewNode extends BaseFlowNode {
  readonly type = "dataPreview";
  readonly label = "数据预览";
  readonly description = "预览任意数据，支持查看各种数据类型的输出结果";
  readonly category = "调试工具";

  protected defineInputs(): PortConfig[] {
    return [
      {
        name: "data",
        type: "any",
        description: "要预览的数据",
        required: false,
      },
    ];
  }

  protected defineOutputs(): PortConfig[] {
    return [
      {
        name: "data",
        type: "any",
        description: "输出的数据（与输入相同）",
      },
    ];
  }

  protected getStyleConfig(): NodeStyleConfig {
    return {
      headerColor: ["#06b6d4", "#0891b2"], // 青色渐变
      icon: "👁️",
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
    try {
      // 获取输入数据
      const data = this.getInput<any>(inputs, "data", undefined);

      // 生成摘要（用于显示）
      let summary = "数据预览";
      if (data !== undefined && data !== null) {
        const dataType = Array.isArray(data) ? "数组" : typeof data;
        if (typeof data === "string" && data.length > 0) {
          summary = `字符串: ${data.length} 字符`;
        } else if (Array.isArray(data)) {
          summary = `数组: ${data.length} 项`;
        } else if (typeof data === "object") {
          const keys = Object.keys(data);
          summary = `对象: ${keys.length} 个属性`;
        } else {
          summary = `${dataType}: ${String(data)}`;
        }
      } else {
        summary = "数据为空";
      }

      // 直接返回输入的数据
      return this.createOutput({ data });
    } catch (error) {
      return this.createError(error as Error);
    }
  }
}
