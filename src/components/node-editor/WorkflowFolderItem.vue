<!-- 工作流文件夹项组件 -->
<template>
  <div class="tree-item">
    <!-- 拖拽插入位置指示线 - 上方 -->
    <div
      v-if="
        dropTarget?.id === folder.id &&
        dropPosition === 'before' &&
        draggingItem?.id !== folder.id
      "
      class="drop-indicator top"
    ></div>

    <!-- 文件夹 -->
    <div
      class="tree-row folder-row"
      :class="{
        'drag-over-inside':
          dropTarget?.id === folder.id && dropPosition === 'inside',
      }"
      :style="{ paddingLeft: `${level * 12 + 8}px` }"
      :tabindex="0"
      draggable="true"
      @click="handleFolderClick"
      @keydown="handleFolderKeydown"
      @dragstart="handleDragStart($event, 'folder', folder)"
      @dragenter="handleDragEnter($event, 'folder', folder)"
      @dragleave="handleDragLeave"
      @dragover="handleDragOver"
      @drop="handleDrop($event, 'folder', folder)"
    >
      <!-- 折叠图标 -->
      <div class="chevron" :class="{ expanded: folder.expanded }">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M6 5l4 3-4 3"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <!-- 文件夹图标 -->
      <div class="icon folder-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M14.5 5.5v7a1 1 0 01-1 1h-11a1 1 0 01-1-1v-8a1 1 0 011-1h4l1.5 1.5h5.5a1 1 0 011 1z"
            fill="#fbbf24"
          />
          <path
            d="M6.5 3.5h-4a1 1 0 00-1 1v1h6v-1.5a.5.5 0 00-.5-.5h-1l.5-.5z"
            fill="#f59e0b"
          />
        </svg>
      </div>

      <!-- 文件夹名称/重命名输入框 -->
      <input
        v-if="isFolderRenaming"
        v-auto-focus-select
        v-model="folderRenameValue"
        class="rename-input"
        @blur="saveFolderRename"
        @keydown="handleFolderRenameKeydown"
        @click.stop
      />
      <div v-else class="label">{{ folder.name }}</div>

      <!-- 操作按钮 -->
      <div class="actions">
        <button
          @click.stop="$emit('create-workflow', folder.id)"
          class="action-btn"
          title="新建工作流"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </button>
        <button
          @click.stop="$emit('delete-folder', folder.id)"
          class="action-btn delete"
          title="删除文件夹"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M11 3h3v1h-1v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4H2V3h3V2a1 1 0 011-1h4a1 1 0 011 1v1z"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- 拖拽插入位置指示线 - 下方 -->
    <div
      v-if="
        dropTarget?.id === folder.id &&
        dropPosition === 'after' &&
        draggingItem?.id !== folder.id
      "
      class="drop-indicator bottom"
    ></div>

    <!-- 文件夹内容 -->
    <div v-if="folder.expanded" class="tree-children">
      <!-- 工作流列表 -->
      <div
        v-for="workflow in folder.workflows"
        :key="workflow.id"
        class="workflow-item-wrapper"
      >
        <!-- 拖拽插入位置指示线 - 上方 -->
        <div
          v-if="
            dropTarget?.id === workflow.id &&
            dropPosition === 'before' &&
            draggingItem?.id !== workflow.id
          "
          class="drop-indicator top"
        ></div>

        <div
          class="tree-row workflow-row"
          :class="{
            active: workflow.id === currentWorkflowId,
            'drag-over':
              dropTarget?.id === workflow.id && dropPosition === 'inside',
          }"
          :style="{ paddingLeft: `${(level + 1) * 12 + 8}px` }"
          :tabindex="0"
          draggable="true"
          @click="handleWorkflowClick(workflow.id)"
          @keydown="handleWorkflowKeydown($event, workflow)"
          @dragstart="handleDragStart($event, 'workflow', workflow)"
          @dragenter="handleDragEnter($event, 'workflow', workflow)"
          @dragleave="handleDragLeave"
          @dragover="(e) => handleWorkflowDragOver(e, workflow)"
          @drop="handleDrop($event, 'workflow', workflow)"
        >
          <!-- 空白（对齐chevron） -->
          <div class="chevron-spacer"></div>

          <!-- 工作流图标 -->
          <div class="icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path
                d="M4 2a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V6.414A2 2 0 0013.414 5L11 2.586A2 2 0 009.586 2H4zm5 2v3h3l-3-3z"
              />
            </svg>
          </div>

          <!-- 工作流标题/重命名输入框 -->
          <input
            v-if="isWorkflowRenaming(workflow.id)"
            v-auto-focus-select
            v-model="workflowRenameValue"
            class="rename-input"
            @blur="saveWorkflowRename(workflow.id, workflow.title)"
            @keydown="
              handleWorkflowRenameKeydown($event, workflow.id, workflow.title)
            "
            @click.stop
          />
          <div v-else class="label">{{ workflow.title }}</div>

          <!-- 删除按钮 -->
          <div class="actions">
            <button
              @click.stop="$emit('delete-workflow', workflow.id)"
              class="action-btn delete"
              title="删除"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path
                  d="M11 3h3v1h-1v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4H2V3h3V2a1 1 0 011-1h4a1 1 0 011 1v1z"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- 拖拽插入位置指示线 - 下方 -->
        <div
          v-if="
            dropTarget?.id === workflow.id &&
            dropPosition === 'after' &&
            draggingItem?.id !== workflow.id
          "
          class="drop-indicator bottom"
        ></div>
      </div>

      <!-- 子文件夹 -->
      <WorkflowFolderItem
        v-for="subfolder in folder.subfolders"
        :key="subfolder.id"
        :folder="subfolder"
        :current-workflow-id="currentWorkflowId"
        :level="level + 1"
        :is-last-child="false"
        :dragging-item="draggingItem"
        :drop-target="dropTarget"
        :drop-position="dropPosition"
        @select-workflow="$emit('select-workflow', $event)"
        @create-workflow="$emit('create-workflow', $event)"
        @delete-workflow="$emit('delete-workflow', $event)"
        @delete-folder="$emit('delete-folder', $event)"
        @rename-workflow="(id, name) => $emit('rename-workflow', id, name)"
        @rename-folder="(id, name) => $emit('rename-folder', id, name)"
        @toggle-folder="$emit('toggle-folder', $event)"
        @drag-start="(data, event) => $emit('drag-start', data, event)"
        @drag-enter="
          (data, position, event) => $emit('drag-enter', data, position, event)
        "
        @drag-leave="$emit('drag-leave')"
        @drop="(data, position) => $emit('drop', data, position)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from "vue";
