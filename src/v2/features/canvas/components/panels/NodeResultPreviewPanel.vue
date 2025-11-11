<template>
  <div class="flex h-full flex-col bg-white">
    <!-- 头部信息 -->
    <div v-if="currentNodeId" class="border-b border-slate-200 px-4 py-3">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold text-slate-900">
            {{ nodeLabel || currentNodeId }}
          </h3>
          <p class="mt-1 text-xs text-slate-500">节点执行结果</p>
        </div>
        <div class="flex items-center gap-2">
          <!-- 迭代信息徽章 -->
          <span
            v-if="hasIterationHistory && currentIterationData"
            class="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded"
            :title="`迭代 ${currentIterationPage}，索引：${currentIterationData.iterationIndex}`"
          >
            迭代 {{ currentIterationPage }}
          </span>
          <!-- 执行状态徽章 -->
          <div
            v-if="executionStatus"
            class="rounded-md px-2 py-1 text-xs font-medium"
            :class="statusBadgeClass"
          >
            {{ statusText }}
          </div>
        </div>
      </div>
      <!-- 迭代历史分页控件 -->
      <div
        v-if="hasIterationHistory"
        class="mt-3 flex items-center justify-between"
      >
        <span class="text-xs text-slate-500">
          共 {{ iterationHistory?.totalIterations }} 次迭代
        </span>
        <div
          class="h-7 flex items-center gap-0.5 px-1.5 bg-slate-100 rounded"
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
            {{ currentIterationPage }}/{{ iterationHistory?.totalIterations }}
          </span>
          <button
            class="p-0 text-slate-600 hover:text-slate-900 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
            :disabled="
              currentIterationPage >= (iterationHistory?.totalIterations || 0)
            "
            @click="handleNextPage"
            title="下一次迭代"
          >
            <IconArrowRight class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="flex-1 overflow-y-auto">
      <!-- 空状态 -->
      <div
        v-if="!currentNodeId"
        class="flex h-full items-center justify-center px-4 text-center"
      >
        <div>
          <IconResult class="mx-auto h-12 w-12 text-slate-300" />
          <p class="mt-3 text-sm text-slate-500">尚未选择节点</p>
          <p class="mt-1 text-xs text-slate-400">
            执行工作流后，点击节点徽章查看结果
          </p>
        </div>
      </div>

      <!-- 结果展示 -->
      <div v-else class="p-4 space-y-4">
        <!-- 执行状态信息 -->
        <div v-if="executionStatus" class="space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-500">执行状态</span>
            <span class="font-medium" :class="statusTextClass">
              {{ statusText }}
            </span>
          </div>

          <div
            v-if="executionStatus.duration"
            class="flex items-center justify-between text-xs"
          >
            <span class="text-slate-500">执行时长</span>
            <span class="font-mono text-slate-700">
              {{ executionStatus.duration }}ms
            </span>
          </div>

          <div
            v-if="executionStatus.timestamp"
            class="flex items-center justify-between text-xs"
          >
            <span class="text-slate-500">执行时间</span>
            <span class="font-mono text-slate-600">
              {{ formatTimestamp(executionStatus.timestamp) }}
            </span>
          </div>
        </div>

        <!-- 错误信息 -->
        <div
          v-if="executionStatus?.status === 'error' && executionStatus.error"
          class="rounded-lg border border-red-200 bg-red-50 p-3"
        >
          <div class="flex items-start gap-2">
            <IconErrorCircle
              class="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5"
            />
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-red-800">执行错误</p>
              <pre
                class="mt-1 text-xs text-red-700 whitespace-pre-wrap break-words"
                >{{ executionStatus.error }}</pre
              >
            </div>
          </div>
        </div>

        <!-- 执行结果 -->
        <div v-if="executionStatus?.result" class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-700">执行结果</span>
            <button
              @click="copyResult"
              class="text-xs text-blue-600 hover:text-blue-700 hover:underline"
            >
              复制
            </button>
          </div>
          <div
            class="rounded-lg border border-slate-200 bg-slate-50 p-3 overflow-auto variable-scroll max-h-96"
          >
            <pre
              class="text-xs text-slate-700 whitespace-pre-wrap break-words font-mono"
              >{{ formattedResult }}</pre
            >
          </div>
        </div>

        <!-- 缓存状态 -->
        <div
          v-if="executionStatus?.status === 'cached'"
          class="rounded-lg border border-purple-200 bg-purple-50 p-3"
        >
          <div class="flex items-start gap-2">
            <IconCache class="h-4 w-4 flex-shrink-0 text-purple-500 mt-0.5" />
            <div>
              <p class="text-xs font-medium text-purple-800">使用缓存结果</p>
              <p class="mt-1 text-xs text-purple-600">
                此节点结果来自缓存，未重新执行
              </p>
            </div>
          </div>
        </div>

        <!-- 跳过状态 -->
        <div
          v-if="executionStatus?.status === 'skipped'"
          class="rounded-lg border border-gray-200 bg-gray-50 p-3"
        >
          <div class="flex items-start gap-2">
            <IconSkip class="h-4 w-4 flex-shrink-0 text-gray-500 mt-0.5" />
            <div>
              <p class="text-xs font-medium text-gray-800">节点已跳过</p>
              <p class="mt-1 text-xs text-gray-600">此节点在本次执行中被跳过</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useMessage } from "naive-ui";
