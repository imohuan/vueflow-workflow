<template>
  <NodeWrapper v-bind="props" custom-handles>
    <template
      #custom-handles="{
        getPortHoverClass,
        handlePortHover,
        handlePortLeave,
        getHandleStyle,
      }"
    >
      <Handle
        v-if="forInput"
        :id="forInput.id"
        type="target"
        :position="Position.Left"
        :is-connectable="true"
        :class="[
          'port-input',
          PORT_STYLE.ellipse,
          getPortHoverClass(forInput.id),
        ]"
        :style="getHandleStyle(0, 1, 'input')"
        @mouseenter="handlePortHover(forInput.id, true)"
        @mouseleave="handlePortLeave(forInput.id)"
      />

      <Handle
        v-if="loopOutput"
        :id="loopOutput.id"
        type="source"
        :position="Position.Bottom"
        :is-connectable="false"
        :connectable="false"
        :class="[PORT_STYLE.circle, 'for-node-loop']"
      />

      <Handle
        v-if="nextOutput"
        :id="nextOutput.id"
        type="source"
        :position="Position.Right"
        :is-connectable="true"
        :class="[
          'port-output',
          PORT_STYLE.ellipse,
          getPortHoverClass(nextOutput.id),
        ]"
        :style="getHandleStyle(0, 1, 'output')"
        @mouseenter="handlePortHover(nextOutput.id, false)"
        @mouseleave="handlePortLeave(nextOutput.id)"
      />
    </template>

    <template #default>
      <div class="flex flex-col gap-2 py-1">
        <!-- 配置预览 -->
        <div class="p-2 bg-slate-50 border border-slate-200 rounded-md">
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <span
              class="text-[10px] font-semibold text-slate-600 uppercase tracking-wide"
            >
              {{ modeName }}
            </span>
            <span class="text-[9px] text-slate-400 font-mono">
              {{ config.itemName }}, {{ config.indexName }}
            </span>
          </div>

          <div
            class="flex flex-wrap items-center gap-1 text-[11px] text-slate-500"
          >
            <template v-if="config.mode === 'variable'">
              <span v-if="!config.variable" class="text-slate-400 italic">
                请配置变量
              </span>
              <template v-else>
                <span>循环</span>
                <VariableBadge :value="config.variable" size="default" />
              </template>
            </template>

            <template v-else-if="config.mode === 'range'">
              <span>范围:</span>
              <VariableBadge
                v-if="isVariableValue(config.range?.start)"
                :value="String(config.range?.start ?? 0)"
                size="default"
              />
              <span v-else class="font-mono font-semibold text-slate-700">
                {{ config.range?.start ?? 0 }}
              </span>

              <span>~</span>

              <VariableBadge
                v-if="isVariableValue(config.range?.end)"
                :value="String(config.range?.end ?? 10)"
                size="default"
              />
              <span v-else class="font-mono font-semibold text-slate-700">
                {{ config.range?.end ?? 10 }}
              </span>

              <span
                v-if="(config.range?.step ?? 1) !== 1"
                class="text-slate-400"
              >
                (步长: {{ config.range?.step }})
              </span>
            </template>
          </div>
        </div>

        <div class="hidden text-[10px] text-slate-400 text-center">
          点击节点打开配置面板
        </div>
      </div>
    </template>
  </NodeWrapper>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import type { NodeData } from "@/typings/nodeEditor";
import type { ForConfig } from "workflow-node-executor";
import NodeWrapper from "./NodeWrapper.vue";
import VariableBadge from "@/components/common/VariableBadge.vue";
import { PORT_STYLE } from "../ports";

interface Props {
  id: string;
  data: NodeData;
  selected?: boolean;
}

const props = defineProps<Props>();

const config = computed(() => {
  const cfg = props.data.config as ForConfig | undefined;
  return (
    cfg || {
      mode: "variable" as const,
      variable: "",
      range: { start: 0, end: 10, step: 1 },
      itemName: "item",
      indexName: "index",
    }
  );
});

const modeName = computed(() => {
  return config.value.mode === "variable" ? "变量循环" : "范围循环";
});

const forInput = computed(
  () => props.data.inputs?.find((item) => item.id === "items") || null
);
const loopOutput = computed(
  () => props.data.outputs?.find((item) => item.id === "loop") || null
);
const nextOutput = computed(
  () => props.data.outputs?.find((item) => item.id === "next") || null
);

/**
 * 检测值是否为变量引用
 */
function isVariableValue(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  return /^\{\{.+\}\}$/.test(value.trim());
}
</script>

<style scoped>
/* 组件特定样式（如果需要） */
</style>
