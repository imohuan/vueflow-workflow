<template>
  <g class="vue-flow__edge-custom">
    <!-- 边的可见路径 -->
    <path
      :id="id"
      class="vue-flow__edge-path-visual"
      :d="pathData"
      :marker-end="markerEnd"
    />

    <!-- 透明的宽路径，用于扩大 hover 区域和拖拽触发 -->
    <path
      :d="pathData"
      class="vue-flow__edge-path vue-flow__edge-interaction"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    />

    <!-- Hover 时显示的删除按钮 -->
    <foreignObject
      v-if="isHovered"
      :width="40"
      :height="40"
      :x="edgeCenterX - 20"
      :y="edgeCenterY - 20"
      class="edgebutton-foreignobject"
      requiredExtensions="http://www.w3.org/1999/xhtml"
    >
      <div class="flex items-center justify-center w-full h-full">
        <button
          @click="onDelete"
          class="w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg cursor-pointer transition-all duration-200 hover:scale-110"
          title="删除连接线"
        >
          <IconClose class="w-4 h-4" />
        </button>
      </div>
    </foreignObject>
  </g>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useVueFlow, type EdgeProps, getBezierPath } from "@vue-flow/core";
import IconClose from "@/icons/IconClose.vue";

const props = defineProps<EdgeProps>();

const isHovered = ref(false);

const { removeEdges } = useVueFlow();

// 计算边的路径
const path = computed(() =>
  getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  })
);

// 提取路径字符串，确保响应式
const pathData = computed(() => path.value[0]);

// 计算边的中心点（用于放置删除按钮）
const edgeCenterX = computed(() => {
  const [, labelX] = path.value;
  return labelX ?? 0;
});

const edgeCenterY = computed(() => {
  const [, , labelY] = path.value;
  return labelY ?? 0;
});

// 箭头标记
const markerEnd = computed(() => props.markerEnd);

// 删除边
const onDelete = () => {
  removeEdges([props.id]);
};
</script>

<style scoped>
/* 可见的边路径 - 只负责显示 */
.vue-flow__edge-path-visual {
  stroke: #b1b1b7;
  stroke-width: 2;
  fill: none;
  pointer-events: none;
}

/* 透明的宽路径 - 负责 hover 和拖拽交互 */
.vue-flow__edge-interaction {
  stroke: transparent;
  stroke-width: 20;
  fill: none;
  cursor: pointer;
}

/* Hover 状态 */
.vue-flow__edge-custom:hover .vue-flow__edge-path-visual {
  stroke: #6366f1;
  stroke-width: 3;
}

.edgebutton-foreignobject {
  overflow: visible;
  pointer-events: none;
}

.edgebutton-foreignobject button {
  pointer-events: all;
}
</style>
