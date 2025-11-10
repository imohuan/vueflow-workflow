<template>
  <div class="flex items-start gap-2 bg-white">
    <!-- 左侧 Key 输入框 -->
    <div class="w-[100px] shrink-0 param-item-key">
      <label class="mb-1 block text-xs font-medium text-slate-600">
        {{ keyTitle }}
      </label>
      <n-input
        :value="paramKey"
        :placeholder="keyPlaceholder"
        size="small"
        :status="keyError ? 'error' : undefined"
        @update:value="handleKeyUpdate"
      />
      <div v-if="keyError" class="mt-1 text-xs text-red-500">
        {{ keyError }}
      </div>
    </div>

    <!-- 右侧 Value 输入框（使用 VariableTextInput） -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between">
        <label class="mb-1 block text-xs font-medium text-slate-600">
          {{ valueTitle }}
        </label>

        <!-- 删除按钮 -->
        <IconTrash
          class="h-4 w-4 text-slate-400 hover:text-red-500 active:text-red-500"
          @click="handleDelete"
        />
      </div>
      <VariableTextInput
        :model-value="value"
        :placeholder="valuePlaceholder"
        :preview-mode="previewMode"
        :density="density"
        :show-tip="false"
        @update:model-value="handleValueUpdate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { NButton, NInput } from "naive-ui";
import VariableTextInput from "@/v2/components/variables-inputs/VariableTextInput.vue";
import IconTrash from "@/icons/IconTrash.vue";

interface Props {
  paramKey: string;
  value: string;
  keyTitle?: string;
  valueTitle?: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  keyError?: string;
  showDelete?: boolean;
  previewMode?: "top" | "bottom" | "dropdown" | "none";
  density?: "default" | "compact";
}

withDefaults(defineProps<Props>(), {
  keyTitle: "参数名",
  valueTitle: "值",
  keyPlaceholder: "名称 英文",
  valuePlaceholder: "例如: {{ 节点.result.name }}",
  keyError: "",
  showDelete: true,
  previewMode: "dropdown",
  density: "default",
});

const emit = defineEmits<{
  (e: "update:param-key", value: string): void;
  (e: "update:value", value: string): void;
  (e: "delete"): void;
}>();

function handleKeyUpdate(value: string) {
  emit("update:param-key", value);
}

function handleValueUpdate(value: string) {
  emit("update:value", value);
}

function handleDelete() {
  emit("delete");
}
</script>

<style>
.param-item-key .n-input__input-el {
  height: 34px;
}
</style>
