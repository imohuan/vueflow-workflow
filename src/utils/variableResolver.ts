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

    const outputs = node.data.result.data.outputs;
    const outputEntries = Object.entries(outputs || {});
    if (outputEntries.length === 0) return;

    const nodeLabel = node.data.label || nodeId;
    const nodeTree: VariableTreeNode = {
      id: nodeId,
      label: nodeLabel,
      valueType: "node",
      value: null,
      children: [],
      nodeId,
    };

    outputEntries.forEach(([outputId, output]) => {
      const baseRef = `${nodeId}.${outputId}`;
      contextMap.set(baseRef, output.value);

      const outputNode: VariableTreeNode = {
        id: baseRef,
        label: outputId, // 使用 ID 而不是 label，保持原始字段名
        valueType: detectValueType(output.value),
        reference: createReference(baseRef),
        value: output.value,
        nodeId,
        outputId,
        children: [],
      };

      outputNode.children = buildValueTree(output.value, baseRef, contextMap);

      nodeTree.children?.push(outputNode);
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

  const isSingleToken =
    matches.length === 1 && template.trim() === matches[0][0];

  if (isSingleToken) {
    // 提取变量名（去掉可能的 $ 前缀）
    let key = matches[0][1].trim();
    // 如果原始匹配包含 $，则key不需要处理，因为正则已经排除了$
    const value = contextMap.get(key);
    if (value === undefined) {
      return template;
    }
    return coerceType(value, expectedType);
  }

  let resolved = template;

  matches.forEach(([full, expr]) => {
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
    return Object.entries(value as Record<string, unknown>).map(
      ([key, child]) => {
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
      }
    );
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
  return `{{ $${path} }}`;
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
