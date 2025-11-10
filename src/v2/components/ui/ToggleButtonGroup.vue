<template>
  <div
    ref="containerRef"
    class="relative flex items-center bg-slate-200 rounded-md p-0.5"
    :class="containerSizeClass"
  >
    <!-- 滑动背景指示器 -->
    <div
      class="absolute bg-white rounded transition-all duration-200 ease-out"
      :class="indicatorSizeClass"
      :style="indicatorStyle"
    />
    <!-- 按钮列表 -->
    <button
      v-for="option in options"
      :key="option.value"
      :ref="(el: any) => setButtonRef(el, option.value)"
      @click="handleClick(option.value)"
      :class="[
        'relative z-10 font-medium rounded transition-all flex items-center gap-1.5',
        buttonPaddingClass,
        textSizeClass,
        modelValue === option.value ? 'text-slate-900' : 'text-slate-500',
      ]"
    >
      <component v-if="option.icon" :is="option.icon" :class="iconSizeClass" />
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, type Component } from "vue";

interface Option {
  /** 选项值 */
  value: string;
  /** 选项标签 */
  label: string;
  /** 可选图标组件 */
  icon?: Component;
}

interface Props {
  /** 选项列表 */
  options: Option[];
  /** 当前选中的值 */
  modelValue: string;
  /** 尺寸 */
  size?: "sm" | "md" | "lg";
}

interface Emits {
  (e: "update:modelValue", value: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const containerRef = ref<HTMLElement | null>(null);
const buttonRefs = ref<Map<string, HTMLElement>>(new Map());

// 尺寸相关样式
const containerSizeClass = computed(() => {
  switch (props.size ?? "md") {
    case "sm":
      return "h-6";
    case "lg":
      return "h-8";
    default:
      return "h-7";
  }
});

const indicatorSizeClass = computed(() => {
  switch (props.size ?? "md") {
    case "sm":
      return "h-5";
    case "lg":
      return "h-7";
    default:
      return "h-6";
  }
});

const buttonPaddingClass = computed(() => {
  switch (props.size ?? "md") {
    case "sm":
      return "px-2 py-0.5";
    case "lg":
      return "px-3 py-1.5";
    default:
      return "px-2.5 py-1";
  }
});

const textSizeClass = computed(() => {
  switch (props.size ?? "md") {
    case "sm":
      return "text-[11px]";
    case "lg":
      return "text-sm";
    default:
      return "text-xs";
  }
});

const iconSizeClass = computed(() => {
  switch (props.size ?? "md") {
    case "sm":
      return "h-3 w-3";
    case "lg":
      return "h-4 w-4";
    default:
      return "h-3.5 w-3.5";
  }
});

// 计算指示器样式
const indicatorStyle = computed(() => {
  const activeButton = buttonRefs.value.get(props.modelValue);
  if (!activeButton || !containerRef.value) {
    return {
      width: "0px",
      left: "0px",
      opacity: 0,
    };
  }

  const containerRect = containerRef.value.getBoundingClientRect();
  const buttonRect = activeButton.getBoundingClientRect();

  return {
    width: `${buttonRect.width}px`,
    left: `${buttonRect.left - containerRect.left}px`,
    opacity: 1,
  };
});

// 处理点击事件
const handleClick = (value: string) => {
  emit("update:modelValue", value);
};

// 设置按钮引用
const setButtonRef = (
  el: HTMLElement | HTMLElement[] | null,
  value: string
) => {
  if (Array.isArray(el)) {
    // v-for 可能返回数组，取第一个元素
    const button = el[0];
    if (button) {
      buttonRefs.value.set(value, button);
    } else {
      buttonRefs.value.delete(value);
    }
  } else if (el) {
    buttonRefs.value.set(value, el);
  } else {
    buttonRefs.value.delete(value);
  }
};

// 监听选中值变化，确保指示器位置正确
watch(
  () => props.modelValue,
  async () => {
    await nextTick();
  }
);

// 组件挂载后初始化
onMounted(async () => {
  await nextTick();
});
</script>

<script lang="ts">
export default {
  name: "ToggleButtonGroup",
};
</script>
