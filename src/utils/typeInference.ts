/**
 * TypeScript 类型推断工具
 * 用于根据值自动生成类型声明
 */

/**
 * 根据变量值推断 TypeScript 类型
 */
export function inferType(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  const type = typeof value;

  if (type === "string") return "string";
  if (type === "number") return "number";
  if (type === "boolean") return "boolean";

  if (Array.isArray(value)) {
    if (value.length === 0) return "any[]";
    // 推断数组元素类型
    const elementTypes = new Set(value.map((item) => inferType(item)));
    if (elementTypes.size === 1) {
      return `${Array.from(elementTypes)[0]}[]`;
    }
    return "any[]";
  }

  if (type === "object") {
    // 生成对象类型
    const obj = value as Record<string, unknown>;
    const props = Object.entries(obj)
      .map(([key, val]) => `    ${key}: ${inferType(val)};`)
      .join("\n");
    return props ? `{\n${props}\n  }` : "Record<string, any>";
  }

  return "any";
}

/**
 * 检测字符串中是否只包含单个变量
 * @param value 要检测的字符串
 * @returns 如果只包含单个变量返回该变量，否则返回 null
 */
export function extractSingleVariable(value: string): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  const variablePattern = /^\{\{\s*([^{}]+?)\s*\}\}$/;
  const match = trimmed.match(variablePattern);

  return match ? match[0] : null;
}

/**
 * 根据数据项生成 Params 接口声明
 * @param dataItems 数据项数组 { key, value }
 * @param resolvedValues 解析后的实际值映射 { key: resolvedValue }
 * @param interfaceName 接口名称，默认为 "Params"
 */
export function generateParamsInterface(
  dataItems: Array<{ key: string; value: string }>,
  resolvedValues: Record<string, unknown>,
  interfaceName = "Params"
): string {
  if (!dataItems || dataItems.length === 0) {
    return `interface ${interfaceName} {
  [key: string]: any;
}`;
  }

  const properties = dataItems
    .map((item) => {
      const key = item.key?.trim();
      if (!key) return "";

      const valueStr = item.value?.trim() || "";
      const singleVar = extractSingleVariable(valueStr);

      let type: string;

      if (singleVar) {
        // 单变量：使用解析后的实际值推断类型
        const resolvedValue = resolvedValues[key];
        type = inferType(resolvedValue);
      } else {
        // 多变量或混合文本：始终是字符串
        type = "string";
      }

      return `  ${key}: ${type};`;
    })
    .filter(Boolean)
    .join("\n");

  if (!properties) {
    return `interface ${interfaceName} {
  [key: string]: any;
}`;
  }

  return `interface ${interfaceName} {
${properties}
}`;
}
