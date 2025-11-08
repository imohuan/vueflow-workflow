import {
  BaseFlowNode,
  type PortConfig,
  type NodeStyleConfig,
  type NodeExecutionContext,
  type NodeExecutionResult,
} from "../BaseFlowNode";
import { isEqual } from "lodash-es";

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

export type ConditionOperand =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, any>
  | any[];

/** 子条件（单个判断） */
export interface SubCondition {
  /** 左侧值 */
  field: ConditionOperand;
  /** 数据类型 */
  dataType: DataType;
  /** 操作符 */
  operator: OperatorType;
  /** 右侧值 */
  value: ConditionOperand;
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

/**
 * If 条件判断节点
 * 根据条件判断返回不同的分支
 */
export class IfNode extends BaseFlowNode {
  readonly type = "if";
  readonly label = "条件判断";
  readonly description = "根据条件判断执行不同的分支";
  readonly category = "流程控制";

  // 存储当前配置（用于动态输出端口）
  private currentConfig: IfConfig | null = null;

  protected defineInputs(): PortConfig[] {
    return [
      {
        name: "input",
        type: "any",
        description: "输入数据",
        required: false,
      },
    ];
  }

  protected defineOutputs(): PortConfig[] {
    // 如果有配置，根据配置生成输出端口
    if (this.currentConfig) {
      return this.getOutputsForConfig(this.currentConfig);
    }

    // 默认输出端口（至少一个条件 + else）
    return this.getOutputsForConfig(this.getDefaultConfig());
  }

  /**
   * 根据配置生成输出端口
   */
  private getOutputsForConfig(config: IfConfig): PortConfig[] {
    const conditions = config.conditions || [];
    const conditionCount = Math.max(conditions.length, 1); // 最少1个条件

    const outputs: PortConfig[] = [];

    // 为每个条件生成一个输出端口
    for (let i = 0; i < conditionCount; i++) {
      const condition = conditions[i];
      outputs.push({
        name: this.getConditionOutputId(i),
        type: "any",
        description: condition
          ? this.describeCondition(condition)
          : "未配置条件",
      });
    }

    // 添加 else 端口
    outputs.push({
      name: "else",
      type: "any",
      description: "所有条件都不满足时执行",
    });

    return outputs;
  }

