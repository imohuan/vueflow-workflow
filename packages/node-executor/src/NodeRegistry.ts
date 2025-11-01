import type { BaseNode } from "./BaseNode.ts";

/**
 * 节点注册表类
 * 提供统一的节点实例访问接口
 * 可被其他包继承或直接使用
 */
export class NodeRegistry {
  /** 节点类型映射表（type -> node instance） */
  protected readonly nodeMap: Record<string, BaseNode>;

  /**
   * 创建节点注册表实例
   * @param nodes - 可选的节点映射表，如果不提供则使用空映射表
   */
  constructor(nodes?: Record<string, BaseNode>) {
    this.nodeMap = nodes ?? {};
  }

  /**
   * 获取节点实例
   * @param type - 节点类型
   * @returns 节点实例，如果不存在则返回 undefined
   */
  getNodeByType(type: string): BaseNode | undefined {
    return this.nodeMap[type];
  }

  /**
   * 获取所有节点列表
   * @returns 节点实例数组
   */
  getAllNodes(): BaseNode[] {
    return Object.values(this.nodeMap);
  }

  /**
   * 按分类获取节点
   * @returns 按分类组织的节点映射表（category -> node[]）
   */
  getNodesByCategory(): Record<string, BaseNode[]> {
    const categories: Record<string, BaseNode[]> = {};

    Object.values(this.nodeMap).forEach((node) => {
      const category = node.category;
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category]!.push(node);
    });

    return categories;
  }

  /**
   * 检查节点类型是否存在
   * @param type - 节点类型
   * @returns 是否存在
   */
  hasNodeType(type: string): boolean {
    return type in this.nodeMap;
  }

  /**
   * 获取所有节点类型列表
   * @returns 节点类型字符串数组
   */
  getAllNodeTypes(): string[] {
    return Object.keys(this.nodeMap);
  }

  /**
   * 注册新节点（用于动态扩展）
   * @param node - 节点实例
   */
  registerNode(node: BaseNode): void {
    this.nodeMap[node.type] = node;
  }

  /**
   * 批量注册节点（用于动态扩展）
   * @param nodes - 节点实例数组
   */
  registerNodes(nodes: BaseNode[]): void {
    nodes.forEach((node) => {
      this.registerNode(node);
    });
  }

  /**
   * 获取节点注册表（只读）
   * @returns 节点类型映射表的只读副本
   */
  getRegistry(): Readonly<Record<string, BaseNode>> {
    return { ...this.nodeMap };
  }
}
