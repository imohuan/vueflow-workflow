<template>
  <div
    class="custom-node"
    :class="{
      'custom-node--selected': selected,
      'custom-node--running': data.status === 'running',
    }"
  >
    <!-- 输入端点 -->
    <Handle
      v-if="!data.noInputs"
      type="target"
      :position="Position.Left"
      class="custom-handle custom-handle--target"
      :style="{ backgroundColor: data.color || '#3b82f6' }"
    />

    <!-- 顶部标题区域 -->
    <div
      class="custom-node__header"
      :style="{ backgroundColor: data.color || '#3b82f6' }"
    >
      <!-- 图标 -->
      <component :is="data.icon" v-if="data.icon" class="custom-node__icon" />

      <!-- 标题 -->
      <div class="custom-node__title">
        {{ data.label }}
      </div>

      <!-- 状态指示器 -->
      <div v-if="data.status" class="custom-node__status">
        <div class="status-dot" :class="`status-dot--${data.status}`" />
      </div>
    </div>

    <!-- 内容板块 -->
    <div class="custom-node__content nodrag nopan">
      <div v-if="data.description" class="custom-node__description">
        {{ data.description }}
      </div>
      <div v-else class="custom-node__placeholder">暂无配置</div>
    </div>

    <!-- 输出端点 -->
    <Handle
      v-if="!data.noOutputs"
      type="source"
      :position="Position.Right"
      class="custom-handle custom-handle--source"
      :style="{ backgroundColor: data.color || '#10b981' }"
    />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";

interface Props {
  id: string;
  data: {
    label: string;
    type?: string;
    description?: string;
    icon?: any;
    color?: string;
    status?: "pending" | "running" | "success" | "error";
    noInputs?: boolean;
    noOutputs?: boolean;
  };
  selected?: boolean;
}

defineProps<Props>();
</script>

<style scoped>
.custom-node {
  min-width: 200px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.custom-node--selected {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.custom-node--running {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

/* 顶部标题区域 */
.custom-node__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background-color: #3b82f6;
  color: white;
}

.custom-node__icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: white;
}

.custom-node__title {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-node__status {
  flex-shrink: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot--success {
  background-color: #ffffff;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}

.status-dot--error {
  background-color: #fecaca;
  box-shadow: 0 0 0 2px rgba(254, 202, 202, 0.3);
}

.status-dot--running {
  background-color: #fef3c7;
  box-shadow: 0 0 0 2px rgba(254, 243, 199, 0.3);
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.status-dot--pending {
  background-color: #e2e8f0;
}

@keyframes ping {
  75%,
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

/* 内容板块 */
.custom-node__content {
  padding: 12px;
  background: white;
  min-height: 50px;
}

.custom-node__description {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.custom-node__placeholder {
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
}

/* Handle 样式 */
.custom-handle {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid white;
}

.custom-handle:hover {
  /* transform: scale(1.3);
  transition: transform 0.15s ease-out; */
}

.custom-handle--target {
  left: -6px;
}

.custom-handle--source {
  right: -6px;
}
</style>
