<script setup lang="ts">
import { computed, inject } from "vue";
import { getBezierPath, type ConnectionLineProps } from "@vue-flow/core";
import { useNodeEditorStore } from "@/stores/nodeEditor";
import {
  CTRL_CONNECT_CONTEXT_KEY,
  type CtrlConnectContextValue,
} from "@/components/node-editor/contextKeys";

// 连接线属性
const props = defineProps<ConnectionLineProps>();

const store = useNodeEditorStore();
const ctrlConnectContext = inject<CtrlConnectContextValue | null>(
  CTRL_CONNECT_CONTEXT_KEY,
  null
);

const previewCandidate = computed(() => {
  if (!ctrlConnectContext) {
    return null;
  }

  const active = ctrlConnectContext.active.value;
  const candidate = ctrlConnectContext.candidate.value;

  if (!active || !candidate || !candidate.position) {
    return null;
  }

  return candidate;
});

// 当前源/目标端口 ID（可能为 null）
const sourceHandleId = computed(() => props.sourceHandle?.id ?? null);
const targetHandleId = computed(() => props.targetHandle?.id ?? null);

// 判断连接是否有效
const isValidConnection = computed(() => {
  const candidate = previewCandidate.value;
  if (candidate) {
    return candidate.isValid;
  }

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

const sourcePoint = computed(() => {
  const candidate = previewCandidate.value;
  if (candidate && candidate.handleType === "source") {
    return candidate.position;
  }
  return { x: props.sourceX, y: props.sourceY };
});

const targetPoint = computed(() => {
  const candidate = previewCandidate.value;
  if (candidate && candidate.handleType === "target") {
    return candidate.position;
  }
  return { x: props.targetX, y: props.targetY };
});

// 计算贝塞尔曲线路径
const path = computed(() => {
  const [bezierPath] = getBezierPath({
    sourceX: sourcePoint.value.x,
    sourceY: sourcePoint.value.y,
    sourcePosition: props.sourcePosition,
    targetX: targetPoint.value.x,
    targetY: targetPoint.value.y,
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
      :cx="targetPoint.x"
      :cy="targetPoint.y"
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
