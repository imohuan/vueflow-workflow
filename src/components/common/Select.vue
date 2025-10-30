<!-- 自定义下拉框组件 -->
<template>
  <Select
    v-model="selectedValue"
    :options="options"
    :optionLabel="optionLabel"
    :optionValue="optionValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="props.class"
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
    @change="handleChange"
  >
    <template #dropdownicon>
      <IconChevronDown class="h-3.5 w-3.5" />
    </template>
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </Select>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Select, {
  type SelectPassThroughOptions,
  type SelectProps,
  type SelectChangeEvent,
} from "primevue/select";
import { ptViewMerge } from "@/volt/utils";
import IconChevronDown from "@/icons/IconChevronDown.vue";

interface Props extends /* @vue-ignore */ Partial<SelectProps> {
  /** v-model 绑定值 */
  modelValue?: any;
  /** 选项数组 */
  options?: any[];
  /** 选项标签字段名 */
  optionLabel?: string;
  /** 选项值字段名 */
  optionValue?: string;
  /** 占位符 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义样式类 */
  class?: string;
  /** 尺寸 */
  size?: "sm" | "md" | "lg";
}

interface Emits {
  (e: "update:modelValue", value: any): void;
  (e: "change", event: SelectChangeEvent): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  options: () => [],
  optionLabel: "label",
  optionValue: "value",
  placeholder: "",
  disabled: false,
  class: "",
  size: "md",
});

const emit = defineEmits<Emits>();

// 双向绑定值
const selectedValue = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

