<!-- 编辑器配置面板 - JSON 驱动 -->
<template>
  <div
    class="w-[340px] h-full bg-white/95 backdrop-blur flex flex-col border-l border-slate-200 overflow-hidden"
  >
    <!-- 面板头部 -->
    <div
      class="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white/90"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex items-center justify-center w-9 h-9 bg-linear-to-br from-purple-500 to-purple-700 rounded-md text-white shadow-sm"
        >
          <IconConfig />
        </div>
        <h3 class="m-0 text-base font-semibold text-slate-800 tracking-wide">
          编辑器配置
        </h3>
      </div>
      <Button
        severity="secondary"
        variant="outlined"
        size="small"
        class="gap-2 px-3 py-1.5 text-xs"
        @click="handleReset"
      >
        <IconReset />
        <span>重置</span>
      </Button>
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
import IconConfig from "@/icons/IconConfig.vue";
import IconReset from "@/icons/IconReset.vue";
import IconEdgeStyle from "@/icons/IconEdgeStyle.vue";
import IconCanvas from "@/icons/IconCanvas.vue";
import IconWidget from "@/icons/IconWidget.vue";
import IconLayout from "@/icons/IconLayout.vue";
import IconZoomRange from "@/icons/IconZoomRange.vue";

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
