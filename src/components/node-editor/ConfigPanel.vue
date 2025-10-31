<!-- 编辑器配置面板 - JSON 驱动 -->
<template>
  <div
    class="w-[280px] h-full bg-white flex flex-col border-r border-slate-200 overflow-hidden shadow-lg"
  >
    <!-- 面板头部 -->
    <div class="panel-header">
      <h2 class="panel-title">编辑器配置</h2>
      <div class="header-actions">
        <button @click="handleReset" class="reset-btn" title="重置配置">
          <IconReset class="w-3.5 h-3.5" />
        </button>
        <button @click="$emit('close')" class="close-btn">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 配置内容 - JSON 驱动渲染 -->
    <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div
        v-for="section in configSchema"
        :key="section.title"
        class="p-4 bg-white/90 border border-slate-200 rounded-md shadow-sm space-y-3"
      >
        <!-- 分组标题 -->
        <div
          class="flex items-center gap-1.5 pb-2 border-b border-slate-100 text-[11px] font-semibold text-slate-600 tracking-wide"
        >
          <component :is="resolveSectionIcon(section.icon)" class="shrink-0" />
          <span>{{ section.title }}</span>
        </div>

        <!-- 配置项列表 -->
        <div class="flex flex-col gap-3">
          <template v-for="item in section.items" :key="item.key">
            <!-- 复选框类型 -->
            <div v-if="item.type === 'checkbox'" class="flex flex-col">
              <label
                class="flex items-center gap-2 px-3 py-2 bg-slate-50/80 border border-slate-200 rounded-md text-[11px] text-slate-600 cursor-pointer transition-all duration-200 select-none hover:bg-slate-100 hover:border-slate-300"
              >
                <Checkbox v-model="config[item.key]" :binary="true" />
                <span>{{ item.label }}</span>
              </label>
            </div>

            <!-- 选择框类型 -->
            <div v-else-if="item.type === 'select'" class="flex flex-col">
              <label class="block mb-1 text-[11px] font-medium text-slate-600">
                {{ item.label }}
              </label>
              <Select
                v-model="config[item.key]"
                :options="item.options"
                optionLabel="label"
                optionValue="value"
              />
            </div>

            <!-- 范围滑块类型 -->
            <div v-else-if="item.type === 'range'" class="flex flex-col">
              <label class="block mb-1 text-[11px] font-medium text-slate-600">
                {{ item.label }}: {{ config[item.key] }}{{ item.unit || "" }}
              </label>
              <Slider
                v-model="config[item.key]"
                :min="item.range?.min"
                :max="item.range?.max"
                :step="item.range?.step"
                class="w-full"
              />
            </div>

            <!-- 颜色选择器类型 -->
            <div v-else-if="item.type === 'color'" class="flex flex-col">
              <label class="block mb-1 text-[11px] font-medium text-slate-600">
                {{ item.label }}
              </label>
              <div class="flex gap-2 items-center">
                <input
                  v-model="config[item.key]"
                  type="color"
                  class="w-10 h-9 p-0.5 bg-white border border-slate-200 rounded-lg cursor-pointer transition-all duration-200 hover:border-slate-300"
                />
                <InputText
                  v-model="config[item.key]"
                  type="text"
                  class="flex-1 h-10 px-3 font-mono text-xs"
                  placeholder="#000000"
                />
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue";
import { storeToRefs } from "pinia";
import { useEditorConfigStore } from "@/stores/editorConfig";
import {
  editorConfigSchema,
  type ConfigSectionIcon,
} from "@/config/editorConfig";
import Button from "@/components/common/Button.vue";
import Checkbox from "@/components/common/Checkbox.vue";
import Select from "@/components/common/Select.vue";
import InputText from "@/components/common/InputText.vue";
import Slider from "@/components/common/Slider.vue";
import IconReset from "@/icons/IconReset.vue";
import IconEdgeStyle from "@/icons/IconEdgeStyle.vue";
import IconCanvas from "@/icons/IconCanvas.vue";
import IconWidget from "@/icons/IconWidget.vue";
import IconLayout from "@/icons/IconLayout.vue";
import IconZoomRange from "@/icons/IconZoomRange.vue";

defineEmits<{
  (e: "close"): void;
}>();

const configStore = useEditorConfigStore();
const { config } = storeToRefs(configStore);
const configSchema = editorConfigSchema;

const sectionIconMap: Record<ConfigSectionIcon, Component> = {
  "edge-style": IconEdgeStyle,
  canvas: IconCanvas,
  widget: IconWidget,
  layout: IconLayout,
  "zoom-range": IconZoomRange,
};

function resolveSectionIcon(icon: ConfigSectionIcon) {
  return sectionIconMap[icon];
}

function handleReset() {
  if (confirm("确定要重置所有配置为默认值吗？")) {
    configStore.resetToDefaults();
  }
}
</script>

<style scoped>
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.reset-btn,
.close-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #6b7280;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.reset-btn:hover,
.close-btn:hover {
  background: #e5e7eb;
  color: #374151;
}
</style>
