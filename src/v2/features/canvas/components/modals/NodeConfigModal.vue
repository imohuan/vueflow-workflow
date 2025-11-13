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
      :show-back-button="true"
      :center-width="500"
      :min-left-width="280"
      :min-right-width="320"
      back-text="返回工作流"
      @resize="handleResize"
      @back="handleClose"
    >
      <!-- 左侧面板：变量面板 -->
      <template #left>
        <VariablePanel
          title="可用变量"
          :variables="availableVariables"
          :show-pinned="true"
          :show-search="true"
          :show-view-mode-toggle="true"
          :view-mode-options="leftViewModeOptions"
          :default-view-mode="leftViewMode"
          @update:view-mode="leftViewMode = $event"
        />
      </template>

      <!-- 中间面板：节点配置面板 -->
      <template #centerHeader>
        <div class="flex items-center justify-between w-full">
          <div class="flex gap-2">
            <!-- 图标 -->
            <IconNodeEditor
              class="h-5 w-5 text-white bg-blue-500 rounded-md p-1 overflow-hidden"
            />

            <h2 class="text-base font-semibold text-slate-900">
              {{ selectedNode.data?.label }} - 配置
            </h2>
          </div>
          <button
            class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isExecuting || !selectedNode"
            @click="handleExecuteNode"
          >
            <IconPlay v-if="!isExecuting" class="h-4 w-4" />
            <IconLoading v-else class="h-4 w-4 animate-spin" />
            <span>{{ isExecuting ? "执行中..." : "执行" }}</span>
          </button>
        </div>
      </template>

      <template #center>
        <NodeConfigPanel />
      </template>

      <!-- 右侧面板：输出/日志 -->
      <template #right>
        <!-- 编辑模式：显示代码编辑器 -->
        <div v-if="isEditing" class="h-full flex flex-col">
          <div
            class="shrink-0 flex items-center justify-between border-b border-slate-200 px-4 py-3"
          >
            <span class="text-sm font-semibold text-slate-900">编辑输出</span>
            <div class="flex items-center gap-2">
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
          </div>
          <CodeEditor
            v-model="editorContent"
            language="json"
            class="flex-1"
            :options="{
              minimap: { enabled: false },
              fontSize: 13,
            }"
          />
        </div>

        <!-- 有执行结果：显示变量面板 -->
        <VariablePanel
          v-else-if="hasExecutionResult"
          title="输出"
          :variables="executionResultVariables"
          :show-search="true"
          :show-view-mode-toggle="true"
          :view-mode-options="rightViewModeOptions"
          :default-view-mode="rightViewMode"
          :enable-drag="false"
          :show-json-selector="false"
          :expand-all-json="true"
          empty-text="暂无执行结果"
          empty-hint="执行节点后显示结果"
          @update:view-mode="(mode) => (rightViewMode = mode)"
          ref="rightVariablePanel"
        >
          <!-- 标题后：迭代信息和执行状态 -->
          <template #title-suffix>
            <div class="flex items-center gap-2">
              <!-- 迭代信息徽章 -->
              <span
                v-if="hasIterationHistory && currentIterationData"
                class="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded"
                :title="`迭代 ${currentIterationPage}，索引：${currentIterationData.iterationIndex}`"
              >
                迭代 {{ currentIterationPage }}
              </span>
              <NodeExecutionStatus
                :status="executionStatus"
                :is-executing="isExecuting"
              />
            </div>
          </template>
          <!-- 右侧操作：编辑按钮和分页控件 -->
          <template #header-actions>
            <!-- 迭代历史分页控件 -->
            <div
              v-if="hasIterationHistory"
              class="h-7 flex items-center gap-0.5 mr-1.5 px-1.5 bg-slate-100 rounded"
            >
              <button
                class="p-0 text-slate-600 hover:text-slate-900 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                :disabled="currentIterationPage <= 1"
                @click="handlePreviousPage"
                title="上一次迭代"
              >
                <IconArrowLeft class="h-3.5 w-3.5" />
              </button>
              <span
                class="text-xs font-medium font-mono text-slate-700 min-w-[38px] text-center leading-none"
              >
                {{ currentIterationPage }}/{{
                  iterationHistory?.totalIterations
                }}
              </span>
              <button
                class="p-0 text-slate-600 hover:text-slate-900 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                :disabled="
                  currentIterationPage >=
                  (iterationHistory?.totalIterations || 0)
                "
                @click="handleNextPage"
                title="下一次迭代"
              >
                <IconArrowRight class="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              class="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              @click="handleEdit"
              title="编辑"
            >
              <IconEdit class="h-4 w-4" />
            </button>
          </template>
        </VariablePanel>

        <!-- 没有执行结果：显示原有的输出/日志切换界面 -->
        <div v-else class="h-full flex flex-col">
          <div
            class="shrink-0 flex items-center justify-between border-b border-slate-200 px-4 py-3"
          >
            <ToggleButtonGroup
              v-model="rightPanelMode"
              :options="rightPanelOptions"
            />
          </div>
          <div class="flex-1 overflow-auto variable-scroll">
            <!-- 执行错误时显示错误信息 -->
            <div
              v-if="
                executionStatus?.status === 'error' && executionStatus.error
              "
              class="px-4 py-6"
            >
              <div class="rounded-lg border border-red-200 bg-red-50 p-3">
                <div class="flex items-start gap-2">
                  <IconErrorCircle
                    class="h-4 w-4 shrink-0 text-red-500 mt-0.5"
                  />
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium text-red-800">执行错误</p>
                    <pre
                      class="mt-1 text-xs text-red-700 whitespace-pre-wrap"
                      >{{ executionStatus.error }}</pre
                    >
                  </div>
                </div>
              </div>
            </div>
            <!-- 无执行结果时显示提示 -->
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
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { storeToRefs } from "pinia";
import { useVueFlow } from "@vue-flow/core";
import type { Node } from "@vue-flow/core";
import { useMessage } from "naive-ui";
import {
  ModalShell,
  SplitLayout,
  ToggleButtonGroup,
} from "../../../../components/ui";
import NodeConfigPanel from "../node-editor/NodeConfigPanel.vue";
import VariablePanel from "../../../../components/variables/VariablePanel.vue";
import IconEmptyNode from "@/icons/IconEmptyNode.vue";
import IconPlay from "@/icons/IconPlay.vue";
import IconLoading from "@/icons/IconLoading.vue";
import IconErrorCircle from "@/icons/IconErrorCircle.vue";
import IconNodeEditor from "@/icons/IconNodeEditor.vue";
import IconEdit from "@/icons/IconEdit.vue";
import IconArrowLeft from "@/icons/IconArrowLeft.vue";
import IconArrowRight from "@/icons/IconArrowRight.vue";
import NodeExecutionStatus from "../status/NodeExecutionStatus.vue";
import CodeEditor from "@/v2/components/code/CodeEditor.vue";
import { useUiStore } from "@/v2/stores/ui";
import { useCanvasStore } from "@/v2/stores/canvas";
import { useVariableContext } from "@/v2/composables/useVariableContext";
import type { VariableTreeNode } from "@/v2/features/canvas/utils/variableResolver";
import { useVueFlowEvents } from "../../../vueflow";
import { eventBusUtils } from "../../../vueflow/events";
import type {
  ExecutionNodeCompleteEvent,
  ExecutionNodeErrorEvent,
  ExecutionCacheHitEvent,
} from "../../../vueflow/executor";
import { jsonToVariableTree } from "../../../../components/json/jsonToVariableTree";

