/**
 * 节点注册表管理器
 * 负责初始化和管理所有节点类型
 */

import { BrowserNodeRegistry } from "workflow-browser-nodes";
import {
  CoreNodeRegistry,
  type BaseNode,
  type NodeRegistry,
} from "workflow-node-executor";
import type { NodeMetadata } from "./types.js";

export class NodeRegistryManager {
  private nodeRegistries: NodeRegistry[];
  private nodeTypeMap: Map<string, BaseNode>;

  constructor() {
    this.nodeRegistries = [new CoreNodeRegistry(), new BrowserNodeRegistry()];
    this.nodeTypeMap = new Map();
  }

  /**
   * 初始化节点注册表
   */
  initialize(): void {
    console.log("[NodeRegistry] 正在初始化节点注册表...");

    this.nodeRegistries.forEach((registry) => {
      const nodes = registry.getAllNodes();
      nodes.forEach((node: BaseNode) => {
        this.nodeTypeMap.set(node.type, node);
      });
    });

    console.log(`[NodeRegistry] ✅ 已加载 ${this.nodeTypeMap.size} 个节点`);
  }

  /**
   * 获取节点实例（节点工厂函数）
   */
  getNodeByType(type: string): BaseNode | undefined {
    return this.nodeTypeMap.get(type);
  }

  /**
   * 提取所有节点元数据
   */
  extractAllNodeMetadata(): NodeMetadata[] {
    const metadata: NodeMetadata[] = [];

    this.nodeTypeMap.forEach((node) => {
      const nodeData = node.createNodeData();
      metadata.push({
        type: node.type,
        label: node.label,
        description: node.description,
        category: node.category,
        inputs: nodeData.inputs,
        outputs: nodeData.outputs,
        defaultConfig: nodeData.config,
      });
    });

    return metadata;
  }

  /**
   * 获取节点数量
   */
  getNodeCount(): number {
    return this.nodeTypeMap.size;
  }

  /**
   * 检查节点类型是否存在
   */
  hasNodeType(type: string): boolean {
    return this.nodeTypeMap.has(type);
  }
}