import type { WorkflowFolder, Workflow } from "../../stores/workflow";

const props = defineProps<{
  folder: WorkflowFolder;
  currentWorkflowId: string | null;
  level: number;
  isLastChild?: boolean;
  draggingItem?: any;
  dropTarget?: any;
  dropPosition?: "before" | "after" | "inside" | null;
}>();

const emit = defineEmits<{
  (e: "select-workflow", workflowId: string): void;
  (e: "create-workflow", folderId: string): void;
  (e: "delete-workflow", workflowId: string): void;
  (e: "rename-workflow", workflowId: string, newTitle: string): void;
  (e: "delete-folder", folderId: string): void;
  (e: "rename-folder", folderId: string, newName: string): void;
  (e: "toggle-folder", folder: WorkflowFolder): void;
  (e: "drag-start", data: any, event: DragEvent): void;
  (
    e: "drag-enter",
    data: any,
    position: "before" | "after" | "inside",
    event: DragEvent
  ): void;
  (e: "drag-leave"): void;
  (e: "drop", data: any, position: "before" | "after" | "inside"): void;
}>();

// 重命名状态
const renamingWorkflowId = ref<string | null>(null);
const folderRenameValue = ref("");
const workflowRenameValue = ref("");

// 判断是否正在重命名
const isFolderRenaming = ref(false);
const isWorkflowRenaming = (workflowId: string) =>
  renamingWorkflowId.value === workflowId;

// 自动聚焦并选中文本的指令
const vAutoFocusSelect = {
  mounted(el: HTMLInputElement) {
    nextTick(() => {
      el.focus();
      el.select();
    });
  },
};

// 文件夹点击
function handleFolderClick() {
  if (!isFolderRenaming.value) {
    emit("toggle-folder", props.folder);
  }
}

// 文件夹键盘事件
function handleFolderKeydown(e: KeyboardEvent) {
  if (e.key === "F2") {
    e.preventDefault();
    e.stopPropagation();
    folderRenameValue.value = props.folder.name;
    isFolderRenaming.value = true;
  }
}

// 保存文件夹重命名
function saveFolderRename() {
  if (
    folderRenameValue.value.trim() &&
    folderRenameValue.value !== props.folder.name
  ) {
    emit("rename-folder", props.folder.id, folderRenameValue.value.trim());
  }
  isFolderRenaming.value = false;
}

// 文件夹重命名键盘事件
function handleFolderRenameKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault();
    saveFolderRename();
  } else if (e.key === "Escape") {
    e.preventDefault();
    isFolderRenaming.value = false;
  }
}

// 工作流点击
function handleWorkflowClick(workflowId: string) {
  if (!isWorkflowRenaming(workflowId)) {
    emit("select-workflow", workflowId);
  }
}

// 工作流键盘事件
function handleWorkflowKeydown(e: KeyboardEvent, workflow: Workflow) {
  if (e.key === "F2") {
    e.preventDefault();
    e.stopPropagation();
    workflowRenameValue.value = workflow.title;
    renamingWorkflowId.value = workflow.id;
  }
}

