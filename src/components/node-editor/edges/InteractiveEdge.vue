<template>
  <g class="vue-flow__edge-custom" :class="{ 'edge-active': isActive }">
    <!-- 可见的细路径 - 只负责显示 -->
    <path
      :id="id"
      class="vue-flow__edge-path-visual"
      :d="path"
      :marker-end="markerEnd"
      :style="visualPathStyle"
    />

    <!-- 透明的宽路径 - 负责交互（hover + 拖拽） -->
    <path
      :d="path"
      :class="[
        'vue-flow__edge-path vue-flow__edge-interaction',
        { 'edge-non-interactive': isLoopContainerEdge },
      ]"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    />

    <!-- 删除按钮 - 使用 foreignObject 在 SVG 中嵌入 HTML -->
    <foreignObject
      v-if="Number.isFinite(labelX) && Number.isFinite(labelY) && isHovered"
      :x="labelX - 16"
      :y="labelY - 16"
      width="32"
      height="32"
      class="edgebutton-foreignobject"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <div
        :class="[
          'flex items-center justify-center w-full h-full transition-all duration-200',
          isHovered || selected
            ? 'opacity-100 pointer-events-auto scale-100'
            : 'opacity-0 pointer-events-none scale-50',
        ]"
        xmlns="http://www.w3.org/1999/xhtml"
      >
        <button
          type="button"
          class="group relative flex items-center justify-center w-8 h-8 bg-transparent text-red-500 cursor-pointer transition-all duration-200 ease-out hover:scale-110 active:scale-100 focus:outline-none"
          @click="handleDelete"
          @mousedown="handleMouseDown"
        >
          <IconTrash
            class="w-4 h-4 transition-transform duration-200 group-hover:scale-110"
          />
        </button>
      </div>
    </foreignObject>
  </g>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
  Position,
  type EdgeProps,
} from "@vue-flow/core";
import { useNodeEditorStore } from "@/stores/nodeEditor";
import IconTrash from "@/icons/IconTrash.vue";

type EdgeVariant =
  | "default"
  | "simplebezier"
  | "smoothstep"
  | "step"
  | "straight";

type InteractiveEdgeProps = EdgeProps & {
  variant: EdgeVariant;
};

const props = defineProps<InteractiveEdgeProps>();
const store = useNodeEditorStore();

// 控制删除按钮显示
const isHovered = ref(false);

// 判断是否是 loopContainer 相关的连接线
const isLoopContainerEdge = computed(() => {
  const sourceNode = store.nodes.find((node) => node.id === props.source);
  const targetNode = store.nodes.find((node) => node.id === props.target);
  return (
    sourceNode?.type === "loopContainer" || targetNode?.type === "loopContainer"
  );
});

// 判断边是否处于激活状态（执行中）
const isActive = computed(() => {
  return (props as any).data?.isActive || false;
});

const pathResult = computed(() => {
  const common = {
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
  };

  switch (props.variant) {
    case "simplebezier":
      return getSimpleBezierPath({
        ...common,
        sourcePosition: props.sourcePosition ?? Position.Bottom,
        targetPosition: props.targetPosition ?? Position.Top,
      });
    case "smoothstep":
      return getSmoothStepPath({
        ...common,
        sourcePosition: props.sourcePosition ?? Position.Bottom,
        targetPosition: props.targetPosition ?? Position.Top,
        borderRadius: (props as any).borderRadius,
        offset: (props as any).offset,
      });
    case "step":
      return getSmoothStepPath({
        ...common,
        sourcePosition: props.sourcePosition ?? Position.Bottom,
        targetPosition: props.targetPosition ?? Position.Top,
        borderRadius: 0,
        offset: (props as any).offset,
      });
    case "straight":
      return getStraightPath(common);
    case "default":
    default:
      return getBezierPath({
        ...common,
        sourcePosition: props.sourcePosition ?? Position.Bottom,
        targetPosition: props.targetPosition ?? Position.Top,
        curvature: (props as any).curvature,
      });
  }
});

const path = computed(() => pathResult.value?.[0] ?? "");
const labelX = computed(() => pathResult.value?.[1]);
const labelY = computed(() => pathResult.value?.[2]);

// 箭头标记
const markerEnd = computed(() => props.markerEnd);

// 可见路径的样式
const visualPathStyle = computed(() => {
  const strokeWidth = props.style?.strokeWidth || 2;
  return {
    stroke: props.style?.stroke || "#b1b1b7",
    strokeWidth:
      typeof strokeWidth === "number" ? `${strokeWidth}px` : strokeWidth,
    fill: "none",
  };
});

function handleDelete(event: MouseEvent) {
  event.stopPropagation();
  event.preventDefault();
  store.removeEdge(props.id);
}

function handleMouseDown(event: MouseEvent) {
  event.stopPropagation();
  event.preventDefault();
}

function handleMouseEnter() {
  // 禁止 loopContainer 相关的连接线显示删除按钮
  if (isLoopContainerEdge.value) return;
  isHovered.value = true;
}

function handleMouseLeave() {
  isHovered.value = false;
}
</script>

<style scoped>
/* 可见的边路径 - 只负责显示 */
.vue-flow__edge-path-visual {
  pointer-events: none; /* 关键：不响应鼠标事件 */
  transition: stroke 0.2s, stroke-width 0.2s;
}

/* 透明的宽路径 - 负责 hover 和拖拽交互 */
.vue-flow__edge-interaction {
  stroke: transparent !important;
  /* stroke: rgba(250, 38, 38, 0.3) !important; */
  stroke-width: 20 !important; /* 宽度决定了触发区域的大小 */
  fill: none;
  cursor: pointer;
}

/* loopContainer 连接线不可交互 */
.edge-non-interactive {
  cursor: default !important;
  pointer-events: none !important;
}

/* Hover 状态 - 加粗可见路径 */
.vue-flow__edge-custom:hover .vue-flow__edge-path-visual {
  stroke: #6366f1;
  stroke-width: 3px;
}

/* loopContainer 连接线不响应 hover */
.vue-flow__edge-custom:has(.edge-non-interactive):hover
  .vue-flow__edge-path-visual {
  stroke: #b1b1b7;
  stroke-width: 2px;
}

/* foreignObject 不响应事件，避免阻止边的拖拽 */
.edgebutton-foreignobject {
  overflow: visible;
  pointer-events: none;
}

/* 只有按钮响应事件 */
.edgebutton-foreignobject button {
  pointer-events: all;
}

/* ==================== 边激活状态动画 ==================== */

/* 激活状态的边 - 使用流动动画（快速过渡效果） */
.edge-active .vue-flow__edge-path-visual {
  stroke: #10b981 !important;
  stroke-width: 3px !important;
  stroke-dasharray: 8 4;
  animation: edge-flow 0.5s linear infinite;
}

@keyframes edge-flow {
  from {
    stroke-dashoffset: 12;
  }
  to {
    stroke-dashoffset: 0;
  }
}
</style>
