import type { VariableTreeNode } from "workflow-node-executor";

/**
 * 检测值的类型
 */
function detectValueType(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/**
 * 创建变量引用路径
 */
function createReference(path: string): string {
  return `{{ ${path} }}`;
}

/**
 * 将 JSON 数据转换为 VariableTreeNode 格式
 */
export function jsonToVariableTree(
  value: unknown,
  baseRef: string = "data"
): VariableTreeNode {
  const valueType = detectValueType(value);
  const id = baseRef;

  // 计算 label
  let label: string;
  if (baseRef === "data") {
    label = "root";
  } else {
    const parts = baseRef.split(".");
    const lastPart = parts[parts.length - 1] || "";
    // 如果是数字索引，显示为 [0] 格式
    if (/^\d+$/.test(lastPart)) {
      label = `[${lastPart}]`;
    } else {
      label = lastPart;
    }
  }

  // 处理数组
  if (Array.isArray(value)) {
    const children: VariableTreeNode[] = value.map((item, index) => {
      const ref = `${baseRef}.${index}`;
      return jsonToVariableTree(item, ref);
    });

    return {
      id,
      label: baseRef === "data" ? "root" : label,
      valueType,
      reference: createReference(baseRef),
      value,
      children: children.length > 0 ? children : undefined,
    };
  }

  // 处理对象
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const children: VariableTreeNode[] = entries.map(([key, child]) => {
      const ref = `${baseRef}.${key}`;
      return jsonToVariableTree(child, ref);
    });

    return {
      id,
      label: baseRef === "data" ? "root" : label,
      valueType,
      reference: createReference(baseRef),
      value,
      children: children.length > 0 ? children : undefined,
    };
  }

  // 基本类型
  return {
    id,
    label: baseRef === "data" ? "root" : label,
    valueType,
    reference: createReference(baseRef),
    value,
  };
}
