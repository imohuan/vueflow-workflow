<template>
  <div
    class="loop-container relative rounded-md border bg-white shadow-sm"
    :class="[
      isHighlighted
        ? highlightType === 'warning'
          ? 'border-red-500 border-2 border-solid shadow-lg shadow-red-200 ring-2 ring-red-200'
          : 'border-indigo-500 border-2 border-solid shadow-lg shadow-indigo-200 ring-2 ring-indigo-200'
        : 'border-slate-300 border-dashed',
    ]"
    :style="{
      width: `${containerWidth}px`,
      height: `${containerHeight}px`,
    }"
  >
    <Handle
      id="loop-in"
      type="target"
      :is-connectable="false"
      :position="Position.Top"
      :connectable="false"
      :class="[PORT_STYLE.circle, 'loop-handle-top']"
    />
    <Handle
      id="loop-left"
      type="source"
      :is-connectable="true"
      :position="Position.Right"
      :class="[PORT_STYLE.ellipse, 'loop-handle-left', 'loop-handle-ellipse']"
    />
    <Handle
      id="loop-right"
      type="target"
      :is-connectable="true"
      :position="Position.Left"
      :class="[PORT_STYLE.ellipse, 'loop-handle-right', 'loop-handle-ellipse']"
    />

    <div
      class="loop-header absolute inset-x-0 top-0 px-4 py-2 border-b border-slate-200 bg-linear-to-r from-slate-100 to-white rounded-t-2xl flex items-center justify-between"
      :style="{
        height: `${headerHeight}px`,
      }"
    >
      <div class="text-[11px] font-semibold text-slate-600 tracking-wide">
        {{ data.label || "循环体" }}
      </div>
      <div class="text-[10px] text-slate-400 font-mono">
        {{ data.config?.forNodeId || "" }}
      </div>
    </div>

    <div class="loop-content" :style="contentStyle">
      <div class="loop-drop-zone min-h-[160px] rounded-md">
        <transition name="fade" mode="out-in">
          <div
            v-if="childCount === 0"
            key="empty"
            class="h-full flex flex-col items-center justify-center text-[11px] text-slate-400 gap-1 pointer-events-none"
          >
            <span>拖拽节点到此，组成循环体流程</span>
            <span class="text-[10px] text-slate-300"
              >子节点位置会在执行时按顺序运行</span
            >
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position, type Node } from "@vue-flow/core";
import { useNodeEditorStore } from "../../../stores/nodeEditor";
import type { NodeData } from "../../../typings/nodeEditor";
import { nodeEditorLayoutConfig } from "../../../config";
import { PORT_STYLE } from "../ports";

interface Props {
  id: string;
  data: NodeData & {
    width?: number;
    height?: number;
  };
}

const props = defineProps<Props>();
const store = useNodeEditorStore();

const { containerDefaults } = nodeEditorLayoutConfig;

const containerWidth = computed(
  () => props.data?.width ?? containerDefaults.width
);
const containerHeight = computed(
  () => props.data?.height ?? containerDefaults.height
);
const headerHeight = computed(
  () =>
    (props.data as any)?.config?.headerHeight ?? containerDefaults.headerHeight
);
const padding = computed(() => {
  const pad = ((props.data as any)?.config?.padding as any) || {};
  return {
    top: pad.top ?? pad.y ?? containerDefaults.padding.top,
    right: pad.right ?? pad.x ?? containerDefaults.padding.right,
    bottom: pad.bottom ?? pad.y ?? containerDefaults.padding.bottom,
    left: pad.left ?? pad.x ?? containerDefaults.padding.left,
  };
});

const contentStyle = computed(() => ({
  padding: `${padding.value.top}px ${padding.value.right}px ${padding.value.bottom}px ${padding.value.left}px`,
  paddingTop: `${headerHeight.value + padding.value.top}px`,
}));

const childCount = computed(() => {
  return store.nodes.filter(
    (node: Node<NodeData>) => node.parentNode === props.id
  ).length;
});

const data = computed(() => props.data);

const isHighlighted = computed(() => {
  return (props.data as any)?.isHighlighted ?? false;
});

const highlightType = computed(() => {
  return (props.data as any)?.highlightType ?? "normal";
});
</script>

<style scoped>
.loop-handle-top {
  top: -7px !important;
  left: 50% !important;
  z-index: 10;
  transform: translate(-50%, 0) !important;
  pointer-events: none !important;
}

.loop-handle-ellipse:hover {
  box-shadow: 0 4px 8px rgba(79, 70, 229, 0.2) !important;
}

.loop-handle-left,
.loop-handle-right {
  top: 50% !important;
}

.loop-handle-left {
  left: 0 !important;
  right: auto !important;
  transform: translate(-50%, -50%) !important;
}

.loop-handle-right {
  right: 0 !important;
  left: auto !important;
  transform: translate(50%, -50%) !important;
}

.loop-handle-left:hover {
  transform: translate(-50%, -50%) scale(1.05) !important;
}

.loop-handle-right:hover {
  transform: translate(50%, -50%) scale(1.05) !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.loop-content {
  width: 100%;
  box-sizing: border-box;
}

.loop-drop-zone {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
</style>
