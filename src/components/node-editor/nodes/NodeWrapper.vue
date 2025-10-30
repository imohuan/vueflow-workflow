<template>
  <div
    :class="[
      'min-w-[280px] max-w-[400px] bg-white border-2 rounded-md shadow-lg cursor-pointer text-sm overflow-visible backdrop-blur-xl transition-all duration-300 ease-out',
      'border-slate-200 hover:shadow-xl',
    ]"
    :style="{
      borderColor: isSelected ? nodeTheme.selectedBorder : undefined,
      boxShadow: isSelected
        ? `0 0 0 1px ${nodeTheme.selectedBorder}25`
        : undefined,
    }"
    @click="handleClick"
    @dblclick.stop="handleDoubleClick"
  >
    <div
      class="flex items-center justify-between gap-2 px-3 py-2 text-white font-semibold relative overflow-hidden rounded-t-xl"
      :style="{
        background: `linear-gradient(to bottom right, ${nodeTheme.headerFrom}, ${nodeTheme.headerTo})`,
      }"
    >
      <div
        class="absolute inset-0 bg-linear-to-br from-white/10 to-transparent pointer-events-none"
      ></div>
      <div class="flex-1 text-[9px] tracking-wide relative z-10 truncate">
        {{ data.label || "节点" }}
      </div>
      <div class="flex items-center gap-1.5 relative z-10">
        <button
          class="w-[22px] h-[22px] flex items-center justify-center bg-white/95 hover:bg-white border-none rounded-md cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105"
          :style="{ color: nodeTheme.headerFrom }"
          @click.stop="handleExecute"
          title="执行节点"
        >
          <IconPlay />
        </button>
        <button
          class="w-[22px] h-[22px] flex items-center justify-center bg-white/15 border-none rounded-md text-white text-base cursor-pointer transition-all duration-200 backdrop-blur-xl hover:bg-white/25 hover:scale-105"
          @click.stop="handleDelete"
          title="删除节点"
        >
          ×
        </button>
      </div>
    </div>

    <div class="relative">
      <slot
        name="handles"
        :data="data"
        :getPortHoverClass="getPortHoverClass"
        :handlePortHover="handlePortHover"
        :handlePortLeave="handlePortLeave"
        :getHandleStyle="getHandleStyle"
      >
        <template v-if="!props.customHandles">
          <Handle
            v-for="(port, inputIndex) in inputPorts"
            :key="`input-${port.id}`"
            :id="port.id"
            type="target"
            :position="Position.Left"
            :is-connectable="true"
            :class="[
              'port-input',
              PORT_STYLE.ellipse,
              getPortHoverClass(port.id),
            ]"
            :style="getHandleStyle(inputIndex, inputPorts.length, 'input')"
            @mouseenter="handlePortHover(port.id, true)"
            @mouseleave="handlePortLeave(port.id)"
          />

          <Handle
            v-for="(port, outputIndex) in outputPorts"
            :key="`output-${port.id}`"
            :id="port.id"
            type="source"
            :position="Position.Right"
            :is-connectable="true"
            :class="[
              'port-output',
              PORT_STYLE.ellipse,
              getPortHoverClass(port.id),
            ]"
            :style="getHandleStyle(outputIndex, outputPorts.length, 'output')"
            @mouseenter="handlePortHover(port.id, false)"
            @mouseleave="handlePortLeave(port.id)"
          />
        </template>
        <template v-else>
          <slot
            name="custom-handles"
            :Handle="Handle"
            :Position="Position"
            :data="data"
            :getPortHoverClass="getPortHoverClass"
            :handlePortHover="handlePortHover"
            :handlePortLeave="handlePortLeave"
            :getHandleStyle="getHandleStyle"
          />
        </template>
      </slot>

      <div
        ref="contentRef"
        :class="[
          'p-3 min-h-[80px] bg-linear-to-b from-slate-50 to-white',
          data.result ? '' : 'rounded-b-xl',
        ]"
      >
        <slot />
      </div>

      <NodeResult
        v-if="data.result"
        :result="data.result"
        :expanded="data.resultExpanded"
        @toggle="handleToggleResult"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Handle, Position } from "@vue-flow/core";
