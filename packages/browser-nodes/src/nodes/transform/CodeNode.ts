import { BaseNode } from "@node-executor/core";
import type {
  PortDefinition,
  WorkflowExecutionContext,
} from "@node-executor/core";

/**
 * 代码执行节点
 * 执行自定义 JavaScript 代码
 */
export class CodeNode extends BaseNode {
  readonly type = "code";
  readonly label = "代码执行";
  readonly description = "执行自定义 JavaScript 代码";
  readonly category = "数据处理";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "input1",
        name: "输入1",
        type: "any",
        required: false,
      },
      {
        id: "input2",
        name: "输入2",
        type: "any",
        required: false,
      },
      {
        id: "input3",
        name: "输入3",
        type: "any",
        required: false,
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "result",
        name: "结果",
        type: "any",
      },
    ];
  }

  protected getDefaultConfig(): Record<string, any> {
    return {
      code: `// 可以使用的变量:
// - input1, input2, input3: 输入数据
//
// 示例 1: 简单计算
// return input1 + input2;
//
// 示例 2: 对象处理
// return {
//   sum: input1 + input2,
//   product: input1 * input2,
//   message: '计算完成'
// };
//
// 示例 3: 数组处理
// return input1.map(item => item * 2);

return input1;`,
    };
  }

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    _context: WorkflowExecutionContext
  ): Promise<any> {
    const code = config.code || "return null;";
    const input1 = inputs.input1;
    const input2 = inputs.input2;
    const input3 = inputs.input3;

    try {
      // 准备执行环境
      const context: Record<string, any> = {
        input1,
        input2,
        input3,
      };

      // 添加常用工具函数
      context.JSON = JSON;
      context.Math = Math;
      context.Date = Date;
      context.console = console;

      // 创建函数并执行
      // 注意：使用 new Function 比 eval 更安全
      const contextKeys = Object.keys(context);
      const contextValues = Object.values(context);

      const fn = new Function(...contextKeys, code);
      const result = fn(...contextValues);

      // 如果返回 Promise，等待结果
      if (result instanceof Promise) {
        const awaited = await result;
        return {
          outputs: {
            result: awaited,
          },
          raw: awaited,
        };
      }

      return {
        outputs: {
          result,
        },
        raw: result,
      };
    } catch (error: any) {
      throw new Error(`代码执行错误: ${error.message}`);
    }
  }
}
