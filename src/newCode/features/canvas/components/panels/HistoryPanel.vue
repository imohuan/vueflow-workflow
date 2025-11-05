<template>
  <div class="h-full overflow-y-auto bg-white">
    <!-- 顶部工具栏 -->
    <div class="border-b border-slate-200 bg-white p-3">
      <n-space vertical size="small">
        <!-- 过滤器 -->
        <n-select
          v-model:value="statusFilter"
          :options="statusOptions"
          size="small"
          placeholder="过滤状态"
        />

        <!-- 清空按钮 -->
        <n-button block secondary size="small" @click="clearHistory">
          <template #icon>
            <n-icon :component="IconDelete" />
          </template>
          清空历史
        </n-button>
      </n-space>
    </div>

    <!-- 执行历史时间线 -->
    <div class="p-4">
      <n-timeline>
        <n-timeline-item
          v-for="record in filteredHistory"
          :key="record.id"
          :type="getTimelineType(record.status)"
          class="group"
        >
          <!-- 自定义标题 -->
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <!-- 左侧：工作流名称 -->
              <div
                class="min-w-0 flex-1 truncate text-sm font-medium text-slate-900"
                :title="record.workflowName"
              >
                {{ record.workflowName }}
              </div>

              <!-- 右侧：操作按钮组（hover 时显示）-->
              <n-space
                :size="4"
                class="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              >
                <n-button
                  size="tiny"
                  circle
                  secondary
                  @click="viewDetails(record)"
                  title="查看详情"
                >
                  <template #icon>
                    <n-icon :component="IconInfo" />
                  </template>
                </n-button>
                <n-button
                  size="tiny"
                  circle
                  secondary
                  @click="rerunWorkflow(record)"
                  title="重新执行"
                >
                  <template #icon>
                    <n-icon :component="IconPlay" />
                  </template>
                </n-button>
                <n-button
                  size="tiny"
                  circle
                  secondary
                  type="error"
                  @click="deleteRecord(record)"
                  title="删除"
                >
                  <template #icon>
                    <n-icon :component="IconDelete" />
                  </template>
                </n-button>
              </n-space>
            </div>
          </template>

          <!-- 执行状态 -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <n-tag :type="getStatusTagType(record.status)" size="small">
                {{ getStatusText(record.status) }}
              </n-tag>
              <span class="text-xs text-slate-500">
                耗时: {{ calculateDuration(record) }}
              </span>
            </div>
            <span class="text-xs text-slate-400 pr-1">
              {{ formatTime(record.startTime) }}
            </span>
          </div>
        </n-timeline-item>
      </n-timeline>

      <!-- 空状态 -->
      <n-empty
        v-if="executionHistory.length === 0"
        description="暂无执行记录"
        class="mt-8"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from "vue";
import type { MessageApi, DialogApi } from "naive-ui";
import IconDelete from "@/icons/IconDelete.vue";
import IconInfo from "@/icons/IconInfo.vue";
import IconPlay from "@/icons/IconPlay.vue";

// 执行状态
type ExecutionStatus = "running" | "success" | "failed" | "cancelled";

// 执行记录
interface ExecutionRecord {
  id: string;
  workflowName: string;
  status: ExecutionStatus;
  startTime: number;
  endTime?: number;
  totalNodes: number;
  successNodes: number;
  failedNodes: number;
  errorMessage?: string;
}

const message = inject<MessageApi>("message");
const dialog = inject<DialogApi>("dialog");

// 状态过滤器
const statusFilter = ref<ExecutionStatus | "all">("all");

// 状态选项
const statusOptions = [
  { label: "全部", value: "all" },
  { label: "执行中", value: "running" },
  { label: "成功", value: "success" },
  { label: "失败", value: "failed" },
  { label: "已取消", value: "cancelled" },
];

