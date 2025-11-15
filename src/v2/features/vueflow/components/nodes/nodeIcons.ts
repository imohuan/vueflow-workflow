import type { Component } from "vue";

// 导入所有节点图标组件
import IconGlobe from "@/icons/IconGlobe.vue";
import IconEdit from "@/icons/IconEdit.vue";
import IconStop from "@/icons/IconStop.vue";
import IconClock from "@/icons/IconClock.vue";
import IconAI from "@/icons/IconAI.vue";
import IconQuestion from "@/icons/IconQuestion.vue";
import IconPackage from "@/icons/IconPackage.vue";
import IconEye from "@/icons/IconEye.vue";
import IconImage from "@/icons/IconImage.vue";
import IconCode from "@/icons/IconCode.vue";
import IconStart from "@/icons/IconStart.vue";
import IconRepeat from "@/icons/IconRepeat.vue";

/**
 * 节点图标名称到组件的映射
 */
export const nodeIconMap: Record<string, Component> = {
  // HTTP 请求
  "http-request": IconGlobe,
  globe: IconGlobe,

  // 文本处理
  "text-process": IconEdit,
  edit: IconEdit,

  // 结束节点
  end: IconStop,
  stop: IconStop,

  // 延迟节点
  delay: IconClock,
  clock: IconClock,

  // AI 大模型
  openaiLlm: IconAI,
  "openai-llm": IconAI,
  ai: IconAI,

  // 条件判断
  if: IconQuestion,
  question: IconQuestion,

  // 变量聚合
  variableAggregate: IconPackage,
  "variable-aggregate": IconPackage,
  package: IconPackage,

  // 数据预览
  dataPreview: IconEye,
  "data-preview": IconEye,
  eye: IconEye,

  // 图片预览
  preview: IconImage,
  image: IconImage,

  // 笔记节点
  note: IconEdit,

  // 代码执行
  code: IconCode,

  // 开始节点
  start: IconStart,

  // 批处理/循环
  for: IconRepeat,
  repeat: IconRepeat,
};

/**
 * 根据图标名称获取对应的组件
 * @param iconName 图标名称
 * @returns 图标组件，如果未找到则返回 null
 */
export function getNodeIcon(iconName: string): Component | null {
  if (!iconName || typeof iconName !== "string") {
    return null;
  }

  return nodeIconMap[iconName] || null;
}
