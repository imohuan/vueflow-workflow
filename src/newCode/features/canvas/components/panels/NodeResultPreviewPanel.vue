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
        <div
          v-if="executionStatus"
          class="rounded-md px-2 py-1 text-xs font-medium"
          :class="statusBadgeClass"
        >
          {{ statusText }}
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
            class="rounded-lg border border-slate-200 bg-slate-50 p-3 overflow-auto max-h-96"
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
import { computed } from "vue";
import { useMessage } from "naive-ui";
import { useCanvasStore } from "@/newCode/stores/canvas";
import { useUiStore } from "@/newCode/stores/ui";
import IconResult from "@/icons/IconResult.vue";
import IconErrorCircle from "@/icons/IconErrorCircle.vue";
import IconCache from "@/icons/IconCache.vue";
import IconSkip from "@/icons/IconSkip.vue";

const message = useMessage();
const canvasStore = useCanvasStore();
const uiStore = useUiStore();

/** 当前查看的节点 ID（从 UI Store 读取） */
const currentNodeId = computed(() => uiStore.previewNodeId);

/** 当前节点的执行状态（从 UI Store 读取） */
const executionStatus = computed(() => uiStore.previewNodeData);

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
</script>

<style scoped></style>
