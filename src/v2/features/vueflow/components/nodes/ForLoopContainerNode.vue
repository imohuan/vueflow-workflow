<template>
  <div
    :class="[
      'for-loop-container relative bg-white rounded-lg transition-all duration-200',
      highlightClass,
    ]"
    :style="containerStyle"
  >
    <!-- 容器标题栏 -->
    <div
      class="container-header absolute left-0 right-0 top-0 flex items-center justify-between px-3 text-xs font-medium text-slate-600 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-lg"
      :style="{ height: `${CONTAINER_HEADER_HEIGHT}px` }"
    >
      <span class="flex items-center gap-2">
        <span class="text-orange-500">🔁</span>
        <span>{{ data.label || "批处理体" }}</span>
      </span>
      <span class="text-[10px] text-slate-400 font-mono">
        {{ shortId }}
      </span>
    </div>

    <!-- 顶部中央圆形端口（接收来自 For 节点的连接） -->
    <PortHandle
      id="loop-in"
      :type="'target'"
      :position="Position.Top"
      :node-id="id"
      :variant="'circle'"
      :is-connectable="false"
      :style="{
        left: '50%',
        transform: 'translateX(-50%)',
        top: '-8px',
      }"
    />

    <!-- 左侧标准端口（循环体出口） -->
    <PortHandle
      id="loop-right"
      :type="'target'"
      :position="Position.Left"
      :node-id="id"
      :variant="'ellipse'"
      :style="{
        top: `${CONTAINER_HEADER_HEIGHT + 20}px`,
      }"
    />

    <!-- 右侧标准端口（循环体入口） -->
    <PortHandle
      id="loop-left"
      :type="'source'"
      :position="Position.Right"
      :node-id="id"
      :variant="'ellipse'"
      :style="{
        top: `${CONTAINER_HEADER_HEIGHT + 20}px`,
      }"
    />

    <!-- 容器内容区域 -->
    <div
      class="container-content"
      :style="{
        paddingTop: `${CONTAINER_HEADER_HEIGHT + CONTAINER_PADDING.top}px`,
        paddingLeft: `${CONTAINER_PADDING.left}px`,
        paddingRight: `${CONTAINER_PADDING.right}px`,
        paddingBottom: `${CONTAINER_PADDING.bottom}px`,
        minHeight: `${CONTAINER_MIN_HEIGHT}px`,
      }"
    >
      <!-- 容器内节点将作为子节点渲染在这里 -->
      <div
        v-if="!hasChildren"
        class="flex items-center justify-center h-full text-xs text-slate-400 italic"
      >
        拖拽节点到此处
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import { Position } from "@vue-flow/core";
import { PortHandle } from "../ports";
import { PLUGIN_MANAGER_KEY, type PluginManager } from "../../plugins";

// 容器常量
const CONTAINER_HEADER_HEIGHT = 32;
const CONTAINER_PADDING = {
  top: 16,
  right: 16,
  bottom: 16,
  left: 16,
};
const CONTAINER_MIN_WIDTH = 300;
const CONTAINER_MIN_HEIGHT = 200;

interface Props {
  id: string;
  data: {
    label?: string;
    type?: string;
    config?: {
      forNodeId?: string;
    };
    [key: string]: any;
  };
  selected?: boolean;
}

const props = defineProps<Props>();

// 获取插件管理器
const pluginManager = inject<PluginManager>(PLUGIN_MANAGER_KEY);

// 容器 ID 简写（显示在标题栏）
const shortId = computed(() => {
  const id = props.id;
  if (id.length > 12) {
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  }
  return id;
});

// 检查是否有子节点
const hasChildren = computed(() => {
  // 这里可以通过插件管理器或其他方式获取子节点信息
  // 暂时返回 false，实际实现时需要根据 parentNode 判断
  return false;
});

// 获取高亮状态
const highlightState = computed(() => {
  if (!pluginManager) {
    return null;
  }

  const sharedState = pluginManager.getSharedState();
  const forLoopState = sharedState["for-loop"];

  if (!forLoopState || !forLoopState.containerHighlight) {
    return null;
  }

  const highlight = forLoopState.containerHighlight.value;
  if (!highlight || !highlight[props.id]) {
    return null;
  }

  return highlight[props.id];
});

// 高亮样式类
const highlightClass = computed(() => {
  const state = highlightState.value;

  if (!state) {
    // 默认虚线边框
    return "border-2 border-dashed border-slate-300";
  }

  if (state === "normal") {
    // 正常高亮（蓝色）
    return "border-2 border-solid border-indigo-500 shadow-lg shadow-indigo-200 ring-2 ring-indigo-200";
  }

  if (state === "warning") {
    // 警告高亮（红色）
    return "border-2 border-solid border-red-500 shadow-lg shadow-red-200 ring-2 ring-red-200";
  }

  // 默认
  return "border-2 border-dashed border-slate-300";
});

// 容器样式
const containerStyle = computed(() => {
  return {
    minWidth: `${CONTAINER_MIN_WIDTH}px`,
    minHeight: `${CONTAINER_MIN_HEIGHT}px`,
  };
});
</script>

<style scoped>
.for-loop-container {
  /* 容器基础样式 */
  position: relative;
  box-sizing: border-box;
}

.container-header {
  user-select: none;
  pointer-events: none;
}

.container-content {
  position: relative;
  box-sizing: border-box;
}
</style>
