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
      :min-left-width="0.2"
      :min-right-width="0.2"
      back-text="返回工作流"
      @resize="handleResize"
      @back="handleClose"
    >
      <!-- 左侧面板：变量面板 -->
      <template #left>
        <div class="h-full flex flex-col">
          <div class="shrink-0 border-b border-slate-200 px-4 py-3">
            <div class="flex items-center justify-between gap-3">
              <h3
                class="text-sm font-semibold text-slate-900 uppercase tracking-wide"
              >
                可用变量
              </h3>
              <div class="flex items-center gap-2">
                <!-- 搜索区域（固定高度容器） -->
                <div class="h-7 flex items-center relative">
                  <div
                    class="overflow-hidden transition-all duration-200 ease-out"
                    :style="{
                      width: isSearchExpanded ? '8rem' : '1.75rem',
                      opacity: isSearchExpanded ? 1 : 0,
                    }"
                  >
                    <n-input
                      v-show="isSearchExpanded"
                      v-model:value="searchQuery"
                      size="small"
                      placeholder="搜索..."
                      class="w-32 n-input-gray"
                      @blur="handleSearchBlur"
                      @keyup.escape="isSearchExpanded = false"
                      ref="searchInputRef"
                    >
                      <template #prefix>
                        <IconSearch class="w-4 h-4 text-slate-400" />
                      </template>
                    </n-input>
                  </div>
                  <button
                    v-show="!isSearchExpanded"
                    @click="expandSearch"
                    class="absolute left-0 h-7 w-7 flex items-center justify-center text-slate-600 cursor-pointer transition-opacity duration-200"
                  >
                    <IconSearch class="w-4 h-4" />
                  </button>
                </div>
                <!-- 按钮组 -->
                <ToggleButtonGroup
                  v-model="leftViewMode"
                  :options="leftViewModeOptions"
                />
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-auto variable-scroll px-4 py-4">
            <!-- Schema 视图：VariableTreeItem -->
            <template v-if="leftViewMode === 'schema'">
              <div
                v-if="filteredVariables.length === 0"
                class="flex items-center justify-center p-5"
              >
                <div
                  class="text-[11px] text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-md p-4 text-center"
                >
                  暂无可用变量<br />
                  <span class="text-[10px]">执行上游节点后显示</span>
                </div>
              </div>
              <div v-else class="space-y-1">
                <VariableTreeItem
                  v-for="node in filteredVariables"
                  :key="node.id"
                  :node="node"
                  :level="0"
                />
              </div>
            </template>

            <!-- JSON 视图：JsonTreeViewer -->
            <template v-else-if="leftViewMode === 'json'">
              <!-- 下拉框和数据条数 -->
              <div class="shrink-0 flex items-center gap-2 pb-2">
                <div class="w-32">
                  <n-select
                    v-model:value="selectedVariableNode"
                    :options="variableNodeOptions"
                    size="small"
                    placeholder="选择变量"
                  />
                </div>
                <span class="text-xs text-slate-500 font-mono">
                  {{ dataItemCount }}
                </span>
              </div>
              <JsonTreeViewer
                v-if="selectedVariableData"
                :data="selectedVariableData"
              />
              <div
                v-else
                class="flex items-center justify-center p-5 text-sm text-slate-400"
              >
                请选择一个变量节点
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- 中间面板：节点配置面板 -->
      <template #centerHeader>
        <div class="flex items-center justify-between w-full">
          <h2 class="text-base font-semibold text-slate-900">节点配置</h2>
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
          <div class="flex-1 overflow-auto variable-scroll">
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
            <!-- 查看模式：显示执行结果或提示 -->
            <div v-else class="h-full">
              <!-- 有执行结果时显示结果 -->
              <div v-if="executionStatus?.result" class="h-full">
                <CodeEditor
                  :model-value="formattedExecutionResult"
                  language="json"
                  class="h-full"
                  :options="{
                    minimap: { enabled: false },
                    fontSize: 13,
                    readOnly: true,
                  }"
                />
              </div>
              <!-- 执行错误时显示错误信息 -->
              <div
                v-else-if="
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
        </div>
      </template>
    </SplitLayout>
  </ModalShell>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { storeToRefs } from "pinia";
