<!-- 纯 Tailwind CSS 滑块组件 -->
<template>
  <div class="relative w-full">
    <input
      type="range"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      :class="sliderClasses"
      @input="handleInput"
      v-bind="$attrs"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  /** v-model 绑定值 */
  modelValue?: number;
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 步长 */
  step?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义样式类 */
  class?: string;
}

interface Emits {
  (e: "update:modelValue", value: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  min: 0,
  max: 100,
  step: 1,
  disabled: false,
  class: "",
});

const emit = defineEmits<Emits>();

const sliderClasses = computed(() => {
  const classes = [
    "w-full",
    "h-2",
    "bg-slate-200",
    "rounded-lg",
    "outline-none",
    "appearance-none",
    "cursor-pointer",
    "transition-all",
    "duration-200",
    "[&::-webkit-slider-thumb]:appearance-none",
    "[&::-webkit-slider-thumb]:w-4",
    "[&::-webkit-slider-thumb]:h-4",
    "[&::-webkit-slider-thumb]:rounded-full",
    "[&::-webkit-slider-thumb]:bg-purple-600",
    "[&::-webkit-slider-thumb]:cursor-pointer",
    "[&::-webkit-slider-thumb]:transition-all",
    "[&::-webkit-slider-thumb]:duration-200",
    "[&::-moz-range-thumb]:w-4",
    "[&::-moz-range-thumb]:h-4",
    "[&::-moz-range-thumb]:rounded-full",
    "[&::-moz-range-thumb]:bg-purple-600",
    "[&::-moz-range-thumb]:border-0",
    "[&::-moz-range-thumb]:cursor-pointer",
    "[&::-moz-range-thumb]:transition-all",
    "[&::-moz-range-thumb]:duration-200",
  ];

  if (props.disabled) {
    classes.push(
      "opacity-50",
      "cursor-not-allowed",
      "[&::-webkit-slider-thumb]:cursor-not-allowed",
      "[&::-moz-range-thumb]:cursor-not-allowed"
    );
  } else {
    classes.push(
      "hover:bg-slate-300",
      "[&::-webkit-slider-thumb]:hover:bg-purple-700",
      "[&::-webkit-slider-thumb]:hover:shadow-lg",
      "[&::-moz-range-thumb]:hover:bg-purple-700",
      "[&::-moz-range-thumb]:hover:shadow-lg"
    );
  }

  if (props.class) {
    classes.push(props.class);
  }

  return classes.join(" ");
});

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("update:modelValue", Number(target.value));
}
</script>
