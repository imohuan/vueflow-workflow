import { BaseNode } from "../BaseNode";
import type { PortDefinition } from "@/typings/nodeEditor";
import type { MCPClient } from "@/core/mcp-client";

/** 数据类型 */
export type DataType =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "array"
  | "object";

/** 操作符定义 */
export type OperatorType =
  // 通用
  | "is equal to"
  | "is not equal to"
  | "exists"
  | "does not exist"
  | "is empty"
  | "is not empty"
  // 字符串
  | "contains"
  | "does not contain"
  | "starts with"
  | "ends with"
  // 数值
  | "is greater than"
  | "is less than"
  | "is greater than or equal to"
  | "is less than or equal to"
  // 布尔
  | "is true"
  | "is false"
  // 日期
  | "is before"
  | "is after"
  | "is before or equal to"
  | "is after or equal to"
  // 数组/字符串长度
  | "length equal to"
  | "length not equal to"
  | "length greater than"
  | "length less than"
  | "length greater than or equal to"
  | "length less than or equal to";

/** 子条件（单个判断） */
export interface SubCondition {
  /** 字段路径，支持 a.b.c，留空表示直接使用输入值 */
  field: string;
  /** 数据类型 */
  dataType: DataType;
  /** 操作符 */
  operator: OperatorType;
  /** 目标值 */
  value: string;
}

/** 条件（包含多个子条件） */
export interface Condition {
  /** 子条件组合方式 */
  logic: "and" | "or";
  /** 子条件列表 */
  subConditions: SubCondition[];
}

/** If 节点配置 */
export interface IfConfig {
  /** 条件列表（每个条件对应一个输出端口） */
  conditions: Condition[];
}

/** 操作符标签映射 */
export const OPERATOR_LABELS: Record<OperatorType, string> = {
  "is equal to": "等于",
  "is not equal to": "不等于",
  exists: "存在",
  "does not exist": "不存在",
  "is empty": "为空",
  "is not empty": "不为空",
  contains: "包含",
  "does not contain": "不包含",
  "starts with": "开头为",
  "ends with": "结尾为",
  "is greater than": "大于",
  "is less than": "小于",
  "is greater than or equal to": "大于等于",
  "is less than or equal to": "小于等于",
  "is true": "为真",
  "is false": "为假",
  "is before": "早于",
  "is after": "晚于",
  "is before or equal to": "早于或等于",
  "is after or equal to": "晚于或等于",
  "length equal to": "长度等于",
  "length not equal to": "长度不等于",
  "length greater than": "长度大于",
  "length less than": "长度小于",
  "length greater than or equal to": "长度大于等于",
  "length less than or equal to": "长度小于等于",
};

/** 数据类型标签映射 */
export const DATA_TYPE_LABELS: Record<DataType, string> = {
  string: "字符串",
  number: "数字",
  date: "日期时间",
  boolean: "布尔值",
  array: "数组",
  object: "对象",
};

/** 每种数据类型支持的操作符 */
export const OPERATORS_BY_TYPE: Record<DataType, OperatorType[]> = {
  string: [
    "is equal to",
    "is not equal to",
    "contains",
    "does not contain",
    "starts with",
    "ends with",
    "is empty",
    "is not empty",
    "exists",
    "does not exist",
    "length equal to",
    "length not equal to",
    "length greater than",
    "length less than",
    "length greater than or equal to",
    "length less than or equal to",
  ],
  number: [
    "is equal to",
    "is not equal to",
    "is greater than",
    "is less than",
    "is greater than or equal to",
    "is less than or equal to",
    "exists",
    "does not exist",
  ],
  date: [
    "is equal to",
    "is not equal to",
    "is before",
    "is after",
    "is before or equal to",
    "is after or equal to",
    "exists",
    "does not exist",
  ],
  boolean: [
    "is true",
    "is false",
    "is equal to",
    "is not equal to",
    "exists",
    "does not exist",
  ],
  array: [
    "is empty",
    "is not empty",
    "contains",
    "does not contain",
    "exists",
    "does not exist",
    "length equal to",
    "length not equal to",
    "length greater than",
    "length less than",
    "length greater than or equal to",
    "length less than or equal to",
  ],
  object: ["is empty", "is not empty", "exists", "does not exist"],
};

/**
 * If 条件判断节点
 * 根据条件判断返回不同的分支
 */