// 保存工作流重命名
function saveWorkflowRename(workflowId: string, originalTitle: string) {
  if (workflowRenameValue.value.trim()) {
    emit("rename-workflow", workflowId, workflowRenameValue.value.trim());
  } else {
    // 如果为空，保持原标题
    emit("rename-workflow", workflowId, originalTitle);
  }
  renamingWorkflowId.value = null;
}

// 工作流重命名键盘事件
function handleWorkflowRenameKeydown(
  e: KeyboardEvent,
  workflowId: string,
  originalTitle: string
) {
  if (e.key === "Enter") {
    e.preventDefault();
    saveWorkflowRename(workflowId, originalTitle);
  } else if (e.key === "Escape") {
    e.preventDefault();
    renamingWorkflowId.value = null;
  }
}

// 拖拽处理
function handleDragStart(
  event: DragEvent,
  type: "folder" | "workflow",
  data: any
) {
  const item = {
    type,
    id: data.id,
    name: type === "folder" ? data.name : data.title || "无标题",
    data,
  };
  emit("drag-start", item, event);
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();

  // 在 dragover 中持续更新文件夹位置判断
  handleDragEnter(e, "folder", props.folder);
}

function handleWorkflowDragOver(e: DragEvent, workflow: Workflow) {
  e.preventDefault();
  e.stopPropagation();

  // 在 dragover 中持续更新工作流位置判断
  handleDragEnter(e, "workflow", workflow);
}

function handleDragEnter(
  event: DragEvent,
  type: "folder" | "workflow",
  data: any
) {
  event.stopPropagation();

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const y = event.clientY - rect.top;
  const height = rect.height;

  let position: "before" | "after" | "inside";

  if (type === "folder") {
    // 文件夹被拖入时：上1/4为before，下1/4为after，中间1/2为inside
    if (y < height * 0.25) {
      position = "before";
    } else if (y > height * 0.75) {
      position = "after";
    } else {
      position = "inside";
    }
  } else {
    // 工作流被拖入时：上半部分为before，下半部分为after
    position = y <= height / 2 ? "before" : "after";
  }

  emit("drag-enter", { type, id: data.id, data }, position, event);
}

function handleDragLeave() {
  // emit("drag-leave");
}

function handleDrop(
  event: DragEvent,
  _type: "folder" | "workflow",
  _data: any
) {
  event.preventDefault();
  event.stopPropagation();

  // 使用已经计算好的 dropTarget 和 dropPosition
  if (props.dropTarget && props.dropPosition) {
    emit("drop", props.dropTarget, props.dropPosition);
  }
}
</script>

<style scoped>
.tree-item {
  user-select: none;
}

.tree-row {
  display: flex;
  align-items: center;
  height: 32px;
  cursor: pointer;
  color: #374151;
  font-size: 13px;
  transition: background 0.15s;
  border-radius: 6px;
  margin: 0;
}

.tree-row:hover {
  background: #f3f4f6;
}

.tree-row.active {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1d4ed8;
  font-weight: 500;
}

.chevron {
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  flex-shrink: 0;
  transition: transform 0.2s;
  margin-right: 4px;
}

.chevron.expanded {
  transform: rotate(90deg);
}

.chevron-spacer {
  width: 18px;
  height: 14px;
  flex-shrink: 0;
}

.icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 6px 0 0;
  color: #9ca3af;
  flex-shrink: 0;
}

.folder-icon {
  color: #64748b;
}

.tree-row.active .icon {
  color: #3b82f6;
}

.label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
  padding-right: 4px;
}

.tree-row:hover .actions {
  opacity: 1;
}

.action-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.action-btn.delete:hover {
  background: #fee2e2;
  color: #dc2626;
}

.tree-children {
  position: relative;
}

/* 重命名输入框 */
.rename-input {
  flex: 1;
  min-width: 60px;
  height: 24px;
  line-height: 22px;
  padding: 0 6px;
  border: 1px solid #3b82f6;
  border-radius: 4px;
  outline: none;
  font-size: 13px;
  background: white;
  color: #374151;
  box-sizing: border-box;
}

.rename-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.workflow-item-wrapper {
  position: relative;
}

/* 拖拽悬停高亮 - 文件夹内部 */
.folder-row.drag-over-inside {
  background: rgba(59, 130, 246, 0.15) !important;
  outline: 1px solid #3b82f6;
  outline-offset: -1px;
}

/* 拖拽插入位置指示线 */
.drop-indicator {
  position: absolute;
  left: 12px;
  right: 0px;
  height: 2px;
  background: #3b82f6;
  pointer-events: none;
  z-index: 10;
}

.drop-indicator.top {
  top: -1px;
}

.drop-indicator.bottom {
  bottom: -1px;
}

.drop-indicator::before {
  content: "";
  position: absolute;
  left: -4px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3b82f6;
}
</style>
