import { BaseNode } from "@workflow-imohuan/node-executor";
import type {
  PortDefinition,
  WorkflowExecutionContext,
} from "@workflow-imohuan/node-executor";

/**
 * 变量聚合节点
 * 将多个输入合并为一个对象或数组
 */
export class MergeNode extends BaseNode {
  readonly type = "merge";
  readonly label = "变量聚合";
  readonly description = "将多个输入合并为一个对象或数组";
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
      {
        id: "input4",
        name: "输入4",
        type: "any",
        required: false,
      },
      {
        id: "input5",
        name: "输入5",
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
      mode: "object", // 'object' 或 'array'
      keys: ["key1", "key2", "key3", "key4", "key5"],
    };
  }

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    _context: WorkflowExecutionContext
  ): Promise<any> {
    const mode = config.mode || "object";
    const keys = config.keys || ["key1", "key2", "key3", "key4", "key5"];

    if (mode === "object") {
      // 对象模式：使用自定义键名
      const result: Record<string, any> = {};

      for (let i = 1; i <= 5; i++) {
        const inputKey = `input${i}`;
        const value = inputs[inputKey];
        if (value !== undefined) {
          const key = keys[i - 1] || inputKey;
          result[key] = value;
        }
      }

      return {
        outputs: {
          result,
        },
        raw: result,
        summary: `已合并 ${Object.keys(result).length} 个字段`,
      };
    } else if (mode === "array") {
      // 数组模式：按顺序收集非空值
      const result: any[] = [];

      for (let i = 1; i <= 5; i++) {
        const inputKey = `input${i}`;
        const value = inputs[inputKey];
        if (value !== undefined) {
          result.push(value);
        }
      }

      return {
        outputs: {
          result,
        },
        raw: result,
        summary: `已收集 ${result.length} 个输入`,
      };
    }

    throw new Error(`不支持的模式: ${mode}`);
  }
}
