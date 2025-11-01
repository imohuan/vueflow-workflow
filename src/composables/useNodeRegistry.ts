/**
 * 节点注册表 Hooks
 * 统一管理节点元数据，支持从 @browser-nodes/core 加载和动态注册
 * 未来将完全基于 JSON 数据，不依赖节点实例
 */

import { ref, computed } from "vue";
import {
  getAllNodes,
  getNodeByType as getBrowserNodeByType,
  type BaseNode,
  type PortDefinition,
} from "@browser-nodes/core";
import { getNodeByType as getCoreNodeByType } from "@/workflow/nodes";
import type { NodeData } from "@/typings/nodeEditor";

/**
 * 节点元数据
 */
export interface NodeMetadata {
  /** 节点类型标识 */
  type: string;
  /** 节点显示名称 */
  label: string;
  /** 节点描述 */
  description: string;
  /** 节点分类 */
  category: string;
  /** 输入端口定义 */
  inputs: PortDefinition[];
  /** 输出端口定义 */
  outputs: PortDefinition[];
  /** 默认配置 */
  defaultConfig: Record<string, any>;
}

/**
 * 节点注册表状态
 */
interface NodeRegistryState {
  /** 节点元数据映射表（type -> metadata） */
  metadataMap: Map<string, NodeMetadata>;
  /** 动态注册的节点元数据（来自后端） */
  dynamicNodes: Map<string, NodeMetadata>;
}

const state = ref<NodeRegistryState>({
  metadataMap: new Map(),
  dynamicNodes: new Map(),
});

/**
 * 从节点实例提取元数据
 * 使用 createNodeData 方法获取完整的节点数据（包含默认端口逻辑）
 */
function extractMetadata(node: BaseNode): NodeMetadata {
  // 使用 createNodeData 方法获取完整的节点数据
  const nodeData = node.createNodeData();

  return {
    type: node.type,
    label: node.label,
    description: node.description,
    category: node.category,
    inputs: nodeData.inputs, // 使用 createNodeData 返回的 inputs（已包含默认端口）
    outputs: nodeData.outputs, // 使用 createNodeData 返回的 outputs（已包含默认端口）
    defaultConfig: nodeData.config, // 使用 createNodeData 返回的 config
  };
}

/**
 * 初始化节点注册表
 * 从 @browser-nodes/core 和核心节点加载所有节点元数据
 */
function initializeRegistry() {
  // 清空现有数据
  state.value.metadataMap.clear();

  // 加载 browser-nodes 包中的节点
  const browserNodes = getAllNodes();
  browserNodes.forEach((node) => {
    const metadata = extractMetadata(node);
    state.value.metadataMap.set(metadata.type, metadata);
  });

  // 加载核心节点（StartNode, EndNode, IfNode, ForNode）
  const coreNodeTypes = ["start", "end", "if", "for"];
  coreNodeTypes.forEach((type) => {
    const node = getCoreNodeByType(type);
    if (node) {
      const metadata = extractMetadata(node);
      state.value.metadataMap.set(metadata.type, metadata);
    }
  });
}

/**
 * 注册单个节点元数据（用于动态注册）
 */
function registerNode(metadata: NodeMetadata) {
  state.value.dynamicNodes.set(metadata.type, metadata);
  state.value.metadataMap.set(metadata.type, metadata);
}

/**
 * 批量注册节点元数据（用于从后端加载）
 */
function registerNodes(metadataList: NodeMetadata[]) {
  metadataList.forEach((metadata) => {
    registerNode(metadata);
  });
}

/**
 * 根据类型获取节点元数据
 */
function getNodeMetadata(type: string): NodeMetadata | undefined {
  return state.value.metadataMap.get(type);
}

/**
 * 获取所有节点元数据
 */
function getAllNodeMetadata(): NodeMetadata[] {
  return Array.from(state.value.metadataMap.values());
}

/**
 * 按分类获取节点元数据
 */
function getNodesByCategory(): Record<string, NodeMetadata[]> {
  const categories: Record<string, NodeMetadata[]> = {};
  const allMetadata = getAllNodeMetadata();

  allMetadata.forEach((metadata) => {
    const category = metadata.category;
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category]!.push(metadata);
  });

  return categories;
}

