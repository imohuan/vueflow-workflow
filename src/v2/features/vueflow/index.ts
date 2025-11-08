/**
 * VueFlow 功能模块统一导出
 */

// 事件系统
export * from "./events";

// 核心逻辑
export { useVueFlowCore } from "./core/useVueFlowCore";
export {
  DEFAULT_VUEFLOW_CONFIG,
  FIT_VIEW_OPTIONS,
  BACKGROUND_CONFIG,
  MINIMAP_CONFIG,
  CONTROLS_CONFIG,
} from "./core/vueflowConfig";

// 插件系统
export * from "./plugins";

// 组件
export { default as VueFlowCanvas } from "./components/VueFlowCanvas.vue";
