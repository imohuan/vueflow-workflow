import { cloneDeep } from "lodash-es";
import type { Edge, Node } from "@vue-flow/core";
import type { NodeData, PortDefinition } from "@/typings/nodeEditor";

export interface VariableTreeNode {
  /** 唯一标识 */
  id: string;
  /** 展示名称 */
  label: string;
  /** 值类型 */
  valueType: string;
  /** 变量引用（用于插入模板） */
  reference?: string;
  /** 原始值 */
  value: unknown;
  /** 子节点 */
  children?: VariableTreeNode[];
  /** 来源节点 ID */
  nodeId?: string;
  /** 来源输出 ID */
  outputId?: string;
}

export interface VariableContextResult {
  /** 可视化变量树 */
  tree: VariableTreeNode[];
  /** 变量映射表 */
  map: Map<string, unknown>;
}

/**
 * 计算指定节点可用的上游变量
 */
export function buildVariableContext(
  targetNodeId: string,
  nodes: Node<NodeData>[],
  edges: Edge[]
): VariableContextResult {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const upstreamIds = collectUpstreamNodeIds(targetNodeId, edges);
  const contextMap = new Map<string, unknown>();
  const tree: VariableTreeNode[] = [];

  upstreamIds.forEach((nodeId) => {
    const node = nodeMap.get(nodeId);
    if (!node?.data?.result) return;

    const resultData = node.data.result.data;
    const outputs = resultData.outputs;
    const outputEntries = Object.entries(outputs || {});
    if (outputEntries.length === 0) return;

    // 使用节点名称（label）作为引用前缀，如果没有 label 则使用 nodeId
    const nodeName = node.data.label || nodeId;
    const nodeLabel = node.data.label || nodeId;
    const nodeTree: VariableTreeNode = {
      id: nodeId,
      label: nodeLabel,
      valueType: "node",
      value: null,
      children: [],
      nodeId,
    };

    outputEntries.forEach(([, output]) => {
      // 如果输出值是对象且包含 data 字段，直接展开 data 的内容
      let valueToExpand = output.value;
      const basePrefix = nodeName;

      if (
        valueToExpand &&
        typeof valueToExpand === "object" &&
        !Array.isArray(valueToExpand) &&
        "data" in valueToExpand
      ) {
        // 将 isError 添加到 data 中
        const dataValue = (valueToExpand as any).data;
        const isError = (valueToExpand as any).isError;

        if (dataValue && typeof dataValue === "object") {
          valueToExpand = {
            ...dataValue,
            ...(isError !== undefined ? { isError } : {}),
          };
        }
      }

      // 直接在节点名称下展开字段，不再添加 outputId 层级
      contextMap.set(nodeName, valueToExpand);

      // 构建子树
      const children = buildValueTree(valueToExpand, basePrefix, contextMap);

      // 直接将子字段添加到节点下
      nodeTree.children?.push(...children);
    });

    tree.push(nodeTree);
  });

  return {
    tree,
    map: contextMap,
  };
}

/**
 * 将配置中的模板变量解析为实际值
 */
export function resolveConfigWithVariables(
  config: Record<string, any>,
  inputs: PortDefinition[],
  contextMap: Map<string, unknown>
): Record<string, any> {
  const cloned = cloneDeep(config);
  const typeMap = new Map<string, string>();

  inputs.forEach((input) => {
    typeMap.set(input.id, input.type);
  });

  return traverseConfig(cloned, typeMap, contextMap);
}

// ==================== 内部辅助函数 ====================

function traverseConfig(
  value: unknown,
  typeMap: Map<string, string>,
  contextMap: Map<string, unknown>,
  expectedType?: string
): any {
  if (typeof value === "string") {
    return resolveTemplateString(value, contextMap, expectedType);
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      traverseConfig(item, typeMap, contextMap, expectedType)
    );
  }

  if (value && typeof value === "object") {
    const result: Record<string, any> = {};
    Object.entries(value as Record<string, any>).forEach(([key, val]) => {
      const nextType = typeMap.get(key);
      result[key] = traverseConfig(val, typeMap, contextMap, nextType);
    });
    return result;
  }

  return value;
}

