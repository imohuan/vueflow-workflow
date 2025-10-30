<template>
  <NodeWrapper v-bind="props" custom-handles>
    <template
      #custom-handles="{ getPortHoverClass, handlePortHover, handlePortLeave }"
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
        @mouseenter="handlePortHover(nextOutput.id, false)"
        @mouseleave="handlePortLeave(nextOutput.id)"
      />
    </template>

    <template #default>
      <div
        v-if="(props.data.inputs?.length ?? 0) > 0"
        class="flex flex-col gap-1.5"
      >
        <div v-for="input in props.data.inputs" :key="input.id">
          <div v-if="input.type === 'boolean'" class="space-y-1" @click.stop>
            <div class="flex items-center justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div
                  class="text-[10px] font-medium text-slate-700 truncate"
                  :title="input.name"
                >
                  {{ input.name }}
                  <span v-if="input.required" class="text-red-500">*</span>
                </div>
              </div>
              <button
                @click="
                  toggleBoolean(
                    input.id,
                    isVariableBound(props.data.config?.[input.id])
                  )
                "
                :disabled="isVariableBound(props.data.config?.[input.id])"
                :class="[
                  'relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1',
                  props.data.config?.[input.id]
                    ? 'bg-purple-600'
                    : 'bg-slate-300',
                  isVariableBound(props.data.config?.[input.id])
                    ? 'opacity-60 cursor-not-allowed'
                    : '',
                ]"
                role="switch"
                :aria-checked="props.data.config?.[input.id]"
                :title="
                  isVariableBound(props.data.config?.[input.id])
                    ? '已绑定变量，请在配置面板中编辑'
                    : undefined
                "
              >
                <span
                  :class="[
                    'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                    props.data.config?.[input.id]
                      ? 'translate-x-3.5'
                      : 'translate-x-0.5',
                  ]"
                />
              </button>
            </div>
            <div
              v-if="isVariableBound(props.data.config?.[input.id])"
              class="flex items-center gap-1 text-[10px] text-purple-500"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              已绑定变量，请在配置面板中编辑
            </div>
          </div>

          <div v-else class="space-y-0.5">
            <div class="flex items-center justify-between gap-1">
              <div
                class="text-[10px] font-medium text-slate-700 truncate"
                :title="input.name"
              >
                {{ input.name }}
                <span v-if="input.required" class="text-red-500">*</span>
              </div>
              <div class="text-[9px] text-slate-400 font-mono">
                {{ input.type }}
              </div>
            </div>

            <div @click.stop>
              <div
                v-if="isVariableBound(props.data.config?.[input.id])"
                class="mb-1 flex items-center gap-1 text-[10px] text-purple-500"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                已绑定变量，请在配置面板中编辑
              </div>
              <input
                v-if="input.type === 'string'"
                :value="props.data.config?.[input.id] || ''"
                :readonly="isVariableBound(props.data.config?.[input.id])"
                @input="
                  updateConfig(
                    input.id,
                    ($event.target as HTMLInputElement).value
                  )
                "
                :placeholder="`请输入${input.name}`"
                :class="[
                  'w-full text-[10px] px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent',
                  isVariableBound(props.data.config?.[input.id])
                    ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                    : '',
                ]"
              />

              <input
                v-else-if="input.type === 'number'"
                :value="props.data.config?.[input.id] || ''"
                :readonly="isVariableBound(props.data.config?.[input.id])"
                @input="
                  updateConfig(
                    input.id,
                    Number(($event.target as HTMLInputElement).value)
                  )
                "
                type="number"
                :placeholder="`请输入${input.name}`"
                :class="[
                  'w-full text-[10px] px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent',
                  isVariableBound(props.data.config?.[input.id])
                    ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                    : '',
                ]"
              />

              <textarea
                v-else-if="input.type === 'object' || input.type === 'array'"
                :value="formatJsonValue(props.data.config?.[input.id])"
                :readonly="isVariableBound(props.data.config?.[input.id])"
                @input="updateJsonConfig(input.id, $event)"
                :placeholder="`请输入 JSON 格式的${input.name}`"
                :class="[
                  'w-full text-[10px] p-1.5 border border-slate-200 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent font-mono leading-relaxed',
                  isVariableBound(props.data.config?.[input.id])
                    ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                    : '',
                ]"
                rows="3"
              />

              <input
                v-else
                :value="String(props.data.config?.[input.id] || '')"
                :readonly="isVariableBound(props.data.config?.[input.id])"
                @input="
                  updateConfig(
                    input.id,
                    ($event.target as HTMLInputElement).value
                  )
                "
                :placeholder="`请输入${input.name}`"
                :class="[
                  'w-full text-[10px] px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus-border-transparent',
                  isVariableBound(props.data.config?.[input.id])
                    ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                    : '',
                ]"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center text-slate-400 py-4 text-[10px] italic">
        此节点无需配置
      </div>
    </template>
  </NodeWrapper>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import type { NodeData } from "@/typings/nodeEditor";
import NodeWrapper from "./NodeWrapper.vue";
import { useNodeConfig } from "./useNodeConfig";
import { PORT_STYLE } from "../ports";

interface Props {
  id: string;
  data: NodeData;
  selected?: boolean;
}

const props = defineProps<Props>();

const {
  updateConfig,
  formatJsonValue,
  updateJsonConfig,
  isVariableBound,
  toggleBoolean,
} = useNodeConfig(props);

const forInput = computed(
  () => props.data.inputs?.find((item) => item.id === "items") || null
);
const loopOutput = computed(
  () => props.data.outputs?.find((item) => item.id === "loop") || null
);
const nextOutput = computed(
  () => props.data.outputs?.find((item) => item.id === "next") || null
);
</script>

<style scoped>
/* 组件特定样式（如果需要） */
</style>
