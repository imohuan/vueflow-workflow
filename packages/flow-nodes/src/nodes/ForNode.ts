import {
  BaseFlowNode,
  type PortConfig,
  type NodeStyleConfig,
  type NodeExecutionContext,
  type NodeExecutionResult,
} from "../BaseFlowNode";

/** For 节点配置 */
export interface ForConfig {
  /** 数据来源模式 */
  mode: "variable" | "range";
  /** 变量模式：变量引用（如 {{ 节点.result.list }}） */
  variable?: string;
  /** 范围模式配置 */
  range?: {
    /** 起始值（支持变量，如 {{ 节点.start }}） */
    start: number | string;
    /** 结束值（支持变量，如 {{ 节点.end }}） */
    end: number | string;
    /** 步长 */
    step: number;
  };
  /** 迭代变量名 */
  itemName: string;
  /** 索引变量名 */
  indexName: string;
  /** 循环体容器 ID（由编辑器自动填充） */
  containerId?: string | null;
  /** 错误处理策略 */
  errorHandling?: {
    /** 迭代失败时是否继续执行后续迭代 */
    continueOnError: boolean;
    /** 最大允许错误次数 */
    maxErrors?: number;
  };
}

/**
 * For 循环节点
 * 遍历集合，为循环体提供上下文
 */
export class ForNode extends BaseFlowNode {
  readonly type = "for";
  readonly label = "批处理";
  readonly description = "遍历集合并运行循环体";
  readonly category = "流程控制";

  protected defineInputs(): PortConfig[] {
    return [
      {
        name: "items",
        type: "array",
        description: "输入集合",
        required: false,
      },
    ];
  }

  protected defineOutputs(): PortConfig[] {
    return [
      {
        name: "loop",
        type: "any",
        description: "循环体",
      },
      {
        name: "next",
        type: "any",
        description: "循环结束",
      },
    ];
  }

  protected getStyleConfig(): NodeStyleConfig {
    return {
      headerColor: ["#f97316", "#ea580c"],
      icon: "🔁",
      showIcon: true,
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      // 获取配置
      const config: ForConfig =
        (this as any).config ||
        (context as any).config ||
        this.getDefaultConfig();

      // 解析循环项
      const items = this.resolveItems(config, inputs.items, context);

      if (!Array.isArray(items)) {
        throw new Error("循环源数据必须是数组");
      }

      // 生成迭代数据
      const iterations = items.map((value, index) => ({
        [config.itemName]: value,
        [config.indexName]: index,
      }));

      const details = {
        mode: config.mode,
        count: items.length,
        items,
        itemName: config.itemName,
        indexName: config.indexName,
        containerId: config.containerId || null,
        errorHandling: config.errorHandling,
        iterations,
      };

      // 生成输出
      const outputs: Record<string, any> = {
        loop: iterations,
        next: {
          count: details.count,
          items: details.items,
          itemName: details.itemName,
          indexName: details.indexName,
          containerId: details.containerId,
        },
      };

      return this.createOutput(
        outputs,
        details,
        `循环 ${details.count} 次`
      );
    } catch (error) {
      return this.createError(error as Error);
    }
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): ForConfig {
    return {
      mode: "variable",
      variable: "",
      range: {
        start: 0,
        end: 10,
        step: 1,
      },
      itemName: "item",
      indexName: "index",
      containerId: null,
      errorHandling: {
        continueOnError: false,
      },
    };
  }

  /**
   * 根据配置解析循环项
   */
  private resolveItems(
    config: ForConfig,
    inputItems: any,
    context: NodeExecutionContext
  ): any[] {
    switch (config.mode) {
      case "variable": {
        // 如果配置了变量引用，优先使用变量
        if (config.variable) {
          const variableValue = this.resolveVariableValue(
            config.variable,
            context
          );
          return Array.isArray(variableValue) ? variableValue : [];
        }
        // 否则使用输入端口的数据
        return Array.isArray(inputItems) ? inputItems : [];
      }
      case "range": {
        const { start = 0, end = 0, step = 1 } = config.range || {};

        // 解析 start 和 end（支持变量）
        const resolvedStart = this.resolveNumberValue(start, context);
        const resolvedEnd = this.resolveNumberValue(end, context);

        if (step === 0) {
          throw new Error("步长不能为 0");
        }

        const result: number[] = [];
        if (step > 0) {
          for (let i = resolvedStart; i < resolvedEnd; i += step) {
            result.push(i);
          }
        } else {
          for (let i = resolvedStart; i > resolvedEnd; i += step) {
            result.push(i);
          }
        }
        return result;
      }
      default:
        return [];
    }
  }

  /**
   * 解析变量值（从上下文中）
   */
  private resolveVariableValue(variable: any, context: NodeExecutionContext): any {
    if (!variable) {
      return undefined;
    }

    // 如果 variable 不是字符串（可能已经被解析过了），直接返回
    if (typeof variable !== "string") {
      return variable;
    }

    // 如果没有上下文，返回原值
    if (!context) {
      return variable;
    }

    // 检查是否为变量引用格式 {{ xxx }}
    const match = variable.match(/^\{\{\s*(.+?)\s*\}\}$/);
    if (!match || !match[1]) {
      // 不是变量格式，直接返回原值
      return variable;
    }

    const path = match[1].trim();
    const resolved = this.resolveByPath(context, path);

    // 返回解析后的值
    return resolved;
  }

  /**
   * 解析数字值（支持变量）
   */
  private resolveNumberValue(value: any, context: NodeExecutionContext): number {
    if (typeof value === "number") {
      return value;
    }

    // 尝试解析变量（会处理字符串引用和已解析的值）
    const resolved = this.resolveVariableValue(value, context);

    // 转换为数字
    const num = Number(resolved);

    // 解析失败返回 0
    return Number.isNaN(num) ? 0 : num;
  }

  /**
   * 根据路径获取值
   */
  private resolveByPath(target: any, path?: string): any {
    if (!path) return target;
    if (target === null || target === undefined) return undefined;

    const segments = path
      .split(".")
      .map((segment) => segment.trim())
      .filter(Boolean);

    let current: any = target;
    for (const segment of segments) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (Array.isArray(current)) {
        const index = Number(segment);
        current = Number.isInteger(index) ? current[index] : undefined;
      } else {
        current = current[segment as keyof typeof current];
      }
    }

    return current;
  }
}
