<!-- 工作流文件树组件 - 用于管理和切换工作流 -->
<template>
  <div class="workflow-tree-container">
    <!-- 标题栏 -->
    <div class="tree-header">
      <h3 class="tree-title">工作流</h3>
      <button class="close-btn" @click="$emit('close')" title="关闭">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <button @click="handleCreateWorkflow" class="tool-btn" title="新建工作流">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M14 3H2a1 1 0 00-1 1v8a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1zm-1 8H3V5h10v6z"
          />
          <path d="M8 6v4M6 8h4" stroke="currentColor" stroke-width="1.5" />
        </svg>
      </button>
      <button @click="handleCreateFolder" class="tool-btn" title="新建文件夹">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M7 3H2a1 1 0 00-1 1v8a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1H8.5L7 3z"
          />
        </svg>
      </button>
    </div>

    <!-- 搜索框 -->
    <div class="search-box">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="search-icon"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索工作流..."
        class="search-input"
      />
    </div>

    <!-- 文件树 -->
    <div class="tree-content">
      <div v-if="filteredFolders.length === 0" class="empty-state">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <p class="empty-text">
          {{ searchQuery ? "未找到工作流" : "暂无工作流" }}
        </p>
        <button
          v-if="!searchQuery"
          @click="handleCreateWorkflow"
          class="create-btn"
        >
          新建工作流
        </button>
      </div>

      <FolderItem
        v-for="(folder, index) in filteredFolders"
        :key="folder.id"
        :folder="folder"
        :current-workflow-id="currentWorkflowId"
        :level="0"
        :is-last-child="index === filteredFolders.length - 1"
        :dragging-item="draggingItem"
        :drop-target="dropTarget"
        :drop-position="dropPosition"
        @select-workflow="handleSelectWorkflow"
        @create-workflow="handleCreateWorkflow"
        @delete-workflow="handleDeleteWorkflow"
        @delete-folder="handleDeleteFolder"
        @rename-workflow="handleRenameWorkflow"
        @rename-folder="handleRenameFolder"
        @toggle-folder="toggleFolder"
        @drag-start="handleDragStart"
        @drag-enter="handleDragEnter"
        @drag-leave="handleDragLeave"
        @drop="handleDrop"
      />
    </div>

    <!-- 拖拽幽灵元素 -->
    <div v-if="draggingItem" class="drag-ghost">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        class="ghost-icon"
      >
        <path
          v-if="draggingItem.type === 'folder'"
          d="M7 3H2a1 1 0 00-1 1v8a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1H8.5L7 3z"
        />
        <path
          v-else
          d="M4 2a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V6.414A2 2 0 0013.414 5L11 2.586A2 2 0 009.586 2H4zm5 2v3h3l-3-3z"
        />
      </svg>
      {{ draggingItem.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import FolderItem from "./WorkflowFolderItem.vue";
import { useWorkflowStore, type WorkflowFolder } from "../../stores/workflow";

const emit = defineEmits<{
  (e: "close"): void;
}>();

const workflowStore = useWorkflowStore();
const { folders, currentWorkflowId } = storeToRefs(workflowStore);

const searchQuery = ref("");

// 拖拽状态
interface DragItem {
  type: "folder" | "workflow";
  id: string;
  name: string;
  data: any;
}

const draggingItem = ref<DragItem | null>(null);
const dropTarget = ref<any>(null);
const dropPosition = ref<"before" | "after" | "inside" | null>(null);

// 搜索过滤
const filteredFolders = computed(() => {
  if (!searchQuery.value) {
    return folders.value;
  }

  const query = searchQuery.value.toLowerCase();

  function filterFolder(folder: WorkflowFolder): WorkflowFolder | null {
    const matchingWorkflows = folder.workflows.filter((w) =>
      w.title.toLowerCase().includes(query)
    );

    const matchingSubfolders = (folder.subfolders || [])
      .map(filterFolder)
      .filter((f): f is WorkflowFolder => f !== null);

    if (matchingWorkflows.length > 0 || matchingSubfolders.length > 0) {
      return {
        ...folder,
        workflows: matchingWorkflows,
        subfolders: matchingSubfolders,
        expanded: true,
      };
    }

    return null;
  }

  return folders.value
    .map(filterFolder)
    .filter((f): f is WorkflowFolder => f !== null);
});

function toggleFolder(folder: WorkflowFolder) {
  workflowStore.toggleFolder(folder);
}

function handleSelectWorkflow(workflowId: string) {
  workflowStore.selectWorkflow(workflowId);
}

function handleCreateWorkflow(folderId?: string | PointerEvent) {
  const targetFolderId = typeof folderId === "string" ? folderId : undefined;
  const newWorkflowId = workflowStore.createWorkflow(targetFolderId);
  if (newWorkflowId) {
    // 自动选择新创建的工作流
    workflowStore.selectWorkflow(newWorkflowId);
  }
}

function handleDeleteWorkflow(workflowId: string) {
  if (confirm("确定要删除这个工作流吗？")) {
    workflowStore.deleteWorkflow(workflowId);
  }
}

function handleRenameWorkflow(workflowId: string, newTitle: string) {
  workflowStore.renameWorkflow(workflowId, newTitle);
}

function handleCreateFolder() {
  workflowStore.createFolder();
}

function handleDeleteFolder(folderId: string) {
  if (confirm("确定要删除这个文件夹吗？文件夹中的所有工作流也将被删除。")) {
    workflowStore.deleteFolder(folderId);
  }
}

function handleRenameFolder(folderId: string, newName: string) {
  workflowStore.renameFolder(folderId, newName);
}

// 拖拽处理
function handleDragStart(item: DragItem, event: DragEvent) {
  draggingItem.value = item;

  // 创建透明的拖拽图像
  const ghost = document.createElement("div");
  ghost.style.opacity = "0";
  document.body.appendChild(ghost);
  event.dataTransfer?.setDragImage(ghost, 0, 0);
  setTimeout(() => document.body.removeChild(ghost), 0);

  const handleDragEnd = () => {
    draggingItem.value = null;
    dropTarget.value = null;
    dropPosition.value = null;
    document.removeEventListener("dragend", handleDragEnd);
  };

  document.addEventListener("dragend", handleDragEnd);
}

function handleDragEnter(
  target: any,
  position: "before" | "after" | "inside",
  _event: DragEvent
) {
  if (!draggingItem.value) return;

  // 不能拖到自己上
  if (draggingItem.value.id === target.id) {
    dropTarget.value = null;
    dropPosition.value = null;
    return;
  }

  // 如果是工作流拖到文件夹上，强制使用 inside（移入文件夹）
  let finalPosition = position;
  if (draggingItem.value.type === "workflow" && target.type === "folder") {
    finalPosition = "inside";
  }

  dropTarget.value = target;
  dropPosition.value = finalPosition;
}

function handleDragLeave() {
  // 可以添加一些清理逻辑
}

function handleDrop(target: any, position: "before" | "after" | "inside") {
  if (!draggingItem.value) return;

  const dragType = draggingItem.value.type;
  const dragId = draggingItem.value.id;
  const targetType = target.type;
  const targetId = target.id;

  // 不能拖到自己上
  if (dragId === targetId) {
    draggingItem.value = null;
    dropTarget.value = null;
    dropPosition.value = null;
    return;
  }

  // 根据拖拽类型调用相应的移动方法
  if (dragType === "workflow") {
    workflowStore.moveWorkflow(dragId, targetId, targetType, position);
  } else if (dragType === "folder") {
    workflowStore.moveFolder(dragId, targetId, targetType, position);
  }

  draggingItem.value = null;
  dropTarget.value = null;
  dropPosition.value = null;
}
</script>

<style scoped>
.workflow-tree-container {
  width: 280px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-right: 1px solid #e5e7eb;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.08);
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.tree-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.close-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #6b7280;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.toolbar {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}

.tool-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: #6b7280;
  transition: all 0.15s;
  background: transparent;
  border: none;
  cursor: pointer;
}

.tool-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
}

.search-icon {
  color: #9ca3af;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  color: #374151;
  background: transparent;
}

.search-input::placeholder {
  color: #9ca3af;
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 16px;
  min-height: 0;
}

.tree-content::-webkit-scrollbar {
  width: 8px;
}

.tree-content::-webkit-scrollbar-track {
  background: transparent;
}

.tree-content::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
  border: 2px solid white;
  background-clip: padding-box;
}

.tree-content::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
  background-clip: padding-box;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-state svg {
  color: #d1d5db;
  margin-bottom: 12px;
}

.empty-text {
  color: #9ca3af;
  font-size: 13px;
  margin: 0 0 16px 0;
}

.create-btn {
  padding: 6px 16px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* 拖拽幽灵元素 */
.drag-ghost {
  position: absolute;
  top: 6px;
  left: 6px;
  display: flex;
  align-items: center;
  padding: 5px 10px;
  background: rgba(59, 130, 246, 0.95);
  color: white;
  border-radius: 4px;
  font-size: 13px;
  pointer-events: none !important;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  user-select: none;
  max-width: calc(100% - 12px);
  overflow: hidden;
  text-overflow: ellipsis;
}

.drag-ghost * {
  pointer-events: none !important;
}

.ghost-icon {
  margin-right: 6px;
  flex-shrink: 0;
}
</style>
