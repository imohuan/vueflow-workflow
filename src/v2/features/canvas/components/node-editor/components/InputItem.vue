<template>
  <!-- 如果包含变量或正在拖拽变量，使用 VariableTextInput -->
  <VariableTextInput
    v-if="isDragOrHasVariable"
    :model-value="normalizeValue(modelValue)"
    :placeholder="placeholder"
    :multiline="multiline"
    :preview-mode="previewMode"
    :density="density"
    :show-border="isDraggingVariable"
    :show-tip="showTip"
    @update:model-value="handleUpdate"
  />
  <!-- 否则使用默认插槽 -->
  <slot v-else />
</template>

<script setup lang="ts">
import { computed } from "vue";
import VariableTextInput from "@/v2/components/variables-inputs/VariableTextInput.vue";
import { containsVariableReference } from "workflow-flow-nodes";

interface Props {
  /** 输入值 */
  modelValue?: string | number;
  /** 占位符 */
  placeholder?: string;
  /** 是否多行输入 */
  multiline?: boolean;
  /** 预览模式 */
  previewMode?: "top" | "bottom" | "dropdown" | "none";
  /** 密度 */
  density?: "default" | "compact";
  /** 是否正在拖拽变量 */
  isDraggingVariable?: boolean;
  /** 是否显示提示信息 */
  showTip?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "",
  multiline: false,
  previewMode: "bottom",
  density: "default",
  isDraggingVariable: false,
  showTip: true,
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

/** 判断是否包含变量或正在拖拽变量 */
const isDragOrHasVariable = computed(() => {
  const normalizedValue = normalizeValue(props.modelValue);
  return containsVariableReference(normalizedValue) || props.isDraggingVariable;
});

/** 规范化值为字符串 */
function normalizeValue(value: string | number | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

/** 处理值更新 */
function handleUpdate(value: string) {
  emit("update:modelValue", value);
}
</script>
