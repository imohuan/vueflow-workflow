<!-- 纯 Tailwind CSS 输入框组件 -->
<template>
  <input
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="inputClasses"
    @input="handleInput"
    @change="handleChange"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  /** 输入框类型 */
  type?: string;
  /** v-model 绑定值 */
  modelValue?: string | number;
  /** 占位符 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义样式类 */
  class?: string;
}

interface Emits {
  (e: "update:modelValue", value: string): void;
  (e: "input", event: Event): void;
  (e: "change", event: Event): void;
}

const props = withDefaults(defineProps<Props>(), {
  type: "text",
  modelValue: "",
  placeholder: "",
  disabled: false,
  class: "",
});

const emit = defineEmits<Emits>();

const inputClasses = computed(() => {
  const classes = [
    "w-full",
    "h-9",
    "px-3",
    "text-sm",
    "text-slate-700",
    "bg-white",
    "border",
    "border-slate-200",
    "rounded-md",
    "shadow-sm",
    "outline-none",
    "transition-all",
    "duration-200",
    "placeholder:text-slate-400",
  ];

  if (props.disabled) {
    classes.push(
      "bg-slate-100/80",
      "cursor-not-allowed",
      "opacity-60",
      "shadow-none"
    );
  } else {
    classes.push(
      "hover:border-slate-300",
      "hover:shadow-sm",
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

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("update:modelValue", target.value);
  emit("input", event);
}

function handleChange(event: Event) {
  emit("change", event);
}
</script>
