/**
 * 节点解析器
 * 负责根据节点类型获取节点执行函数和元数据
 */

import type { BaseFlowNode, PortConfig, NodeExecutionContext } from "../BaseFlowNode";
import type { NodeMetadata, NodeExecuteFunction } from "./types";

/**
 * 节点解析器接口
 */
export interface INodeResolver {
  /**
   * 根据类型获取节点执行函数
   * @param type - 节点类型
   * @returns 节点执行函数
   */
  resolve(type: string): NodeExecuteFunction;

  /**
   * 根据类型获取节点实例
   * @param type - 节点类型
   * @returns 节点实例
   */
  resolveInstance(type: string): BaseFlowNode;

  /**
   * 获取节点元数据
   * @param type - 节点类型
   * @returns 节点元数据
   */
  getMetadata(type: string): NodeMetadata;

  /**
   * 获取节点代码（用于预览）
   * @param type - 节点类型
   * @returns 节点代码字符串
   */
  getCode(type: string): string | undefined;

  /**
   * 检查节点类型是否已注册
   * @param type - 节点类型
   * @returns 是否已注册
   */
  hasNode(type: string): boolean;

  /**
   * 获取所有已注册的节点类型
   * @returns 节点类型列表
   */
  getAllTypes(): string[];
}

/**
 * 默认节点解析器实现
 * 基于 NODE_CLASS_REGISTRY 创建节点实例并执行
 */
export class DefaultNodeResolver implements INodeResolver {
  /**
   * 节点类注册表
   * 从外部注入，通常是 NODE_CLASS_REGISTRY
   */
  private registry: Record<string, new () => BaseFlowNode>;

  /**
   * 元数据缓存
   */
  private metadataCache: Map<string, NodeMetadata> = new Map();

  constructor(registry: Record<string, new () => BaseFlowNode>) {
    this.registry = registry;
  }

  /**
   * 获取节点类
   */
  private getNodeClass(type: string): new () => BaseFlowNode {
    const NodeClass = this.registry[type];
    if (!NodeClass) {
      throw new Error(`未知的节点类型: ${type}`);
    }
    return NodeClass;
  }

  /**
   * 根据类型获取节点实例
   */
  resolveInstance(type: string): BaseFlowNode {
    const NodeClass = this.getNodeClass(type);
    return new NodeClass();
  }

  /**
   * 根据类型获取节点执行函数
   */
  resolve(type: string): NodeExecuteFunction {
    const NodeClass = this.getNodeClass(type);

    // 返回一个包装函数，调用节点的 execute 方法
    return async (
      inputs: Record<string, any>,
      context: Record<string, any>
    ): Promise<Record<string, any>> => {
      const instance = new NodeClass();

      // 执行节点，直接传入完整的 context（包含 nodeId, nodeData, executeContainer 等）
      // context 应包含 NodeExecutionContext 的所有必需属性
      const result = await instance.execute(inputs, context as NodeExecutionContext);

      // 返回输出数据
      return result.outputs || {};
    };
  }

  /**
   * 获取节点元数据
   */
  getMetadata(type: string): NodeMetadata {
    if (this.metadataCache.has(type)) {
      return this.metadataCache.get(type)!;
    }

    const NodeClass = this.getNodeClass(type);
    const instance = new NodeClass();
    const metadata = instance.getMetadata();

    // 转换为标准的 NodeMetadata 格式
    const normalized: NodeMetadata = {
      type: instance.type,
      label: metadata.label,
      description: metadata.description,
      inputs: instance.getInputs().map((input: PortConfig) => ({
        name: input.name,
        label: input.description || input.name,
        type: input.type || "any",
        required: input.required,
      })),
      outputs: instance.getOutputs().map((output: PortConfig) => ({
        name: output.name,
        label: output.description || output.name,
        type: output.type || "any",
      })),
      category: metadata.category,
      icon: metadata.style?.icon,
    };

    this.metadataCache.set(type, normalized);
    return normalized;
  }

  /**
   * 获取节点代码（用于预览）
   */
  getCode(type: string): string | undefined {
    try {
      const NodeClass = this.getNodeClass(type);
      const instance = new NodeClass();
      // 获取 execute 方法的源代码
      return instance.execute.toString();
    } catch (error) {
      console.error(`获取节点代码失败 [${type}]:`, error);
      return undefined;
    }
  }

  /**
   * 检查节点类型是否已注册
   */
  hasNode(type: string): boolean {
    return type in this.registry;
  }

  /**
   * 获取所有已注册的节点类型
   */
  getAllTypes(): string[] {
    return Object.keys(this.registry);
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.metadataCache.clear();
  }
}

/**
 * 创建默认节点解析器
 * @param registry - 节点类注册表
 * @returns 节点解析器实例
 */
export function createNodeResolver(
  registry: Record<string, new () => BaseFlowNode>
): INodeResolver {
  return new DefaultNodeResolver(registry);
}
