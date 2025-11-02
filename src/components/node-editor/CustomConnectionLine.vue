<script setup lang="ts">
import { computed } from "vue";
import { getBezierPath, type ConnectionLineProps } from "@vue-flow/core";
import { useNodeEditorStore } from "@/stores/nodeEditor";

// 连接线属性
const props = defineProps<ConnectionLineProps>();

const store = useNodeEditorStore();

// 当前源/目标端口 ID（可能为 null）
const sourceHandleId = computed(() => props.sourceHandle?.id ?? null);
const targetHandleId = computed(() => props.targetHandle?.id ?? null);

// 判断连接是否有效
const isValidConnection = computed(() => {
  if (props.connectionStatus) {
    return props.connectionStatus === "valid";
  }

  if (!props.targetNode || !props.targetHandle) {
    return false;
  }

  if (
    props.sourceNode.type === "loopContainer" ||
    props.targetNode.type === "loopContainer"
  ) {
    return false;
  }

  if (!targetHandleId.value) {
    return false;
  }

  return store.validateConnection({
    source: props.sourceNode.id,
    sourceHandle: sourceHandleId.value,
    target: props.targetNode.id,
    targetHandle: targetHandleId.value,
  });
});

// 根据连接有效性决定颜色
const strokeColor = computed(() =>
  isValidConnection.value ? "#22c55e" : "#ef4444"
);

// 计算贝塞尔曲线路径
const path = computed(() => {
  const [bezierPath] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  });
  return bezierPath;
});
</script>

<template>
  <g>
    <path
      :d="path"
      fill="none"
      :stroke="strokeColor"
      :stroke-width="3"
      class="animated"
    />
    <circle
      :cx="targetX"
      :cy="targetY"
      fill="#fff"
      r="3"
      :stroke="strokeColor"
      :stroke-width="2"
    />
  </g>
</template>

<style scoped>
.animated {
  stroke-dasharray: 5;
  animation: dashdraw 0.5s linear infinite;
  transition: stroke 0.2s ease;
}

@keyframes dashdraw {
  from {
    stroke-dashoffset: 10;
  }
  to {
    stroke-dashoffset: 0;
  }
}
</style>
