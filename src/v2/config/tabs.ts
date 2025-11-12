import type { Component } from "vue";
import IconNodeEditor from "@/icons/IconNodeEditor.vue";
import IconWidget from "@/icons/IconWidget.vue";
import IconCode from "@/icons/IconCode.vue";
import IconServer from "@/icons/IconServer.vue";
import IconSettings from "@/icons/IconSettings.vue";
import IconConfig from "@/icons/IconConfig.vue";
import IconResult from "@/icons/IconResult.vue";

/**
 * Tab 项配置接口
 */
export interface TabItem {
  /** Tab 唯一标识 */
  id: string;
  /** 显示标签 */
  label: string;
  /** 图标组件 */
  icon: Component;
  /** 角标数字（可选） */
  badge?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否仅测试环境显示 */
  testOnly?: boolean;
  /** 描述信息 */
  description?: string;
}

/**
 * 主要 Tab 配置
 */
export const mainTabs: TabItem[] = [
  {
    id: "workflows",
    label: "工作流",
    icon: IconNodeEditor,
    description: "管理和组织工作流",
  },
  {
    id: "node-library",
    label: "节点库",
    icon: IconWidget,
    description: "浏览和搜索可用节点",
  },
  {
    id: "node-config",
    label: "节点配置",
    icon: IconConfig,
    description: "配置选中节点的参数",
  },
  {
    id: "node-result-preview",
    label: "节点预览",
    icon: IconResult,
    description: "查看节点执行结果",
  },
  {
    id: "variables",
    label: "变量",
    icon: IconCode,
    description: "管理工作流变量",
  },
  {
    id: "execution-history",
    label: "执行记录",
    icon: IconServer,
    description: "查看执行历史和日志",
  },
] as const;

/**
 * 底部 Tab 配置（设置、测试等）
 */
export const bottomTabs: TabItem[] = [
  // {
  //   id: "test-menu",
  //   label: "测试菜单",
  //   icon: IconWidget,
  //   description: "开发调试工具",
  //   testOnly: true,
  // },
  {
    id: "settings",
    label: "设置",
    icon: IconSettings,
    description: "应用设置和配置",
  },
] as const;

/**
 * 所有 Tab 配置（主要 + 底部）
 */
export const allTabs = [...mainTabs, ...bottomTabs] as const;

/**
 * Tab ID 类型
 */
export type TabId = (typeof allTabs)[number]["id"];
