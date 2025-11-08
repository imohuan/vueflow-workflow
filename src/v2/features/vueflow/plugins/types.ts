/**
 * VueFlow 插件类型定义
 * 专注于功能扩展，而非基础组件封装
 */

import type { VueFlowStore, Edge, Node } from "@vue-flow/core";
import type { ComputedRef, Ref } from "vue";
import type { useVueFlowCore } from "../core/useVueFlowCore";
import type {
  ConnectCandidateState,
  ConnectionState,
} from "./ctrlConnectPlugin";

/**
 * Ctrl 连接插件共享状态
 */
export interface CtrlConnectSharedState {
  /**
   * 是否处于激活状态（Ctrl 连接指令生效，插件监听事件并响应吸附）
   */
  isActive: ComputedRef<boolean>;
  /**
   * 当前吸附的连接候选信息（如有吸附，则为目标节点及端口等信息，未吸附则为 null）
   */
  candidate: Ref<ConnectCandidateState | null>;
  /**
   * 当前连接的起点信息，包括节点 ID、端口 ID、端口类型（source/target）
   */
  connectionState: Ref<ConnectionState>;
}

/**
 * 边编辑插件共享状态
 */
export interface EdgeEditSharedState {
  /** 是否正在编辑边 */
  isEditing: Ref<string | null>;
  /** 正在编辑的边 ID */
  editingEdgeId: Ref<string | null>;
  /** 原始边信息 */
  originalEdge: Ref<Edge | null>;
  /** 标记边更新成功（供其他插件调用） */
  markUpdateSuccessful: () => void;
}

/**
 * 插件共享状态
 * 用于插件暴露状态供其他插件或组件访问
 */
export interface PluginSharedState {
  /** Ctrl 连接插件共享状态 */
  "ctrl-connect"?: CtrlConnectSharedState;
  /** 边编辑插件共享状态 */
  "edge-edit"?: EdgeEditSharedState;
  /** 其他插件的共享状态 */
  [pluginId: string]: any;
}

/**
 * 插件上下文
 * 提供给插件访问画布状态和方法的接口
 */
export interface PluginContext {
  /** VueFlow 核心 API（来自 useVueFlowCore） */
  core: ReturnType<typeof useVueFlowCore>;
  /** VueFlow API（来自 useVueFlow） */
  vueflow: VueFlowStore;
  /** 插件共享状态（用于插件之间以及插件与组件之间的状态共享） */
  shared: PluginSharedState;
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
  beforeNodeAdd?: (context: PluginContext, node: Node) => boolean | void;
  /** 节点添加后调用 */
  afterNodeAdd?: (context: PluginContext, node: Node) => void;
  /** 节点删除前调用，返回 false 可阻止删除 */
  beforeNodeDelete?: (context: PluginContext, nodeId: string) => boolean | void;
  /** 节点删除后调用 */
  afterNodeDelete?: (context: PluginContext, nodeId: string) => void;
  /** 边删除前调用，返回 false 可阻止删除 */
  beforeEdgeDelete?: (context: PluginContext, edgeId: string) => boolean | void;
  /** 边删除后调用 */
  afterEdgeDelete?: (context: PluginContext, edgeId: string) => void;
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
