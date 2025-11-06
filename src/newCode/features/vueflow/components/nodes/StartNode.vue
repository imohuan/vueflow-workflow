<template>
  <div
    class="start-node"
    :class="{
      'start-node--selected': selected,
      'start-node--running': data.status === 'running',
    }"
  >
    <!-- 顶部标题区域 -->
    <div class="start-node__header">
      <!-- 图标 -->
      <svg
        class="start-node__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>

      <!-- 标题 -->
      <div class="start-node__title">
        {{ data.label || "开始" }}
      </div>

      <!-- 状态指示器 -->
      <div v-if="data.status" class="start-node__status">
        <div class="status-dot" :class="`status-dot--${data.status}`" />
      </div>
    </div>

    <!-- 内容板块 -->
    <div class="start-node__content nodrag nopan">
      <div v-if="data.description" class="start-node__description">
        {{ data.description }}
      </div>
      <div v-else class="start-node__placeholder">工作流程开始</div>
    </div>

    <!-- 输出端点（只有输出，没有输入） -->
    <PortHandle
      id="output"
      type="source"
      :position="Position.Right"
      :node-id="id"
      variant="ellipse"
    />
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
.start-node {
  min-width: v-bind("NODE_SIZE.minWidth + 'px'");
  background: #ffffff;
  border: v-bind("NODE_SIZE.borderWidth + 'px'") solid #10b981;
  border-radius: v-bind("NODE_SIZE.borderRadius + 'px'");
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
  overflow: hidden;
}

.start-node--selected {
  border-color: #059669;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.start-node--running {
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
.start-node__header {
  display: flex;
  align-items: center;
  gap: v-bind("NODE_SPACING.iconGap + 'px'");
  padding: v-bind("NODE_SPACING.headerPadding.vertical + 'px'")
    v-bind("NODE_SPACING.headerPadding.horizontal + 'px'");
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.start-node__icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: white;
}

.start-node__title {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.start-node__status {
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
.start-node__content {
  padding: v-bind("NODE_SPACING.contentPadding + 'px'");
  background: white;
  min-height: v-bind("NODE_SIZE.contentMinHeight + 'px'");
}

.start-node__description {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.start-node__placeholder {
  font-size: 12px;
  color: #10b981;
  font-style: italic;
}
</style>

