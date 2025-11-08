<!-- 纯 Tailwind CSS 手风琴容器组件 -->
<template>
  <div class="space-y-2">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { provide, ref, watch, type Ref } from "vue";

interface Props {
  /** v-model 绑定值（展开的面板值数组或单个值） */
  value?: string[] | string | undefined;
  /** 是否允许多个面板同时展开 */
  multiple?: boolean;
}

interface Emits {
  (e: "update:value", value: string[] | string | undefined): void;
}

const props = withDefaults(defineProps<Props>(), {
  value: undefined,
  multiple: false,
});

const emit = defineEmits<Emits>();

// 内部状态：当前展开的面板
const expandedPanels: Ref<string[]> = ref([]);

// 初始化展开状态
watch(
  () => props.value,
  (newValue) => {
    if (newValue === undefined) {
      expandedPanels.value = [];
    } else if (Array.isArray(newValue)) {
      expandedPanels.value = newValue;
    } else {
      expandedPanels.value = [newValue];
    }
  },
  { immediate: true }
);

// 切换面板展开状态
function togglePanel(panelValue: string) {
  if (props.multiple) {
    // 多选模式
    const index = expandedPanels.value.indexOf(panelValue);
    if (index > -1) {
      expandedPanels.value.splice(index, 1);
    } else {
      expandedPanels.value.push(panelValue);
    }
    emit("update:value", [...expandedPanels.value]);
  } else {
    // 单选模式
    if (expandedPanels.value.includes(panelValue)) {
      expandedPanels.value = [];
      emit("update:value", undefined);
    } else {
      expandedPanels.value = [panelValue];
      emit("update:value", panelValue);
    }
  }
}

// 检查面板是否展开
function isPanelExpanded(panelValue: string): boolean {
  return expandedPanels.value.includes(panelValue);
}

// 向子组件提供方法
provide("accordion", {
  togglePanel,
  isPanelExpanded,
});
</script>
