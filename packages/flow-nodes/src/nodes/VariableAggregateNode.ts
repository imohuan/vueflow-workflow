import {
  BaseFlowNode,
  type PortConfig,
  type NodeStyleConfig,
  type NodeExecutionContext,
  type NodeExecutionResult,
} from "../BaseFlowNode";

/**
 * 变量聚合节点
 * 支持多个分组，返回每个分组的第一项数据
 */
export class VariableAggregateNode extends BaseFlowNode {
  readonly type = "variableAggregate";
  readonly label = "变量聚合";
  readonly description = "将多个分组的数据聚合，返回每个分组的第一项";
  readonly category = "数据处理";

  protected defineInputs(): PortConfig[] {
    return [
      {
        name: "data",
        type: "any",
        description:
          "输入数据数组，格式: [{ name: string, children: any[] }, ...]",
        required: true,
      },
    ];
  }

  protected defineOutputs(): PortConfig[] {
    return [
      {
        name: "aggregated",
        type: "any",
        description: "聚合结果，键为分组名称，值为该分组的第一项有数据的值",
      },
    ];
  }

  shouldUseCache(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): boolean {
    return false;
  }

  protected getStyleConfig(): NodeStyleConfig {
    return {
      headerColor: ["#06b6d4", "#0891b2"], // 青色渐变
      icon: "package",
      showIcon: true,
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      const data = this.getInput<any[]>(inputs, "data", []);

      // 验证输入
      if (!Array.isArray(data)) {
        return this.createError("输入数据必须是数组类型");
      }

      // 聚合数据：key为分组名称，value为第一个有数据的值
      const aggregated: Record<string, any> = {};

      for (const group of data) {
        // 验证分组结构
        if (!group || typeof group !== "object") {
          continue;
        }

        const groupName = group.name || "unknown";
        const children = Array.isArray(group.children) ? group.children : [];

        // 获取第一个有数据的值
        let firstValidItem = null;
        for (const item of children) {
          if (item !== null && item !== undefined && item !== "") {
            firstValidItem = item;
            break;
          }
        }

        // 保存聚合结果
        aggregated[groupName] = firstValidItem;
      }

      return this.createOutput({ aggregated });
    } catch (error) {
      return this.createError(error as Error);
    }
  }
}
