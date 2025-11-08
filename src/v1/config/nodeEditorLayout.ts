/**
 * 节点编辑器布局配置
 */
export const nodeEditorLayoutConfig = {
  /**
   * 循环容器默认尺寸与结构配置
   */
  containerDefaults: {
    /** 默认宽度 */
    width: 360,
    /** 默认高度 */
    height: 240,
    /** 标题栏高度 */
    headerHeight: 48,
    /** 内容区域内边距 */
    padding: {
      top: 24,
      right: 24,
      bottom: 24,
      left: 24,
    },
  },
  /**
   * 子节点预估尺寸（用于计算容器扩容）
   */
  childEstimate: {
    width: 320,
    height: 160,
  },
} as const;

export type NodeEditorLayoutConfig = typeof nodeEditorLayoutConfig;
export type ContainerPaddingConfig =
  NodeEditorLayoutConfig["containerDefaults"]["padding"];
