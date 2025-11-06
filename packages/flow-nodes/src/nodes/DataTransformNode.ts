import {
  BaseFlowNode,
  type PortConfig,
  type NodeStyleConfig,
  type NodeExecutionContext,
  type NodeExecutionResult,
} from "../BaseFlowNode";

/**
 * 数据合并节点
 */
export class DataMergeNode extends BaseFlowNode {
  readonly type = "data-merge";
  readonly label = "数据合并";
  readonly description = "将多个输入合并为一个对象";
  readonly category = "数据处理";

  protected defineInputs(): PortConfig[] {
    return [
      {
        name: "input1",
        type: "any",
        description: "输入数据1",
        multiple: true,
      },
      {
        name: "input2",
        type: "any",
        description: "输入数据2",
        multiple: true,
      },
      {
        name: "input3",
        type: "any",
        description: "输入数据3",
      },
    ];
  }

  protected defineOutputs(): PortConfig[] {
    return [
      {
        name: "merged",
        type: "object",
        description: "合并后的对象",
      },
    ];
  }

  protected getStyleConfig(): NodeStyleConfig {
    return {
      headerColor: ["#8b5cf6", "#ec4899"], // 紫色到粉色渐变
      icon: "🔗",
      showIcon: true,
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      const input1 = this.getInput(inputs, "input1");
      const input2 = this.getInput(inputs, "input2");
      const input3 = this.getInput(inputs, "input3");

      // 合并数据
      const merged = {
        data1: input1,
        data2: input2,
        data3: input3,
        mergedAt: new Date().toISOString(),
      };

      // 单输出端口：直接传入值即可
      return this.createOutput(merged);
    } catch (error) {
      return this.createError(error as Error);
    }
  }
}

/**
 * 示例节点3：数组过滤节点
 * 演示数组类型处理
 */
export class ArrayFilterNode extends BaseFlowNode {
  readonly type = "array-filter";
  readonly label = "数组过滤";
  readonly description = "根据条件过滤数组元素";
  readonly category = "数据处理";

  protected defineInputs(): PortConfig[] {
    return [
      {
        name: "array",
        type: "array",
        description: "输入数组",
        required: true,
      },
      {
        name: "condition",
        type: "string",
        description: "过滤条件（JavaScript 表达式，使用 item 表示当前元素）",
        required: true,
        defaultValue: "item > 0",
      },
    ];
  }

  protected defineOutputs(): PortConfig[] {
    return [
      {
        name: "filtered",
        type: "array",
        description: "过滤后的数组",
      },
      {
        name: "count",
        type: "number",
        description: "过滤后的元素数量",
      },
    ];
  }

  protected getStyleConfig(): NodeStyleConfig {
    return {
      headerColor: "#10b981", // 绿色
      icon: "🔍",
      showIcon: true,
      headerStyle: {
        fontWeight: "600",
      },
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      const array = this.getInput<any[]>(inputs, "array", []);
      const condition = this.getInput<string>(inputs, "condition", "true");

      // 验证输入
      if (!Array.isArray(array)) {
        return this.createError("输入必须是数组类型");
      }

      // 使用 Function 构造器创建过滤函数
      // 注意：生产环境中应谨慎使用，可能存在安全风险
      const filterFn = new Function("item", `return ${condition}`);
      const filtered = array.filter(filterFn as any);

      return this.createOutput(
        {
          filtered,
          count: filtered.length,
        },
        filtered,
        `过滤完成：${array.length} -> ${filtered.length} 项`
      );
    } catch (error) {
      return this.createError(error as Error);
    }
  }
}
