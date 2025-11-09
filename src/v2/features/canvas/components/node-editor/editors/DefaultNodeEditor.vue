<template>
  <div v-if="nodeTypeConfig && nodeTypeConfig.length > 0" class="mb-6">
    <h4
      class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"
    >
      <IconCode class="h-4 w-4" />
      节点参数
    </h4>

    <div class="space-y-4">
      <ConfigField
        v-for="field in nodeTypeConfig"
        :key="field.key"
        :field="field"
        :model-value="modelValue?.[field.key] ?? field.default"
        :is-dragging-variable="isDraggingVariable"
        @update:model-value="(val) => handleParamChange(field.key, val)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ConfigField } from "@/v2/components/ui";
import IconCode from "@/icons/IconCode.vue";
import type { ConfigField as ConfigFieldType } from "@/v2/typings/config";

interface Props {
  nodeTypeConfig: ConfigFieldType[];
  modelValue?: Record<string, any>;
  isDraggingVariable: boolean;
}

interface Emits {
  (e: "update:param", key: string, value: any): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

function handleParamChange(key: string, value: any) {
  emit("update:param", key, value);
}
</script>