const uiStore = useUiStore();
const canvasStore = useCanvasStore();
const message = useMessage();
const { findNode } = useVueFlow();
const { selectedNodeId } = storeToRefs(uiStore);
const { variableTree: availableVariables } = useVariableContext();

// 事件系统
const events = useVueFlowEvents();

/** 当前选中的节点 */
const selectedNode = computed<Node | undefined>(() => {
  if (!selectedNodeId.value) return undefined;
  return findNode(selectedNodeId.value);
});

const leftWidth = ref(320);
const rightWidth = ref(320);
const rightPanelMode = ref<"output" | "logs">("output");
const isEditing = ref(false);
const editorContent = ref("");
const originalEditorContent = ref("");
const rightVariablePanel = ref<InstanceType<typeof VariablePanel> | null>(null);

// 左侧面板状态
const leftViewMode = ref<"schema" | "json">("schema");

// 右侧面板状态
const rightViewMode = ref<"schema" | "json">("json");

const leftViewModeOptions = [
  { value: "schema", label: "Schema" },
  { value: "json", label: "JSON" },
];

const rightViewModeOptions = [
  { value: "schema", label: "Schema" },
  { value: "json", label: "JSON" },
];

// 执行相关状态
const isExecuting = ref(false);

// 迭代历史分页状态
const currentIterationPage = ref(1);

