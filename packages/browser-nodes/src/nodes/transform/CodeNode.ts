import { BaseNode } from "../base-node.ts";
import type { PortDefinition, WorkflowExecutionContext } from "../base-node.ts";
import { transform } from "sucrase";

interface CodeNodeDataItem {
  key: string;
  value: unknown;
}

interface CodeNodeConfig {
  code: string;
  dataItems: CodeNodeDataItem[];
  typeDeclarations?: string;
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
 * 支持通过数据映射构建参数，并在运行时执行自定义代码
 */
export class CodeNode extends BaseNode {
  readonly type = "code";
  readonly label = "代码执行";
  readonly description = "执行自定义 TypeScript/JavaScript 代码";
  readonly category = "数据处理";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "code",
        name: "代码",
        type: "string",
        required: true,
        description: "编写 export function main(params) {...} 格式的代码",
      },
      {
        id: "dataItems",
        name: "数据映射",
        type: "array",
        description: "将变量映射为 main(params) 的参数对象",
      },
      {
        id: "typeDeclarations",
        name: "类型声明",
        type: "string",
        description: "额外的 TypeScript 类型声明，增强编辑器提示",
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

  protected getDefaultConfig(): CodeNodeConfig {
    return {
      code: DEFAULT_CODE,
      dataItems: [],
      typeDeclarations: `/**
 * 可以在此处声明类型以辅助编辑器智能提示
 * 例如：
 *
 * interface ExampleParams {
 *   user: { id: string; name: string };
 * }
 */
`,
    };
  }

  async execute(
    config: Record<string, any>,
    _inputs: Record<string, any>,
    _context: WorkflowExecutionContext
  ): Promise<any> {
    const { code, dataItems, typeDeclarations } = this.normalizeConfig(config);

    const params = this.buildParams(dataItems);
    const mergedSource = this.composeSource(typeDeclarations, code);

    let transformedCode: string;

    try {
      transformedCode = transform(mergedSource, {
        transforms: ["typescript"],
        production: true,
      }).code;
    } catch (error: any) {
      throw new Error(`代码转译失败: ${error?.message ?? error}`);
    }

    const runtimeSource = this.prepareRuntime(transformedCode);

    try {
      const executor = new Function("params", runtimeSource);
      const executionResult = executor(params);
      const result =
        executionResult instanceof Promise
          ? await executionResult
          : executionResult;

      return {
        outputs: {
          result,
        },
        raw: result,
        summary: this.buildSummary(result, Object.keys(params)),
      };
    } catch (error: any) {
      throw new Error(`代码执行错误: ${error?.message ?? error}`);
    }
  }

  private normalizeConfig(rawConfig: Record<string, any>): CodeNodeConfig {
    const codeValue = typeof rawConfig.code === "string" ? rawConfig.code : "";
    const dataItemsValue = Array.isArray(rawConfig.dataItems)
      ? (rawConfig.dataItems as CodeNodeDataItem[])
      : [];
    const typeDeclarationsValue =
      typeof rawConfig.typeDeclarations === "string"
        ? rawConfig.typeDeclarations
        : "";

    return {
      code: codeValue.trim() ? codeValue : DEFAULT_CODE,
      dataItems: dataItemsValue,
      typeDeclarations: typeDeclarationsValue,
    };
  }

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
          `第 ${index + 1} 项的键名 \"${key}\" 无效：仅支持以字母开头，由字母、数字或下划线组成`
        );
      }

      if (seenKeys.has(key)) {
        throw new Error(`检测到重复的键名 \"${key}\"，请确保唯一`);
      }

      seenKeys.add(key);
      params[key] = item?.value;
    });

    return params;
  }

  private composeSource(typeDeclarations: string, userCode: string): string {
    const declarationsBlock = typeDeclarations?.trim()
      ? `${typeDeclarations.trim()}
`
      : "";

    return `${declarationsBlock}${userCode}`;
  }

  private prepareRuntime(transformedCode: string): string {
    const normalized = this.normalizeExports(transformedCode);

    return `"use strict";
${normalized}

if (typeof main !== "function") {
  throw new Error("main 函数未定义，请确保导出 export function main(params) {}");
}

const result = main(params);
return result;`;
  }

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

  private buildSummary(result: unknown, keys: string[]): string {
    const keyInfo = keys.length > 0 ? keys.join(", ") : "无";
    const preview = this.formatValue(result);
    return `main(params) 执行完成 | 参数键: [${keyInfo}] | 结果: ${preview}`;
  }

  private formatValue(value: unknown): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") {
      return value.length > 40
        ? `"${value.slice(0, 37)}..."`
        : `"${value}"`;
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
