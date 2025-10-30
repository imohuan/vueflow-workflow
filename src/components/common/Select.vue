<!-- 自定义 Tailwind CSS 下拉框组件 -->
<template>
  <div ref="selectRef" class="relative w-full">
    <!-- 选择器触发按钮 -->
    <button
      type="button"
      :disabled="disabled"
      :class="selectClasses"
      @click="toggleDropdown"
      @keydown.enter.prevent="toggleDropdown"
      @keydown.space.prevent="toggleDropdown"
      @keydown.up.prevent="navigateOptions(-1)"
      @keydown.down.prevent="navigateOptions(1)"
      @keydown.escape="isOpen = false"
    >
      <span :class="selectedLabelClasses">
        {{ selectedLabel }}
      </span>
      <!-- 下拉箭头图标 -->
      <IconChevronDown :class="arrowClasses" />
    </button>

    <!-- 下拉选项列表 -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div v-show="isOpen" :class="dropdownClasses">
        <div
          v-for="(option, index) in options"
          :key="index"
          :class="getOptionClasses(option, index)"
          @click="selectOption(option)"
          @mouseenter="hoveredIndex = index"
        >
          <span class="block truncate">
            {{ getOptionLabel(option) }}
          </span>
          <!-- 选中图标 -->
          <IconCheck v-if="isSelected(option)" class="h-4 w-4 text-slate-500" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import IconChevronDown from "@/icons/IconChevronDown.vue";
import IconCheck from "@/icons/IconCheck.vue";

interface Props {
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
  (e: "change", event: Event): void;
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

// 下拉框状态
const isOpen = ref(false);
const selectRef = ref<HTMLElement | null>(null);
const hoveredIndex = ref<number>(-1);

// 选择器按钮样式
const selectClasses = computed(() => {
  const classes = [
    "w-full",
    "flex",
    "items-center",
    "justify-between",
    "gap-2",
    "px-3",
    "text-left",
    "bg-white",
    "border",
    "border-slate-200",
    "rounded-md",
    "shadow-sm",
    "transition-all",
    "duration-200",
    "outline-none",
  ];

  if (props.size === "sm") {
    classes.push("h-9", "px-2.5", "text-xs", "rounded-lg");
  } else if (props.size === "lg") {
    classes.push("h-12", "px-4", "text-base");
  } else {
    classes.push("h-9", "px-3", "text-sm");
  }

  if (props.disabled) {
    classes.push(
      "bg-slate-100/80",
      "cursor-not-allowed",
      "opacity-60",
      "shadow-none"
    );
  } else {
    classes.push(
      "cursor-pointer",
      "hover:border-slate-300",
      "focus-visible:border-slate-400",
      "focus-visible:ring-2",
      "focus-visible:ring-slate-200"
    );
  }

  if (props.class) {
    classes.push(props.class);
  }

  return classes.join(" ");
});

// 下拉箭头样式
const arrowClasses = computed(() => {
  const classes = [
    props.size === "sm" ? "h-3.5" : props.size === "lg" ? "h-5" : "h-4",
    props.size === "sm" ? "w-3.5" : props.size === "lg" ? "w-5" : "w-4",
    "text-slate-400",
    "transition-transform",
    "duration-200",
    "flex-shrink-0",
  ];
  if (isOpen.value) {
    classes.push("rotate-180", "text-slate-500");
  }
  return classes.join(" ");
});

// 下拉选项容器样式
const dropdownClasses = computed(() => {
  return [
    "absolute",
    "z-20",
    "w-full",
    props.size === "sm" ? "mt-1" : "mt-1.5",
    "bg-white",
    "border",
    "border-slate-200",
    "rounded-md",
    "shadow-lg",
    "max-h-56",
    "overflow-auto",
    "py-1.5",
  ].join(" ");
});

// 选中的标签文本
const selectedLabel = computed(() => {
  if (
    props.modelValue === undefined ||
    props.modelValue === null ||
    props.modelValue === ""
  ) {
    return props.placeholder || "请选择";
  }
  const selectedOption = props.options.find(
    (option) => getOptionValue(option) === props.modelValue
  );
  return selectedOption
    ? getOptionLabel(selectedOption)
    : props.placeholder || "请选择";
});

// 选中标签样式
const selectedLabelClasses = computed(() => {
  const hasValue =
    props.modelValue !== undefined &&
    props.modelValue !== null &&
    props.modelValue !== "";
  return hasValue ? "text-slate-700" : "text-slate-400";
});

// 切换下拉框
function toggleDropdown() {
  if (!props.disabled) {
    isOpen.value = !isOpen.value;
  }
}

// 选择选项
function selectOption(option: any) {
  const value = getOptionValue(option);
  emit("update:modelValue", value);
  emit("change", new Event("change"));
  isOpen.value = false;
  hoveredIndex.value = -1;
}

// 判断选项是否被选中
function isSelected(option: any): boolean {
  return getOptionValue(option) === props.modelValue;
}

// 获取选项样式
function getOptionClasses(option: any, index: number): string {
  const classes = [
    "mx-1",
    "px-2.5",
    props.size === "sm"
      ? "py-1.5 text-xs"
      : props.size === "lg"
      ? "py-2.5 text-base"
      : "py-2 text-sm",
    "flex",
    "items-center",
    "justify-between",
    "rounded",
    "cursor-pointer",
    "transition-colors",
    "duration-150",
  ];

  if (isSelected(option)) {
    classes.push("bg-slate-200/70", "text-slate-800", "font-medium");
  } else if (hoveredIndex.value === index) {
    classes.push("bg-slate-100", "text-slate-900");
  } else {
    classes.push("text-slate-600", "hover:bg-slate-100");
  }

  return classes.join(" ");
}

// 键盘导航
function navigateOptions(direction: number) {
  if (!isOpen.value) {
    isOpen.value = true;
    return;
  }

  const currentIndex = props.options.findIndex(
    (option) => getOptionValue(option) === props.modelValue
  );

  let newIndex = currentIndex + direction;
  if (newIndex < 0) newIndex = props.options.length - 1;
  if (newIndex >= props.options.length) newIndex = 0;

  hoveredIndex.value = newIndex;
  selectOption(props.options[newIndex]);
}

// 获取选项标签
function getOptionLabel(option: any): string {
  if (typeof option === "object" && option !== null) {
    return option[props.optionLabel] ?? String(option);
  }
  return String(option);
}

// 获取选项值
function getOptionValue(option: any): any {
  if (typeof option === "object" && option !== null) {
    return option[props.optionValue] ?? option;
  }
  return option;
}

// 点击外部关闭下拉框
function handleClickOutside(event: MouseEvent) {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
}

// 生命周期钩子
onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>
