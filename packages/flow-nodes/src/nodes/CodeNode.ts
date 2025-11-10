import {
  BaseFlowNode,
  type PortConfig,
  type NodeStyleConfig,
  type NodeExecutionContext,
  type NodeExecutionResult,
} from "../BaseFlowNode";

/** 代码节点数据项 */
export interface CodeNodeDataItem {
  key: string;
  value: unknown;
}

/** 代码节点配置 */
export interface CodeNodeConfig {
  /** 代码内容 */
  code: string;
  /** 数据映射 */
  dataItems: CodeNodeDataItem[];
}

const DEFAULT_CODE = `export async function main(params) {
  return {
    receivedKeys: Object.keys(params),
    example: params,
  };
}`;

const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

/**
 * 代码执行节点
 * 支持通过数据映射构建参数，并在运行时执行自定义 TypeScript/JavaScript 代码
 */
export class CodeNode extends BaseFlowNode {
  readonly type = "code";
  readonly label = "代码执行";
  readonly description = "执行自定义 TypeScript/JavaScript 代码";
  readonly category = "数据处理";

  protected defineInputs(): PortConfig[] {
    return [
      {
        name: "dataItems",
        type: "array",
        description: "参数对象（如提供则覆盖由 dataItems 构建的参数）",
        required: false,
      },
      {
        name: "code",
        type: "string",
        description: "动态代码（如提供则覆盖配置中的 code）",
        required: false,
      },
    ];
  }

  protected defineOutputs(): PortConfig[] {
    return [
      {
        name: "result",
        type: "any",
        description: "执行结果",
      },
    ];
  }

  protected getStyleConfig(): NodeStyleConfig {
    return {
      headerColor: ["#8b5cf6", "#7c3aed"],
      showIcon: true,
    };
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): CodeNodeConfig {
    return {
      code: DEFAULT_CODE,
      dataItems: [],
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      // 使用默认配置（不从 context 读取）
      const defaults: CodeNodeConfig = this.getDefaultConfig();

      // 允许输入覆盖配置（统一通过 this.getInput 获取）
      const rawCode = this.getInput<string>(inputs, "code", "");
      const incomingCode =
        typeof rawCode === "string" && rawCode.trim() ? rawCode : undefined;

      const rawParams = this.getInput<Record<string, unknown> | null>(
        inputs,
        "dataItems",
        null
      );

      const rawParamsIsArray = Array.isArray(rawParams);
      const incomingParams =
        rawParams && typeof rawParams === "object" && !rawParamsIsArray
          ? rawParams
          : undefined;

      const effectiveCode = incomingCode ?? defaults.code;

      // 构建参数（优先使用输入的 params，否则根据 dataItems 构建）
      const params =
        incomingParams ??
        this.buildParams(rawParamsIsArray ? rawParams : defaults.dataItems);

      // 准备运行时代码
      const runtimeSource = this.prepareRuntime(effectiveCode);

      // 执行代码
      try {
        const executor = new Function("params", runtimeSource);
        const executionResult = executor(params);
        const result =
          executionResult instanceof Promise
            ? await executionResult
            : executionResult;

        const outputs: Record<string, any> = {
          result,
        };

        return this.createOutput(
          outputs,
          result,
          this.buildSummary(result, Object.keys(params))
        );
      } catch (error: any) {
        throw new Error(`代码执行错误: ${error?.message ?? error}`);
      }
    } catch (error) {
      return this.createError(error as Error);
    }
  }

  /**
   * 构建参数对象
   */
  private buildParams(dataItems: CodeNodeDataItem[]): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    const seenKeys = new Set<string>();

    dataItems.forEach((item, index) => {
      const key = (item?.key ?? "").trim();

      if (!key) {
        throw new Error(`第 ${index + 1} 项的键名不能为空`);
      }

      if (!KEY_PATTERN.test(key)) {
        throw new Error(
          `第 ${
            index + 1
          } 项的键名 "${key}" 无效：仅支持以字母开头，由字母、数字或下划线组成`
        );
      }

      if (seenKeys.has(key)) {
        throw new Error(`检测到重复的键名 "${key}"，请确保唯一`);
      }

      seenKeys.add(key);
      params[key] = item?.value;
    });

    return params;
  }

  // 已移除 composeSource：不再需要对代码进行额外拼接

  /**
   * 准备运行时代码
   */
  private prepareRuntime(code: string): string {
    const normalized = this.normalizeExports(code);

    return `"use strict";
${normalized}

if (typeof main !== "function") {
  throw new Error("main 函数未定义，请确保导出 export function main(params) {}");
}

const result = main(params);
return result;`;
  }

  /**
   * 规范化导出语句
   */
  private normalizeExports(code: string): string {
    let normalized = code;

    const replacements: Array<[RegExp, string]> = [
      [/export\s+default\s+async\s+function\s+main/g, "async function main"],
      [/export\s+default\s+function\s+main/g, "function main"],
      [/export\s+async\s+function\s+main/g, "async function main"],
      [/export\s+function\s+main/g, "function main"],
      [/export\s+default\s+main\s*;?/g, ""],
      [/export\s+{\s*main\s+as\s+default\s*};?/g, ""],
      [/export\s+const\s+main\s*=\s*/g, "const main = "],
      [/export\s+let\s+main\s*=\s*/g, "let main = "],
      [/export\s+var\s+main\s*=\s*/g, "var main = "],
    ];

    replacements.forEach(([pattern, replacement]) => {
      normalized = normalized.replace(pattern, replacement);
    });

    return normalized;
  }

  /**
   * 构建摘要信息
   */
  private buildSummary(result: unknown, keys: string[]): string {
    const keyInfo = keys.length > 0 ? keys.join(", ") : "无";
    const preview = this.formatValue(result);
    return `main(params) 执行完成 | 参数键: [${keyInfo}] | 结果: ${preview}`;
  }

  /**
   * 格式化值用于显示
   */
  private formatValue(value: unknown): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") {
      return value.length > 40 ? `"${value.slice(0, 37)}..."` : `"${value}"`;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (Array.isArray(value)) {
      return `Array(${value.length})`;
    }
    if (typeof value === "object") {
      const keys = Object.keys(value as Record<string, unknown>);
      if (keys.length === 0) {
        return "{}";
      }
      const previewKeys = keys.slice(0, 3).join(", ");
      const suffix = keys.length > 3 ? ", ..." : "";
      return `{ ${previewKeys}${suffix} }`;
    }
    return String(value);
  }
}
