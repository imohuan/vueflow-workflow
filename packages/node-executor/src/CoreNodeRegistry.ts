/**
 * 核心节点注册表类
 * 管理所有核心节点实例的加载和访问
 * 核心节点包括：start, end, if, for
 */

import type { BaseNode } from "./BaseNode.ts";
import { NodeRegistry } from "./NodeRegistry.ts";
import { StartNode } from "./nodes/StartNode.ts";
import { EndNode } from "./nodes/EndNode.ts";
import { IfNode } from "./nodes/IfNode.ts";
import { ForNode } from "./nodes/ForNode.ts";

/**
 * 核心节点注册表
 * 按分类组织所有核心节点（内部使用）
 */
const CORE_NODE_REGISTRY = {
  /** 流程控制 */
  flow: {
    start: new StartNode(),
    end: new EndNode(),
    if: new IfNode(),
    for: new ForNode(),
  },
} as const;

/**
 * 构建节点类型映射表
 */
function buildNodeTypeMap(): Record<string, BaseNode> {
  const map: Record<string, BaseNode> = {};
  Object.values(CORE_NODE_REGISTRY).forEach((category) => {
    Object.values(category).forEach((node) => {
      map[node.type] = node;
    });
  });
  return map;
}

/**
 * 核心节点注册表类
 * 继承自 NodeRegistry，提供核心节点的专用注册表
 */
export class CoreNodeRegistry extends NodeRegistry {
  /**
   * 创建核心节点注册表实例
   * @param nodes - 可选的节点映射表，如果不提供则使用默认的 CORE_NODE_REGISTRY 构建
   */
  constructor() {
    super(buildNodeTypeMap());
  }
}
