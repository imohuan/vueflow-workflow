<template>
  <div class="flex flex-col h-full bg-white">
    <!-- 顶部工具栏（固定）-->
    <div class="shrink-0 border-b border-slate-200 bg-white p-3">
      <div class="flex items-center gap-2">
        <!-- 过滤器 -->
        <n-select
          v-model:value="statusFilter"
          :options="statusOptions"
          size="small"
          placeholder="过滤状态"
          class="flex-1"
        />

        <!-- 清空按钮 -->
        <n-button secondary size="small" @click="clearHistory">
          <template #icon>
            <n-icon :component="IconDelete" />
          </template>
          清空历史
        </n-button>
      </div>
    </div>

    <!-- 执行历史时间线（可滚动）-->
    <div class="flex-1 overflow-y-auto variable-scroll p-4">
      <n-timeline>
        <n-timeline-item
          v-for="record in filteredHistory"
          :key="record.id"
          :type="getTimelineType(record.status)"
          class="group cursor-pointer rounded-lg p-1 -m-1 hover:bg-linear-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-200 border border-transparent mb-2"
          @click="viewDetails(record)"
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

              <!-- 右侧：删除按钮（hover 时显示）-->
              <n-button
                size="tiny"
                circle
                secondary
                type="error"
                @click.stop="deleteRecord(record)"
                title="删除"
                class="opacity-0 group-hover:opacity-100"
              >
                <template #icon>
                  <n-icon :component="IconDel" />
                </template>
              </n-button>
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

    <!-- 分页器（固定）-->
    <div
      v-if="totalRecords > 0"
      class="shrink-0 border-t border-slate-200 bg-white p-3 flex justify-center"
    >
      <n-pagination
        :display-order="['quick-jumper', 'pages', 'size-picker']"
        show-size-picker
        v-model:page="currentPage"
        :page-size="pageSize"
        :item-count="totalRecords"
        :page-slot="3"
        :page-sizes="[5, 10, 20, 50, 100]"
        @update:page="(page: number) => loadHistory(page, pageSize)"
        @update:page-size="(size: number) => loadHistory(1, size)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, triggerRef } from "vue";
import { useMessage, useDialog } from "naive-ui";
import IconDel from "@/icons/IconDel.vue";
import IconDelete from "@/icons/IconDelete.vue";
import { useCanvasStore } from "@/v2/stores/canvas";
import { useWorkflowStore } from "@/v2/stores/workflow";
import { useVueFlowEvents } from "@/v2/features/vueflow/events";
import type {
  ExecutionHistoryRecord,
  ExecutionResult,
} from "@/v2/features/vueflow/executor/types";

// 执行状态
type ExecutionStatus = "running" | "success" | "failed" | "cancelled";

// 执行记录（UI 层）
interface ExecutionRecord {
  id: string;
  workflowId: string;
  workflowName: string;
  status: ExecutionStatus;
  startTime: number;
  endTime?: number;
  totalNodes: number;
  successNodes: number;
  failedNodes: number;
  errorMessage?: string;
}

const message = useMessage();
const dialog = useDialog();
const canvasStore = useCanvasStore();
const workflowStore = useWorkflowStore();
const vueflowEvents = useVueFlowEvents();

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

// 执行历史记录
const executionHistory = shallowRef<ExecutionRecord[]>([]);
const isLoading = ref(false);

// 分页相关
const currentPage = ref(1);
const pageSize = ref(20);
const totalRecords = ref(0);

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
 * 将历史记录的执行结果数据加载到画布中，包括工作流结构（nodes 和 edges）
 * 创建一个临时工作流来显示历史记录，避免修改当前工作流
 */
