<!--
单个条件项组件
左侧：运算符下拉框
中间：两个输入框（上下布局）
右侧：删除按钮
-->
<template>
  <div class="flex items-center gap-2">
    <!-- 运算符选择下拉框 -->
    <div class="shrink-0 pt-0.5">
      <CascadedSelect
        v-model="localCondition.operator"
        :options="operatorOptions"
        :groups="dataTypeGroups"
        @change="handleOperatorChange"
        trigger-class="operator-trigger"
        placeholder="="
      />
    </div>

    <!-- 中间：两个输入框上下布局 -->
    <div class="flex-1 flex flex-col gap-2 min-w-0">
      <!-- 上：字段输入框 -->
      <div class="w-full">
        <VariableTextInput
          preview-mode="dropdown"
          :model-value="normalizeOperand(localCondition.field)"
          @update:model-value="handleFieldChange"
          placeholder="开始 - input"
          class="field-input"
        />
      </div>

      <!-- 下：值输入框（带 str/ 标签） -->
      <div v-if="needsValue(localCondition.operator)" class="w-full">
        <div class="flex items-center gap-1.5 w-full">
          <VariableTextInput
            preview-mode="dropdown"
            :model-value="normalizeOperand(localCondition.value)"
            @update:model-value="handleValueChange"
            placeholder="输入或引用参数值"
            class="value-input"
          />
        </div>
      </div>
    </div>

    <!-- 右侧：删除按钮 -->
    <div class="shrink-0 pt-0.5">
      <button
        v-if="showDelete"
        @click="$emit('delete')"
        class="w-7 h-7 p-0 text-gray-400 bg-transparent border border-gray-200 rounded-md cursor-pointer flex items-center justify-center transition-all duration-150 hover:text-red-500 hover:bg-red-50 hover:border-red-200"
        title="删除条件"
      >
        <IconMinus class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
  SubCondition,
  ConditionOperand,
  OperatorType,
} from "workflow-flow-nodes";
import { OPERATOR_LABELS, OPERATORS_BY_TYPE } from "workflow-flow-nodes";
import VariableTextInput from "@/v2/components/variables-inputs/VariableTextInput.vue";
import CascadedSelect from "@/v2/components/common/CascadedSelect.vue";
import type {
  CascadedOption,
  OptionGroup,
} from "@/v2/components/common/CascadedSelect.vue";
import IconMinus from "@/icons/IconMinus.vue";

interface Props {
  condition: SubCondition;
  showDelete?: boolean;
}

interface Emits {
  (e: "update:condition", value: SubCondition): void;
  (e: "delete"): void;
}

const props = withDefaults(defineProps<Props>(), {
  showDelete: false,
});

const emit = defineEmits<Emits>();

// 本地条件副本
const localCondition = computed(() => props.condition);

// 数据类型分组
const dataTypeGroups = computed<OptionGroup[]>(() => [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date & Time" },
  { value: "boolean", label: "Boolean" },
  { value: "array", label: "Array" },
  { value: "object", label: "Object" },
]);

// 操作符符号映射
const operatorSymbols: Partial<Record<OperatorType, string>> = {
  "is equal to": "=",
  "is not equal to": "≠",
  contains: "⊃",
  "does not contain": "⊅",
  "starts with": "^",
  "ends with": "$",
  "is greater than": ">",
  "is less than": "<",
  "is greater than or equal to": "≥",
  "is less than or equal to": "≤",
  exists: "?",
  "does not exist": "∅",
  "is empty": "␀",
  "is not empty": "!␀",
  "is true": "✓",
  "is false": "✗",
};

// 操作符选项
const operatorOptions = computed<CascadedOption[]>(() => {
  const options: CascadedOption[] = [];
  Object.entries(OPERATORS_BY_TYPE).forEach(([dataType, operators]) => {
    operators.forEach((operator) => {
      options.push({
        value: operator,
        label: OPERATOR_LABELS[operator],
        displayLabel: operatorSymbols[operator] || OPERATOR_LABELS[operator],
        group: dataType,
        title: OPERATOR_LABELS[operator],
      });
    });
  });
  return options;
});

// 规范化操作数
function normalizeOperand(operand: ConditionOperand): string | number {
  if (operand === null || operand === undefined) {
    return "";
  }
  if (typeof operand === "string" || typeof operand === "number") {
    return operand;
  }
  return String(operand);
}

// 判断是否需要值输入
function needsValue(operator: OperatorType): boolean {
  const noValueOps: OperatorType[] = [
    "exists",
    "does not exist",
    "is empty",
    "is not empty",
    "is true",
    "is false",
  ];
  return !noValueOps.includes(operator);
}

// 处理运算符变化
function handleOperatorChange() {
  emit("update:condition", { ...localCondition.value });
}

// 处理字段变化
function handleFieldChange(value: string) {
  emit("update:condition", {
    ...localCondition.value,
    field: value as any,
  });
}

// 处理值变化
function handleValueChange(value: string) {
  emit("update:condition", {
    ...localCondition.value,
    value: value as any,
  });
}
</script>

<style scoped>
@import "@/v2/style.css";

/* 运算符下拉框样式 */
:deep(.operator-trigger) {
  @apply px-2 py-1 text-[13px] min-h-7 min-w-[50px] border border-gray-300 rounded-md bg-white;
  @apply flex items-center justify-start cursor-pointer transition-all duration-150;
}

:deep(.operator-trigger:hover) {
  @apply border-gray-400;
}

/* 字段输入框样式 */
:deep(.field-input .variable-editor) {
  @apply min-h-7 max-h-7 text-[13px] px-2.5 py-1 border border-gray-300 rounded-md bg-white;
  @apply transition-all duration-150 w-full;
}

:deep(.field-input .variable-editor:hover) {
  @apply border-gray-400;
}

:deep(.field-input .variable-editor:focus) {
  @apply border-blue-500 outline-none ring-2 ring-blue-100;
}

:deep(.field-input .variable-editor:empty::before) {
  @apply text-gray-400 text-[13px];
}

/* 值输入框样式 */
:deep(.value-input) {
  @apply flex-1 min-w-0;
}

:deep(.value-input .variable-editor) {
  @apply min-h-7 max-h-7 text-[13px] px-2.5 py-1 border border-gray-300 rounded-md bg-white;
  @apply transition-all duration-150 w-full;
}

:deep(.value-input .variable-editor:hover) {
  @apply border-gray-400;
}

:deep(.value-input .variable-editor:focus) {
  @apply border-blue-500 outline-none ring-2 ring-blue-100;
}

:deep(.value-input .variable-editor:empty::before) {
  @apply text-gray-400 text-[13px];
}

/* 隐藏提示文本 */
:deep(.field-input p),
:deep(.value-input p) {
  @apply hidden;
}

:deep(.field-input button svg),
:deep(.value-input button svg) {
  @apply w-3.5 h-3.5;
}
</style>
