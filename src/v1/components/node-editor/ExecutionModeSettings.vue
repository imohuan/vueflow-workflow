<!--
  工作流执行模式设置
  放在设置面板中，允许用户切换 Worker/Server 模式
-->
<template>
  <div class="execution-mode-settings-sidebar">
    <!-- 执行模式选择 -->
    <div class="setting-item mode-selector">
      <label class="setting-label">执行模式</label>
      <div class="mode-buttons">
        <button
          :class="['mode-button', { active: localMode === 'worker' }]"
          @click="handleModeChange('worker')"
          title="使用浏览器 Web Worker 执行（离线可用）"
        >
          <IconWorker class="mode-icon" />
          <span class="mode-text">Worker 模式</span>
        </button>
        <button
          :class="['mode-button', { active: localMode === 'server' }]"
          @click="handleModeChange('server')"
          title="使用 WebSocket 服务器执行（需要服务器）"
        >
          <IconServer class="mode-icon" />
          <span class="mode-text">Server 模式</span>
        </button>
      </div>
    </div>

    <!-- 服务器地址配置（仅在 Server 模式下显示） -->
    <div v-if="localMode === 'server'" class="setting-item server-config">
      <label class="setting-label">服务器地址</label>
      <input
        v-model="localServerUrl"
        type="text"
        class="server-input"
        placeholder="ws://localhost:3001"
        @blur="handleServerUrlChange"
        @keyup.enter="handleServerUrlChange"
      />
    </div>

    <!-- 状态信息 -->
    <div class="setting-item status-info">
      <div class="status-content">
        <span
          :class="['status-indicator', statusClass]"
          :title="statusText"
        ></span>
        <span class="status-text">{{ statusDescription }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useWorkflowExecutionManager } from "../../composables/useWorkflowExecutionManager";
import { saveExecutionModeConfig } from "../../config/executionMode";
import type { ExecutionMode } from "../../config/executionMode";
import IconWorker from "@/icons/IconWorker.vue";
import IconServer from "@/icons/IconServer.vue";

const executionManager = useWorkflowExecutionManager();

const localMode = ref<ExecutionMode>(executionManager.mode.value);
const localServerUrl = ref(executionManager.serverUrl.value);

// 监听配置变化
watch(
  () => executionManager.config.value,
  (newConfig) => {
    localMode.value = newConfig.mode;
    localServerUrl.value = newConfig.serverUrl;
  }
);

// 状态类
const statusClass = computed(() => {
  const status = executionManager.status.value;
  if (localMode.value === "worker") {
    return status === "ready" ? "ready" : "loading";
  } else {
    switch (status) {
      case "ready":
        return "ready";
      case "connecting":
        return "connecting";
      case "error":
        return "error";
      default:
        return "disconnected";
    }
  }
});

// 状态文本
const statusText = computed(() => {
  if (localMode.value === "worker") {
    return executionManager.isReady.value ? "Worker 已就绪" : "Worker 初始化中";
  } else {
    const status = executionManager.status.value;
    switch (status) {
      case "ready":
        return "已连接到服务器";
      case "connecting":
        return "连接中...";
      case "error":
        return "连接错误";
      default:
        return "未连接";
    }
  }
});

// 状态描述
const statusDescription = computed(() => {
  const nodeCount = executionManager.nodeMetadata.value.length;
  if (localMode.value === "worker") {
    return executionManager.isReady.value
      ? `已加载 ${nodeCount} 个节点`
      : "正在初始化...";
  } else {
    const status = executionManager.status.value;
    switch (status) {
      case "ready":
        return `已连接，${nodeCount} 个节点可用`;
      case "connecting":
        return `连接到 ${localServerUrl.value}...`;
      case "error":
        return "服务器连接失败，请检查地址和服务器状态";
      default:
        return "未连接到服务器";
    }
  }
});

// 切换模式
function handleModeChange(mode: ExecutionMode) {
  if (localMode.value === mode) return;

  localMode.value = mode;
  const config = {
    mode,
    serverUrl: localServerUrl.value,
  };

  saveExecutionModeConfig(config);
  executionManager.updateConfig(config);

  console.log(`[Settings] 切换到 ${mode} 模式`);
}

// 更新服务器地址
function handleServerUrlChange() {
  if (localServerUrl.value === executionManager.serverUrl.value) return;

  const config = {
    mode: localMode.value,
    serverUrl: localServerUrl.value,
  };

  saveExecutionModeConfig(config);
  executionManager.updateConfig(config);

  console.log(`[Settings] 服务器地址更新: ${localServerUrl.value}`);
}
</script>

<style scoped>
.execution-mode-settings-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
}

/* 模式选择器 */
.mode-buttons {
  display: flex;
  gap: 6px;
  width: 100%;
}

.mode-button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 10px;
  font-size: 11px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.mode-button.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.mode-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.mode-text {
  font-weight: 500;
}

/* 服务器配置 */
.server-input {
  width: 100%;
  padding: 8px 10px;
  font-size: 11px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: white;
  font-family: "Monaco", "Courier New", monospace;
}

.server-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

/* 状态指示器 */
.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.ready {
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

.status-indicator.connecting {
  background: #f59e0b;
  animation: pulse 2s infinite;
}

.status-indicator.error {
  background: #ef4444;
}

.status-indicator.loading {
  background: #6b7280;
  animation: pulse 2s infinite;
}

.status-indicator.disconnected {
  background: #9ca3af;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 状态信息 */
.status-info {
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
}

.status-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-text {
  font-size: 11px;
  color: #6b7280;
}
</style>