export class IfNode extends BaseNode {
  readonly type = "if";
  readonly label = "条件判断";
  readonly description = "根据条件判断执行不同的分支";
  readonly category = "流程控制";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "input",
        name: "输入数据",
        type: "any",
        required: false,
        isPort: true,
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return this.getOutputsForConfig(this.getDefaultConfig());
  }

  protected getDefaultConfig(): IfConfig {
    return {
      conditions: [
        {
          logic: "and",
          subConditions: [
            {
              field: "",
              dataType: "string",
              operator: "is equal to",
              value: "",
            },
          ],
        },
      ],
    };
  }

  getOutputsForConfig(config: IfConfig): PortDefinition[] {
    const conditions = config.conditions || [];
    const conditionCount = Math.max(conditions.length, 1); // 最少1个条件

    const outputs: PortDefinition[] = [];

    // 为每个条件生成一个输出端口
    for (let i = 0; i < conditionCount; i++) {
      const condition = conditions[i];
      outputs.push({
        id: this.getConditionOutputId(i),
        name: this.createConditionPortName(i),
        type: "any",
        description: condition
          ? this.describeCondition(condition)
          : "未配置条件",
        isPort: true,
      });
    }

    // 添加 else 端口
    outputs.push({
      id: "else",
      name: "否则",
      type: "any",
      description: "所有条件都不满足时执行",
      isPort: true,
    });

    return outputs;
  }

  async execute(
    config: IfConfig,
    inputs: Record<string, any>,
    _client: MCPClient
  ): Promise<any> {
    const inputValue = inputs.input;
    const conditions = Array.isArray(config.conditions)
      ? config.conditions
      : [];

    // 评估每个条件
    const evaluations = conditions.map((condition, index) => {
      const subResults = condition.subConditions.map((subCond) => {
        const actualValue = this.resolveFieldValue(inputValue, subCond.field);
        const targetValue = this.parseTargetValue(
          subCond.value,
          subCond.dataType
        );
        const result = this.compareValues(
          actualValue,
          targetValue,
          subCond.operator,
          subCond.dataType
        );

        return {
          ...subCond,
          actualValue,
          targetValue,
          result,
        };
      });

      // 根据逻辑组合子条件结果
      const conditionResult =
        condition.logic === "or"
          ? subResults.some((r) => r.result)
          : subResults.every((r) => r.result);

      return {
        index,
        outputId: this.getConditionOutputId(index),
        logic: condition.logic,
        subResults,
        result: conditionResult,
      };
    });

    // 找出第一个满足的条件
    const firstPassedIndex = evaluations.findIndex((e) => e.result);
    const anyPassed = firstPassedIndex !== -1;

    // 生成输出数据
    const outputs: Record<string, any> = {};

    // 为每个条件端口设置输出
    evaluations.forEach((evaluation, index) => {
      // 只有第一个满足的条件才有输出数据
      outputs[evaluation.outputId] =
        index === firstPassedIndex
          ? {
              branch: evaluation.outputId,
              passed: true,
              input: inputValue,
              evaluation,
              allEvaluations: evaluations,
            }
          : undefined;
    });

    // else 端口：所有条件都不满足时才有输出
    outputs.else = !anyPassed
      ? {
          branch: "else",
          passed: false,
          input: inputValue,
          allEvaluations: evaluations,
        }
      : undefined;

    const passedEvaluation =
      firstPassedIndex !== -1 ? evaluations[firstPassedIndex] : null;

    return {
      outputs,
      raw: {
        branch: passedEvaluation ? passedEvaluation.outputId : "else",
        passed: anyPassed,
        input: inputValue,
        evaluations,
      },
      summary: passedEvaluation
        ? `条件${firstPassedIndex + 1}满足`
        : "所有条件都不满足，执行 else",
    };
  }

  private getConditionOutputId(index: number): string {
    return `condition_${index + 1}`;
  }

  private createConditionPortName(index: number): string {
    return `条件${index + 1}`;
  }

  private describeCondition(condition: Condition): string {
    const { logic, subConditions } = condition;

    if (!subConditions || subConditions.length === 0) {
      return "未配置子条件";
    }

    if (subConditions.length === 1) {
      return this.describeSubCondition(subConditions[0]);
    }

    const logicLabel = logic === "and" ? " 且 " : " 或 ";
    const descriptions = subConditions
      .map((sub) => this.describeSubCondition(sub))
      .join(logicLabel);

    return descriptions.length > 60
      ? descriptions.slice(0, 57) + "..."
      : descriptions;
  }

  private describeSubCondition(subCond: SubCondition | undefined): string {
    if (!subCond) return "未配置";

    const fieldLabel = subCond.field?.trim() || "输入值";
    const operatorLabel = OPERATOR_LABELS[subCond.operator] || subCond.operator;

    // 不需要值的操作符
    const noValueOps: OperatorType[] = [
      "exists",
      "does not exist",
      "is empty",
      "is not empty",
      "is true",
      "is false",
    ];

    if (noValueOps.includes(subCond.operator)) {
      return `${fieldLabel} ${operatorLabel}`;
    }

    const valueText = this.truncateValue(subCond.value || "''", 20);
    return `${fieldLabel} ${operatorLabel} ${valueText}`;
  }

  private truncateValue(value: string, maxLength = 48): string {
    if (!value) return "";
    const trimmed = value.trim();
    if (trimmed.length <= maxLength) {
      return trimmed;
    }
    return `${trimmed.slice(0, maxLength - 1)}…`;
  }

  /**
   * 根据字段路径获取值
   */
  private resolveFieldValue(source: any, fieldPath: string): any {
    if (!fieldPath) {
      return source;
    }

    if (source === null || source === undefined) {
      return undefined;
    }

    const segments = fieldPath
      .split(".")
      .map((segment) => segment.trim())
      .filter(Boolean);

    let current: any = source;
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

  /**
   * 解析目标值
   */
  private parseTargetValue(value: string, dataType: DataType): any {
    if (!value) return "";

    switch (dataType) {
      case "number":
        return Number(value);
      case "boolean":
        return value === "true" || value === "1";
      case "date":
        return new Date(value);
      case "array":
      case "object":
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  /**
   * 比较两个值
   */
  private compareValues(
    actual: any,
    target: any,
    operator: OperatorType,
    _dataType: DataType
  ): boolean {
    switch (operator) {
      // 通用
      case "is equal to":
        return actual == target;
      case "is not equal to":
        return actual != target;
      case "exists":
        return actual !== null && actual !== undefined;
      case "does not exist":
        return actual === null || actual === undefined;
      case "is empty":
        if (actual === null || actual === undefined) return true;
        if (typeof actual === "string") return actual.trim().length === 0;
        if (Array.isArray(actual)) return actual.length === 0;
        if (typeof actual === "object")
          return Object.keys(actual as Record<string, any>).length === 0;
        return false;
      case "is not empty":
        if (actual === null || actual === undefined) return false;
        if (typeof actual === "string") return actual.trim().length > 0;
        if (Array.isArray(actual)) return actual.length > 0;
        if (typeof actual === "object")
          return Object.keys(actual as Record<string, any>).length > 0;
        return true;

      // 字符串
      case "contains":
        if (typeof actual === "string" && typeof target === "string") {
          return actual.includes(target);
        }
        if (Array.isArray(actual)) {
          return actual.includes(target);
        }
        return false;
      case "does not contain":
        if (typeof actual === "string" && typeof target === "string") {
          return !actual.includes(target);
        }
        if (Array.isArray(actual)) {
          return !actual.includes(target);
        }
        return true;
      case "starts with":
        return typeof actual === "string" && typeof target === "string"
          ? actual.startsWith(target)
          : false;
      case "ends with":
        return typeof actual === "string" && typeof target === "string"
          ? actual.endsWith(target)
          : false;

      // 数值
      case "is greater than":
        return Number(actual) > Number(target);
      case "is less than":
        return Number(actual) < Number(target);
      case "is greater than or equal to":
        return Number(actual) >= Number(target);
      case "is less than or equal to":
        return Number(actual) <= Number(target);

      // 布尔
      case "is true":
        return actual === true;
      case "is false":
        return actual === false;

      // 日期
      case "is before":
        return new Date(actual) < new Date(target);
      case "is after":
        return new Date(actual) > new Date(target);
      case "is before or equal to":
        return new Date(actual) <= new Date(target);
      case "is after or equal to":
        return new Date(actual) >= new Date(target);

      // 长度
      case "length equal to":
        return this.getLength(actual) === Number(target);
      case "length not equal to":
        return this.getLength(actual) !== Number(target);
      case "length greater than":
        return this.getLength(actual) > Number(target);
      case "length less than":
        return this.getLength(actual) < Number(target);
      case "length greater than or equal to":
        return this.getLength(actual) >= Number(target);
      case "length less than or equal to":
        return this.getLength(actual) <= Number(target);

      default:
        return false;
    }
  }

  /**
   * 获取长度
   */
  private getLength(value: any): number {
    if (typeof value === "string") return value.length;
    if (Array.isArray(value)) return value.length;
    if (typeof value === "object" && value !== null)
      return Object.keys(value).length;
    return 0;
  }
}
