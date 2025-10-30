<template>
  <g>
    <path
      :d="pathData"
      class="vue-flow__connection-path"
      :marker-end="markerEnd"
    />
  </g>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { getBezierPath, type ConnectionLineProps } from "@vue-flow/core";

const props = defineProps<ConnectionLineProps>();

// 计算连接线的路径
const pathData = computed(() => {
  const [path] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  });
  return path;
});

// 箭头标记
const markerEnd = computed(() => "url(#vue-flow__arrowclosed)");
</script>

<style scoped>
.vue-flow__connection-path {
  stroke: #6366f1;
  stroke-width: 2;
  fill: none;
}
</style>
