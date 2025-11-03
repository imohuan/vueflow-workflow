<!--
  服务器模式演示页面
  展示如何使用 WebSocket 服务器替代 Web Worker
-->
<template>
  <div class="flex flex-col w-screen h-screen bg-gray-50">
    <!-- 顶部状态栏 -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">工作流服务器模式演示</h1>
          <p class="text-sm text-gray-500 mt-1">
            使用 WebSocket 服务器替代 Web Worker 执行工作流
          </p>
        </div>

        <!-- 连接状态 -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <div
              :class="[
                'w-3 h-3 rounded-full',
                {
                  'bg-gray-400': client.status.value === 'disconnected',
                  'bg-yellow-400 animate-pulse':
                    client.status.value === 'connecting',
                  'bg-green-500': client.status.value === 'ready',
                  'bg-red-500': client.status.value === 'error',
                },
              ]"
            />
            <span class="text-sm font-medium text-gray-700">
              {{ statusText }}
            </span>
          </div>

          <button
            v-if="client.status.value === 'disconnected'"
            @click="client.reconnect()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重新连接
          </button>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="flex-1 flex gap-6 p-6 overflow-hidden">
      <!-- 左侧：服务器信息 -->
      <div
        class="w-1/3 bg-white rounded-lg shadow-sm p-6 overflow-y-auto variable-scroll"
      >
        <h2 class="text-lg font-semibold text-gray-900 mb-4">服务器信息</h2>

        <div class="space-y-4">
          <!-- 服务器地址 -->
          <div>
            <label class="text-sm font-medium text-gray-700">服务器地址</label>
            <div class="mt-1 p-3 bg-gray-50 rounded-md">
              <code class="text-sm text-gray-900">{{ serverUrl }}</code>
            </div>
          </div>

          <!-- 服务器 ID -->
          <div v-if="client.serverId.value">
            <label class="text-sm font-medium text-gray-700">服务器 ID</label>
            <div class="mt-1 p-3 bg-gray-50 rounded-md">
              <code class="text-sm text-gray-900">{{
                client.serverId.value
              }}</code>
            </div>
          </div>

          <!-- 节点数量 -->
          <div>
            <label class="text-sm font-medium text-gray-700">已加载节点</label>
            <div class="mt-1 p-3 bg-gray-50 rounded-md">
              <span class="text-2xl font-bold text-blue-600">{{
                client.nodeMetadata.value.length
              }}</span>
              <span class="text-sm text-gray-500 ml-2">个节点</span>
            </div>
          </div>

          <!-- 错误信息 -->
          <div v-if="client.error.value" class="p-4 bg-red-50 rounded-md">
            <p class="text-sm font-medium text-red-800">错误</p>
            <p class="text-sm text-red-600 mt-1">{{ client.error.value }}</p>
          </div>
        </div>

        <!-- 节点列表 -->
        <div v-if="client.nodeMetadata.value.length > 0" class="mt-6">
          <h3 class="text-md font-semibold text-gray-900 mb-3">
            节点列表 ({{ client.nodeMetadata.value.length }})
          </h3>
          <div class="space-y-2 max-h-96 overflow-y-auto variable-scroll">
            <div
              v-for="node in client.nodeMetadata.value"
              :key="node.type"
              class="p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-900">
                    {{ node.label }}
                  </p>
                  <p class="text-xs text-gray-500">{{ node.type }}</p>
                </div>
                <span
                  class="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded"
                >
                  {{ node.category }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：测试区域 -->
      <div
        class="flex-1 bg-white rounded-lg shadow-sm p-6 overflow-y-auto variable-scroll"
      >
        <h2 class="text-lg font-semibold text-gray-900 mb-4">工作流测试</h2>

        <!-- 测试按钮 -->
        <div class="space-y-4">
          <button
            @click="executeTestWorkflow"
            :disabled="!client.isReady.value || isExecuting"
            class="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <span
              v-if="isExecuting"
              class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
            />
            <span>{{ isExecuting ? "执行中..." : "执行测试工作流" }}</span>
          </button>

          <p class="text-sm text-gray-500 text-center">
            点击按钮执行一个包含 HTTP 请求节点的测试工作流
          </p>
        </div>

        <!-- 执行日志 -->
        <div v-if="executionLogs.length > 0" class="mt-6">
          <h3 class="text-md font-semibold text-gray-900 mb-3">执行日志</h3>
          <div
            class="space-y-2 max-h-96 overflow-y-auto variable-scroll bg-gray-900 rounded-lg p-4"
          >
            <div
              v-for="(log, index) in executionLogs"
              :key="index"
              class="text-sm font-mono"
            >
              <span class="text-gray-400">[{{ log.timestamp }}]</span>
              <span
                :class="{
                  'text-green-400': log.type === 'success',
                  'text-blue-400': log.type === 'info',
                  'text-yellow-400': log.type === 'warning',
                  'text-red-400': log.type === 'error',
                }"
              >
                {{ log.message }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from "vue";
import { useWorkflowServerClient } from "@/composables/useWorkflowServerClient";
import type { Emitter } from "mitt";
import type { WorkflowEvents } from "@/typings/workflowExecution";
import { WorkflowEventType } from "@/typings/workflowExecution";

// WebSocket 服务器地址
const serverUrl = "ws://localhost:3001";

// 创建客户端
const client = useWorkflowServerClient(serverUrl);

// 连接状态文本
const statusText = computed(() => {
  switch (client.status.value) {
    case "disconnected":
      return "未连接";
    case "connecting":
      return "连接中...";
    case "ready":
      return "已连接";
    case "error":
      return "连接错误";
    default:
      return "未知状态";
  }
});

// 执行状态
const isExecuting = ref(false);

// 执行日志
interface ExecutionLog {
  timestamp: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

const executionLogs = ref<ExecutionLog[]>([]);

function addLog(type: ExecutionLog["type"], message: string) {
  const timestamp = new Date().toLocaleTimeString();
  executionLogs.value.push({
    timestamp,
    type,
    message,
  });

  // 限制日志数量
  if (executionLogs.value.length > 100) {
    executionLogs.value.shift();
  }
}

// 监听工作流事件
const workflowEmitter = inject<Emitter<WorkflowEvents>>("workflowEmitter");
if (workflowEmitter) {
  // 工作流开始
  workflowEmitter.on(WorkflowEventType.STARTED, (data) => {
    addLog("info", `工作流开始执行: ${data.workflowId}`);
  });

  // 工作流完成
  workflowEmitter.on(WorkflowEventType.COMPLETED, (data) => {
    addLog("success", `工作流执行完成，耗时: ${data.duration}ms`);
    isExecuting.value = false;
  });

  // 工作流错误
  workflowEmitter.on(WorkflowEventType.ERROR, (data) => {
    addLog("error", `工作流执行错误: ${data.error.message}`);
    isExecuting.value = false;
  });

  // 节点状态变化
  workflowEmitter.on(WorkflowEventType.NODE_STATUS, (data) => {
    addLog("info", `节点 ${data.nodeId} 状态: ${data.status}`);
  });

  // 节点日志
  workflowEmitter.on(WorkflowEventType.NODE_LOG, (data) => {
    addLog("info", `[${data.nodeId}] ${data.message}`);
  });
}

/**
 * 执行测试工作流
 */
async function executeTestWorkflow() {
  if (!client.isReady.value || isExecuting.value) {
    return;
  }

  executionLogs.value = [];
  isExecuting.value = true;

  addLog("info", "准备执行测试工作流...");

  // 构建测试工作流
  const executionId = `exec_${Date.now()}`;
  const workflowId = "test-workflow";

  const nodes = [
    {
      id: "start_1",
      type: "custom",
      parentNode: undefined,
      data: {
        label: "开始",
        category: "控制",
        variant: "start" as const,
        inputs: [],
        outputs: [
          { id: "__output__", name: "输出", type: "any", isPort: true },
        ],
        config: {},
      },
    },
    {
      id: "httpRequest_2",
      type: "custom",
      parentNode: undefined,
      data: {
        label: "HTTP 请求",
        category: "网络",
        variant: "custom" as const,
        inputs: [
          { id: "url", name: "URL", type: "string", isPort: false },
          { id: "method", name: "方法", type: "string", isPort: false },
          { id: "__input__", name: "输入", type: "any", isPort: true },
        ],
        outputs: [
          { id: "__output__", name: "输出", type: "any", isPort: true },
        ],
        config: {
          url: "https://jsonplaceholder.typicode.com/todos/1",
          method: "GET",
          headers: {},
          body: "",
          timeout: 30000,
        },
      },
    },
    {
      id: "end_3",
      type: "custom",
      parentNode: undefined,
      data: {
        label: "结束",
        category: "控制",
        variant: "end" as const,
        inputs: [{ id: "__input__", name: "输入", type: "any", isPort: true }],
        outputs: [],
        config: {},
      },
    },
  ];

  const edges = [
    {
      id: "edge_1",
      source: "start_1",
      target: "httpRequest_2",
      sourceHandle: "__output__",
      targetHandle: "__input__",
    },
    {
      id: "edge_2",
      source: "httpRequest_2",
      target: "end_3",
      sourceHandle: "__output__",
      targetHandle: "__input__",
    },
  ];

  try {
    client.executeWorkflow(executionId, workflowId, nodes, edges);
    addLog("success", "工作流已提交到服务器执行");
  } catch (error) {
    addLog("error", `执行失败: ${error}`);
    isExecuting.value = false;
  }
}
</script>
