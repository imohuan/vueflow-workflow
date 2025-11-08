/**
 * VueFlow 配置
 */

import type { DefaultEdgeOptions, ConnectionMode } from "@vue-flow/core";

/**
 * 适应视图配置选项
 */
export interface FitViewOptions {
  padding?: number;
  includeHiddenNodes?: boolean;
  duration?: number;
  maxZoom?: number;
  minZoom?: number;
}

/**
 * VueFlow 默认配置
 */
export const DEFAULT_VUEFLOW_CONFIG = {
  /** 默认缩放级别 */
  defaultZoom: 1,
  /** 最小缩放 */
  minZoom: 0.1,
  /** 最大缩放 */
  maxZoom: 4,
  /** 是否启用网格吸附 */
  snapToGrid: false,
  /** 网格间距 */
  snapGrid: [20, 20] as [number, number],
  /** 初始化时自动适应视图 */
  fitViewOnInit: true,
  /** 是否可以连接 */
  connectOnClick: true,
  /** 连接模式：loose 允许在任何地方释放连接，strict 只能连接到 handle */
  connectionMode: "strict" as ConnectionMode,
  /** 默认边类型 */
  defaultEdgeOptions: {
    type: "default",
    animated: false,
  } as DefaultEdgeOptions,
};

/**
 * 适应视图配置
 */
export const FIT_VIEW_OPTIONS: FitViewOptions = {
  padding: 0.2,
  includeHiddenNodes: false,
  duration: 300,
};

/**
 * 背景配置
 */
export const BACKGROUND_CONFIG = {
  /** 背景图案颜色 */
  patternColor: "#e5e7eb",
  /** 网格间距 */
  gap: 20,
} as const;

/**
 * 小地图配置
 */
export const MINIMAP_CONFIG = {
  /** 是否可平移 */
  pannable: true,
  /** 是否可缩放 */
  zoomable: true,
  /** 位置 */
  position: "top-right" as const,
} as const;

/**
 * 控制按钮配置
 */
export const CONTROLS_CONFIG = {
  /** 位置 */
  position: "bottom-right" as const,
  /** 是否显示缩放按钮 */
  showZoom: true,
  /** 是否显示适应视图按钮 */
  showFitView: true,
  /** 是否显示交互按钮 */
  showInteractive: true,
} as const;
