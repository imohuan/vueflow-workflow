/**
 * 节点配置
 * 统一管理节点的尺寸、样式等配置
 */

/**
 * 节点尺寸配置
 */
export const NODE_SIZE = {
  /** 节点最小宽度 */
  minWidth: 200,
  /** 节点默认宽度 */
  defaultWidth: 200,
  /** 节点最大宽度 */
  maxWidth: 400,

  /** 节点顶部标题高度（padding 10px * 2 + 文字高度约18px） */
  headerHeight: 30,
  /** 节点内容区域最小高度 */
  contentMinHeight: 50,

  /** 图标size */
  iconSize: 10,

  /** 节点边框宽度 */
  borderWidth: 2,
  /** 节点圆角半径 */
  borderRadius: 8,
} as const;

/**
 * 节点间距配置
 */
export const NODE_SPACING = {
  /** 标题内边距 */
  headerPadding: {
    vertical: 2,
    horizontal: 12,
  },
  /** 内容内边距 */
  contentPadding: 12,
  /** 图标和文字间距 */
  iconGap: 8,
} as const;

/**
 * 节点颜色配置
 */
export const NODE_COLORS = {
  /** 默认节点颜色 */
  default: "#3b82f6",
  /** 边框颜色（未选中） */
  border: "#e5e7eb",
  /** 边框颜色（选中） */
  borderSelected: "#3b82f6",
  /** 背景颜色 */
  background: "#ffffff",
} as const;

/**
 * 节点状态颜色配置
 */
export const NODE_STATUS_COLORS = {
  pending: "#e2e8f0",
  running: "#fef3c7",
  success: "#ffffff",
  error: "#fecaca",
} as const;

/**
 * 节点端口配置
 */
export const NODE_PORT = {
  /** 端口大小 */
  size: 12,
  /** 端口边框宽度 */
  borderWidth: 2,
  /** 端口激活时的大小 */
  activeSize: 16,
} as const;

/**
 * 节点拖拽配置
 */
export const NODE_DRAG = {
  /** 拖拽时鼠标相对于节点顶部标题中心的偏移 */
  cursorOffset: {
    x: NODE_SIZE.defaultWidth / 2,
    y: NODE_SIZE.headerHeight / 2,
  },
} as const;

/**
 * 节点类型配置
 */
export const NODE_TYPES = {
  /** 自定义节点类型 */
  custom: "custom",
} as const;
