<!--
条件编辑器组件
用于编辑 If 节点的条件配置
-->
<template>
  <div class="relative">
    <!-- 顶部：条件分支标题 + 添加按钮 -->
    <div class="absolute right-0 top-[-40px]">
      <button
        @click="addCondition"
        class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 active:bg-purple-200 transition-all shadow-sm hover:shadow"
      >
        <IconPlus />
        <span>新增</span>
      </button>
    </div>

    <!-- 条件列表 -->
    <div class="space-y-2">
      <div
        v-for="(condition, condIndex) in config.conditions"
        :key="condIndex"
        class="bg-linear-to-br from-white to-slate-50 border border-slate-200 rounded-md p-2 shadow-sm hover:shadow-md transition-shadow"
      >
        <!-- 条件头部：如果 + 删除按钮 -->
        <div
          class="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100"
        >
          <div class="text-sm font-semibold text-purple-700">如果</div>
          <button
            v-if="config.conditions.length > 1"
            @click="removeCondition(condIndex)"
            class="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="删除条件"
          >
            <IconMinus class="w-4 h-4" />
          </button>
        </div>

        <!-- 子条件列表 -->
        <div class="flex gap-2">
          <!-- 左侧：且/或选择器 -->
          <div class="flex flex-col w-12 items-center">
            <div class="flex-1 relative w-full min-h-[10px]">
              <div
                v-if="condition.subConditions.length > 1"
                class="absolute left-1/2 right-0 top-2 bottom-0 border-l border-t border-purple-200 rounded-tl-lg"
              ></div>
            </div>
            <Select
              v-model="condition.logic"
              :options="[
                { label: '且', value: 'and' },
                { label: '或', value: 'or' },
              ]"
              @change="updateCondition(condIndex, condition)"
              size="small"
            />
            <div class="flex-1 relative w-full min-h-[10px]">
              <div
                v-if="condition.subConditions.length > 1"
                class="absolute left-1/2 right-0 top-0 bottom-2 border-l border-b border-purple-200 rounded-bl-lg"
              ></div>
            </div>
          </div>

          <!-- 右侧：子条件行 -->
          <div class="flex-1 space-y-1.5 overflow-hidden">
            <div
              v-for="(subCond, subIndex) in condition.subConditions"
              :key="subIndex"
              class="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1.5 hover:border-purple-300 transition-colors"
            >
              <!-- 字段路径输入 -->
              <div class="flex-1 min-w-0">
                <VariableTextInput
                  preview-mode="dropdown"
                  :model-value="normalizeConditionOperand(subCond.field)"
                  @update:model-value="
                    (val) => updateSubConditionField(condIndex, subIndex, val)
                  "
                  placeholder="字段路径"
                  class="compact-editor"
                />
              </div>

              <!-- 操作符选择 -->
              <div class="shrink-0">
                <CascadedSelect
                  v-model="subCond.operator"
                  :options="operatorOptions"
                  :groups="dataTypeGroups"
                  @change="
                    () => updateSubCondition(condIndex, subIndex, subCond)
                  "
                  trigger-class="w-11 bg-white px-1 py-0.5 text-sm font-semibold text-slate-700"
                  placeholder="="
                />
              </div>

              <!-- 目标值输入 -->
              <div v-if="needsValue(subCond.operator)" class="flex-1 min-w-0">
                <VariableTextInput
                  preview-mode="dropdown"
                  :model-value="normalizeConditionOperand(subCond.value)"
                  placeholder="目标值"
                  class="compact-editor"
                  @update:model-value="
                    (val) => updateSubConditionValue(condIndex, subIndex, val)
                  "
                />
              </div>

              <!-- 删除按钮 -->
              <button
                v-if="condition.subConditions.length > 1"
                @click="removeSubCondition(condIndex, subIndex)"
                class="shrink-0 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="删除子条件"
              >
                <IconMinus class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- 新增子条件按钮 -->
            <button
              @click="addSubCondition(condIndex)"
              class="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors ml-12"
            >
              <IconPlus class="w-3 h-3" />
              <span>新增</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部：否则 -->
    <div
      class="mt-2 bg-linear-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-md px-2.5 py-2 shadow-sm"
    >
      <div class="text-sm font-semibold text-slate-600">否则</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, computed } from "vue";
import type {
  Condition,
  SubCondition,
  OperatorType,
  IfConfig,
  ConditionOperand,
} from "workflow-flow-nodes";
import { OPERATOR_LABELS, OPERATORS_BY_TYPE } from "workflow-flow-nodes";
import VariableTextInput from "@/v2/components/variables-inputs/VariableTextInput.vue";
import Select from "@/v2/components/common/Select.vue";
import CascadedSelect from "@/v2/components/common/CascadedSelect.vue";
import type {
  CascadedOption,
  OptionGroup,
} from "@/v2/components/common/CascadedSelect.vue";
import IconPlus from "@/icons/IconPlus.vue";
import IconMinus from "@/icons/IconMinus.vue";