async function viewDetails(record: ExecutionRecord) {
  try {
    console.log("查看详情:", record);

    // 直接通过 executionId 获取完整的历史记录（包含执行结果和工作流结构）
    const result = await canvasStore.vueFlowExecution.getHistory(record.id);

    console.log("[HistoryPanel] 加载历史记录:", result);

    // 获取单条记录
    const historyRecord = result.history[0];

    if (!historyRecord) {
      message?.warning("未找到该执行记录的详细数据");
      return;
    }

    // 查找或创建临时工作流用于显示历史记录
    // 临时工作流名称固定为"临时工作流"，使用 forceRecreate=true 确保只有一个
    const TEMP_WORKFLOW_NAME = "临时工作流";
    const HISTORY_FOLDER_PATH = "历史记录";

    // 先确保"历史记录"文件夹存在
    await workflowStore.createFolder(HISTORY_FOLDER_PATH);

    // 创建或重新创建临时工作流（forceRecreate=true 会删除已存在的同名工作流）
    const tempWorkflow = await workflowStore.createWorkflow(
      TEMP_WORKFLOW_NAME,
      HISTORY_FOLDER_PATH,
      `执行ID: ${record.id}\n执行时间: ${new Date(
        record.startTime
      ).toLocaleString("zh-CN")}\n原始工作流: ${record.workflowName}`,
      true // forceRecreate: 如果已存在则删除后重新创建
    );

    // 选中临时工作流（loadExecutionStatus 会更新当前工作流的结构）
    if (tempWorkflow) {
      await workflowStore.setCurrentWorkflow(tempWorkflow.workflow_id);
    }

    // 构造 ExecutionResult 对象用于恢复状态
    const executionResult: ExecutionResult = {
      ...historyRecord,
      nodeResults: new Map(Object.entries(historyRecord.nodeResults || {})),
    };

    // 加载执行状态到画布（会自动更新当前选中的临时工作流的结构）
    canvasStore.loadExecutionStatus(executionResult, historyRecord);

    message?.success(`已加载执行状态和工作流结构到画布`);
  } catch (error) {
    console.error("加载执行详情失败:", error);
    message?.error("加载执行详情失败");
  }
}

/**
 * 删除记录
 */
async function deleteRecord(record: ExecutionRecord) {
  dialog?.warning({
    title: "删除记录",
    content: `确定要删除执行记录 "${record.workflowName}" 吗？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        await canvasStore.vueFlowExecution.deleteHistory(record.id);
        // 从本地列表中移除
        const index = executionHistory.value.indexOf(record);
        if (index > -1) {
          executionHistory.value.splice(index, 1);
          triggerRef(executionHistory);
        }
        message?.success("记录已删除");
      } catch (error) {
        console.error("删除记录失败:", error);
        message?.error("删除记录失败");
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
    onPositiveClick: async () => {
      try {
        await canvasStore.vueFlowExecution.clearHistory();
        executionHistory.value = [];
        triggerRef(executionHistory);
        message?.success("历史记录已清空");
      } catch (error) {
        console.error("清空历史失败:", error);
        message?.error("清空历史失败");
      }
    },
  });
}

/**
 * 加载历史记录
 */
async function loadHistory(page: number = 1, size: number = 20) {
  isLoading.value = true;
  try {
    const result = await canvasStore.vueFlowExecution.getHistory(
      undefined,
      page,
      size
    );

    // 转换为 UI 层的格式
    executionHistory.value = result.history.map(
      (record: ExecutionHistoryRecord) => ({
        id: record.executionId,
        workflowId: record.workflowId,
        workflowName:
          workflowStore.getWorkflowById(record.workflowId)?.name ||
          record.workflowId, // TODO: 从 workflowStore 获取工作流名称
        status: record.success ? "success" : "failed",
        startTime: record.startTime,
        endTime: record.endTime,
        totalNodes: record.executedNodeCount + record.skippedNodeCount,
        successNodes: record.executedNodeCount,
        failedNodes: 0, // 暂时没有失败节点数
        errorMessage: record.error,
      })
    );

    // 更新分页信息
    currentPage.value = result.page;
    pageSize.value = result.pageSize;
    totalRecords.value = result.total;

    triggerRef(executionHistory);
  } catch (error) {
    console.error("加载历史记录失败:", error);
    message?.error("加载历史记录失败");
  } finally {
    isLoading.value = false;
  }
}

// 组件挂载时加载历史
onMounted(() => {
  loadHistory();

  // 监听工作流执行完成事件（成功或失败）
  vueflowEvents.on("workflow:execution-completed", (data) => {
    console.log("[HistoryPanel] 工作流执行完成，重新加载历史记录", data);
    loadHistory();
  });

  vueflowEvents.on("execution:error", (data) => {
    console.log("[HistoryPanel] 工作流执行失败，重新加载历史记录", data);
    loadHistory();
  });
});
</script>

<style scoped></style>
