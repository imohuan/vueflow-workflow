/**
 * 变量解析器
 * 统一处理工作流中节点的变量提取和解析
 * 支持前后端使用
 */

import type { WorkflowNode, WorkflowEdge } from "./types";
import type { ExecutionContext } from "./ExecutionContext";

/**
 * 变量树节点
 */
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

/**
 * 变量上下文结果
 */
export interface VariableContextResult {
  /** 可视化变量树 */
  tree: VariableTreeNode[];
  /** 变量映射表 */
  map: Map<string, unknown>;
}

/**
 * 节点输出数据提取器
 * 适配不同的数据结构
 */
export interface NodeOutputExtractor {
  /**
   * 从节点中提取输出数据
   * @param node - 工作流节点
   * @returns 输出数据对象，key 为输出端口名，value 为输出值
   */
  extractOutputs(node: WorkflowNode): Record<string, any> | null;
}

/**
 * 默认节点输出提取器
 * 支持多种数据结构：
 * 1. v2 格式：node.data.executionResult（直接是输出对象）
 * 2. v1 格式：node.data.result.data.outputs（嵌套结构）
 * 3. executor 格式：从 ExecutionContext 中获取
 */
class DefaultNodeOutputExtractor implements NodeOutputExtractor {
  extractOutputs(node: WorkflowNode): Record<string, any> | null {
    const data = node.data;
    if (!data) return null;

    // v2 格式：executionResult 直接是输出对象
    if (data.executionResult) {
      // 如果 executionResult 是对象，直接使用
      if (
        typeof data.executionResult === "object" &&
        !Array.isArray(data.executionResult)
      ) {
        return data.executionResult;
      }
      // 如果是其他类型，包装为 default 输出
      return { default: data.executionResult };
    }

    // v1 格式：result.data.outputs
    if (data.result?.data?.outputs) {
      const outputs = data.result.data.outputs;
      const result: Record<string, any> = {};

      // 将 NodeResultOutput 格式转换为简单对象
      Object.entries(outputs).forEach(([key, output]: [string, any]) => {
        if (output && typeof output === "object" && "value" in output) {
          result[key] = output.value;
        } else {
          result[key] = output;
        }
      });

      return result;
    }

    // v1 格式：result.data.raw（没有 outputs 时使用 raw）
    if (data.result?.data?.raw !== undefined) {
      return { default: data.result.data.raw };
    }

    return null;
  }
}

/**
 * 从 ExecutionContext 中提取节点输出
 */
class ExecutionContextOutputExtractor implements NodeOutputExtractor {
  private context: ExecutionContext;

  constructor(context: ExecutionContext) {
    this.context = context;
  }

  extractOutputs(node: WorkflowNode): Record<string, any> | null {
    const outputs = this.context.getNodeOutput(node.id);
    return outputs || null;
  }
}

/**
 * 收集目标节点的所有上游节点 ID
 * 如果目标节点在容器内，找到对应的For循环节点，然后收集For节点的上游
 *
 * @param targetNodeId - 目标节点 ID
 * @param edges - 工作流边列表
 * @param nodes - 工作流节点列表
 * @param targetParentContainerId - 目标节点所在的容器 ID（可选）
 */
function collectUpstreamNodeIds(
  targetNodeId: string,
  edges: WorkflowEdge[],
  nodes: WorkflowNode[]
): string[] {
  const visited = new Set<string>();
  const result: string[] = [];
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  // 递归收集上游节点
  const traverse = (nodeId: string) => {
    const incomingEdges = edges.filter((edge) => edge.target === nodeId);

    for (const edge of incomingEdges) {
      if (!edge.source || visited.has(edge.source)) continue;

      const sourceNode = nodeMap.get(edge.source);
      if (!sourceNode) continue;

      // 判斷他是否是for循环体
      const forNodeId = sourceNode.data?.config?.forNodeId;
      if (forNodeId) {
        const forNode = nodeMap.get(forNodeId);
        if (!forNode) continue;
        visited.add(forNodeId);
        result.push(forNodeId);
        traverse(forNodeId);
        continue;
      }

      // 目标节点不在容器内，正常收集所有上游节点
      visited.add(edge.source);
      result.push(edge.source);
      traverse(edge.source);
    }
  };

  // 先收集容器内的上游节点
  traverse(targetNodeId);
  return result;
}