import { useVueFlow } from "@vue-flow/core";
import type { Node, Edge } from "@vue-flow/core";
import { useMessage, NInput, NSelect } from "naive-ui";
import {
  ModalShell,
  SplitLayout,
  ToggleButtonGroup,
} from "../../../../components/ui";
import NodeConfigPanel from "../panels/NodeConfigPanel.vue";
import VariableTreeItem from "../../../../components/variables/VariableTreeItem.vue";
import JsonTreeViewer from "../../../../components/variables/JsonTreeViewer.vue";
import IconEmptyNode from "@/icons/IconEmptyNode.vue";
import IconPlay from "@/icons/IconPlay.vue";
import IconLoading from "@/icons/IconLoading.vue";
import IconErrorCircle from "@/icons/IconErrorCircle.vue";
import IconSearch from "@/icons/IconSearch.vue";
import CodeEditor from "@/v2/components/code/CodeEditor.vue";
import { useUiStore } from "../../../../stores/ui";
import { useCanvasStore } from "../../../../stores/canvas";
import { useVueFlowEvents } from "../../../vueflow";
import { eventBusUtils } from "../../../vueflow/events";
import type {
  ExecutionNodeCompleteEvent,
  ExecutionNodeErrorEvent,
  ExecutionCacheHitEvent,
} from "../../../vueflow/executor";
import {
  getAvailableVariableTree,
  type VariableTreeNode,
} from "../../utils/variableResolver";

const uiStore = useUiStore();
const canvasStore = useCanvasStore();
const message = useMessage();
const { findNode } = useVueFlow();
const { selectedNodeId } = storeToRefs(uiStore);

// 事件系统
const events = useVueFlowEvents();

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
    const edges = (canvasStore.edges || []) as Edge[];
    const result = getAvailableVariableTree(selectedNodeId.value, nodes, edges);
    console.log("[NodeConfigModal] 获取可用变量结果:", result);
    return result;
  } catch (error) {
    console.error("[NodeConfigModal] 获取可用变量失败:", error);
    return [];
  }
});

/** 过滤后的变量列表（根据搜索关键词） */
const filteredVariables = computed<VariableTreeNode[]>(() => {
  if (!searchQuery.value.trim()) {
    return availableVariables.value;
  }

  const query = searchQuery.value.toLowerCase().trim();

  const filterNode = (node: VariableTreeNode): VariableTreeNode | null => {
    // 检查当前节点是否匹配
    const matchesLabel = node.label.toLowerCase().includes(query);

    // 递归过滤子节点
    const filteredChildren =
      node.children
        ?.map(filterNode)
        .filter((n): n is VariableTreeNode => n !== null) || [];

    // 如果当前节点匹配或有匹配的子节点，则保留
    if (matchesLabel || filteredChildren.length > 0) {
      return {
        ...node,
        children:
          filteredChildren.length > 0 ? filteredChildren : node.children,
      };
    }

    return null;
  };

  return availableVariables.value
    .map(filterNode)
    .filter((n): n is VariableTreeNode => n !== null);
});

/** 变量节点选项（用于下拉框） */
const variableNodeOptions = computed(() => {
  return availableVariables.value.map((node) => ({
    label: node.label,
    value: node.id,
  }));
});

/**
 * 将 VariableTreeNode 转换为 JSON 数据
 * 如果节点有子节点，从子节点构建对象/数组；否则使用节点的 value
 */
function variableTreeNodeToJson(node: VariableTreeNode): unknown {
  // 如果有子节点，从子节点构建数据结构
  if (node.children && node.children.length > 0) {
    // 判断是数组还是对象
    // 如果所有子节点的 label 都是数字索引格式（如 [0], [1]），则视为数组
    const isArray = node.children.every((child) => {
      const label = child.label.trim();
      return /^\[\d+\]$/.test(label);
    });

    if (isArray) {
      // 构建数组：按索引排序
      const array: unknown[] = [];
      node.children.forEach((child) => {
        const match = child.label.match(/^\[(\d+)\]$/);
        if (match && match[1]) {
          const index = parseInt(match[1], 10);
          array[index] = variableTreeNodeToJson(child);
        }
      });
      return array;
    } else {
      // 构建对象：使用 label 作为 key
      const obj: Record<string, unknown> = {};
      node.children.forEach((child) => {
        obj[child.label] = variableTreeNodeToJson(child);
      });
      return obj;
    }
  }

  // 没有子节点，直接返回 value
  return node.value;
}

