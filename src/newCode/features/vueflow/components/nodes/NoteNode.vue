<template>
  <div
    ref="nodeRef"
    class="note-node"
    :class="{
      'note-node--selected': selected,
      'note-node--editing': isEditing,
      'note-node--resizing': isResizing,
    }"
    :style="nodeStyle"
    @dblclick="handleDoubleClick"
  >
    <!-- 编辑状态：显示输入框 -->
    <textarea
      v-if="isEditing"
      ref="textareaRef"
      v-model="localContent"
      class="note-node__textarea nodrag nopan"
      placeholder="输入笔记内容..."
      @blur="handleBlur"
      @keydown.esc="handleEscape"
      @click.stop
    />

    <!-- 非编辑状态：显示文本内容 -->
    <div v-else class="note-node__content">
      <div v-if="localContent" class="note-node__text">
        {{ localContent }}
      </div>
      <div v-else class="note-node__placeholder">点击添加笔记</div>
    </div>

    <!-- 右下角调整大小手柄 -->
    <div
      class="note-node__resize-handle nodrag nopan"
      @mousedown.stop="handleResizeStart"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M11 1L1 11M11 5L5 11M11 9L9 11"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onUnmounted, type Ref } from "vue";
import { useVueFlow, type NodeProps } from "@vue-flow/core";

interface NoteNodeData {
  content?: string;
  width?: number;
  height?: number;
}

type Props = NodeProps<NoteNodeData>;

const props = defineProps<Props>();

// 获取 VueFlow 实例以访问 zoom 等信息
const { viewport } = useVueFlow();

// 编辑状态
const isEditing = ref(false);
// 调整大小状态
const isResizing = ref(false);
// 本地内容
const localContent = ref(props.data.content || "");
// 本地尺寸
const localWidth = ref(props.data.width || 200);
const localHeight = ref(props.data.height || 120);
// 元素引用
const textareaRef: Ref<HTMLTextAreaElement | null> = ref(null);
const nodeRef: Ref<HTMLElement | null> = ref(null);

// 节点样式（响应式）
const nodeStyle = computed(() => ({
  width: `${localWidth.value}px`,
  height: `${localHeight.value}px`,
  cursor: isEditing.value ? "text" : "default",
}));

// 同步 data.content 的变化
watch(
  () => props.data.content,
  (newContent) => {
    if (newContent !== undefined && newContent !== localContent.value) {
      localContent.value = newContent;
    }
  }
);

// 同步 data 中的尺寸变化
watch(
  () => [props.data.width, props.data.height],
  ([newWidth, newHeight]) => {
    if (newWidth !== undefined && newWidth !== localWidth.value) {
      localWidth.value = newWidth;
    }
    if (newHeight !== undefined && newHeight !== localHeight.value) {
      localHeight.value = newHeight;
    }
  }
);

// 处理双击：进入编辑模式
async function handleDoubleClick() {
  if (!isEditing.value && !isResizing.value) {
    isEditing.value = true;
    await nextTick();
    // 聚焦并选中文本
    if (textareaRef.value) {
      textareaRef.value.focus();
      textareaRef.value.select();
    }
  }
}

// 处理失焦：退出编辑模式
function handleBlur() {
  isEditing.value = false;
  // 更新数据
  if (props.data) {
    props.data.content = localContent.value;
  }
}

// 处理 ESC 键：取消编辑
function handleEscape() {
  // 恢复原始内容
  localContent.value = props.data.content || "";
  isEditing.value = false;
}

// 调整大小相关变量
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;

// 开始调整大小
function handleResizeStart(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();

  isResizing.value = true;
  resizeStartX = event.clientX;
  resizeStartY = event.clientY;
  resizeStartWidth = localWidth.value;
  resizeStartHeight = localHeight.value;

  // 添加全局鼠标移动和释放监听
  document.addEventListener("mousemove", handleResizeMove);
  document.addEventListener("mouseup", handleResizeEnd);
}

// 调整大小过程中
function handleResizeMove(event: MouseEvent) {
  if (!isResizing.value) return;

  // 计算鼠标移动的屏幕像素距离
  const deltaX = event.clientX - resizeStartX;
  const deltaY = event.clientY - resizeStartY;

  // 获取当前缩放级别
  const zoom = viewport.value.zoom || 1;

  // 将屏幕像素距离转换为画布坐标距离（考虑缩放）
  const canvasDeltaX = deltaX / zoom;
  const canvasDeltaY = deltaY / zoom;

  // 计算新的尺寸（最小 150x80）
  const newWidth = Math.max(150, resizeStartWidth + canvasDeltaX);
  const newHeight = Math.max(80, resizeStartHeight + canvasDeltaY);

  localWidth.value = newWidth;
  localHeight.value = newHeight;
}

// 结束调整大小
function handleResizeEnd() {
  if (isResizing.value) {
    isResizing.value = false;

    // 保存尺寸到 data
    if (props.data) {
      props.data.width = localWidth.value;
      props.data.height = localHeight.value;
    }

    // 移除全局监听
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);
  }
}

// 组件卸载时清理
onUnmounted(() => {
  document.removeEventListener("mousemove", handleResizeMove);
  document.removeEventListener("mouseup", handleResizeEnd);
});
</script>

<style scoped>
.note-node {
  position: relative;
  background: #fef9c3; /* 淡黄色背景 */
  border: 2px solid #fbbf24;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.15);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
  overflow: hidden;
  /* 尺寸通过 :style 动态设置 */
}

.note-node--selected {
  border-color: #f59e0b;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.note-node--editing {
  background: #fffbeb;
  border-color: #f59e0b;
}

.note-node--resizing {
  user-select: none;
  transition: none;
}

/* 内容显示区域 */
.note-node__content {
  padding: 12px;
  padding-right: 24px; /* 为右下角手柄留出空间 */
  padding-bottom: 24px; /* 为右下角手柄留出空间 */
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  overflow: auto; /* 内容超出时滚动 */
}

.note-node__text {
  font-size: 13px;
  line-height: 1.6;
  color: #78716c;
  white-space: pre-wrap;
  word-break: break-word;
  width: 100%;
}

.note-node__placeholder {
  font-size: 13px;
  color: #a8a29e;
  font-style: italic;
}

/* 输入框 */
.note-node__textarea {
  width: 100%;
  height: 100%;
  padding: 12px;
  padding-right: 24px; /* 为右下角手柄留出空间 */
  padding-bottom: 24px; /* 为右下角手柄留出空间 */
  box-sizing: border-box;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  line-height: 1.6;
  color: #78716c;
  resize: none;
  font-family: inherit;
}

.note-node__textarea::placeholder {
  color: #a8a29e;
  font-style: italic;
}

/* 调整大小手柄 */
.note-node__resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: nwse-resize;
  color: #a8a29e;
  opacity: 0;
  transition: opacity 0.2s ease;
  background: linear-gradient(
    135deg,
    transparent 0%,
    transparent 50%,
    rgba(168, 162, 158, 0.1) 50%,
    rgba(168, 162, 158, 0.1) 100%
  );
}

.note-node:hover .note-node__resize-handle,
.note-node--selected .note-node__resize-handle,
.note-node--resizing .note-node__resize-handle {
  opacity: 1;
}

.note-node__resize-handle:hover {
  color: #78716c;
  background: linear-gradient(
    135deg,
    transparent 0%,
    transparent 50%,
    rgba(168, 162, 158, 0.2) 50%,
    rgba(168, 162, 158, 0.2) 100%
  );
}

.note-node--resizing .note-node__resize-handle {
  color: #f59e0b;
}
</style>
