/**
 * 编辑器配置定义
 */

export interface ConfigItem {
  /** 配置项唯一键 */
  key: string;
  /** 显示标签 */
  label: string;
  /** 配置类型 */
  type: "select" | "range" | "color" | "checkbox";
  /** 默认值 */
  defaultValue: any;
  /** 选项（用于 select） */
  options?: Array<{ label: string; value: any }>;
  /** 范围配置（用于 range） */
  range?: {
    min: number;
    max: number;
    step: number;
  };
  /** 单位（用于 range） */
  unit?: string;
  /** 描述 */
  description?: string;
}

export interface ConfigSection {
  /** 分组标题 */
  title: string;
  /** 图标标识 */
  icon: ConfigSectionIcon;
  /** 配置项列表 */
  items: ConfigItem[];
}

export type ConfigSectionIcon =
  | "edge-style"
  | "canvas"
  | "widget"
  | "layout"
  | "zoom-range";

/**
 * 编辑器配置 Schema
 */
export const editorConfigSchema: ConfigSection[] = [
  {
    title: "连接线样式",
    icon: "edge-style",
    items: [
      {
        key: "edgeType",
        label: "连线类型",
        type: "select",
        defaultValue: "default",
        options: [
          { label: "贝塞尔曲线 (Bezier)", value: "default" },
          { label: "简单贝塞尔 (Simple Bezier)", value: "simplebezier" },
          { label: "平滑阶梯 (Smooth Step)", value: "smoothstep" },
          { label: "阶梯 (Step)", value: "step" },
          { label: "直线 (Straight)", value: "straight" },
        ],
        description: "选择连接线的路径类型",
      },
      {
        key: "edgeStrokeWidth",
        label: "线条粗细",
        type: "range",
        defaultValue: 2,
        range: { min: 1, max: 8, step: 0.5 },
        unit: "px",
        description: "调整连接线的粗细",
      },
      {
        key: "edgeColor",
        label: "连线颜色",
        type: "color",
        defaultValue: "#94a3b8",
        description: "默认连接线颜色",
      },
      {
        key: "edgeSelectedColor",
        label: "选中颜色",
        type: "color",
        defaultValue: "#3b82f6",
        description: "选中时的连接线颜色",
      },
      {
        key: "edgeDragColor",
        label: "拖拽颜色",
        type: "color",
        defaultValue: "#6366f1",
        description: "拖拽创建连接时的连接线颜色",
      },
      {
        key: "edgeAnimated",
        label: "连线动画效果",
        type: "checkbox",
        defaultValue: false,
        description: "启用连接线流动动画",
      },
    ],
  },
  {
    title: "画布背景",
    icon: "canvas",
    items: [
      {
        key: "showBackground",
        label: "显示网格背景",
        type: "checkbox",
        defaultValue: true,
      },
      {
        key: "backgroundPattern",
        label: "图案类型",
        type: "select",
        defaultValue: "dots",
        options: [
          { label: "点 (Dots)", value: "dots" },
          { label: "线 (Lines)", value: "lines" },
        ],
      },
      {
        key: "backgroundGap",
        label: "网格间距",
        type: "range",
        defaultValue: 15,
        range: { min: 10, max: 30, step: 5 },
        unit: "px",
      },
      {
        key: "backgroundColor",
        label: "背景颜色",
        type: "color",
        defaultValue: "#f8fafc",
      },
      {
        key: "backgroundPatternColor",
        label: "图案颜色",
        type: "color",
        defaultValue: "#e2e8f0",
      },
    ],
  },
  {
    title: "功能组件",
    icon: "widget",
    items: [
      {
        key: "showMiniMap",
        label: "显示小地图",
        type: "checkbox",
        defaultValue: true,
        description: "在右下角显示画布缩略图",
      },
      {
        key: "showControls",
        label: "显示控制按钮",
        type: "checkbox",
        defaultValue: true,
        description: "显示缩放、适应等控制按钮",
      },
      {
        key: "snapToGrid",
        label: "吸附到网格",
        type: "checkbox",
        defaultValue: true,
        description: "节点移动时自动对齐网格",
      },
    ],
  },
  {
    title: "自动布局",
    icon: "layout",
    items: [
      {
        key: "autoLayoutDirection",
        label: "布局方向",
        type: "select",
        defaultValue: "LR",
        options: [
          { label: "水平（左 ➝ 右）", value: "LR" },
          { label: "水平（右 ➝ 左）", value: "RL" },
          { label: "垂直（上 ➝ 下）", value: "TB" },
          { label: "垂直（下 ➝ 上）", value: "BT" },
        ],
        description: "控制自动布局的主方向",
      },
      {
        key: "autoLayoutNodeSpacing",
        label: "节点纵向间距",
        type: "range",
        defaultValue: 160,
        range: { min: 10, max: 320, step: 10 },
        unit: "px",
        description: "同一列节点之间的垂直间距",
      },
      {
        key: "autoLayoutRankSpacing",
        label: "节点横向间距",
        type: "range",
        defaultValue: 240,
        range: { min: 10, max: 480, step: 10 },
        unit: "px",
        description: "不同列节点之间的水平间距",
      },
      {
        key: "autoLayoutPadding",
        label: "画布边距",
        type: "range",
        defaultValue: 120,
        range: { min: 0, max: 300, step: 10 },
        unit: "px",
        description: "整体布局与画布边缘的距离",
      },
    ],
  },
  {
    title: "缩放范围",
    icon: "zoom-range",
    items: [
      {
        key: "minZoom",
        label: "最小缩放",
        type: "range",
        defaultValue: 0.25,
        range: { min: 0.1, max: 1, step: 0.05 },
        unit: "x",
        description: "画布可缩小的最小倍数",
      },
      {
        key: "maxZoom",
        label: "最大缩放",
        type: "range",
        defaultValue: 2,
        range: { min: 1, max: 4, step: 0.5 },
        unit: "x",
        description: "画布可放大的最大倍数",
      },
    ],
  },
];
