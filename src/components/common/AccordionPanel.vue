<!-- 纯 Tailwind CSS 手风琴面板组件 -->
<template>
  <div class="border border-slate-200 rounded-lg overflow-hidden bg-white">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { provide } from "vue";

interface Props {
  /** 面板的唯一标识值 */
  value: string;
}

const props = defineProps<Props>();

// 向子组件提供面板值
provide("accordionPanelValue", props.value);
</script>
