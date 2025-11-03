import { cloneDeep } from "lodash-es";
import type {
  NodeResult,
  NodeResultOutput,
  PortDefinition,
  WorkflowEdge,
  WorkflowNode,
} from "./types.ts";

const DEBUG_PREFIX = "[NODE_EXECUTOR_DEBUG]";

function debugLog(message: string, payload?: unknown): void {
  if (payload === undefined) {
    console.log(`${DEBUG_PREFIX} ${message}`);
    return;
  }

  console.log(`${DEBUG_PREFIX} ${message}`, serializeDebugValue(payload));
}

function serializeDebugValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeDebugValue(item));
  }

  if (typeof value === "object") {
    const seen = new WeakSet<object>();
    const replacer = (_key: string, val: unknown) => {
      if (val && typeof val === "object") {
        if (seen.has(val as object)) {
          return "[Circular]";
        }
        seen.add(val as object);
      }
      if (typeof val === "bigint") {
        return val.toString();
      }
      return val;
    };

    try {
      return JSON.parse(JSON.stringify(value, replacer));
    } catch (error) {
      return {
        __debugSerializeError:
          error instanceof Error ? error.message : String(error),
      };
    }
  }

  return String(value);
}

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
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): VariableContextResult {
  debugLog("buildVariableContext:start", {
    targetNodeId,
    nodeCount: nodes.length,
    edgeCount: edges.length,
  });
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const upstreamIds = collectUpstreamNodeIds(targetNodeId, edges);
  debugLog("buildVariableContext:upstreamIds", upstreamIds);
  const contextMap = new Map<string, unknown>();
  const tree: VariableTreeNode[] = [];

  upstreamIds.forEach((nodeId) => {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    const result: NodeResult | undefined = node.data?.result;
    if (!result || !result.data) return;

    debugLog("buildVariableContext:nodeResult", {
      nodeId,
      label: node.data?.label,
      outputIds: Object.keys(result.data.outputs || {}),
      hasRaw: result.data.raw !== undefined,
    });

    const resultData = result.data;
    const outputs: Record<string, NodeResultOutput> = resultData.outputs || {};
    const outputEntries = Object.entries(outputs);
    if (outputEntries.length === 0) {
      const raw = resultData.raw;
      if (raw === undefined) {
        debugLog("buildVariableContext:skipNodeWithoutOutputs", { nodeId });
        return;
      }

      const nodeLabel = node.data?.label || nodeId;
      const nodeTree: VariableTreeNode = {
        id: nodeId,
        label: nodeLabel,
        valueType: detectValueType(raw),
        value: raw,
        children: buildValueTree(raw, nodeLabel, contextMap),
        nodeId,
      };

      contextMap.set(nodeLabel, raw);
      tree.push(nodeTree);
      return;
    }

    const nodeName = node.data?.label || nodeId;
    const nodeLabel = node.data?.label || nodeId;
    const nodeTree: VariableTreeNode = {
      id: nodeId,
      label: nodeLabel,
      valueType: "node",
      value: null,
      children: [],
      nodeId,
    };

    outputEntries.forEach(([outputId, output]) => {
      if (!output) return;

      let valueToExpand = output.value;

      if (
        valueToExpand &&
        typeof valueToExpand === "object" &&
        !Array.isArray(valueToExpand) &&
        "data" in (valueToExpand as Record<string, unknown>)
      ) {
        const dataValue = (valueToExpand as Record<string, unknown>).data;
        const isError = (valueToExpand as Record<string, unknown>).isError;

        if (dataValue && typeof dataValue === "object") {
          valueToExpand = {
            ...(dataValue as Record<string, unknown>),
            ...(isError !== undefined ? { isError } : {}),
          };
        }
      }

      if (valueToExpand === undefined) {
        debugLog("buildVariableContext:skipUndefinedOutput", {
          nodeId,
          outputId,
        });
        return;
      }

      debugLog("buildVariableContext:setContextValue", {
        nodeId,
        nodeName,
        outputId,
        preview: serializeDebugValue(valueToExpand),
      });
      contextMap.set(nodeName, valueToExpand);
      contextMap.set(`${nodeName}.${outputId}`, valueToExpand);

      const children = buildValueTree(valueToExpand, nodeName, contextMap);
      nodeTree.children?.push(...children);
    });

    tree.push(nodeTree);
  });

  debugLog("buildVariableContext:completed", {
    contextKeys: Array.from(contextMap.keys()),
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
  debugLog("resolveConfigWithVariables:start", {
    config,
    inputIds: inputs.map((item) => item.id),
    contextKeys: Array.from(contextMap.keys()),
  });
  const cloned = cloneDeep(config);
  const typeMap = new Map<string, string>();

  inputs.forEach((input) => {
    typeMap.set(input.id, input.type);
  });

  const resolved = traverseConfig(cloned, typeMap, contextMap);
  debugLog("resolveConfigWithVariables:result", resolved);
  return resolved;
}

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
  debugLog("resolveTemplateString:start", {
    template,
    expectedType,
  });
  const tokenRegex = /\{\{\s*\$?([^{}]+?)\s*\}\}/g;
  const matches = [...template.matchAll(tokenRegex)];

  if (matches.length === 0) {
    debugLog("resolveTemplateString:noMatches", template);
    return coerceType(template, expectedType);
  }

  const firstMatch = matches[0];
  if (!firstMatch) {
    debugLog("resolveTemplateString:firstMatchMissing", template);
    return coerceType(template, expectedType);
  }

  const isSingleToken =
    matches.length === 1 && template.trim() === firstMatch[0];

  if (isSingleToken) {
    const expr = firstMatch[1];
    if (!expr) {
      debugLog("resolveTemplateString:emptyExpression", template);
      return template;
    }
    const key = expr.trim();
    debugLog("resolveTemplateString:singleToken", {
      key,
      hasContext: contextMap.has(key),
    });
    if (!contextMap.has(key)) {
      return template;
    }
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
    debugLog("resolveTemplateString:replaceToken", {
      token: full,
      key,
      value: serializeDebugValue(value),
    });
    const replacement =
      typeof value === "string" ? value : JSON.stringify(value, null, 2);
    resolved = resolved.replace(full, replacement);
  });

  debugLog("resolveTemplateString:resolved", {
    original: template,
    resolved,
  });
  return coerceType(resolved, expectedType);
}

function collectUpstreamNodeIds(
  targetNodeId: string,
  edges: WorkflowEdge[]
): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  const traverse = (nodeId: string) => {
    edges
      .filter((edge) => edge.target === nodeId)
      .forEach((edge) => {
        if (!edge.source || visited.has(edge.source)) return;
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
      .filter(([key]) => key !== "type")
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
  return `{{ ${path} }}`;
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
