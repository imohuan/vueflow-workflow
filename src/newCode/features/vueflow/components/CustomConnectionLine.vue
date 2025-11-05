<template>
  <g>
    <!-- 连接线路径 -->
    <path
      :d="path"
      fill="none"
      :stroke="strokeColor"
      :stroke-width="strokeWidth"
      class="connection-line-animated"
    />
    <!-- 终点圆点（使用吸附后的坐标） -->
    <circle
      :cx="targetPoint.x"
      :cy="targetPoint.y"
      fill="#fff"
      r="3"
      :stroke="strokeColor"
      :stroke-width="2"
    />
  </g>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import {
  getBezierPath,
  getSmoothStepPath,
  type ConnectionLineProps,
} from "@vue-flow/core";
import { useEditorConfigStore } from "@/newCode/stores/editorConfig";
import { storeToRefs } from "pinia";
import { PLUGIN_MANAGER_KEY, type PluginManager } from "../plugins";

// 连接线属性
const props = defineProps<ConnectionLineProps>();

// 获取编辑器配置
const editorConfigStore = useEditorConfigStore();
const { config } = storeToRefs(editorConfigStore);

// 获取插件管理器
const pluginManager = inject<PluginManager>(PLUGIN_MANAGER_KEY);

// 获取 Ctrl 连接候选状态
const ctrlConnectCandidate = computed(() => {
  if (!pluginManager) {
    return null;
  }

  const sharedState = pluginManager.getSharedState();
  const ctrlConnect = sharedState["ctrl-connect"];

  if (!ctrlConnect || !ctrlConnect.isActive?.value) {
    return null;
  }

  const candidate = ctrlConnect.candidate?.value;
  if (!candidate || !candidate.position) {
    return null;
  }

  return candidate;
});

// 源点和目标点（考虑 Ctrl 连接吸附）
const sourcePoint = computed(() => {
  const candidate = ctrlConnectCandidate.value;
  if (candidate && candidate.handleType === "source") {
    return candidate.position;
  }
  return { x: props.sourceX, y: props.sourceY };
});

const targetPoint = computed(() => {
  const candidate = ctrlConnectCandidate.value;
  if (candidate && candidate.handleType === "target") {
    return candidate.position;
  }
  return { x: props.targetX, y: props.targetY };
});

// 判断连接是否有效
const isValidConnection = computed(() => {
  // 优先使用 Ctrl 连接候选的验证状态
  const candidate = ctrlConnectCandidate.value;
  if (candidate) {
    return candidate.isValid;
  }

  if (props.connectionStatus) {
    return props.connectionStatus === "valid";
  }
  // 如果没有目标节点或目标端口，显示为无效（红色）
  if (!props.targetNode || !props.targetHandle) {
    return false;
  }
  // 有目标节点和端口，显示为有效（绿色）
  return true;
});

// 根据连接有效性决定颜色
const strokeColor = computed(() => {
  return isValidConnection.value ? "#22c55e" : "#ef4444";
});

// 线宽
const strokeWidth = computed(() => 3);

// 计算连接线路径（使用吸附后的坐标）
const path = computed(() => {
  const edgeType = config.value.edgeType;
  const source = sourcePoint.value;
  const target = targetPoint.value;

  // 根据配置的边类型选择路径算法
  if (edgeType === "step" || edgeType === "smoothstep") {
    const [smoothPath] = getSmoothStepPath({
      sourceX: source.x,
      sourceY: source.y,
      sourcePosition: props.sourcePosition,
      targetX: target.x,
      targetY: target.y,
      targetPosition: props.targetPosition,
    });
    return smoothPath;
  } else {
    // 默认使用贝塞尔曲线
    const [bezierPath] = getBezierPath({
      sourceX: source.x,
      sourceY: source.y,
      sourcePosition: props.sourcePosition,
      targetX: target.x,
      targetY: target.y,
      targetPosition: props.targetPosition,
    });
    return bezierPath;
  }
});
</script>

<style scoped>
.connection-line-animated {
  stroke-dasharray: 5;
  animation: connection-line-dash 0.5s linear infinite;
  transition: stroke 0.2s ease;
}

@keyframes connection-line-dash {
  from {
    stroke-dashoffset: 10;
  }
  to {
    stroke-dashoffset: 0;
  }
}
</style>
