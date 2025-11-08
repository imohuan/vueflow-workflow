/**
 * 节点主题配置
 * 根据节点分类定义不同的颜色主题
 */

/** 节点主题配置 */
export interface NodeTheme {
  /** 分类名称 */
  category: string;
  /** 头部渐变色（起始） */
  headerFrom: string;
  /** 头部渐变色（结束） */
  headerTo: string;
  /** 端口颜色 */
  portColor: string;
  /** 端口边框颜色 */
  portBorder: string;
  /** 悬停时端口颜色 */
  portHoverColor: string;
  /** 选中时边框颜色 */
  selectedBorder: string;
}

/** 节点主题映射 - 与列表项颜色保持一致 */
export const NODE_THEMES: Record<string, NodeTheme> = {
  浏览器管理: {
    category: "浏览器管理",
    headerFrom: "#a855f7", // purple-500
    headerTo: "#7c3aed", // purple-600
    portColor: "#c084fc", // purple-400
    portBorder: "#a855f7", // purple-500
    portHoverColor: "#7e22ce", // purple-700
    selectedBorder: "#a855f7", // purple-500
  },
  截图和视觉: {
    category: "截图和视觉",
    headerFrom: "#3b82f6", // blue-500
    headerTo: "#2563eb", // blue-600
    portColor: "#60a5fa", // blue-400
    portBorder: "#3b82f6", // blue-500
    portHoverColor: "#1d4ed8", // blue-700
    selectedBorder: "#3b82f6", // blue-500
  },
  网络监控: {
    category: "网络监控",
    headerFrom: "#10b981", // green-500
    headerTo: "#059669", // green-600
    portColor: "#34d399", // green-400
    portBorder: "#10b981", // green-500
    portHoverColor: "#047857", // green-700
    selectedBorder: "#10b981", // green-500
  },
  内容分析: {
    category: "内容分析",
    headerFrom: "#f59e0b", // amber-500
    headerTo: "#d97706", // amber-600
    portColor: "#fbbf24", // amber-400
    portBorder: "#f59e0b", // amber-500
    portHoverColor: "#b45309", // amber-700
    selectedBorder: "#f59e0b", // amber-500
  },
  交互操作: {
    category: "交互操作",
    headerFrom: "#ec4899", // pink-500
    headerTo: "#db2777", // pink-600
    portColor: "#f472b6", // pink-400
    portBorder: "#ec4899", // pink-500
    portHoverColor: "#be185d", // pink-700
    selectedBorder: "#ec4899", // pink-500
  },
  数据管理: {
    category: "数据管理",
    headerFrom: "#6366f1", // indigo-500
    headerTo: "#4f46e5", // indigo-600
    portColor: "#818cf8", // indigo-400
    portBorder: "#6366f1", // indigo-500
    portHoverColor: "#4338ca", // indigo-700
    selectedBorder: "#6366f1", // indigo-500
  },
  高级功能: {
    category: "高级功能",
    headerFrom: "#f43f5e", // rose-500
    headerTo: "#e11d48", // rose-600
    portColor: "#fb7185", // rose-400
    portBorder: "#f43f5e", // rose-500
    portHoverColor: "#be123c", // rose-700
    selectedBorder: "#f43f5e", // rose-500
  },
  流程控制: {
    category: "流程控制",
    headerFrom: "#f59e0b", // amber-500
    headerTo: "#d97706", // amber-600
    portColor: "#fbbf24", // amber-400
    portBorder: "#f59e0b", // amber-500
    portHoverColor: "#b45309", // amber-700
    selectedBorder: "#f59e0b", // amber-500
  },
  数据处理: {
    category: "数据处理",
    headerFrom: "#8b5cf6", // violet-500
    headerTo: "#7c3aed", // violet-600
    portColor: "#a78bfa", // violet-400
    portBorder: "#8b5cf6", // violet-500
    portHoverColor: "#6d28d9", // violet-700
    selectedBorder: "#8b5cf6", // violet-500
  },
} as const;

/**
 * 获取节点主题
 * @param category - 节点分类
 * @returns 主题配置
 */
export function getNodeTheme(category: string): NodeTheme {
  return (
    NODE_THEMES[category] || {
      category: "默认",
      headerFrom: "#64748b", // slate-500
      headerTo: "#475569", // slate-600
      portColor: "#94a3b8", // slate-400
      portBorder: "#64748b", // slate-500
      portHoverColor: "#334155", // slate-700
      selectedBorder: "#64748b", // slate-500
    }
  );
}