import { useCanvasStore } from "../../../../stores/canvas";
import { useUiStore } from "../../../../stores/ui";
import IconResult from "@/icons/IconResult.vue";
import IconErrorCircle from "@/icons/IconErrorCircle.vue";
import IconCache from "@/icons/IconCache.vue";
import IconSkip from "@/icons/IconSkip.vue";
import IconArrowLeft from "@/icons/IconArrowLeft.vue";
import IconArrowRight from "@/icons/IconArrowRight.vue";

const message = useMessage();
const canvasStore = useCanvasStore();
const uiStore = useUiStore();

/** 迭代历史分页状态 */
const currentIterationPage = ref(1);

/** 当前查看的节点 ID（从 UI Store 读取） */
const currentNodeId = computed(() => uiStore.previewNodeId);

/** 当前节点的迭代历史 */
const iterationHistory = computed(() => {
  const nodeId = currentNodeId.value;
  if (!nodeId) return null;
  const node = canvasStore.nodes.find((n: any) => n.id === nodeId);
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

/** 当前节点的执行状态（从 canvasStore 读取或从迭代历史获取） */
const executionStatus = computed(() => {
  const nodeId = currentNodeId.value;
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

/** 获取节点标签 */
const nodeLabel = computed(() => {
  const nodeId = currentNodeId.value;
  if (!nodeId) return "";
  const node = canvasStore.nodes.find((n: any) => n.id === nodeId);
  return node?.data?.label || node?.label || "";
});

/** 状态文本 */
const statusText = computed(() => {
  const status = executionStatus.value?.status;
  switch (status) {
    case "running":
      return "执行中";
    case "success":
      return "执行成功";
    case "error":
      return "执行失败";
    case "cached":
      return "缓存结果";
    case "skipped":
      return "已跳过";
    default:
      return "待执行";
  }
});

/** 状态徽章样式 */
const statusBadgeClass = computed(() => {
  const status = executionStatus.value?.status;
  switch (status) {
    case "running":
      return "bg-blue-100 text-blue-700";
    case "success":
      return "bg-green-100 text-green-700";
    case "error":
      return "bg-red-100 text-red-700";
    case "cached":
      return "bg-purple-100 text-purple-700";
    case "skipped":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
});

/** 状态文本颜色 */
const statusTextClass = computed(() => {
  const status = executionStatus.value?.status;
  switch (status) {
    case "running":
      return "text-blue-600";
    case "success":
      return "text-green-600";
    case "error":
      return "text-red-600";
    case "cached":
      return "text-purple-600";
    case "skipped":
      return "text-gray-600";
    default:
      return "text-slate-600";
  }
});

/** 格式化结果 */
const formattedResult = computed(() => {
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

/** 格式化时间戳 */
function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** 复制结果 */
function copyResult() {
  if (!formattedResult.value) return;

  navigator.clipboard
    .writeText(formattedResult.value)
    .then(() => {
      message.success("已复制到剪贴板");
    })
    .catch(() => {
      message.error("复制失败");
    });
}

/** 切换到指定迭代页 */
function handleIterationPageChange(page: number) {
  if (!hasIterationHistory.value || !iterationHistory.value) return;
  const totalPages = iterationHistory.value.totalIterations;
  if (page < 1 || page > totalPages) return;
  currentIterationPage.value = page;
  // 同步更新到 store
  if (currentNodeId.value) {
    canvasStore.setNodeIterationPage(currentNodeId.value, page);
  }
}

/** 上一页 */
function handlePreviousPage() {
  if (currentIterationPage.value > 1) {
    handleIterationPageChange(currentIterationPage.value - 1);
  }
}

/** 下一页 */
function handleNextPage() {
  if (hasIterationHistory.value && iterationHistory.value) {
    if (currentIterationPage.value < iterationHistory.value.totalIterations) {
      handleIterationPageChange(currentIterationPage.value + 1);
    }
  }
}

// 监听节点变化和迭代历史变化，同步当前页码
watch(
  [currentNodeId, iterationHistory],
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
</script>

<style scoped></style>