/**
 * 直接展开对象或数组的 children（用于属性节点的递归展开，不创建包装节点）
 */
function buildObjectOrArrayChildren(
  value: unknown,
  parentRef: string,
  contextMap: Map<string, unknown>
): VariableTreeNode[] {
  if (value === null || value === undefined) {
    return [];
  }

  // 处理数组
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const itemRef = `${parentRef}[${index}]`;
      contextMap.set(itemRef, item);

      const needsRecursion =
        item !== null &&
        item !== undefined &&
        (Array.isArray(item) || typeof item === "object");

      return {
        id: itemRef,
        label: `[${index}]`,
        valueType: detectValueType(item),
        reference: createReference(itemRef),
        value: item,
        children: needsRecursion
          ? buildObjectOrArrayChildren(item, itemRef, contextMap)
          : [],
      };
    });
  }

  // 处理对象
  if (typeof value === "object") {
    const properties = Object.entries(value as Record<string, unknown>).filter(
      ([key]) => key !== "type"
    );

    return properties.map(([childKey, child]) => {
      const childRef = `${parentRef}.${childKey}`;
      contextMap.set(childRef, child);

      const needsRecursion =
        child !== null &&
        child !== undefined &&
        (Array.isArray(child) || typeof child === "object");

      return {
        id: childRef,
        label: childKey,
        valueType: detectValueType(child),
        reference: createReference(childRef),
        value: child,
        children: needsRecursion
          ? buildObjectOrArrayChildren(child, childRef, contextMap)
          : [],
      };
    });
  }

  return [];
}

/**
 * 构建值树（递归构建对象/数组的树结构）
 */
function buildValueTree(
  key: string,
  value: unknown,
  baseRef: string,
  contextMap: Map<string, unknown>
): VariableTreeNode[] {
  if (value === null || value === undefined) {
    return [];
  }

  // 构建当前节点的完整引用路径
  const currentRef = baseRef && key ? `${baseRef}.${key}` : baseRef || key;

  if (Array.isArray(value)) {
    return value.map((item, index) => {
      // 数组元素的引用路径：baseRef.key[index]
      const itemRef = `${currentRef}[${index}]`;
      contextMap.set(itemRef, item);

      // 只有对象或数组才需要递归展开，基本值不需要
      const needsRecursion =
        item !== null &&
        item !== undefined &&
        (Array.isArray(item) || typeof item === "object");

      return {
        id: itemRef,
        label: `[${index}]`,
        valueType: detectValueType(item),
        reference: createReference(itemRef),
        value: item,
        // 递归时，直接展开对象或数组的 children，不创建包装节点
        children: needsRecursion
          ? buildObjectOrArrayChildren(item, itemRef, contextMap)
          : [],
      };
    });
  }

  if (typeof value === "object") {
    // 获取对象的属性列表
    const properties = Object.entries(value as Record<string, unknown>).filter(
      ([key]) => key !== "type"
    );

    // 创建对象的子节点（属性节点）
    const buildPropertyNodes = (
      props: Array<[string, unknown]>,
      parentRef: string
    ): VariableTreeNode[] => {
      return props.map(([childKey, child]) => {
        // 对象属性的引用路径：parentRef.childKey
        const childRef = `${parentRef}.${childKey}`;
        contextMap.set(childRef, child);

        // 判断子值是否需要递归展开
        const needsRecursion =
          child !== null &&
          child !== undefined &&
          (Array.isArray(child) || typeof child === "object");

        // 创建属性节点
        const propertyNode: VariableTreeNode = {
          id: childRef,
          label: childKey,
          valueType: detectValueType(child),
          reference: createReference(childRef),
          value: child,
          children: needsRecursion
            ? // 递归时，直接展开子值的属性，不再创建包装节点
              buildObjectOrArrayChildren(child, childRef, contextMap)
            : [],
        };

        return propertyNode;
      });
    };

    // 如果 key 为空（比如是数组元素中的对象），直接返回属性列表
    if (!key) {
      return buildPropertyNodes(properties, currentRef);
    }

    // 如果 key 不为空，先创建对象节点，然后对象的属性作为该节点的 children
    contextMap.set(currentRef, value);
    const children = buildPropertyNodes(properties, currentRef);

    return [
      {
        id: currentRef,
        label: key,
        valueType: "object",
        reference: createReference(currentRef),
        value: value,
        children: children,
        nodeId: baseRef,
        outputId: key,
      },
    ];
  }

  // 基本值：直接返回当前节点
  contextMap.set(currentRef, value);
  return [
    {
      id: currentRef,
      label: key,
      valueType: detectValueType(value),
      reference: createReference(currentRef),
      value: value,
      children: [],
      nodeId: baseRef,
      outputId: key,
    },
  ];
}

