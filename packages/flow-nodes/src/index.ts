import { BaseFlowNode } from "./BaseFlowNode";
import type {
  NodeDataType,
  PortConfig,
  NodeStyleConfig,
  NodeExecutionContext,
  NodeExecutionResult,
} from "./BaseFlowNode";

export { BaseFlowNode };
export type {
  NodeDataType,
  PortConfig,
  NodeStyleConfig,
  NodeExecutionContext,
  NodeExecutionResult,
};

// 从 types.ts 导出类型（排除与 executor 冲突的）
export type {
  NodeType,
  NodeRegistration,
  INodeFactory,
  INodeExecutor,
  NodeConnection,
  NodeInstanceConfig,
  WorkflowGraph,
  NodeExecutionRecord,
  WorkflowExecutionLog,
} from "./types";

// 导出 Executor 模块（会导出自己的 NodeExecutionStatus）
export * from "./executor";

// 使用 import.meta.glob 动态导入所有节点文件
const nodeModules = import.meta.glob<Record<string, any>>("./nodes/*.ts", {
  eager: true,
});

/**
 * 节点类注册表
 * 用于根据类型字符串创建节点实例
 */
export const NODE_CLASS_REGISTRY: Record<string, new () => BaseFlowNode> = {};

// 自动注册所有节点类
for (const path in nodeModules) {
  const module = nodeModules[path];
  // 遍历模块中导出的所有类
  for (const key in module) {
    const exported = module[key];
    // 检查是否为类（构造函数）
    if (typeof exported === "function" && exported.prototype) {
      try {
        const instance = new exported();
        // 检查是否有 type 属性（BaseFlowNode 的实例）
        if (instance && typeof instance.type === "string") {
          NODE_CLASS_REGISTRY[instance.type] =
            exported as new () => BaseFlowNode;
        }
      } catch (e) {
        // 跳过无法实例化的导出
      }
    }
  }
}

/**
 * 节点工厂函数
 * @param type - 节点类型
 * @returns 节点实例
 */
export function createNodeInstance(type: string): BaseFlowNode {
  const NodeClass = NODE_CLASS_REGISTRY[type];
  if (!NodeClass) {
    throw new Error(`未知的节点类型: ${type}`);
  }
  return new NodeClass();
}

/**
 * 获取所有已注册节点的元信息
 */
export function getAllNodeMetadata() {
  return Object.values(NODE_CLASS_REGISTRY).map((NodeClass) => {
    const instance = new NodeClass();
    return instance.getMetadata();
  });
}

/**
 * 获取所有节点类型
 */
export function getAllNodeTypes(): string[] {
  return Object.keys(NODE_CLASS_REGISTRY);
}

/**
 * 根据类型获取节点类
 * @param type - 节点类型
 * @returns 节点类或 undefined
 */
export function getNodeClass(
  type: string
): (new () => BaseFlowNode) | undefined {
  return NODE_CLASS_REGISTRY[type];
}
