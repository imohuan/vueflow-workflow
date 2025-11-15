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
    <!-- 执行状态徽章 -->
    <NodeExecutionBadge :node-id="id" />

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
    <ResizeHandle
      ref="resizeHandleRef"
      :node-data="props.data"
      :resize-options="{
        initialWidth: 200,
        initialHeight: 120,
        minWidth: 150,
        minHeight: 80,
      }"
      :selected="selected"
      @update:node-style="handleNodeStyleUpdate"
      @update:is-resizing="handleIsResizingUpdate"
      class="note-node__resize-handle"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, type Ref } from "vue";
import { type NodeProps } from "@vue-flow/core";
import { NodeExecutionBadge } from "../widgets";
import ResizeHandle from "../widgets/ResizeHandle.vue";

interface NoteNodeData {
  content?: string;
  width?: number;
  height?: number;
}

type Props = NodeProps<NoteNodeData>;

const props = defineProps<Props>();

// 编辑状态
const isEditing = ref(false);
// 本地内容
const localContent = ref(props.data.content || "");
// 元素引用
const textareaRef: Ref<HTMLTextAreaElement | null> = ref(null);
const nodeRef: Ref<HTMLElement | null> = ref(null);
const resizeHandleRef = ref<InstanceType<typeof ResizeHandle> | null>(null);

// 节点样式状态（由 ResizeHandle 内部管理，通过事件同步）
const nodeStyleState = ref<{ width: string; height: string }>({
  width: `${props.data.width || 200}px`,
  height: `${props.data.height || 120}px`,
});

const isResizingState = ref(false);

// 计算样式（合并状态）
const nodeStyle = computed(() => ({
  ...nodeStyleState.value,
  cursor: isEditing.value ? "text" : "default",
}));

// 计算 isResizing
const isResizing = computed(() => isResizingState.value);

// 处理 nodeStyle 更新（通过事件同步）
function handleNodeStyleUpdate(style: { width: string; height: string }) {
  nodeStyleState.value = style;
}

// 处理 isResizing 更新
function handleIsResizingUpdate(value: boolean) {
  isResizingState.value = value;
}

// 同步 data.content 的变化
watch(
  () => props.data.content,
  (newContent) => {
    if (newContent !== undefined && newContent !== localContent.value) {
      localContent.value = newContent;
    }
  }
);

// ResizeHandle 内部已经处理了尺寸同步，不需要额外的 watch

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

// ResizeHandle 内部已经处理了所有 resize 逻辑，不需要额外的函数和清理
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
  /* ResizeHandle 组件已经有自己的样式，这里只需要覆盖特定样式 */
}

.note-node__resize-handle :deep(svg) {
  color: #a8a29e;
}

.note-node:hover .note-node__resize-handle :deep(svg),
.note-node--selected .note-node__resize-handle :deep(svg),
.note-node--resizing .note-node__resize-handle :deep(svg) {
  color: #78716c;
}

.note-node__resize-handle:hover :deep(svg) {
  color: #f59e0b;
}

.note-node--resizing .note-node__resize-handle :deep(svg) {
  color: #f59e0b;
}
</style>