/**
 * 检测值类型
 */
function detectValueType(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/**
 * 创建变量引用字符串
 */
function createReference(path: string): string {
  return `{{ ${path} }}`;
}

/**
 * 构建变量上下文
 * 从工作流节点中提取可用变量
 *
 * @param targetNodeId - 目标节点 ID（要为其提取可用变量）
 * @param nodes - 工作流节点列表
 * @param edges - 工作流边列表
 * @param extractor - 可选的输出提取器（默认使用 DefaultNodeOutputExtractor）
 * @param globalVariables - 全局变量对象（可选）
 * @returns 变量上下文结果
 */
export function buildVariableContext(
  targetNodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  extractor?: NodeOutputExtractor,
  globalVariables?: Record<string, any>,
  loopVariables?: Record<string, any>
): VariableContextResult {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const contextMap = new Map<string, unknown>();
  const tree: VariableTreeNode[] = [];

  // 获取目标节点信息
  const targetNode = nodeMap.get(targetNodeId);
  const targetParentContainerId =
    targetNode?.parentNode || targetNode?.data?.parentNode;

  // 收集上游节点（传入容器信息以支持容器内节点过滤）
  const upstreamIds = collectUpstreamNodeIds(
    targetNodeId,
    edges,
    nodes
  ).reverse();

  // 如果目标节点在容器内，找到容器对应的 For 节点
  let parentForNodeId: string | null = null;
  if (targetParentContainerId) {
    const containerNode = nodeMap.get(targetParentContainerId);
    if (containerNode?.type === "forLoopContainer") {
      // 容器配置中记录了对应的 For 节点 ID
      parentForNodeId = containerNode.data?.config?.forNodeId;
      // 如果容器配置中没有，尝试从所有 For 节点中查找
      if (!parentForNodeId) {
        for (const node of nodes) {
          if (
            node.type === "for" &&
            node.data?.config?.containerId === targetParentContainerId
          ) {
            parentForNodeId = node.id;
            break;
          }
        }
      }
    }
  }

  // 使用提供的提取器或默认提取器
  const outputExtractor = extractor || new DefaultNodeOutputExtractor();

  // 如果有全局变量，添加到上下文中
  if (globalVariables && Object.keys(globalVariables).length > 0) {
    const reference = "全局变量";

    // 构建全局变量树节点
    const globalVarNode: VariableTreeNode = {
      id: "global-variables",
      label: "全局变量",
      valueType: "object",
      reference,
      value: {},
      children: [],
    };

    // 使用 buildValueTree 构建每个全局变量的子树
    Object.entries(globalVariables).forEach(([key, value]) => {
      // 添加到 contextMap
      contextMap.set(`${reference}.${key}`, value);
      // 使用 buildValueTree 构建子树
      const children = buildValueTree(key, value, reference, contextMap);
      globalVarNode.children?.push(...children);
    });

    tree.push(globalVarNode);
  }

  upstreamIds.forEach((nodeId) => {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    const nodeLabel = node.label || node.data?.label || nodeId;
    const nodeType = node.type;
    const outputs = outputExtractor.extractOutputs(node);

    // 特殊处理 For 节点：根据目标节点位置决定显示内容
    if (nodeType === "for") {
      const forConfig = node.data?.config || {};
      const containerId = forConfig.containerId;

      // 判断：目标节点是否在这个 For 节点的容器内
      const isTargetInThisContainer =
        targetParentContainerId &&
        containerId &&
        targetParentContainerId === containerId &&
        parentForNodeId === nodeId;

      if (isTargetInThisContainer) {
        // 目标节点在容器内：显示迭代变量（item、index、list）
        const nodeTree: VariableTreeNode = {
          id: nodeId,
          label: nodeLabel,
          valueType: "node",
          value: null,
          children: [],
          nodeId,
        };

        const itemName = forConfig.itemName || "item";
        const indexName = forConfig.indexName || "index";

        // 如果有循环变量（运行时），使用实际的迭代数据
        // 否则从参数中获取示例数据（前端配置时）
        let itemValue: any;
        let indexValue: any;
        let listData: any[] = [];
        let isRuntime = false;

        const paramsItems = node.data?.params?.items;
        // 解析 paramsItems 中可能存在的变量引用
        if (paramsItems !== undefined && paramsItems !== null) {
          const resolvedItems = resolveTemplateString(paramsItems, contextMap);
          if (Array.isArray(resolvedItems)) {
            listData = resolvedItems;
          }
        }

        if (loopVariables) {
          // 运行时：使用实际的循环变量
          itemValue = loopVariables[itemName];
          indexValue = loopVariables[indexName];
          isRuntime = true;
        } else {
          // 前端配置时：使用示例数据
          itemValue = listData.length > 0 ? listData[0] : null;
          indexValue = 0;
        }

        // 使用 buildValueTree 构建 item 变量节点
        const itemChildren = buildValueTree(
          itemName,
          itemValue,
          nodeLabel,
          contextMap
        );
        if (!isRuntime && itemChildren[0]) {
          itemChildren[0].label = itemChildren[0].label + " [示例]";
        }
        if (itemChildren[0]) nodeTree.children?.push(itemChildren[0]);

        // 使用 buildValueTree 构建 index 变量节点
        const indexChildren = buildValueTree(
          indexName,
          indexValue,
          nodeLabel,
          contextMap
        );
        if (!isRuntime && indexChildren[0]) {
          indexChildren[0].label = indexChildren[0].label + " [示例]";
        }
        if (indexChildren[0]) nodeTree.children?.push(indexChildren[0]);

        // 手动创建 list 变量节点，使数组元素作为其子节点
        const listRef = `${nodeLabel}.list`;
        contextMap.set(listRef, listData);
        const listNode: VariableTreeNode = {
          id: listRef,
          label: "list",
          valueType: "array",
          reference: createReference(listRef),
          value: listData,
          children:
            listData.length > 0
              ? buildObjectOrArrayChildren(listData, listRef, contextMap)
              : [],
          nodeId,
          outputId: "list",
        };
        nodeTree.children?.push(listNode);
        tree.push(nodeTree);
        return;
      }

      // 目标节点在容器外：显示执行结果（next）
      // 继续执行下面的默认逻辑
    }

    // 其他节点：正常提取输出
    if (!outputs || Object.keys(outputs).length === 0) {
      return;
    }

    const nodeTree: VariableTreeNode = {
      id: nodeId,
      label: nodeLabel,
      valueType: "node",
      value: null,
      children: [],
      nodeId,
    };

    // 处理每个输出
    Object.entries(outputs).forEach(([outputId, outputValue]) => {
      if (outputValue === undefined) return;

      let valueToExpand = outputValue;

      // 如果输出值是对象且包含 data 字段，展开 data 的内容
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

      // 设置变量映射
      // 如果只有一个输出且 key 是 "default"，直接使用节点名
      const outputKeys = Object.keys(outputs);
      if (outputKeys.length === 1 && outputKeys[0] === "default") {
        contextMap.set(nodeLabel, valueToExpand);
      } else {
        // 多个输出时，使用节点名和输出 ID
        contextMap.set(nodeLabel, valueToExpand);
        contextMap.set(`${nodeLabel}.${outputId}`, valueToExpand);
      }

      // 构建子树
      const children = buildValueTree(
        outputId,
        valueToExpand,
        nodeLabel,
        contextMap
      );

      nodeTree.children?.push(...children);
    });

    tree.push(nodeTree);
  });

  return {
    tree: tree.reverse(),
    map: contextMap,
  };
}

/**
 * 从 ExecutionContext 构建变量上下文
 * 用于后台执行时提取变量
 *
 * @param targetNodeId - 目标节点 ID
 * @param context - 执行上下文
 * @param nodes - 工作流节点列表
 * @param edges - 工作流边列表
 * @param globalVariables - 全局变量对象（可选）
 * @returns 变量上下文结果
 */
export function buildVariableContextFromExecutionContext(
  targetNodeId: string,
  context: ExecutionContext,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  globalVariables?: Record<string, any>
): VariableContextResult {
  const extractor = new ExecutionContextOutputExtractor(context);
  return buildVariableContext(
    targetNodeId,
    nodes,
    edges,
    extractor,
    globalVariables,
    context.loopVariables
  );
}

/**
 * 将配置中的模板变量解析为实际值
 * 用于在执行节点前解析配置中的变量引用（如 {{ nodeName.field }}）
 *
 * @param config - 节点配置对象
 * @param contextMap - 变量上下文映射表
 * @returns 解析后的配置对象
 */
export function resolveConfigWithVariables(
  config: Record<string, any>,
  contextMap: Map<string, unknown>
): Record<string, any> {
  const cloned = JSON.parse(JSON.stringify(config)); // 深拷贝
  return traverseConfig(cloned, contextMap);
}

/**
 * 递归遍历配置对象，解析所有变量引用
 */
function traverseConfig(value: unknown, contextMap: Map<string, unknown>): any {
  if (typeof value === "string") {
    return resolveTemplateString(value, contextMap);
  }

  if (Array.isArray(value)) {
    return value.map((item) => traverseConfig(item, contextMap));
  }

  if (value && typeof value === "object") {
    const result: Record<string, any> = {};
    Object.entries(value as Record<string, any>).forEach(([key, val]) => {
      result[key] = traverseConfig(val, contextMap);
    });
    return result;
  }

  return value;
}

/** 变量引用正则 */
export const tokenRegex = /\{\{\s*\$?([^{}]+?)\s*\}\}/g;

/**
 * 检测字符串中是否包含变量引用
 */
export function containsVariableReference(str: string): boolean {
  return tokenRegex.test(str);
}

/**
 * 检测字符串是否只包含变量引用（没有其他内容）
 * 用于判断字符串是否应该被视为空值
 *
 * @param str - 要检测的字符串
 * @returns 如果字符串只包含变量引用和空白字符，返回 true
 */
export function isOnlyVariableReference(str: string): boolean {
  if (typeof str !== "string") {
    return false;
  }

  // 获取所有变量引用匹配
  const matches = [...str.matchAll(tokenRegex)];

  if (matches.length === 0) {
    return false;
  }

  // 移除所有变量引用，检查剩余内容
  let remaining = str;
  matches.forEach(([full]) => {
    remaining = remaining.replace(full, "");
  });

  // 如果移除变量引用后只剩下空白字符，则认为只包含变量引用
  return remaining.trim().length === 0;
}

/**
 * 解析模板字符串中的变量引用
 * 支持 {{ nodeName.field }} 和 {{ $nodeName.field }} 两种格式
 */
export function resolveTemplateString(
  template: string,
  contextMap: Map<string, unknown>
): unknown {
  // 支持 {{ $xxx }} 和 {{ xxx }} 两种格式
  const matches = [...template.matchAll(tokenRegex)];

  if (matches.length === 0) {
    return template;
  }

  const firstMatch = matches[0];
  if (!firstMatch) {
    return template;
  }

  const isSingleToken =
    matches.length === 1 && template.trim() === firstMatch[0];

  if (isSingleToken) {
    // 单个变量引用，直接替换为值
    const expr = firstMatch[1];
    if (!expr) {
      return template;
    }
    const key = expr.trim();
    const value = contextMap.get(key);
    if (value === undefined) {
      return template;
    }
    return value;
  }

  // 多个变量引用，替换所有匹配项
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

  return resolved;
}