// 执行历史记录（示例数据）
const executionHistory = ref<ExecutionRecord[]>([
  {
    id: "exec-1",
    workflowName: "数据采集流程",
    status: "success",
    startTime: Date.now() - 3600000,
    endTime: Date.now() - 3540000,
    totalNodes: 12,
    successNodes: 12,
    failedNodes: 0,
  },
  {
    id: "exec-2",
    workflowName: "表单自动填写",
    status: "failed",
    startTime: Date.now() - 7200000,
    endTime: Date.now() - 7100000,
    totalNodes: 8,
    successNodes: 5,
    failedNodes: 3,
    errorMessage: "无法找到目标元素",
  },
  {
    id: "exec-3",
    workflowName: "登录测试",
    status: "success",
    startTime: Date.now() - 86400000,
    endTime: Date.now() - 86340000,
    totalNodes: 5,
    successNodes: 5,
    failedNodes: 0,
  },
  {
    id: "exec-4",
    workflowName: "数据验证",
    status: "cancelled",
    startTime: Date.now() - 172800000,
    endTime: Date.now() - 172700000,
    totalNodes: 6,
    successNodes: 3,
    failedNodes: 0,
  },
  {
    id: "exec-5",
    workflowName: "网页截图",
    status: "success",
    startTime: Date.now() - 259200000,
    endTime: Date.now() - 259100000,
    totalNodes: 3,
    successNodes: 3,
    failedNodes: 0,
  },
]);

// 过滤后的历史记录
const filteredHistory = computed(() => {
  if (statusFilter.value === "all") {
    return executionHistory.value;
  }
  return executionHistory.value.filter(
    (record) => record.status === statusFilter.value
  );
});

/**
 * 获取时间线类型
 */
function getTimelineType(status: ExecutionStatus) {
  const typeMap = {
    running: "info",
    success: "success",
    failed: "error",
    cancelled: "warning",
  };
  return typeMap[status] as any;
}

/**
 * 获取状态标签类型
 */
function getStatusTagType(status: ExecutionStatus) {
  const typeMap = {
    running: "info",
    success: "success",
    failed: "error",
    cancelled: "warning",
  };
  return typeMap[status] as any;
}

/**
 * 获取状态文本
 */
function getStatusText(status: ExecutionStatus): string {
  const textMap = {
    running: "执行中",
    success: "成功",
    failed: "失败",
    cancelled: "已取消",
  };
  return textMap[status];
}

/**
 * 格式化时间
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - timestamp;

  // 小于 1 分钟
  if (diff < 60000) {
    return "刚刚";
  }
  // 小于 1 小时
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`;
  }
  // 小于 1 天
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小时前`;
  }
  // 小于 7 天
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)} 天前`;
  }

  // 超过 7 天，显示具体日期
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 计算执行时长
 */
function calculateDuration(record: ExecutionRecord): string {
  if (!record.endTime) {
    return "进行中";
  }

  const duration = record.endTime - record.startTime;
  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes > 0) {
    return `${minutes} 分 ${seconds % 60} 秒`;
  }
  return `${seconds} 秒`;
}

/**
 * 查看详情
 */
function viewDetails(record: ExecutionRecord) {
  console.log("查看详情:", record);
  message?.info(`查看执行详情: ${record.workflowName}`);
}

/**
 * 重新执行工作流
 */
function rerunWorkflow(record: ExecutionRecord) {
  console.log("重新执行:", record);
  message?.success(`开始执行: ${record.workflowName}`);
}

/**
 * 删除记录
 */
function deleteRecord(record: ExecutionRecord) {
  dialog?.warning({
    title: "删除记录",
    content: `确定要删除执行记录 "${record.workflowName}" 吗？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => {
      const index = executionHistory.value.indexOf(record);
      if (index > -1) {
        executionHistory.value.splice(index, 1);
        message?.success("记录已删除");
      }
    },
  });
}

/**
 * 清空历史
 */
function clearHistory() {
  dialog?.warning({
    title: "清空历史",
    content: "确定要清空所有执行历史吗？此操作不可撤销。",
    positiveText: "清空",
    negativeText: "取消",
    onPositiveClick: () => {
      executionHistory.value = [];
      message?.success("历史记录已清空");
    },
  });
}
</script>

<style scoped></style>
