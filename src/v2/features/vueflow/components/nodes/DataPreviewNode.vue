<template>
  <div
    ref="nodeRef"
    class="relative bg-slate-50 border-2 border-indigo-200 rounded-lg shadow-sm flex flex-col items-center justify-center variable-scroll w-full h-full"
    :class="{
      'border-indigo-500 shadow-md': selected,
      'bg-indigo-50': isLoading,
      'bg-red-50 border-red-300': hasError,
      'transition-all duration-200': !isResizing,
    }"
    :style="(data as any)?.style.bodyStyle || {}"
  >
    <!-- 输入端口 -->
    <PortHandle
      id="input"
      type="target"
      :position="Position.Left"
      :node-id="id"
      variant="ellipse"
      class="absolute left-0 top-1/2 -translate-y-1/2"
    />

    <!-- 输出端口 -->
    <PortHandle
      id="data"
      type="source"
      :position="Position.Right"
      :node-id="id"
      variant="ellipse"
      class="absolute right-0 top-1/2 -translate-y-1/2"
    />

    <!-- 执行状态徽章 -->
    <NodeExecutionBadge :node-id="id" />

    <!-- 调整大小手柄 -->
    <ResizeHandle
      ref="resizeHandleRef"
      :node-id="id"
      :resize-options="resizeOptions"
      :selected="selected"
      @update:is-resizing="handleIsResizingUpdate"
    />

    <!-- 加载状态 -->
    <div
      v-if="isLoading"
      class="flex flex-col items-center justify-center gap-3 p-5"
    >
      <div
        class="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"
      ></div>
      <span class="text-sm text-indigo-600">加载中...</span>
    </div>

    <!-- 错误状态 -->
    <div
      v-else-if="hasError"
      class="flex flex-col items-center justify-center gap-2 p-5 w-full h-full text-center"
    >
      <div class="text-3xl">⚠️</div>
      <div class="text-xs text-red-600 leading-relaxed">{{ errorMessage }}</div>
    </div>

    <!-- 数据展示区域 -->
    <div v-else class="w-full h-full p-2">
      <!-- 空状态 -->
      <div
        v-if="previewData === undefined || previewData === null"
        class="flex flex-col items-center justify-center gap-2 h-full text-center"
      >
        <div class="text-4xl opacity-60">👁️</div>
        <div class="text-xs text-gray-400 leading-relaxed">等待数据输入</div>
      </div>

      <!-- 有数据时展示 -->
      <div v-else class="h-full flex flex-col gap-1 overflow-hidden">
        <!-- 数据类型标签 -->
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-gray-500">类型:</span>
          <span
            class="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded font-mono"
          >
            {{ dataType }}
          </span>
          <span
            v-if="dataSize"
            class="text-xs px-2 py-0.5 text-gray-700 rounded"
          >
            {{ dataSize }}
          </span>
        </div>

        <!-- 字符串展示 -->
        <div
          v-if="typeof previewData === 'string'"
          class="h-full overflow-auto variable-scroll bg-white border border-gray-200 rounded p-3"
        >
          <pre
            class="text-xs text-gray-800 whitespace-pre-wrap wrap-break-word font-mono"
            >{{ previewData }}</pre
          >
        </div>

        <!-- 数字展示 -->
        <div
          v-else-if="typeof previewData === 'number'"
          class="h-full overflow-auto variable-scroll bg-white border border-gray-200 rounded p-3"
        >
          <div class="text-sm font-mono text-gray-800">
            {{ previewData }}
          </div>
        </div>

        <!-- 布尔值展示 -->
        <div
          v-else-if="typeof previewData === 'boolean'"
          class="h-full overflow-auto variable-scroll bg-white border border-gray-200 rounded p-3"
        >
          <div
            class="text-sm font-semibold"
            :class="previewData ? 'text-green-600' : 'text-red-600'"
          >
            {{ previewData ? "true" : "false" }}
          </div>
        </div>

        <!-- 数组展示 -->
        <div
          v-else-if="Array.isArray(previewData)"
          class="h-full overflow-auto variable-scroll bg-white border border-gray-200 rounded p-3"
        >
          <div class="space-y-1">
            <div
              v-for="(item, index) in previewData.slice(0, 50)"
              :key="index"
              class="flex items-start gap-2 text-xs"
            >
              <span class="text-gray-400 font-mono min-w-8"
                >[{{ index }}]:</span
              >
              <span class="flex-1 text-gray-800 font-mono">
                {{ formatValue(item) }}
              </span>
            </div>
            <div
              v-if="previewData.length > 50"
              class="text-xs text-gray-400 pt-2"
            >
              ... 还有 {{ previewData.length - 50 }} 项未显示
            </div>
          </div>
        </div>

        <!-- 对象展示 -->
        <div
          v-else-if="typeof previewData === 'object'"
          class="h-full overflow-auto variable-scroll bg-white border border-gray-200 rounded p-3"
        >
          <pre
            class="text-xs text-gray-800 font-mono whitespace-pre-wrap wrap-break-word"
            >{{ formatJSON(previewData) }}</pre
          >
        </div>

        <!-- 其他类型展示 -->
        <div
          v-else
          class="h-full overflow-auto variable-scroll bg-white border border-gray-200 rounded p-3"
        >
          <pre class="text-xs text-gray-800 font-mono whitespace-pre-wrap">{{
            String(previewData)
          }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, type Ref } from "vue";
