<template>
  <g class="custom-edge" :class="{ selected: props.selected }">
    <!-- 边路径 -->
    <path
      :id="props.id"
      :d="path"
      fill="none"
      :stroke="edgeColor"
      :stroke-width="edgeWidth"
      :class="{ animated: isAnimated }"
      class="edge-path"
    />

    <!-- 空心箭头 -->
    <path
      :d="arrowPath"
      fill="none"
      :stroke="edgeColor"
      :stroke-width="2"
      stroke-linejoin="miter"
      class="edge-arrow"
    />
  </g>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { EdgeProps } from "@vue-flow/core";
import {
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
} from "@vue-flow/core";
import { useEditorConfigStore } from "@/newCode/stores/editorConfig";
import { storeToRefs } from "pinia";

const props = defineProps<EdgeProps>();

// 获取编辑器配置
const editorConfigStore = useEditorConfigStore();
const { config } = storeToRefs(editorConfigStore);

// 边颜色
const edgeColor = computed(() => {
  if (props.selected) {
    return config.value.edgeActiveColor;
  }
  return props.style?.stroke || config.value.edgeColor;
});

// 边宽度
const edgeWidth = computed(() => {
  return props.style?.strokeWidth || config.value.edgeWidth;
});

// 是否有动画
const isAnimated = computed(() => {
  return props.animated ?? config.value.edgeAnimation;
});

// 计算边路径
const pathResult = computed(() => {
  const edgeType = props.type || config.value.edgeType;

  const params = {
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  };

  if (edgeType === "straight") {
    return getStraightPath(params);
  } else if (edgeType === "step" || edgeType === "smoothstep") {
    return getSmoothStepPath(params);
  } else {
    // 默认使用贝塞尔曲线
    return getBezierPath(params);
  }
});

// 边路径
const path = computed(() => pathResult.value[0]);

// 箭头大小
const arrowSize = 12;

// 计算箭头路径（在终点绘制空心三角形箭头）
const arrowPath = computed(() => {
  if (typeof document === "undefined") {
    return "";
  }

  const pathValue = path.value;
  if (!pathValue) {
    return "";
  }

  const svgPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  svgPath.setAttribute("d", pathValue);

  const totalLength = svgPath.getTotalLength();
  if (!Number.isFinite(totalLength) || totalLength === 0) {
    return "";
  }

  const tipPoint = svgPath.getPointAtLength(totalLength);
  const backPoint = svgPath.getPointAtLength(
    Math.max(totalLength - arrowSize, 0)
  );

  const angle = Math.atan2(tipPoint.y - backPoint.y, tipPoint.x - backPoint.x);
  const arrowAngle = Math.PI / 6; // 30 度

  const tipX = tipPoint.x;
  const tipY = tipPoint.y;

  const leftX = tipX - arrowSize * Math.cos(angle - arrowAngle);
  const leftY = tipY - arrowSize * Math.sin(angle - arrowAngle);

  const rightX = tipX - arrowSize * Math.cos(angle + arrowAngle);
  const rightY = tipY - arrowSize * Math.sin(angle + arrowAngle);

  return `M ${leftX} ${leftY} L ${tipX} ${tipY} L ${rightX} ${rightY}`;
});
</script>

<style scoped>
.edge-path {
  transition: stroke 0.2s ease;
}

.edge-arrow {
  transition: stroke 0.2s ease;
}

.animated {
  stroke-dasharray: 5;
  animation: edge-dash 0.5s linear infinite;
}

@keyframes edge-dash {
  from {
    stroke-dashoffset: 10;
  }
  to {
    stroke-dashoffset: 0;
  }
}

/* 选中状态 */
.custom-edge.selected .edge-path,
.custom-edge.selected .edge-arrow {
  stroke: v-bind("config.edgeActiveColor");
}
</style>
