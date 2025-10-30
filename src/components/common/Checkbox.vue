<!-- 纯 Tailwind CSS 复选框组件 -->
<template>
  <input
    type="checkbox"
    :checked="binary ? modelValue : modelValue?.includes(value)"
    :disabled="disabled"
    :class="checkboxClasses"
    @change="handleChange"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  /** v-model 绑定值（binary 模式下为 boolean，否则为数组） */
  modelValue?: boolean | any[];
  /** 是否为二值模式（true/false） */
  binary?: boolean;
  /** 复选框的值（非 binary 模式下使用） */
  value?: any;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义样式类 */
  class?: string;
}

interface Emits {
  (e: "update:modelValue", value: boolean | any[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  binary: false,
  value: undefined,
  disabled: false,
  class: "",
});

const emit = defineEmits<Emits>();

const checkboxClasses = computed(() => {
  const classes = [
    "w-4",
    "h-4",
    "rounded-md",
    "border",
    "border-slate-300",
    "text-purple-500",
    "bg-white",
    "shadow-sm",
    "transition-all",
    "duration-200",
    "cursor-pointer",
  ];

  if (props.disabled) {
    classes.push("opacity-50", "cursor-not-allowed", "shadow-none");
  } else {
    classes.push(
      "hover:border-purple-400",
      "focus-visible:outline-none",
      "focus-visible:ring-3",
      "focus-visible:ring-purple-200",
      "focus-visible:ring-offset-0"
    );
  }

  if (props.class) {
    classes.push(props.class);
  }

  return classes.join(" ");
});

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement;

  if (props.binary) {
    emit("update:modelValue", target.checked);
  } else {
    const currentValue = Array.isArray(props.modelValue)
      ? props.modelValue
      : [];
    if (target.checked) {
      emit("update:modelValue", [...currentValue, props.value]);
    } else {
      emit(
        "update:modelValue",
        currentValue.filter((v) => v !== props.value)
      );
    }
  }
}
</script>
