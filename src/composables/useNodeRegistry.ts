/**
 * 节点注册表 Hooks
 *
 * ============================================================
 * 架构说明：纯元数据管理
 * ============================================================
 *
 * 📦 Worker (workflowWorker.ts)：
 *   ✅ 初始化节点注册表
 *   ✅ 执行所有工作流和单节点（统一在 Worker 中）
 *   ✅ 管理节点实例和工厂函数
 *   ✅ 提取并发送节点元数据到主线程
 *
 * 🎨 主线程 (useNodeRegistry.ts)：
 *   ✅ 接收 Worker 发来的节点元数据（纯数据，不包含实例）
 *   ✅ 提供元数据查询功能（搜索、过滤、分类）
 *   ✅ 管理动态注册的节点元数据
 *   ❌ 不再管理节点实例
 *   ❌ 不再执行节点
 *
 * ============================================================
 * 设计原则：职责单一
 * ============================================================
 *
 * 主线程只负责 UI 相关的元数据操作：
 * - 显示节点列表
 * - 搜索和过滤节点
 * - 获取节点的配置定义
 *
 * 所有执行逻辑（工作流 + 单节点）都在 Worker 中完成。
 *
 * ============================================================
 */

import { ref, computed } from "vue";
import type { PortDefinition } from "workflow-node-executor";
import type { NodeData } from "@/typings/nodeEditor";
import { useWorkflowWorker } from "./useWorkflowWorker";

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
  /** 是否已从 Worker 加载 */
  loadedFromWorker: boolean;
}

const state = ref<NodeRegistryState>({
  metadataMap: new Map(),
  dynamicNodes: new Map(),
  loadedFromWorker: false,
});

/**
 * 从 Worker 加载节点元数据（需要在 setup 上下文中调用）
 * 这是唯一的元数据来源，不再本地生成
 */
async function loadFromWorker(worker: ReturnType<typeof useWorkflowWorker>) {
  if (state.value.loadedFromWorker) {
    return;
  }

  try {
    // 等待 Worker 初始化完成
    await worker.waitForReady();

    // 清空现有数据
    state.value.metadataMap.clear();

    // 从 Worker 获取节点元数据（唯一来源）
    const metadata = worker.nodeMetadata.value;
    metadata.forEach((node) => {
      state.value.metadataMap.set(node.type, node as NodeMetadata);
    });

    state.value.loadedFromWorker = true;
    console.log(
      `[NodeRegistry] ✅ 已从 Worker 加载 ${metadata.length} 个节点元数据`
    );
  } catch (error) {
    console.error(
      "[NodeRegistry] ❌ 从 Worker 加载节点失败，这会导致节点列表为空",
      error
    );
    throw error; // 抛出错误，不回退到本地
  }
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
 * 基于元数据创建节点的初始数据
 */
function createNodeData(type: string): NodeData | null {
  const metadata = getNodeMetadata(type);
  if (!metadata) {
    return null;
  }

  // 检查是否有自定义端口
  const hasCustomInputPorts = metadata.inputs.some((input) => input.isPort);
  const hasCustomOutputPorts = metadata.outputs.some((output) => output.isPort);

  // 配置项（非端口的输入）
  const configOnlyInputs = metadata.inputs.filter((input) => !input.isPort);

  // 如果没有自定义输入端口，添加默认输入端口
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

  // 如果没有自定义输出端口，添加默认输出端口
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
    variant:
      metadata.type === "start" ||
      metadata.type === "end" ||
      metadata.type === "condition" ||
      metadata.type === "custom"
        ? metadata.type
        : "custom",
  };
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
 *
 * 职责：
 * - 从 Worker 加载节点元数据（UI 显示）
 * - 提供元数据查询接口
 * - 懒加载本地注册表（仅用于单节点执行）
 */
export function useNodeRegistry() {
  // 从 Worker 加载节点元数据（唯一来源）
  if (state.value.metadataMap.size === 0 && !state.value.loadedFromWorker) {
    try {
      // 必须在 setup 上下文中调用
      const worker = useWorkflowWorker();

      // 异步从 Worker 加载节点元数据
      loadFromWorker(worker).catch((error) => {
        console.error("[NodeRegistry] ❌ 无法从 Worker 加载节点元数据", error);
        // 不再回退到本地，因为元数据应该由 Worker 提供
      });
    } catch (error) {
      console.error(
        "[NodeRegistry] ❌ useWorkflowWorker() 必须在 setup 上下文中调用",
        error
      );
    }
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

    // 工具方法
    getDynamicNodes: computed(() => getDynamicNodes()),
  };
}
