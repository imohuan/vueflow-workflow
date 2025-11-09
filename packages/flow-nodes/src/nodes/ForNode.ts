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
  /** 分页配置 */
  pagination?: {
    /** 是否启用分页 */
    enabled: boolean;
    /** 每页大小 */
    pageSize: number;
    /** 当前页码（从 1 开始） */
    currentPage?: number;
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
      showIcon: true,
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      // 获取输入集合
      const items = this.getInput<any[]>(inputs, "items", []);

      if (!Array.isArray(items)) {
        throw new Error("循环源数据必须是数组");
      }

      // 获取配置（从节点的 context.nodeData.config 或使用默认配置）
      const nodeData = (context as any).nodeData || {};
      const config: ForConfig = {
        ...this.getDefaultConfig(),
        ...(nodeData.config || {}),
      };

      // 生成迭代数据：每次迭代的变量
      const iterations = items.map((value, index) => ({
        [config.itemName]: value,
        [config.indexName]: index,
      }));

      // 构建详细信息（供执行器使用）
      const details = {
        mode: config.mode,
        count: items.length,
        items,
        itemName: config.itemName,
        indexName: config.indexName,
        containerId: config.containerId || null,
        errorHandling: config.errorHandling,
        iterations, // 迭代变量列表
      };

      // 生成输出
      // loop: 提供给循环体容器的迭代信息
      // next: 循环结束后的输出信息
      const outputs: Record<string, any> = {
        loop: {
          iterations,
          containerId: config.containerId,
          itemName: config.itemName,
          indexName: config.indexName,
        },
        next: null, // 初始为 null，执行器会填充实际的循环结果
      };

      return this.createOutput(outputs, details, `准备循环 ${items.length} 次`);
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
}