// 自定义样式主题
const theme = computed<SelectPassThroughOptions>(() => {
  const isLogicSelect = props.class?.includes("logic-select");
  const isOperatorSelect = props.class?.includes("operator-select");
  const isTypeSelect = props.class?.includes("type-select");

  // logic-select 样式
  if (isLogicSelect) {
    return {
      root: `inline-flex cursor-pointer relative select-none rounded-md
        w-12 h-7
        bg-white border border-purple-200 hover:border-purple-300
        focus:border-purple-400 focus:ring-2 focus:ring-purple-100
        transition-colors duration-200`,
      label: `flex items-center justify-center flex-auto
        py-0.5 px-1 text-xs font-medium text-purple-600
        overflow-hidden whitespace-nowrap
        p-placeholder:text-purple-400`,
      dropdown: `flex items-center justify-center shrink-0 bg-transparent text-purple-400 w-5`,
      overlay: `absolute top-0 left-0 rounded-md min-w-full
        bg-white border border-slate-200 shadow-lg z-50`,
      listContainer: `overflow-auto max-h-56`,
      list: `m-0 p-1 list-none gap-0.5 flex flex-col`,
      option: `cursor-pointer font-normal whitespace-nowrap relative overflow-hidden flex items-center
        px-2 py-1.5 text-xs border-none text-slate-700 bg-transparent rounded
        hover:bg-slate-100 focus:bg-slate-100
        data-[p-selected=true]:bg-purple-50 data-[p-selected=true]:text-purple-700
        transition-colors duration-150`,
      transition: {
        enterFromClass: "opacity-0 scale-95",
        enterActiveClass: "transition duration-100 ease-out",
        leaveActiveClass: "transition duration-75 ease-in",
        leaveToClass: "opacity-0 scale-95",
      },
    };
  }

  // operator-select 样式
  if (isOperatorSelect) {
    return {
      root: `inline-flex cursor-pointer relative select-none rounded-md
        w-11 h-7
        bg-white border border-slate-200 hover:border-slate-300
        focus:border-slate-400 focus:ring-2 focus:ring-slate-100
        transition-colors duration-200`,
      label: `flex items-center justify-center flex-auto
        py-0.5 px-1 text-sm font-semibold text-slate-700
        overflow-hidden whitespace-nowrap
        p-placeholder:text-slate-400`,
      dropdown: `flex items-center justify-center shrink-0 bg-transparent text-slate-400 w-5`,
      overlay: `absolute top-0 left-0 rounded-md min-w-full
        bg-white border border-slate-200 shadow-lg z-50`,
      listContainer: `overflow-auto max-h-56`,
      list: `m-0 p-1 list-none gap-0.5 flex flex-col`,
      option: `cursor-pointer font-semibold whitespace-nowrap relative overflow-hidden flex items-center
        px-2 py-1.5 text-sm border-none text-slate-700 bg-transparent rounded
        hover:bg-slate-100 focus:bg-slate-100
        data-[p-selected=true]:bg-slate-200 data-[p-selected=true]:text-slate-800
        transition-colors duration-150`,
      transition: {
        enterFromClass: "opacity-0 scale-95",
        enterActiveClass: "transition duration-100 ease-out",
        leaveActiveClass: "transition duration-75 ease-in",
        leaveToClass: "opacity-0 scale-95",
      },
    };
  }

  // type-select 样式
  if (isTypeSelect) {
    return {
      root: `inline-flex cursor-pointer relative select-none rounded-md
        w-10 h-7
        bg-white border border-slate-200 hover:border-slate-300
        focus:border-slate-400 focus:ring-2 focus:ring-slate-100
        transition-colors duration-200`,
      label: `flex items-center justify-center flex-auto
        py-0.5 px-1 text-xs text-slate-700
        overflow-hidden whitespace-nowrap
        p-placeholder:text-slate-400`,
      dropdown: `flex items-center justify-center shrink-0 bg-transparent text-slate-400 w-5`,
      overlay: `absolute top-0 left-0 rounded-md min-w-full
        bg-white border border-slate-200 shadow-lg z-50`,
      listContainer: `overflow-auto max-h-56`,
      list: `m-0 p-1 list-none gap-0.5 flex flex-col`,
      option: `cursor-pointer font-normal whitespace-nowrap relative overflow-hidden flex items-center
        px-2 py-1.5 text-xs border-none text-slate-700 bg-transparent rounded
        hover:bg-slate-100 focus:bg-slate-100
        data-[p-selected=true]:bg-slate-200 data-[p-selected=true]:text-slate-800
        transition-colors duration-150`,
      transition: {
        enterFromClass: "opacity-0 scale-95",
        enterActiveClass: "transition duration-100 ease-out",
        leaveActiveClass: "transition duration-75 ease-in",
        leaveToClass: "opacity-0 scale-95",
      },
    };
  }

  // 默认样式 - 高度 1.75rem (28px) 匹配输入框
  return {
    root: `inline-flex cursor-pointer relative select-none rounded-md
      h-7 min-w-0
      bg-white border border-slate-200 hover:border-slate-300
      focus:border-slate-400 focus:ring-2 focus:ring-slate-100
      transition-colors duration-200 shadow-sm`,
    label: `block whitespace-nowrap overflow-hidden flex-auto
      py-1 px-2 text-xs text-slate-700
      overflow-ellipsis
      p-placeholder:text-slate-400
      p-disabled:text-slate-500`,
    dropdown: `flex items-center justify-center shrink-0 bg-transparent text-slate-400 w-6`,
    overlay: `absolute top-0 left-0 rounded-md min-w-full
      bg-white border border-slate-200 shadow-lg z-50`,
    listContainer: `overflow-auto max-h-56`,
    list: `m-0 p-1.5 list-none gap-1 flex flex-col`,
    option: `cursor-pointer font-normal whitespace-nowrap relative overflow-hidden flex items-center justify-between
      px-2.5 py-2 text-sm border-none text-slate-600 bg-transparent rounded
      hover:bg-slate-100 hover:text-slate-900
      focus:bg-slate-100 focus:text-slate-900
      data-[p-selected=true]:bg-slate-200/70 data-[p-selected=true]:text-slate-800 data-[p-selected=true]:font-medium
      transition-colors duration-150`,
    transition: {
      enterFromClass: "opacity-0 scale-95",
      enterActiveClass: "transition duration-100 ease-out",
      leaveActiveClass: "transition duration-75 ease-in",
      leaveToClass: "opacity-0 scale-95",
    },
  };
});

// 处理 change 事件
function handleChange(event: SelectChangeEvent) {
  emit("change", event);
}
</script>