/** 当前节点的迭代历史 */
const iterationHistory = computed(() => {
  if (!selectedNodeId.value) return null;
  const node = canvasStore.nodes.find(
    (n: any) => n.id === selectedNodeId.value
  );
  if (!node) return null;
  return node.data?.iterationHistory;
});

/** 是否有迭代历史 */
const hasIterationHistory = computed(() => {
  return !!iterationHistory.value && iterationHistory.value.totalIterations > 0;
});

/** 当前迭代的数据（如果有迭代历史） */
const currentIterationData = computed(() => {
  if (!hasIterationHistory.value || !iterationHistory.value) return null;
  const page = currentIterationPage.value;
  const iterations = iterationHistory.value.iterations;
  if (page < 1 || page > iterations.length) return null;
  return iterations[page - 1];
});

/** 当前节点的执行状态（与 NodeResultPreviewPanel.vue 保持一致） */
const executionStatus = computed(() => {
  const nodeId = selectedNodeId.value;
  if (!nodeId) return null;

  // 优先使用迭代历史数据
  if (hasIterationHistory.value && currentIterationData.value) {
    return {
      status: currentIterationData.value.executionStatus || "success",
      result: currentIterationData.value.executionResult,
      error: currentIterationData.value.executionError,
      duration: currentIterationData.value.executionDuration,
      timestamp: currentIterationData.value.executionTimestamp,
    };
  }

  // 否则使用 canvasStore 的执行状态数据
  return canvasStore.getNodeExecutionStatus(nodeId);
});

/** 是否有执行结果 */
const hasExecutionResult = computed(() => {
  return !!executionStatus.value?.result;
});

/** 执行结果转换为变量树 */
const executionResultVariables = computed<VariableTreeNode[]>(() => {
  if (!hasExecutionResult.value || !executionStatus.value?.result) {
    return [];
  }

  try {
    const result = executionStatus.value.result;
    // 将执行结果转换为变量树
    const tree = jsonToVariableTree(result);
    // jsonToVariableTree 返回单个节点，需要包装成数组
    return tree ? [tree] : [];
  } catch (error) {
    console.error("[NodeConfigModal] 转换执行结果为变量树失败:", error);
    return [];
  }
});

const rightPanelOptions = [
  { value: "output", label: "输出" },
  { value: "logs", label: "日志" },
];

// 监听迭代历史变化，同步当前页码
watch(
  [selectedNodeId, iterationHistory],
  () => {
    if (hasIterationHistory.value && iterationHistory.value) {
      // 如果有迭代历史，同步当前页码
      currentIterationPage.value = iterationHistory.value.currentPage || 1;
    } else {
      // 没有迭代历史，重置为第一页
      currentIterationPage.value = 1;
    }
  },
  { immediate: true }
);

// 处理编辑
const handleEdit = () => {
  // 初始化编辑器内容为当前执行结果的 JSON
  if (executionStatus.value?.result) {
    try {
      editorContent.value = JSON.stringify(
        executionStatus.value.result,
        null,
        2
      );
      originalEditorContent.value = editorContent.value;
    } catch (error) {
      console.error("初始化编辑器内容失败:", error);
      editorContent.value = "{}";
      originalEditorContent.value = "{}";
    }
  } else {
    editorContent.value = "{}";
    originalEditorContent.value = "{}";
  }
  isEditing.value = true;
};

