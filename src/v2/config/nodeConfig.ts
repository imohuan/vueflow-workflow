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
 * 容器节点配置（For 循环容器）
 */
export const CONTAINER_CONFIG = {
  /** 容器标题栏高度 */
  headerHeight: 32,
  /** 容器内边距 */
  padding: {
    top: 30,
    right: 80,
    bottom: 30,
    left: 80,
  },
  /** 容器最小宽度 */
  minWidth: 400,
  /** 容器最小高度 */
  minHeight: 200,
} as const;

/**
 * 分组节点容器配置
 */
export const GROUP_CONTAINER_CONFIG = {
  /** 分组标题栏高度（沿用普通节点标题高度） */
  headerHeight: NODE_SIZE.headerHeight,
  /** 分组容器内边距（顶部为正文与标题之间的额外留白） */
  padding: {
    top: 16,
    right: 24,
    bottom: 24,
    left: 24,
  },
  /** 分组容器最小宽度 */
  minWidth: 200,
  /** 分组容器最小高度 */
  minHeight: 200,
  /** 分组节点刷新 parent 关系的延迟（毫秒） */
  syncDelay: 150,
} as const;

// --------------------------下面是么有被使用的
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
 * 节点状态颜色配置
 */
export const NODE_STATUS_COLORS = {
  pending: "#e2e8f0",
  running: "#fef3c7",
  success: "#ffffff",
  error: "#fecaca",
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
