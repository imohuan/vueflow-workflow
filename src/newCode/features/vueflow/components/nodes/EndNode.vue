<template>
  <div
    class="end-node"
    :class="{
      'end-node--selected': selected,
      'end-node--running': data.status === 'running',
    }"
  >
    <!-- 输入端点（只有输入，没有输出） -->
    <PortHandle
      id="input"
      type="target"
      :position="Position.Left"
      :node-id="id"
      variant="ellipse"
    />

    <!-- 顶部标题区域 -->
    <div class="end-node__header">
      <!-- 图标 -->
      <svg
        class="end-node__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <rect x="9" y="9" width="6" height="6"></rect>
      </svg>

      <!-- 标题 -->
      <div class="end-node__title">
        {{ data.label || "结束" }}
      </div>

      <!-- 状态指示器 -->
      <div v-if="data.status" class="end-node__status">
        <div class="status-dot" :class="`status-dot--${data.status}`" />
      </div>
    </div>

    <!-- 内容板块 -->
    <div class="end-node__content nodrag nopan">
      <div v-if="data.description" class="end-node__description">
        {{ data.description }}
      </div>
      <div v-else class="end-node__placeholder">工作流程结束</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Position } from "@vue-flow/core";
import { PortHandle } from "../ports";
import { NODE_SIZE, NODE_SPACING } from "@/newCode/config";
import "../ports/portStyles.css";

interface Props {
  id: string;
  data: {
    label?: string;
    description?: string;
    status?: "pending" | "running" | "success" | "error";
  };
  selected?: boolean;
}

defineProps<Props>();
</script>

<style scoped>
.end-node {
  min-width: v-bind("NODE_SIZE.minWidth + 'px'");
  background: #ffffff;
  border: v-bind("NODE_SIZE.borderWidth + 'px'") solid #ef4444;
  border-radius: v-bind("NODE_SIZE.borderRadius + 'px'");
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
  overflow: hidden;
}

.end-node--selected {
  border-color: #dc2626;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.end-node--running {
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
.end-node__header {
  display: flex;
  align-items: center;
  gap: v-bind("NODE_SPACING.iconGap + 'px'");
  padding: v-bind("NODE_SPACING.headerPadding.vertical + 'px'")
    v-bind("NODE_SPACING.headerPadding.horizontal + 'px'");
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.end-node__icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: white;
}

.end-node__title {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.end-node__status {
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
.end-node__content {
  padding: v-bind("NODE_SPACING.contentPadding + 'px'");
  background: white;
  min-height: v-bind("NODE_SIZE.contentMinHeight + 'px'");
}

.end-node__description {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.end-node__placeholder {
  font-size: 12px;
  color: #ef4444;
  font-style: italic;
}
</style>