// 处理保存
const handleSave = () => {
  try {
    // 验证 JSON 格式
    const parsed = JSON.parse(editorContent.value);
    // 保存成功，更新执行结果
    if (selectedNode.value) {
      canvasStore.updateNode(selectedNode.value.id, {
        data: {
          ...selectedNode.value.data,
          executionResult: parsed,
          executionTimestamp: Date.now(),
        },
      });
    }
    originalEditorContent.value = editorContent.value;
    isEditing.value = false;
    message.success("保存成功");
  } catch (error) {
    console.error("保存失败：JSON 格式错误", error);
    message.error("保存失败：JSON 格式错误");
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
 * 执行当前节点（使用事件总线）
 */
function handleExecuteNode() {
  if (!selectedNode.value) {
    message.warning("请先选择一个节点");
    return;
  }
  const nodeId = selectedNode.value.id;
  // 设置执行状态
  isExecuting.value = true;
  // 使用事件总线触发节点执行
  eventBusUtils.emit("node:execute", { nodeId });
  console.log("[NodeConfigModal] 触发节点执行:", nodeId);
}

/**
 * 处理节点执行完成事件
 */
function handleNodeComplete(payload: ExecutionNodeCompleteEvent) {
  // 只处理当前选中节点的执行结果
  if (payload.nodeId === selectedNodeId.value) {
    isExecuting.value = false;
    // 切换到输出标签页
    rightPanelMode.value = "output";
    console.log("[NodeConfigModal] 节点执行完成:", payload);
  }
}

/**
 * 处理节点执行错误事件
 */
function handleNodeError(payload: ExecutionNodeErrorEvent) {
  // 只处理当前选中节点的执行错误
  if (payload.nodeId === selectedNodeId.value) {
    isExecuting.value = false;
    // 切换到输出标签页
    rightPanelMode.value = "output";
    console.error("[NodeConfigModal] 节点执行错误:", payload);
  }
}

/**
 * 处理节点执行开始事件
 */
function handleNodeStart(payload: { nodeId: string }) {
  // 只处理当前选中节点的执行开始
  if (payload.nodeId === selectedNodeId.value) {
    isExecuting.value = true;
  }
}

/**
 * 处理节点缓存命中事件
 */
function handleCacheHit(payload: ExecutionCacheHitEvent) {
  // 只处理当前选中节点的缓存命中
  if (payload.nodeId === selectedNodeId.value) {
    isExecuting.value = false;

    // 更新节点数据，确保缓存结果可以被读取（参考 CanvasView.vue 的处理方式）
    const node = canvasStore.nodes.find((n: any) => n.id === payload.nodeId);
    if (node) {
      canvasStore.updateNode(payload.nodeId, {
        data: {
          ...node.data,
          executionStatus: "cached",
          executionResult: payload.cachedResult.outputs,
          executionDuration: payload.cachedResult.duration,
          executionTimestamp: Date.now(),
        },
      });
    }

    // 切换到输出标签页
    rightPanelMode.value = "output";
    console.log("[NodeConfigModal] 节点使用缓存:", payload);
  }
}

// 监听节点执行事件
onMounted(() => {
  events.on("execution:node:start", handleNodeStart);
  events.on("execution:node:complete", handleNodeComplete);
  events.on("execution:node:error", handleNodeError);
  events.on("execution:cache-hit", handleCacheHit);
});

onBeforeUnmount(() => {
  events.off("execution:node:start", handleNodeStart);
  events.off("execution:node:complete", handleNodeComplete);
  events.off("execution:node:error", handleNodeError);
  events.off("execution:cache-hit", handleCacheHit);
});

/**
 * 切换到指定迭代页
 */
function handleIterationPageChange(page: number) {
  if (!hasIterationHistory.value || !iterationHistory.value) return;
  const totalPages = iterationHistory.value.totalIterations;
  if (page < 1 || page > totalPages) return;
  currentIterationPage.value = page;
  // 同步更新到 store
  if (selectedNodeId.value) {
    canvasStore.setNodeIterationPage(selectedNodeId.value, page);
  }
}

/**
 * 上一页
 */
function handlePreviousPage() {
  if (currentIterationPage.value > 1) {
    handleIterationPageChange(currentIterationPage.value - 1);
  }
}

/**
 * 下一页
 */
function handleNextPage() {
  if (hasIterationHistory.value && iterationHistory.value) {
    if (currentIterationPage.value < iterationHistory.value.totalIterations) {
      handleIterationPageChange(currentIterationPage.value + 1);
    }
  }
}

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