/**
 * 搜索节点
 */
function searchNodes(query: string): NodeMetadata[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) {
    return getAllNodeMetadata();
  }

  return getAllNodeMetadata().filter(
    (metadata) =>
      metadata.type.toLowerCase().includes(lowerQuery) ||
      metadata.label.toLowerCase().includes(lowerQuery) ||
      metadata.description.toLowerCase().includes(lowerQuery) ||
      metadata.category.toLowerCase().includes(lowerQuery)
  );
}

/**
 * 根据分类过滤节点
 */
function getNodesByCategoryFiltered(
  category?: string
): Record<string, NodeMetadata[]> | NodeMetadata[] {
  if (category) {
    return getAllNodeMetadata().filter(
      (metadata) => metadata.category === category
    );
  }
  return getNodesByCategory();
}

/**
 * 检查节点类型是否存在
 */
function hasNodeType(type: string): boolean {
  return state.value.metadataMap.has(type);
}

/**
 * 创建节点数据（用于创建新节点）
 * 优先使用节点实例的 createNodeData 方法，以确保默认端口逻辑正确应用
 */
function createNodeData(type: string): NodeData | null {
  // 优先尝试使用节点实例的 createNodeData 方法（包含默认端口逻辑）
  const nodeInstance = getNodeInstance(type);
  if (nodeInstance) {
    return nodeInstance.createNodeData();
  }

  // 如果找不到节点实例，回退到使用元数据（适用于动态注册的节点）
  const metadata = getNodeMetadata(type);
  if (!metadata) {
    return null;
  }

  // 对于动态注册的节点，需要手动检查并添加默认端口
  const hasCustomInputPorts = metadata.inputs.some((input) => input.isPort);
  const hasCustomOutputPorts = metadata.outputs.some((output) => output.isPort);

  const configOnlyInputs = metadata.inputs.filter((input) => !input.isPort);

  const finalInputs = hasCustomInputPorts
    ? metadata.inputs
    : [
        ...configOnlyInputs,
        {
          id: "__input__",
          name: "输入",
          type: "any",
          isPort: true,
        },
      ];

  const finalOutputs = hasCustomOutputPorts
    ? metadata.outputs
    : [
        {
          id: "__output__",
          name: "输出",
          type: "any",
          isPort: true,
        },
      ];

  return {
    config: { ...metadata.defaultConfig },
    inputs: finalInputs,
    outputs: finalOutputs,
    label: metadata.label,
    category: metadata.category,
    variant: metadata.type,
  };
}

/**
 * 获取节点实例（向后兼容，仅在需要执行时使用）
 */
function getNodeInstance(type: string): BaseNode | undefined {
  return getCoreNodeByType(type) || getBrowserNodeByType(type);
}

/**
 * 获取动态注册的节点（来自后端）
 */
function getDynamicNodes(): NodeMetadata[] {
  return Array.from(state.value.dynamicNodes.values());
}

/**
 * 清除动态注册的节点
 */
function clearDynamicNodes() {
  // 从主映射表中移除动态节点
  state.value.dynamicNodes.forEach((_, type) => {
    state.value.metadataMap.delete(type);
  });
  state.value.dynamicNodes.clear();
}

/**
 * 节点注册表 Hooks
 */
export function useNodeRegistry() {
  // 初始化（仅在首次调用时）
  if (state.value.metadataMap.size === 0) {
    initializeRegistry();
  }

  return {
    // 状态
    state: computed(() => state.value),

    // 查询方法
    getNodeMetadata,
    getAllNodeMetadata: computed(() => getAllNodeMetadata()),
    getNodesByCategory: computed(() => getNodesByCategory()),
    searchNodes,
    getNodesByCategoryFiltered,
    hasNodeType,

    // 注册方法
    registerNode,
    registerNodes,
    clearDynamicNodes,

    // 创建方法
    createNodeData,

    // 向后兼容方法（仅在需要节点实例时使用）
    getNodeInstance,

    // 工具方法
    getDynamicNodes: computed(() => getDynamicNodes()),
  };
}
