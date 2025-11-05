/**
 * VueFlow 插件类型定义
 * 专注于功能扩展，而非基础组件封装
 */

import type { Node, Edge } from "@vue-flow/core";

/**
 * 插件上下文
 * 提供给插件访问画布状态和方法的接口
 */
export interface PluginContext {
  /** 节点数据 */
  nodes: Node[];
  /** 边数据 */
  edges: Edge[];
  /** 添加节点 */
  addNode: (node: Node) => void;
  /** 删除节点 */
  deleteNode: (nodeId: string) => void;
  /** 添加边 */
  addEdge: (edge: Edge) => void;
  /** 删除边 */
  deleteEdge: (edgeId: string) => void;
  /** 更新边（批量） */
  updateEdges: (updater: (edges: Edge[]) => Edge[]) => void;
  /** 清空画布 */
  clearCanvas: () => void;
  /** 适应视图 */
  fitView: () => void;
  /** 事件系统 */
  events: any;
}

/**
 * 插件配置
 */
export interface PluginConfig {
  /** 插件唯一标识 */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件描述 */
  description?: string;
  /** 是否默认启用 */
  enabled?: boolean;
  /** 插件版本 */
  version?: string;
  /** 插件作者 */
  author?: string;
}

/**
 * 插件生命周期钩子
 */
export interface PluginHooks {
  /** 插件安装时调用 */
  onInstall?: (context: PluginContext) => void;
  /** 插件卸载时调用 */
  onUninstall?: (context: PluginContext) => void;
  /** 画布初始化完成后调用 */
  onCanvasReady?: (context: PluginContext) => void;
  /** 节点添加前调用，返回 false 可阻止添加 */
  beforeNodeAdd?: (node: Node, context: PluginContext) => boolean | void;
  /** 节点添加后调用 */
  afterNodeAdd?: (node: Node, context: PluginContext) => void;
  /** 节点删除前调用，返回 false 可阻止删除 */
  beforeNodeDelete?: (nodeId: string, context: PluginContext) => boolean | void;
  /** 节点删除后调用 */
  afterNodeDelete?: (nodeId: string, context: PluginContext) => void;
}

/**
 * 插件快捷键配置
 */
export interface PluginShortcut {
  /** 快捷键组合 (如: "ctrl+c", "cmd+v") */
  key: string;
  /** 快捷键描述 */
  description: string;
  /** 快捷键处理函数 */
  handler: (context: PluginContext) => void;
}

/**
 * VueFlow 功能插件接口
 */
export interface VueFlowPlugin {
  /** 插件配置 */
  config: PluginConfig;
  /** 插件生命周期钩子 */
  hooks?: PluginHooks;
  /** 插件快捷键 */
  shortcuts?: PluginShortcut[];
  /**
   * 插件初始化方法
   * 在插件启用时调用，用于设置事件监听、初始化状态等
   */
  setup?: (context: PluginContext) => void;
  /**
   * 插件清理方法
   * 在插件禁用时调用，用于清理事件监听、重置状态等
   */
  cleanup?: (context: PluginContext) => void;
}