  /**
   * 更新配置（用于动态更新输出端口）
   */
  updateConfig(config: IfConfig): void {
    this.currentConfig = config;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): IfConfig {
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

  protected getStyleConfig(): NodeStyleConfig {
    return {
      headerColor: ["#8b5cf6", "#7c3aed"],
      icon: "❓",
      showIcon: true,
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      // 从实例属性中获取配置（NodeResolver 会将 config 合并到实例上）
      // 或者从 context 中获取，或者使用当前配置
      const config: IfConfig =
        (this as any).config ||
        (context as any).config ||
        this.currentConfig ||
        this.getDefaultConfig();

      // 更新当前配置（用于动态输出端口）
      if ((this as any).config) {
        this.updateConfig((this as any).config);
      } else if ((context as any).config) {
        this.updateConfig((context as any).config);
      }

      const inputValue = this.getInput(inputs, "input");
      const conditions = Array.isArray(config.conditions)
        ? config.conditions
        : [];

      // 评估每个条件
      const evaluations = conditions.map((condition, index) => {
        const subResults = condition.subConditions.map((subCond) => {
          const actualValue = this.resolveOperandValue(
            subCond.field,
            subCond.dataType,
            {
              fallbackSource: inputValue,
              preferPath: true,
            }
          );
          const targetValue = this.resolveOperandValue(
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

      return this.createOutput(
        outputs,
        {
          branch: passedEvaluation ? passedEvaluation.outputId : "else",
          passed: anyPassed,
          input: inputValue,
          evaluations,
        },
        passedEvaluation
          ? `条件${firstPassedIndex + 1}满足`
          : "所有条件都不满足，执行 else"
      );
    } catch (error) {
      return this.createError(error as Error);
    }
  }

  private getConditionOutputId(index: number): string {
    return `condition-${index}`;
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

    const fieldLabel = this.formatOperand(subCond.field, "输入值");
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

    const valueText = this.truncateValue(subCond.value, 20, "''");
    return `${fieldLabel} ${operatorLabel} ${valueText}`;
  }

  private truncateValue(
    value: ConditionOperand,
    maxLength = 48,
    fallback = ""
  ): string {
    const text = this.formatOperand(value, fallback);
    if (!text) {
      return fallback;
    }
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength - 1)}…`;
  }

  private formatOperand(
    operand: ConditionOperand | undefined,
    fallback = ""
  ): string {
    if (operand === null || operand === undefined) {
      return fallback;
    }

    if (typeof operand === "string") {
      const trimmed = operand.trim();
      return trimmed.length > 0 ? trimmed : fallback;
    }

    if (typeof operand === "number" || typeof operand === "boolean") {
      return String(operand);
    }

    if (operand instanceof Date) {
      return operand.toISOString();
    }

    try {
      return JSON.stringify(operand);
    } catch {
      return String(operand);
    }
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
   * 解析操作数值
   */
  private resolveOperandValue(
    operand: ConditionOperand,
    dataType: DataType,
    options: {
      fallbackSource?: any;
      preferPath?: boolean;
    } = {}
  ): any {
    if (operand === null || operand === undefined) {
      return operand;
    }

    if (typeof operand === "string") {
      const trimmed = operand.trim();

      if (
        options.preferPath &&
        options.fallbackSource !== undefined &&
        this.isPathLikeString(trimmed)
      ) {
        const resolved = this.resolveFieldValue(
          options.fallbackSource,
          trimmed
        );
        if (resolved !== undefined) {
          return resolved;
        }
      }

      return this.coerceValueByType(trimmed, dataType);
    }

    return this.coerceValueByType(operand, dataType);
  }

  /**
   * 根据数据类型转换值
   */
  private coerceValueByType(value: any, dataType: DataType): any {
    if (value === null || value === undefined) {
      return value;
    }

    switch (dataType) {
      case "number": {
        if (typeof value === "number") return value;
        if (typeof value === "boolean") return value ? 1 : 0;
        if (typeof value === "string") {
          const num = Number(value);
          return Number.isNaN(num) ? value : num;
        }
        const coerced = Number(value);
        return Number.isNaN(coerced) ? value : coerced;
      }
      case "boolean": {
        if (typeof value === "boolean") return value;
        if (typeof value === "number") return value !== 0;
        if (typeof value === "string") {
          const lowered = value.toLowerCase();
          if (["true", "1", "yes"].includes(lowered)) return true;
          if (["false", "0", "no"].includes(lowered)) return false;
        }
        return Boolean(value);
      }
      case "date": {
        if (value instanceof Date) return value;
        if (typeof value === "number") return new Date(value);
        if (typeof value === "string") {
          const date = new Date(value);
          return Number.isNaN(date.getTime()) ? value : date;
        }
        return value;
      }
      case "array": {
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (!trimmed) return [];
          try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : value;
          } catch {
            return value;
          }
        }
        return value;
      }
      case "object": {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          return value;
        }
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (!trimmed) return {};
          try {
            const parsed = JSON.parse(trimmed);
            return parsed && typeof parsed === "object" ? parsed : value;
          } catch {
            return value;
          }
        }
        return value;
      }
      default:
        return typeof value === "string" ? value : String(value);
    }
  }

  private isPathLikeString(value: string): boolean {
    if (!value) {
      return false;
    }

    if (/\s/.test(value)) {
      return false;
    }

    if (value === "input") {
      return true;
    }

    return value.includes(".") || /\[\d+\]/.test(value);
  }

  /**
   * 比较两个值
   */
  private compareValues(
    actual: any,
    target: any,
    operator: OperatorType,
    dataType: DataType
  ): boolean {
    switch (operator) {
      // 通用
      case "is equal to":
        return this.compareEquality(actual, target, dataType);
      case "is not equal to":
        return !this.compareEquality(actual, target, dataType);
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

  /**
   * 判断相等性
   */
  private compareEquality(
    actual: any,
    target: any,
    dataType: DataType
  ): boolean {
    const normalizedActual = this.normalizeEqualityValue(actual, dataType);
    const normalizedTarget = this.normalizeEqualityValue(target, dataType);

    if (dataType === "array" || dataType === "object") {
      return isEqual(normalizedActual, normalizedTarget);
    }

    return normalizedActual === normalizedTarget;
  }

  /**
   * 将值转换为可比较的类型
   */
  private normalizeEqualityValue(value: any, dataType: DataType): any {
    if (value === null || value === undefined) {
      return value;
    }

    switch (dataType) {
      case "number": {
        const numberValue = Number(value);
        return Number.isNaN(numberValue) ? value : numberValue;
      }
      case "boolean": {
        if (typeof value === "boolean") {
          return value;
        }
        if (typeof value === "string") {
          const normalized = value.trim().toLowerCase();
          if (normalized === "true" || normalized === "1") {
            return true;
          }
          if (normalized === "false" || normalized === "0") {
            return false;
          }
        }
        if (typeof value === "number") {
          return value === 1;
        }
        return Boolean(value);
      }
      case "date": {
        const timestamp =
          value instanceof Date ? value.getTime() : new Date(value).getTime();
        return Number.isNaN(timestamp) ? value : timestamp;
      }
      case "string":
        return String(value);
      default:
        return value;
    }
  }
}