function resolveTemplateString(
  template: string,
  contextMap: Map<string, unknown>,
  expectedType?: string
): unknown {
  // 支持 {{ $xxx }} 和 {{ xxx }} 两种格式
  const tokenRegex = /\{\{\s*\$?([^{}]+?)\s*\}\}/g;
  const matches = [...template.matchAll(tokenRegex)];

  if (matches.length === 0) {
    return coerceType(template, expectedType);
  }

  const firstMatch = matches[0];
  if (!firstMatch) {
    return coerceType(template, expectedType);
  }

  const isSingleToken =
    matches.length === 1 && template.trim() === firstMatch[0];

  if (isSingleToken) {
    // 提取变量名（去掉可能的 $ 前缀）
    const expr = firstMatch[1];
    if (!expr) {
      return template;
    }
    const key = expr.trim();
    // 如果原始匹配包含 $，则key不需要处理，因为正则已经排除了$
    const value = contextMap.get(key);
    if (value === undefined) {
      return template;
    }
    return coerceType(value, expectedType);
  }

  let resolved = template;

  matches.forEach(([full, expr]) => {
    if (!expr) return;
    const key = expr.trim();
    if (!contextMap.has(key)) return;
    const value = contextMap.get(key);
    const replacement =
      typeof value === "string" ? value : JSON.stringify(value, null, 2);
    resolved = resolved.replace(full, replacement);
  });

  return coerceType(resolved, expectedType);
}

function collectUpstreamNodeIds(targetNodeId: string, edges: Edge[]): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  const traverse = (nodeId: string) => {
    edges
      .filter((edge) => edge.target === nodeId)
      .forEach((edge) => {
        if (visited.has(edge.source)) return;
        visited.add(edge.source);
        result.push(edge.source);
        traverse(edge.source);
      });
  };

  traverse(targetNodeId);
  return result;
}

function buildValueTree(
  value: unknown,
  baseRef: string,
  contextMap: Map<string, unknown>
): VariableTreeNode[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const ref = `${baseRef}.${index}`;
      contextMap.set(ref, item);
      return {
        id: ref,
        label: `[${index}]`,
        valueType: detectValueType(item),
        reference: createReference(ref),
        value: item,
        children: buildValueTree(item, ref, contextMap),
      };
    });
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "type") // 过滤掉 type 字段
      .map(([key, child]) => {
        const ref = `${baseRef}.${key}`;
        contextMap.set(ref, child);
        return {
          id: ref,
          label: key,
          valueType: detectValueType(child),
          reference: createReference(ref),
          value: child,
          children: buildValueTree(child, ref, contextMap),
        };
      });
  }

  return [];
}

function detectValueType(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function createReference(path: string): string {
  // 直接使用路径，不添加 $ 前缀
  return `{{ ${path} }}`;
}

/**
 * 简化变量引用的显示格式
 * @param value - 包含变量引用的字符串，如 "{{ 截图.data.result.name }}"
 * @returns 简化后的显示格式，如 "截图 - name"
 */
export function simplifyVariableReference(value: string): string {
  if (!value || typeof value !== "string") return "";

  // 提取所有变量引用
  const tokenRegex = /\{\{\s*([^{}]+?)\s*\}\}/g;
  const matches = [...value.matchAll(tokenRegex)];

  if (matches.length === 0) return value;

  // 简化每个变量引用
  const simplified = matches.map((match) => {
    const path = match[1]?.trim();
    if (!path) return match[0];

    const parts = path.split(".");
    if (parts.length === 0) return match[0];

    // 获取第一部分（节点名）和最后一部分（属性名）
    const firstPart = parts[0];
    const lastPart = parts[parts.length - 1];

    // 如果只有一个部分或最后一部分是数字索引，返回原值
    if (parts.length === 1 || /^\d+$/.test(lastPart || "")) {
      return firstPart || match[0];
    }

    return `${firstPart} - ${lastPart}`;
  });

  // 如果只有一个变量且是完整匹配，返回简化后的
  const firstMatch = matches[0];
  if (matches.length === 1 && firstMatch && value.trim() === firstMatch[0]) {
    return simplified[0] || value;
  }

  // 否则替换所有变量引用
  let result = value;
  matches.forEach((match, index) => {
    result = result.replace(match[0], simplified[index] || match[0]);
  });

  return result;
}

function coerceType(value: unknown, expectedType?: string): unknown {
  if (!expectedType) {
    return value;
  }

  switch (expectedType) {
    case "number":
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return value;
        const num = Number(trimmed);
        return Number.isNaN(num) ? value : num;
      }
      if (typeof value === "boolean") {
        return value ? 1 : 0;
      }
      return value;
    case "boolean":
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        const lowered = value.trim().toLowerCase();
        if (["true", "1"].includes(lowered)) return true;
        if (["false", "0"].includes(lowered)) return false;
      }
      if (typeof value === "number") {
        return value !== 0;
      }
      return Boolean(value);
    case "array":
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : value;
        } catch {
          return value;
        }
      }
      return value;
    case "object":
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return value;
      }
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return parsed;
        } catch {
          return value;
        }
      }
      return value;
    default:
      return value;
  }
}
