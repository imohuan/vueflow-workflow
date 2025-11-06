<template>
  <div
    class="custom-node"
    :class="{
      'custom-node--selected': selected,
      'custom-node--running': data.status === 'running',
    }"
  >
    <!-- 输入端点 -->
    <PortHandle
      v-if="!data.noInputs"
      id="input"
      type="target"
      :position="Position.Left"
      :node-id="id"
      variant="ellipse"
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
    <PortHandle
      v-if="!data.noOutputs"
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
import { NODE_SIZE, NODE_COLORS, NODE_SPACING } from "@/newCode/config";
import "../ports/portStyles.css";

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
  min-width: v-bind("NODE_SIZE.minWidth + 'px'");
  background: v-bind("NODE_COLORS.background");
  border: v-bind("NODE_SIZE.borderWidth + 'px'") solid
    v-bind("NODE_COLORS.border");
  border-radius: v-bind("NODE_SIZE.borderRadius + 'px'");
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.custom-node--selected {
  border-color: v-bind("NODE_COLORS.borderSelected");
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
  gap: v-bind("NODE_SPACING.iconGap + 'px'");
  padding: v-bind("NODE_SPACING.headerPadding.vertical + 'px'")
    v-bind("NODE_SPACING.headerPadding.horizontal + 'px'");
  background-color: v-bind("NODE_COLORS.default");
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
  padding: v-bind("NODE_SPACING.contentPadding + 'px'");
  background: white;
  min-height: v-bind("NODE_SIZE.contentMinHeight + 'px'");
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
</style>