/** 选中的变量数据 */
const selectedVariableData = computed(() => {
  if (!selectedVariableNode.value) {
    return null;
  }
  const node = availableVariables.value.find(
    (n) => n.id === selectedVariableNode.value
  );
  if (!node) {
    return null;
  }
  return variableTreeNodeToJson(node);
});

/** 计算数据条数 */
const dataItemCount = computed(() => {
  const data = selectedVariableData.value;
  if (!data) return "0 items";

  if (Array.isArray(data)) {
    const count = data.length;
    return count === 1 ? "1 item" : `${count} items`;
  }
  if (typeof data === "object" && data !== null) {
    const count = Object.keys(data).length;
    return count === 1 ? "1 item" : `${count} items`;
  }
  return "1 item";
});

const leftWidth = ref(320);
const rightWidth = ref(320);
const rightPanelMode = ref<"output" | "logs">("output");
const isEditing = ref(false);
const editorContent = ref("");
const originalEditorContent = ref("");

// 左侧面板状态
const leftViewMode = ref<"schema" | "json">("schema");
const isSearchExpanded = ref(false);
const searchQuery = ref("");
const searchInputRef = ref<InstanceType<typeof NInput> | null>(null);
const selectedVariableNode = ref<string | null>(null);

const leftViewModeOptions = [
  { value: "schema", label: "Schema" },
  { value: "json", label: "JSON" },
];

// 执行相关状态
const isExecuting = ref(false);

/** 当前节点的执行状态（参考 NodeResultPreviewPanel.vue） */
const executionStatus = computed(() => {
  if (!selectedNodeId.value) return null;
  const node = canvasStore.nodes.find(
    (n: any) => n.id === selectedNodeId.value
  );
  if (!node) return null;

  // 从节点数据中获取执行状态
  const executionResult = node.data?.executionResult;
  const executionStatus = node.data?.executionStatus;
  const executionError = node.data?.executionError;
  const executionDuration = node.data?.executionDuration;

  if (!executionStatus && !executionResult) return null;

  return {
    status: executionStatus || (executionResult ? "success" : null),
    result: executionResult,
    error: executionError,
    duration: executionDuration,
    timestamp: node.data?.executionTimestamp || Date.now(),
  };
});

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

// 搜索相关处理
const handleSearchBlur = () => {
  if (!searchQuery.value) {
    isSearchExpanded.value = false;
  }
};

// 当搜索框展开时自动聚焦
const expandSearch = async () => {
  isSearchExpanded.value = true;
  await nextTick();
  searchInputRef.value?.focus();
};

// 自动选中第一个变量节点
const selectFirstVariable = () => {
  if (
    leftViewMode.value === "json" &&
    availableVariables.value.length > 0 &&
    (!selectedVariableNode.value ||
      !availableVariables.value.find(
        (n) => n.id === selectedVariableNode.value
      ))
  ) {
    selectedVariableNode.value = availableVariables.value[0]?.id ?? null;
  }
};

// 监听变量变化，自动选中第一个
watch(
  () => availableVariables.value,
  () => {
    selectFirstVariable();
  },
  { immediate: true }
);

// 监听视图模式切换，自动选中第一个
watch(
  () => leftViewMode.value,
  (newMode) => {
    if (newMode === "json") {
      selectFirstVariable();
    }
  }
);

/**
 * 格式化执行结果为 JSON 字符串（参考 NodeResultPreviewPanel.vue）
 */
const formattedExecutionResult = computed(() => {
  if (!executionStatus.value?.result) return "";

  const result = executionStatus.value.result;

  // 如果是对象或数组，格式化为 JSON
  if (typeof result === "object") {
    try {
      return JSON.stringify(result, null, 2);
    } catch (e) {
      return String(result);
    }
  }

  return String(result);
});

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
