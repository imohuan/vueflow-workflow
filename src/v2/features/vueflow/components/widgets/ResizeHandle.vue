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
import { ref, computed, watch, onMounted } from "vue";
import { useVueFlowEvents } from "../../events/useVueFlowEvents";
import { useVueFlowCore } from "../../core/useVueFlowCore";

export interface ResizeOptions {
  /** 最小宽度 */
  minWidth?: number;
  /** 最小高度 */
  minHeight?: number;
  /** 是否启用 resize */
  enabled?: boolean;
}

interface Props {
  /** 节点 ID（必需，用于更新节点尺寸） */
  nodeId: string;
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
  "update:isResizing": [isResizing: boolean];
}>();

// 简化：nodeId 必需，所以总是处理 resize 逻辑
const shouldHandleResize = true;
const resizeEnabled = props.resizeOptions?.enabled ?? true;

// Resize 配置
const { minWidth = 200, minHeight = 150 } = props.resizeOptions || {};

// 获取 VueFlow 实例和事件系统
const { viewport } = useVueFlowCore();
const events = useVueFlowEvents();
const vueFlowCore = useVueFlowCore();

// 本地尺寸状态
const width = ref(0);
const height = ref(0);
const isResizing = ref(false);

// Resize 状态变量
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;

function updateNode() {
  // 直接修改 node.width/height，以便实时显示 resize 效果
  if (props.nodeId) {
    console.log("[update]", width.value, height.value);

    vueFlowCore.updateNode(props.nodeId, {
      width: width.value,
      height: height.value,
    });
  }
}

// 处理鼠标移动（更新尺寸）
function handleMouseMove(event: MouseEvent) {
  if (!isResizing.value || !resizeEnabled) return;

  const deltaX = event.clientX - resizeStartX;
  const deltaY = event.clientY - resizeStartY;

  const zoom = viewport.value.zoom || 1;
  const canvasDeltaX = deltaX / zoom;
  const canvasDeltaY = deltaY / zoom;

  width.value = Math.max(minWidth, resizeStartWidth + canvasDeltaX);
  height.value = Math.max(minHeight, resizeStartHeight + canvasDeltaY);

  // 直接修改 node.width/height，以便实时显示 resize 效果
  updateNode();
}

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

  // 添加全局鼠标移动和释放监听
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleResizeEnd);
}

// 处理调整结束
function handleResizeEnd() {
  if (isResizing.value) {
    isResizing.value = false;

    // 发送 resize 结束事件
    if (props.nodeId) {
      events.emit("group-node:drag-end", {
        nodeId: props.nodeId,
      });
    }
  }
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleResizeEnd);
}

// 同步外部尺寸变化
watch(
  () => {
    const node = vueFlowCore.nodes.value.find((n) => n.id === props.nodeId);
    return [node?.width, node?.height];
  },
  ([newWidth, newHeight]) => {
    if (newWidth !== undefined && newWidth !== width.value) {
      width.value = newWidth as number;
    }
    if (newHeight !== undefined && newHeight !== height.value) {
      height.value = newHeight as number;
    }
  }
);

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
  return props.selected || isResizing.value;
});

// 处理鼠标按下
function handleMouseDown(event: MouseEvent) {
  if (!props.enabled) return;

  event.preventDefault();
  event.stopPropagation();

  handleResizeStart(event);
}

// 监听 isResizing 变化
watch(isResizing, (newValue) => {
  emit("update:isResizing", newValue);
});

// 暴露方法给父组件（如果父组件需要访问）
defineExpose({
  nodeStyle,
  isResizing,
  handleResizeStart,
  handleResizeEnd,
});
</script>