interface Props {
  modelValue: IfConfig;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "update:modelValue", value: IfConfig): void;
}>();

// 使用响应式对象管理配置
const config = reactive<IfConfig>({
  conditions:
    props.modelValue.conditions && props.modelValue.conditions.length >= 1
      ? props.modelValue.conditions
      : [createDefaultCondition()],
});

// 监听外部变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(config)) {
      config.conditions =
        newValue.conditions && newValue.conditions.length >= 1
          ? newValue.conditions
          : [createDefaultCondition()];
    }
  },
  { deep: true }
);

// 数据类型分组配置
const dataTypeGroups = computed<OptionGroup[]>(() => [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date & Time" },
  { value: "boolean", label: "Boolean" },
  { value: "array", label: "Array" },
  { value: "object", label: "Object" },
]);

// 操作符符号映射（用于按钮显示）
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
  "is before": "<",
  "is after": ">",
  "is before or equal to": "≤",
  "is after or equal to": "≥",
  "length equal to": "len=",
  "length not equal to": "len≠",
  "length greater than": "len>",
  "length less than": "len<",
  "length greater than or equal to": "len≥",
  "length less than or equal to": "len≤",
};

// 操作符选项配置
const operatorOptions = computed<CascadedOption[]>(() => {
  const options: CascadedOption[] = [];

  // 为每个数据类型生成选项
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

// 创建默认条件
function createDefaultCondition(): Condition {
  return {
    logic: "and",
    subConditions: [createDefaultSubCondition()],
  };
}

// 创建默认子条件
function createDefaultSubCondition(): SubCondition {
  return {
    field: "",
    dataType: "string",
    operator: "is equal to",
    value: "",
  };
}

// 规范化 ConditionOperand 为字符串（用于 VariableTextInput）
function normalizeConditionOperand(operand: ConditionOperand): string | number {
  if (operand === null || operand === undefined) {
    return "";
  }
  if (typeof operand === "string" || typeof operand === "number") {
    return operand;
  }
  return String(operand);
}

// 添加条件
function addCondition() {
  config.conditions.push(createDefaultCondition());
  emitUpdate();
}

// 删除条件
function removeCondition(index: number) {
  if (config.conditions.length > 1) {
    config.conditions.splice(index, 1);
    emitUpdate();
  }
}

// 添加子条件
function addSubCondition(condIndex: number) {
  const condition = config.conditions[condIndex];
  if (condition) {
    condition.subConditions.push(createDefaultSubCondition());
    emitUpdate();
  }
}

// 删除子条件
function removeSubCondition(condIndex: number, subIndex: number) {
  const condition = config.conditions[condIndex];
  if (condition && condition.subConditions.length > 1) {
    condition.subConditions.splice(subIndex, 1);
    emitUpdate();
  }
}

// 更新条件
function updateCondition(index: number, condition: Condition) {
  config.conditions[index] = condition;
  emitUpdate();
}

// 更新子条件
function updateSubCondition(
  condIndex: number,
  subIndex: number,
  subCond: SubCondition
) {
  const condition = config.conditions[condIndex];
  if (condition) {
    condition.subConditions[subIndex] = subCond;
    emitUpdate();
  }
}

// 更新子条件字段
function updateSubConditionField(
  condIndex: number,
  subIndex: number,
  value: string
) {
  const condition = config.conditions[condIndex];
  if (condition && condition.subConditions[subIndex]) {
    condition.subConditions[subIndex].field = value as any;
    emitUpdate();
  }
}

// 更新子条件值
function updateSubConditionValue(
  condIndex: number,
  subIndex: number,
  value: string
) {
  const condition = config.conditions[condIndex];
  if (condition && condition.subConditions[subIndex]) {
    condition.subConditions[subIndex].value = value as any;
    emitUpdate();
  }
}

// 是否需要值输入
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

// 发送更新事件
function emitUpdate() {
  emit("update:modelValue", {
    conditions: config.conditions,
  });
}
</script>

<style scoped>
/* 紧凑型编辑器样式 */
:deep(.compact-editor) {
  margin: 0;
  padding: 0;
}

:deep(.compact-editor > div) {
  margin: 0;
}

:deep(.compact-editor .variable-editor) {
  min-height: 1.75rem;
  max-height: 1.75rem;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
}

:deep(.compact-editor .variable-editor:empty::before) {
  font-size: 0.75rem;
}

/* 隐藏紧凑编辑器中的提示文本 */
:deep(.compact-editor p) {
  display: none;
}

:deep(.compact-editor button svg) {
  width: 0.875rem;
  height: 0.875rem;
}

/* 滚动条样式 */
.condition-config-panel::-webkit-scrollbar {
  width: 6px;
}

.condition-config-panel::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.condition-config-panel::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.condition-config-panel::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
