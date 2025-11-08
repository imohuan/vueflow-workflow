/**
 * @vicons/ionicons5 类型声明
 */
declare module "@vicons/ionicons5" {
  import type { Component } from "vue";

  export const SearchOutline: Component;
  export const PlayCircleOutline: Component;
  export const GitNetworkOutline: Component;
  export const GitCompareOutline: Component;
  export const RefreshCircleOutline: Component;
  export const CreateOutline: Component;
  export const ConstructOutline: Component;
  export const BarChartOutline: Component;
}

/**
 * 自定义图标类型声明
 */
declare module "@/icons/*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
