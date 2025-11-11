<template>
  <n-tooltip
    v-if="status && !isExecuting"
    :disabled="status.status !== 'error' || !status.error"
    placement="bottom"
    trigger="hover"
    :theme-overrides="{
      color: '#fef2f2',
      textColor: '#991b1b',
      borderRadius: '8px',
      padding: '12px',
    }"
  >
    <template #trigger>
      <div
        class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs"
        :class="{
          'bg-green-50': status.status === 'success',
          'bg-red-50': status.status === 'error',
          'bg-blue-50': status.status === 'cached',
          'cursor-help': status.status === 'error' && status.error,
        }"
      >
        <!-- 成功状态 -->
        <template v-if="status.status === 'success'">
          <IconCheckCircle class="h-3.5 w-3.5 text-green-600" />
          <span class="font-medium text-green-700">成功</span>
        </template>

        <!-- 失败状态 -->
        <template v-else-if="status.status === 'error'">
          <IconErrorCircle class="h-3.5 w-3.5 text-red-600" />
          <span class="font-medium text-red-700">失败</span>
        </template>

        <!-- 缓存命中 -->
        <template v-else-if="status.status === 'cached'">
          <IconCheckCircle class="h-3.5 w-3.5 text-blue-600" />
          <span class="font-medium text-blue-700">缓存</span>
        </template>

        <!-- 执行时长 -->
        <span
          v-if="status.duration !== undefined"
          class="text-xs text-slate-500"
        >
          {{ formatDuration(status.duration) }}
        </span>
      </div>
    </template>

    <!-- 错误信息提示内容 -->
    <div class="max-w-md">
      <div
        class="text-xs font-semibold text-red-900 mb-1.5 border-b border-red-200 pb-1"
      >
        错误信息
      </div>
      <div
        class="text-xs text-red-800 whitespace-pre-wrap break-words leading-relaxed"
      >
        {{ status.error }}
      </div>
    </div>
  </n-tooltip>
</template>

<script setup lang="ts">
import { NTooltip } from "naive-ui";
import IconCheckCircle from "@/icons/IconCheckCircle.vue";
import IconErrorCircle from "@/icons/IconErrorCircle.vue";

export interface ExecutionStatus {
  status: "success" | "error" | "cached" | "running" | null;
  result?: any;
  error?: string;
  duration?: number;
  timestamp?: number;
}

interface Props {
  /** 执行状态 */
  status: ExecutionStatus | null;
  /** 是否正在执行中 */
  isExecuting?: boolean;
}

defineProps<Props>();

/**
 * 格式化执行时长
 */
function formatDuration(duration: number): string {
  if (duration < 1000) {
    return `${duration}ms`;
  } else if (duration < 60000) {
    return `${(duration / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}
</script>
