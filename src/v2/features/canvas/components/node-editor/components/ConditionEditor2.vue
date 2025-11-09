<!--
条件编辑器组件 V2
正确的布局：左侧逻辑选择器 + 右侧条件项列表（每项包含运算符-上下输入框-删除按钮）
-->
<template>
  <div class="relative flex flex-col gap-3">
    <div class="absolute right-0 top-[-40px]">
      <n-button size="small" type="primary" ghost @click="addCondition">
        <template #icon>
          <IconPlus />
        </template>
        新增
      </n-button>
    </div>

    <!-- 如果部分列表 -->
    <div
      v-for="(condition, condIndex) in config.conditions"
      :key="condIndex"
      class="border border-gray-200 rounded-lg p-4 bg-white"
    >
      <div class="flex items-center justify-between mb-4">
        <div class="text-sm font-semibold text-gray-800">
          {{ condIndex === 0 ? "如果" : "否则如果" }}
        </div>
        <n-button
          v-if="config.conditions.length > 1"
          @click="removeConditionGroup(condIndex)"
          size="tiny"
          text
        >
          <template #icon>
            <IconMinus class="w-4 h-4" />
          </template>
        </n-button>
      </div>

      <!-- 条件列表容器：左右两列布局 -->
      <div class="flex gap-2">
        <!-- 左侧：逻辑选择器 + 连接线 -->
        <div
          class="flex flex-col w-14 items-center"
          v-if="condition.subConditions.length > 1"
        >
          <!-- 上半部分连接线 -->
          <div class="flex-1 relative w-full min-h-[10px]">
            <div
              v-if="condition.subConditions.length > 1"
              class="absolute left-1/2 right-0 top-10 bottom-0 border-l border-t border-gray-300 rounded-tl-lg"
            ></div>
          </div>

          <!-- 逻辑选择器 -->
          <Select
            v-model="condition.logic"
            :options="[
              { label: '且', value: 'and' },
              { label: '或', value: 'or' },
            ]"
            @change="updateCondition(condIndex, condition)"
            size="small"
            class="logic-select"
          />

          <!-- 下半部分连接线 -->
          <div class="flex-1 relative w-full min-h-[10px]">
            <div
              v-if="condition.subConditions.length > 1"
              class="absolute left-1/2 right-0 top-0 bottom-10 border-l border-b border-gray-300 rounded-bl-lg"
            ></div>
          </div>
        </div>

        <!-- 右侧：条件项列表 -->
        <div class="flex-1 flex flex-col gap-3 min-w-0">
          <ConditionItem
            v-for="(subCond, subIndex) in condition.subConditions"
            :key="subIndex"
            :condition="subCond"
            :show-delete="condition.subConditions.length > 1"
            @update:condition="(val: SubCondition) => updateSubCondition(condIndex, subIndex, val)"
            @delete="removeSubCondition(condIndex, subIndex)"
          />
        </div>
      </div>

      <!-- 新增按钮 -->
      <div class="ml-29 mt-2">
        <n-button
          @click="addSubCondition(condIndex)"
          size="small"
          type="primary"
          text
        >
          <template #icon>
            <IconPlus class="w-3.5 h-3.5" />
          </template>
          新增
        </n-button>
      </div>
    </div>

    <!-- 否则部分 -->
    <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <span class="text-sm font-semibold text-gray-800">否则</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue";
import type { Condition, SubCondition, IfConfig } from "workflow-flow-nodes";
import { NButton } from "naive-ui";
import ConditionItem from "./ConditionItem.vue";
import Select from "@/v2/components/common/Select.vue";
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

// 添加条件组
function addCondition() {
  config.conditions.push(createDefaultCondition());
  emitUpdate();
}

// 删除条件组
function removeConditionGroup(condIndex: number) {
  if (config.conditions.length > 1) {
    config.conditions.splice(condIndex, 1);
    emitUpdate();
  }
}

// 更新条件组
function updateCondition(condIndex: number, condition: Condition) {
  config.conditions[condIndex] = condition;
  emitUpdate();
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

// 发送更新事件
function emitUpdate() {
  emit("update:modelValue", {
    conditions: config.conditions,
  });
}
</script>

<style scoped>
@import "@/v2/style.css";

/* 逻辑选择器样式 */
:deep(.logic-select .n-base-selection) {
  @apply min-h-6 text-[13px];
}

:deep(.logic-select .n-base-selection-label) {
  @apply h-7 leading-7 justify-start;
}
</style>
