<template>
  <ModalShell
    v-model="uiStore.nodeConfigModalVisible"
    title="节点配置"
    width="full"
    padding="none"
    @close="handleClose"
  >
    <!-- 未选中节点时 -->
    <div
      v-if="!selectedNode"
      class="flex flex-col items-center justify-center h-full px-8 py-12"
    >
      <IconEmptyNode />
      <p class="mt-5 text-[15px] font-medium text-center text-slate-600">
        选择一个节点进行编辑
      </p>
    </div>

    <!-- 已选中节点时 -->
    <SplitLayout
      v-else
      center-title="节点配置"
      :show-back-button="false"
      :center-width="500"
      :min-left-width="0.2"
      :min-right-width="0.2"
      @resize="handleResize"
    >
      <!-- 左侧面板：变量面板 -->
      <template #left>
        <VariablePanel :variables="availableVariables" />
      </template>

      <!-- 中间面板：节点配置面板 -->
      <template #center>
        <NodeConfigPanel />
      </template>

      <!-- 右侧面板：输出/日志 -->
      <template #right>
        <div class="h-full flex flex-col">
          <div
            class="shrink-0 flex items-center justify-between border-b border-slate-200 px-4 py-3"
          >
            <ToggleButtonGroup
              v-model="rightPanelMode"
              :options="rightPanelOptions"
            />
            <!-- 编辑模式：显示保存和取消按钮 -->
            <div v-if="isEditing" class="flex items-center gap-2">
              <button
                class="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 rounded transition-colors"
                @click="handleCancel"
              >
                取消
              </button>
              <button
                class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                @click="handleSave"
              >
                保存
              </button>
            </div>
            <!-- 查看模式且为 output：显示编辑图标 -->
            <button
              v-else-if="rightPanelMode === 'output'"
              class="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              @click="handleEdit"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          </div>
          <div class="flex-1 overflow-auto">
            <!-- 编辑模式：显示代码编辑器 -->
            <CodeEditor
              v-if="isEditing"
              v-model="editorContent"
              language="json"
              class="h-full"
              :options="{
                minimap: { enabled: false },
                fontSize: 13,
              }"
            />
            <!-- 查看模式：显示原有内容 -->
            <div v-else class="px-4 py-6">
              <p class="text-sm text-slate-500">
                Execute this node to view data or set mock data
              </p>
            </div>
          </div>
        </div>
      </template>
    </SplitLayout>
  </ModalShell>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useVueFlow } from "@vue-flow/core";
import type { Node } from "@vue-flow/core";
import {
  ModalShell,
  SplitLayout,
  ToggleButtonGroup,
} from "../../../../components/ui";
import NodeConfigPanel from "../panels/NodeConfigPanel.vue";
import VariablePanel from "../panels/VariablePanel.vue";
import IconEmptyNode from "@/icons/IconEmptyNode.vue";
import CodeEditor from "@/v2/components/code/CodeEditor.vue";
import { useUiStore } from "../../../../stores/ui";
import { useCanvasStore } from "../../../../stores/canvas";
import { buildVariableContext } from "@/v1/workflow/variables/variableResolver";
import type { VariableTreeNode } from "@/v1/workflow/variables/variableResolver";

const uiStore = useUiStore();
const canvasStore = useCanvasStore();
const { findNode } = useVueFlow();
const { selectedNodeId } = storeToRefs(uiStore);

/** 当前选中的节点 */
const selectedNode = computed<Node | undefined>(() => {
  if (!selectedNodeId.value) return undefined;
  return findNode(selectedNodeId.value);
});

/** 可用变量列表 */
const availableVariables = computed<VariableTreeNode[]>(() => {
  if (!selectedNodeId.value) {
    return [];
  }
  try {
    const nodes = (canvasStore.nodes || []) as Node[];
    const edges = (canvasStore.edges || []) as any[];
    const { tree } = buildVariableContext(selectedNodeId.value, nodes, edges);
    return tree;
  } catch (error) {
    console.error("[NodeConfigModal] 获取可用变量失败:", error);
    return [];
  }
});

const leftWidth = ref(320);
const rightWidth = ref(320);
const rightPanelMode = ref<"output" | "logs">("output");
const isEditing = ref(false);
const editorContent = ref("");
const originalEditorContent = ref("");

const rightPanelOptions = [
  { value: "output", label: "输出" },
  { value: "logs", label: "日志" },
];

// 初始化编辑器内容
const initEditorContent = () => {
  try {
    // 这里可以根据节点数据初始化编辑器内容
    editorContent.value = "{}";
  } catch (error) {
    console.error("初始化编辑器内容失败:", error);
    editorContent.value = "";
  }
};

// 监听编辑模式，初始化编辑器内容
watch(
  () => isEditing.value,
  (editing) => {
    if (editing) {
      if (!editorContent.value) {
        initEditorContent();
      }
      // 保存原始内容
      originalEditorContent.value = editorContent.value;
    }
  }
);

// 初始化编辑器内容
initEditorContent();

// 处理编辑
const handleEdit = () => {
  isEditing.value = true;
};

// 处理保存
const handleSave = () => {
  try {
    // 验证 JSON 格式
    JSON.parse(editorContent.value);
    // 保存成功，更新原始内容
    originalEditorContent.value = editorContent.value;
    isEditing.value = false;
    console.log("保存成功:", editorContent.value);
  } catch (error) {
    console.error("保存失败：JSON 格式错误", error);
    // 这里可以添加错误提示
    alert("保存失败：JSON 格式错误");
  }
};

// 处理取消
const handleCancel = () => {
  // 恢复原始内容
  editorContent.value = originalEditorContent.value;
  isEditing.value = false;
};

const handleResize = (data: { leftWidth: number; rightWidth: number }) => {
  leftWidth.value = data.leftWidth;
  rightWidth.value = data.rightWidth;
};

/**
 * 关闭模态框
 */
function handleClose() {
  uiStore.closeNodeConfigModal();
  uiStore.clearNodeSelection();
}
</script>

<style scoped>
@import "@/v2/style.css";
</style>
