<!--
级联选择器组件 - 支持按分组显示的多级菜单

使用示例:
```vue
<CascadedSelect
  v-model="selectedOperator"
  :options="operatorOptions"
  :groups="dataTypeGroups"
  @change="handleChange"
  trigger-class="w-11 h-7 bg-white px-1 py-0.5"
  placeholder="选择操作符"
/>

// 数据结构示例：
const dataTypeGroups = [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
];

const operatorOptions = [
  { value: "equals", label: "等于", group: "string", title: "等于" },
  { value: "contains", label: "包含", group: "string", title: "包含" },
  { value: "gt", label: "大于", group: "number", title: "大于" },
];
```
-->
<template>
  <Dropdown v-model="dropdownVisible" width-mode="auto" :offset="2">
    <!-- 触发按钮 -->
    <template #trigger="{ toggle }">
      <button
        @click="toggle"
        :class="[
          'inline-flex items-center justify-between cursor-pointer select-none',
          'h-8 rounded-md border transition-colors duration-200',
          dropdownVisible
            ? 'border-slate-400 ring-2 ring-slate-100'
            : 'border-slate-200 hover:border-slate-300',
          props.triggerClass,
        ]"
        :disabled="disabled"
        :title="currentOption?.title || currentOption?.label"
      >
        <span class="flex-auto overflow-hidden whitespace-nowrap text-ellipsis">
          {{ displayLabel }}
        </span>
        <IconChevronDown
          :class="[
            'w-3.5 h-3.5 transition-transform shrink-0',
            dropdownVisible ? 'rotate-180' : '',
          ]"
        />
      </button>
    </template>

    <!-- 下拉内容 -->
    <div class="flex w-max">
      <!-- 左侧：分组列表 -->
      <div class="border-r border-slate-100 shrink-0" style="width: 140px">
        <div class="p-1.5 space-y-0.5">
          <button
            v-for="group in groups"
            :key="group.value"
            @click="activeGroup = group.value"
            @mouseenter="activeGroup = group.value"
            :class="[
              'w-full flex items-center gap-2 px-3 py-2 text-sm rounded',
              'transition-colors duration-150 text-left',
              activeGroup === group.value
                ? 'bg-slate-100 text-slate-900 font-medium'
                : 'text-slate-700 hover:bg-slate-50',
            ]"
          >
            <span class="truncate flex-1">{{ group.label }}</span>
            <IconChevronRight class="w-3.5 h-3.5 shrink-0 text-slate-400" />
          </button>
        </div>
      </div>

      <!-- 右侧：选项列表 -->
      <div class="overflow-auto max-h-80 shrink-0" style="width: 180px">
        <div class="p-1.5 space-y-0.5">
          <button
            v-for="option in currentGroupOptions"
            :key="option.value"
            @click="selectOption(option)"
            :class="[
              'w-full px-3 py-2 text-sm rounded text-left',
              'transition-colors duration-150',
              isSelected(option.value)
                ? 'bg-red-50 text-red-600 font-medium'
                : 'text-slate-700 hover:bg-slate-50',
            ]"
          >
            <span class="block truncate">{{ option.label }}</span>
          </button>
        </div>
      </div>
    </div>
  </Dropdown>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import Dropdown from "./Dropdown.vue";
import IconChevronDown from "@/icons/IconChevronDown.vue";
import IconChevronRight from "@/icons/IconChevronRight.vue";

/** 选项定义 */
export interface CascadedOption {
  /** 选项值 */
  value: string;
  /** 显示标签（下拉菜单中显示） */
  label: string;
  /** 触发按钮显示标签（可选，不提供则使用 label） */
  displayLabel?: string;
  /** 所属分组 */
  group: string;
  /** 提示文本 */
  title?: string;
}

/** 分组定义 */
export interface OptionGroup {
  /** 分组值 */
  value: string;
  /** 分组标签 */
  label: string;
}

interface Props {
  /** v-model 绑定值 */
  modelValue?: string;
  /** 选项列表 */
  options: CascadedOption[];
  /** 分组列表 */
  groups: OptionGroup[];
  /** 占位符 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 触发按钮样式类 */
  triggerClass?: string;
  /** 下拉菜单样式类 */
  dropdownClass?: string;
}

interface Emits {
  (e: "update:modelValue", value: string): void;
  (e: "change", value: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  options: () => [],
  groups: () => [],
  placeholder: "请选择",
  disabled: false,
  triggerClass: "",
  dropdownClass: "",
});

const emit = defineEmits<Emits>();

// 下拉菜单状态
const dropdownVisible = ref(false);
const activeGroup = ref<string>("");

// 当前选中的选项
const currentOption = computed(() => {
  return props.options.find((opt) => opt.value === props.modelValue);
});

// 显示标签
const displayLabel = computed(() => {
  if (!currentOption.value) return props.placeholder;
  return currentOption.value.displayLabel || currentOption.value.label;
});

// 当前分组的选项
const currentGroupOptions = computed(() => {
  if (!activeGroup.value) return [];
  return props.options.filter((opt) => opt.group === activeGroup.value);
});

// 初始化激活的分组（选中项所在分组或第一个分组）
watch(
  () => props.groups,
  (newGroups) => {
    if (newGroups.length > 0 && !activeGroup.value) {
      // 如果有选中值，激活其所在分组，否则激活第一个分组
      if (currentOption.value) {
        activeGroup.value = currentOption.value.group;
      } else {
        const firstGroup = newGroups[0];
        if (firstGroup) {
          activeGroup.value = firstGroup.value;
        }
      }
    }
  },
  { immediate: true }
);

// 监听下拉菜单打开，重新激活当前选中项所在分组
watch(dropdownVisible, (visible) => {
  if (visible && currentOption.value) {
    activeGroup.value = currentOption.value.group;
  }
});

// 选择选项
function selectOption(option: CascadedOption) {
  emit("update:modelValue", option.value);
  emit("change", option.value);
  dropdownVisible.value = false;
}

// 判断是否选中
function isSelected(value: string): boolean {
  return props.modelValue === value;
}
</script>
