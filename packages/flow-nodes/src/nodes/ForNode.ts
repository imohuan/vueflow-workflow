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
      const nodeData = context.nodeData || {};
      const config: ForConfig = {
        ...this.getDefaultConfig(),
        ...(nodeData.config || {}),
      };

      // 检查是否有容器 ID
      if (!config.containerId) {
        throw new Error("For 节点未配置循环体容器");
      }

      // 检查是否有执行容器的方法（由 WorkflowExecutor 注入）
      if (!context.executeContainer) {
        throw new Error("执行上下文缺少 executeContainer 方法");
      }

      // 生成迭代数据：每次迭代的变量
      const iterations = items.map((value, index) => ({
        [config.itemName]: value,
        [config.indexName]: index,
      }));

      // 如果没有迭代数据，直接返回
      if (iterations.length === 0) {
        const outputs: Record<string, any> = {
          next: {
            totalCount: 0,
            executedCount: 0,
            successCount: 0,
            errorCount: 0,
            results: [],
            summary: "无迭代数据",
          },
        };
        return this.createOutput(outputs, { count: 0 }, "无迭代数据");
      }

      // 获取分页配置
      const pagination = config.pagination;
      const isPaginated = pagination?.enabled ?? false;
      const pageSize = pagination?.pageSize ?? 10;
      const currentPage = pagination?.currentPage ?? 1;

      // 计算要执行的迭代范围
      let iterationsToExecute = iterations;
      let startIndex = 0;
      let endIndex = iterations.length;

      if (isPaginated && pageSize > 0) {
        startIndex = (currentPage - 1) * pageSize;
        endIndex = Math.min(startIndex + pageSize, iterations.length);
        iterationsToExecute = iterations.slice(startIndex, endIndex);

        console.log(
          `[ForNode] 启用分页：第 ${currentPage} 页，每页 ${pageSize} 条，执行 ${iterationsToExecute.length} 次迭代（总共 ${iterations.length} 次）`
        );
      } else {
        console.log(`[ForNode] 开始执行循环，共 ${iterations.length} 次迭代`);
      }

      // 执行循环
      const iterationResults: any[] = [];

      for (let i = 0; i < iterationsToExecute.length; i++) {
        const actualIndex = startIndex + i;
        const iterationVars = iterationsToExecute[i] || {};

        console.log(
          `[ForNode] 执行第 ${actualIndex + 1}/${iterations.length} 次迭代`,
          iterationVars
        );

        try {
          // 执行容器内的节点
          const containerOutput = await context.executeContainer(
            config.containerId,
            iterationVars
          );

          iterationResults.push({
            index: actualIndex,
            variables: iterationVars,
            result: containerOutput,
            status: "success",
          });
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          console.error(
            `[ForNode] 第 ${actualIndex + 1} 次迭代失败:`,
            errorMsg
          );

          iterationResults.push({
            index: actualIndex,
            variables: iterationVars,
            error: errorMsg,
            status: "error",
          });

          // 检查是否继续执行
          const errorHandling = config.errorHandling;
          if (!errorHandling?.continueOnError) {
            throw error;
          }
        }
      }

      // 构建输出结果
      const totalCount = iterations.length;
      const executedCount = iterationsToExecute.length;
      const successCount = iterationResults.filter(
        (r) => r.status === "success"
      ).length;
      const errorCount = iterationResults.filter(
        (r) => r.status === "error"
      ).length;

      const outputs: Record<string, any> = {
        next: {
          // 执行统计
          totalCount,
          executedCount,
          successCount,
          errorCount,
          // 结果数据
          results: iterationResults,
          // 分页信息
          pagination: isPaginated
            ? {
                enabled: true,
                currentPage,
                pageSize,
                totalPages: Math.ceil(totalCount / pageSize),
                startIndex,
                endIndex: endIndex - 1,
              }
            : undefined,
          // 摘要信息
          summary: isPaginated
            ? `第 ${currentPage} 页：执行 ${executedCount} 次，成功 ${successCount} 次，失败 ${errorCount} 次`
            : `循环执行 ${executedCount} 次，成功 ${successCount} 次，失败 ${errorCount} 次`,
        },
      };

      return this.createOutput(
        outputs,
        { totalCount, executedCount, successCount, errorCount },
        outputs.next.summary
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
}
