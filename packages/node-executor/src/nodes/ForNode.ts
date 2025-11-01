import { BaseNode } from "../BaseNode.ts";
import type { PortDefinition } from "../types.ts";

export interface ForConfig {
  /** 数据来源模式 */
  mode: "input" | "static" | "range";
  /** 输入数据路径（相对 input） */
  itemsPath?: string;
  /** 静态数组 */
  staticItems?: any[];
  /** 范围模式配置 */
  range?: {
    start: number;
    end: number;
    step: number;
  };
  /** 迭代变量名 */
  itemName: string;
  /** 索引变量名 */
  indexName: string;
  /** 循环体容器 ID（由编辑器自动填充） */
  containerId?: string | null;
}

/**
 * For 循环节点
 * 遍历集合，为循环体提供上下文
 */
export class ForNode extends BaseNode {
  readonly type = "for";
  readonly label = "批处理";
  readonly description = "遍历集合并运行循环体";
  readonly category = "流程控制";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "items",
        name: "输入集合",
        type: "array",
        required: false,
        isPort: true,
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "loop",
        name: "循环体",
        type: "any",
        isPort: true,
      },
      {
        id: "next",
        name: "循环结束",
        type: "any",
        isPort: true,
      },
    ];
  }

  protected getDefaultConfig(): ForConfig {
    return {
      mode: "input",
      itemsPath: "",
      staticItems: [],
      range: {
        start: 0,
        end: 5,
        step: 1,
      },
      itemName: "item",
      indexName: "index",
      containerId: null,
    };
  }

  async execute(
    config: ForConfig,
    inputs: Record<string, any>,
    context: any
  ): Promise<any> {
    const items = this.resolveItems(config, inputs.items);

    if (!Array.isArray(items)) {
      throw new Error("循环源数据必须是数组");
    }

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
      iterations,
    };

    return {
      outputs: {
        loop: iterations,
        next: {
          count: details.count,
          items: details.items,
          itemName: details.itemName,
          indexName: details.indexName,
          containerId: details.containerId,
        },
      },
      raw: details,
      summary: `循环 ${details.count} 次`,
    };
  }

  /**
   * 根据配置解析循环项
   */
  private resolveItems(config: ForConfig, inputItems: any): any[] {
    switch (config.mode) {
      case "input": {
        if (!config.itemsPath) {
          return Array.isArray(inputItems) ? inputItems : [];
        }
        const value = this.resolveByPath(inputItems, config.itemsPath);
        return Array.isArray(value) ? value : [];
      }
      case "static":
        return Array.isArray(config.staticItems) ? config.staticItems : [];
      case "range": {
        const { start = 0, end = 0, step = 1 } = config.range || {};
        if (step === 0) {
          throw new Error("步长不能为 0");
        }
        const result: number[] = [];
        if (step > 0) {
          for (let i = start; i < end; i += step) {
            result.push(i);
          }
        } else {
          for (let i = start; i > end; i += step) {
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
