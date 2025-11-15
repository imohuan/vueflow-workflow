<template>
  <div
    v-if="enabled"
    class="absolute right-0 bottom-0 w-5 h-5 flex items-center justify-center cursor-nwse-resize text-gray-300 opacity-0 transition-opacity duration-200 nodrag nopan"
    :class="{ 'opacity-100': displayVisible }"
    @mousedown="handleMouseDown"
  >
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="hover:text-indigo-500"
    >
      <path
        d="M11 1L1 11M11 5L5 11M11 9L9 11"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, watch } from "vue";
import { useVueFlow } from "@vue-flow/core";
import { useMouse } from "@vueuse/core";

export interface ResizeOptions {
  /** 初始宽度 */
  initialWidth?: number;
  /** 初始高度 */
  initialHeight?: number;
  /** 最小宽度 */
  minWidth?: number;
  /** 最小高度 */
  minHeight?: number;
  /** 是否启用 resize */
  enabled?: boolean;
}

interface Props {
  /** 节点数据对象（包含 width 和 height） */
  nodeData?: { width?: number; height?: number };
  /** Resize 配置选项 */
  resizeOptions?: ResizeOptions;
  /** 是否显示（通常与 selected 绑定），如果不提供则自动根据 isResizing 显示 */
  visible?: boolean;
  /** 是否启用 */
  enabled?: boolean;
  /** 外部选中状态（用于自动显示/隐藏） */
  selected?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  visible: undefined,
  enabled: true,
  selected: false,
});

const emit = defineEmits<{
  "update:nodeStyle": [style: { width: string; height: string }];
  "update:isResizing": [isResizing: boolean];
  "resize-start": [event: MouseEvent];
}>();

// 如果提供了 nodeData，则内部处理 resize 逻辑
const shouldHandleResize = !!props.nodeData;
const resizeEnabled = props.resizeOptions?.enabled ?? true;

// Resize 配置
const {
  initialWidth = 300,
  initialHeight = 200,
  minWidth = 200,
  minHeight = 150,
} = props.resizeOptions || {};

// 获取 VueFlow 实例
const { viewport } = useVueFlow();
const { x: mouseX, y: mouseY } = useMouse();

// 本地尺寸状态
const width = ref(props.nodeData?.width ?? initialWidth);
const height = ref(props.nodeData?.height ?? initialHeight);
const isResizing = ref(false);

// Resize 状态变量
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;

// 处理调整开始
function handleResizeStart(event: MouseEvent) {
  if (!resizeEnabled || !shouldHandleResize) return;

  event.preventDefault();
  event.stopPropagation();

  isResizing.value = true;
  resizeStartX = event.clientX;
  resizeStartY = event.clientY;
  resizeStartWidth = width.value;
  resizeStartHeight = height.value;

  // 添加全局鼠标释放监听
  document.addEventListener("mouseup", handleResizeEnd);
}

// 处理调整结束
function handleResizeEnd() {
  if (isResizing.value) {
    isResizing.value = false;
    // 同步到 nodeData
    if (props.nodeData) {
      props.nodeData.width = width.value;
      props.nodeData.height = height.value;
    }
  }
  document.removeEventListener("mouseup", handleResizeEnd);
}

// 监听鼠标移动，更新尺寸（仅在调整大小时执行）
if (shouldHandleResize) {
  watchEffect(() => {
    if (!isResizing.value || !resizeEnabled) return;

    const deltaX = mouseX.value - resizeStartX;
    const deltaY = mouseY.value - resizeStartY;

    const zoom = viewport.value.zoom || 1;
    const canvasDeltaX = deltaX / zoom;
    const canvasDeltaY = deltaY / zoom;

    width.value = Math.max(minWidth, resizeStartWidth + canvasDeltaX);
    height.value = Math.max(minHeight, resizeStartHeight + canvasDeltaY);
  });

  // 同步外部尺寸变化
  watch(
    () => [props.nodeData?.width, props.nodeData?.height],
    ([newWidth, newHeight]) => {
      if (newWidth !== undefined && newWidth !== width.value) {
        width.value = newWidth;
      }
      if (newHeight !== undefined && newHeight !== height.value) {
        height.value = newHeight;
      }
    }
  );
}

// 计算节点样式（响应式）
const nodeStyle = computed(() => ({
  width: `${width.value}px`,
  height: `${height.value}px`,
}));

// 计算显示状态
const displayVisible = computed(() => {
  if (props.visible !== undefined) {
    return props.visible;
  }
  // 如果使用内部 resize 逻辑，则根据 selected 和 isResizing 自动显示
  if (shouldHandleResize) {
    return props.selected || isResizing.value;
  }
  return false;
});

// 处理鼠标按下
function handleMouseDown(event: MouseEvent) {
  if (!props.enabled) return;

  event.preventDefault();
  event.stopPropagation();

  if (shouldHandleResize) {
    // 使用内部 resize 逻辑
    handleResizeStart(event);
  } else {
    // 发出事件，让父组件处理（向后兼容）
    emit("resize-start", event);
  }
}

// 监听 nodeStyle 变化，发出更新事件
if (shouldHandleResize) {
  watch(
    nodeStyle,
    (newStyle) => {
      emit("update:nodeStyle", newStyle);
    },
    { deep: true, immediate: true }
  );

  // 监听 isResizing 变化
  watch(isResizing, (newValue) => {
    emit("update:isResizing", newValue);
  });
}

// 暴露方法给父组件（如果父组件需要访问）
defineExpose({
  nodeStyle,
  isResizing,
  handleResizeStart,
  handleResizeEnd,
});
</script>