import type { NodeData } from "@/typings/nodeEditor";
import { useNodeEditorStore } from "@/stores/nodeEditor";
import IconPlay from "@/icons/IconPlay.vue";
import NodeResult from "../NodeResult.vue";
import { getNodeTheme } from "@/config/nodeTheme";
import { PORT_STYLE } from "../ports";
import { usePortPositionUpdate } from "./usePortPositionUpdate";

interface Props {
  id: string;
  data: NodeData;
  selected?: boolean;
  customHandles?: boolean;
  customGetHandleStyle?: (
    index: number,
    total: number,
    portType: "input" | "output"
  ) => Record<string, string>;
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  customHandles: false,
});

const store = useNodeEditorStore();
const contentRef = ref<HTMLDivElement | null>(null);

const nodeTheme = computed(() => getNodeTheme(props.data.category || ""));

const isSelected = computed(() =>
  props.selected !== undefined
    ? props.selected
    : store.selectedNodeId === props.id
);

const inputPorts = computed(() =>
  (props.data.inputs ?? []).filter((port) => port.isPort === true)
);
const outputPorts = computed(() =>
  (props.data.outputs ?? []).filter((port) => port.isPort === true)
);

// 端口数量
const inputPortsCount = computed(() => inputPorts.value.length);
const outputPortsCount = computed(() => outputPorts.value.length);

// 使用端口位置更新 Hook
usePortPositionUpdate({
  nodeId: props.id,
  watchSource: [inputPortsCount, outputPortsCount],
});

const hoveredPortId = ref<string | null>(null);
const isHoveredPortValid = ref<boolean>(true);

function handleClick() {
  store.selectNode(props.id);
}

function handleDoubleClick() {
  store.openNodeEditor(props.id);
}

function handleDelete() {
  store.removeNode(props.id);
}

function handleExecute() {
  store.executeNode(props.id);
}

function handleToggleResult(expanded: boolean) {
  store.updateNodeData(props.id, { resultExpanded: expanded });
}

function handlePortHover(portId: string, _isInput: boolean) {
  hoveredPortId.value = portId;

  const isConnecting = (window as any).__isConnecting?.();
  if (!isConnecting) {
    isHoveredPortValid.value = true;
    return;
  }

  const checkValidity = (window as any).__checkPortValidity;
  if (checkValidity) {
    isHoveredPortValid.value = checkValidity(props.id, portId);
  }
}

function handlePortLeave(portId: string) {
  if (hoveredPortId.value === portId) {
    hoveredPortId.value = null;
    isHoveredPortValid.value = true;
  }
}

function getPortHoverClass(portId: string): string {
  if (hoveredPortId.value !== portId) return "";

  const isConnecting = (window as any).__isConnecting?.();
  if (!isConnecting) return "";

  return isHoveredPortValid.value ? "port-valid-target" : "port-invalid-target";
}

function getHandleStyle(
  index: number,
  total: number,
  portType: "input" | "output"
): Record<string, string> {
  // 如果提供了自定义的 getHandleStyle，则使用自定义的
  if (props.customGetHandleStyle) {
    const style = props.customGetHandleStyle(index, total, portType);
    if (Object.keys(style).length > 0) {
      return style;
    }
  }

  // 默认实现
  if (total <= 1) {
    const height = contentRef.value?.offsetHeight || 200;
    return {
      top: `${height / 2}px !important`,
    };
  }
  const step = 100 / (total + 1);
  const top = (index + 1) * step;
  return {
    top: `${top}% !important`,
  };
}
</script>

<style scoped>
/* 组件特定样式（如果需要） */
</style>
