<template>
  <div ref="triggerRef" class="relative">
    <!-- 触发器插槽 -->
    <slot name="trigger" :toggle="toggle" :show="isVisible"></slot>

    <!-- 下拉内容 - 使用 teleport 传送到 body -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-show="isVisible"
          ref="dropdownRef"
          :class="[
            'absolute rounded-lg border border-slate-200 bg-white shadow-xl',
            dropdownClass,
          ]"
          :style="dropdownStyle"
          @mousedown.prevent
        >
          <slot :close="close"></slot>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  type CSSProperties,
} from "vue";

interface Props {
  /** 是否显示下拉框 */
  modelValue?: boolean;
  /** 下拉框额外类名 */
  dropdownClass?: string;
  /** 偏移距离 */
  offset?: number;
  /** 位置：bottom-start, bottom-end, top-start, top-end */
  placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
  /** 宽度模式：trigger-宽度跟随触发器，auto-自动 */
  widthMode?: "trigger" | "auto";
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  dropdownClass: "",
  offset: 4,
  placement: "bottom-start",
  widthMode: "trigger",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

const triggerRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
const isVisible = ref(props.modelValue);
const dropdownPosition = ref({ top: 0, left: 0, width: 0 });

// 计算下拉框样式
const dropdownStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {
    position: "fixed",
    top: `${dropdownPosition.value.top}px`,
    left: `${dropdownPosition.value.left}px`,
    zIndex: 9999,
  };

  if (props.widthMode === "trigger" && dropdownPosition.value.width) {
    style.width = `${dropdownPosition.value.width}px`;
  }

  return style;
});

// 监听 modelValue 变化
watch(
  () => props.modelValue,
  (value) => {
    isVisible.value = value;
    if (value) {
      updatePosition();
    }
  }
);

// 监听 isVisible 变化
watch(isVisible, (value) => {
  emit("update:modelValue", value);
  if (value) {
    updatePosition();
  }
});

/**
 * 切换显示状态
 */
function toggle() {
  isVisible.value = !isVisible.value;
}

/**
 * 关闭下拉框
 */
function close() {
  isVisible.value = false;
}

/**
 * 更新下拉框位置
 */
function updatePosition() {
  if (!triggerRef.value) return;

  const triggerRect = triggerRef.value.getBoundingClientRect();
  const dropdownEl = dropdownRef.value;
  const dropdownHeight = dropdownEl?.offsetHeight || 0;

  let top = 0;
  let left = 0;

  // 根据 placement 计算位置
  if (props.placement.startsWith("bottom")) {
    top = triggerRect.bottom + props.offset;
  } else if (props.placement.startsWith("top")) {
    top = triggerRect.top - dropdownHeight - props.offset;
  }

  if (props.placement.endsWith("start")) {
    left = triggerRect.left;
  } else if (props.placement.endsWith("end")) {
    left = triggerRect.right - (dropdownEl?.offsetWidth || 0);
  }

  // 边界检测 - 防止超出视口
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const dropdownWidth = dropdownEl?.offsetWidth || 0;

  // 水平边界检测
  if (left + dropdownWidth > viewportWidth - 10) {
    left = viewportWidth - dropdownWidth - 10;
  }
  if (left < 10) {
    left = 10;
  }

  // 垂直边界检测 - 如果底部超出，自动翻转到顶部
  if (top + dropdownHeight > viewportHeight - 10) {
    if (props.placement.startsWith("bottom")) {
      // 翻转到顶部
      top = triggerRect.top - dropdownHeight - props.offset;
    }
  }

  // 如果顶部也超出，则固定在视口内
  if (top < 10) {
    top = 10;
  }

  dropdownPosition.value = {
    top,
    left,
    width: triggerRect.width,
  };
}

/**
 * 处理滚动事件
 */
function handleScroll() {
  if (isVisible.value) {
    updatePosition();
  }
}

/**
 * 处理窗口大小变化
 */
function handleResize() {
  if (isVisible.value) {
    updatePosition();
  }
}

/**
 * 处理点击外部关闭
 */
function handleClickOutside(event: MouseEvent) {
  if (!isVisible.value) return;

  const target = event.target as Node;
  const trigger = triggerRef.value;
  const dropdown = dropdownRef.value;

  if (
    trigger &&
    !trigger.contains(target) &&
    dropdown &&
    !dropdown.contains(target)
  ) {
    close();
  }
}

onMounted(() => {
  // 监听全局滚动（包括所有可滚动的父元素）
  window.addEventListener("scroll", handleScroll, true);
  window.addEventListener("resize", handleResize);
  // 使用 capture 阶段监听 mousedown，确保即使事件被 stopPropagation 也能捕获
  document.addEventListener("mousedown", handleClickOutside, true);
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll, true);
  window.removeEventListener("resize", handleResize);
  document.removeEventListener("mousedown", handleClickOutside, true);
});

// 暴露方法给父组件
defineExpose({
  toggle,
  close,
  updatePosition,
});
</script>