import { type NodeProps, Position } from "@vue-flow/core";
import { useCanvasStore } from "@/v2/stores/canvas";
import { NodeExecutionBadge } from "../widgets";
import PortHandle from "../ports/PortHandle.vue";
import ResizeHandle from "../widgets/ResizeHandle.vue";
import { useBodyStyleResizeOptions } from "../../composables/useBodyStyleResizeOptions";

interface DataPreviewNodeData {
  data?: any;
}

type Props = NodeProps<DataPreviewNodeData>;

const props = defineProps<Props>();

// 获取 stores
const canvasStore = useCanvasStore();

// 状态
const isLoading = ref(false);
const hasError = ref(false);
const errorMessage = ref("");

// 从执行结果中获取数据（响应式）
const previewData = computed(() => {
  const executionStatus = canvasStore.getNodeExecutionStatus(props.id);
  if (executionStatus?.result?.outputs?.data !== undefined) {
    return executionStatus.result.outputs.data;
  }
  if (executionStatus?.result?.data !== undefined) {
    return executionStatus.result.data;
  }
  return props.data.data;
});

// 数据类型
const dataType = computed(() => {
  const data = previewData.value;
  if (data === null) return "null";
  if (data === undefined) return "undefined";
  if (Array.isArray(data)) return "array";
  return typeof data;
});

// 数据大小信息
const dataSize = computed(() => {
  const data = previewData.value;
  if (typeof data === "string") {
    return `${data.length} 字符`;
  }
  if (Array.isArray(data)) {
    return `${data.length} 项`;
  }
  if (typeof data === "object" && data !== null) {
    const keys = Object.keys(data);
    return `${keys.length} 个属性`;
  }
  return null;
});

// 元素引用
const nodeRef: Ref<HTMLElement | null> = ref(null);
const resizeHandleRef = ref<InstanceType<typeof ResizeHandle> | null>(null);

// 节点样式状态
const isResizingState = ref(false);

// 计算 isResizing
const isResizing = computed(() => isResizingState.value);
const resizeOptions = useBodyStyleResizeOptions(
  () => (props.data as any)?.style?.bodyStyle,
  {
    minWidth: 300,
    minHeight: 200,
  }
);

// 处理 isResizing 更新
function handleIsResizingUpdate(value: boolean) {
  isResizingState.value = value;
}

// 格式化值（用于数组项显示）
function formatValue(value: any): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    return value.length > 100 ? value.slice(0, 100) + "..." : value;
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

// 格式化 JSON（用于对象显示）
function formatJSON(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    return String(obj);
  }
}

// nodeStyle 已经由 composable 处理，不需要额外的 watch

// 监听执行状态变化
watch(
  () => canvasStore.getNodeExecutionStatus(props.id),
  (status) => {
    if (status?.status === "running") {
      isLoading.value = true;
      hasError.value = false;
    } else if (status?.status === "error") {
      isLoading.value = false;
      hasError.value = true;
      errorMessage.value = status.error || "执行失败";
    } else if (status?.status === "success") {
      isLoading.value = false;
      hasError.value = false;
    }
  },
  { deep: true, immediate: true }
);
</script>
