<!--
  自定义端口 Handle 组件
  基于连接线目标位置的动态高亮，而非 hover
-->
<template>
  <Handle
    :id="id"
    :type="type"
    :position="position"
    :is-connectable="isConnectable"
    :is-valid-connection="isValidConnection"
    :class="computedClass"
    :style="style"
  />
</template>

<script setup lang="ts">
import { inject, computed } from "vue";
import {
  Handle,
  useConnection,
  type Position,
  type ConnectionStatus,
  type Connection,
} from "@vue-flow/core";
import { PORT_STYLE } from "./portStyles";
import { PLUGIN_MANAGER_KEY, type PluginManager } from "../../plugins";

interface Props {
  /** 端口 ID */
  id: string;
  /** 端口类型：source (输出) 或 target (输入) */
  type: "source" | "target";
  /** 端口位置 */
  position: Position;
  /** 端口样式：ellipse (椭圆) 或 circle (圆形) */
  variant?: "ellipse" | "circle";
  /** 是否可连接 */
  isConnectable?: boolean;
  /** 节点 ID（用于连接验证） */
  nodeId: string;
  /** 自定义样式 */
  style?: Record<string, string>;
  /** 额外的 CSS 类 */
  class?: string | string[];
}

const props = withDefaults(defineProps<Props>(), {
  variant: "ellipse",
  isConnectable: true,
  style: () => ({}),
  class: "",
});

// 获取插件管理器
const pluginManager = inject<PluginManager>(PLUGIN_MANAGER_KEY);

// 当前连接信息（VueFlow 提供）
const { endHandle, status: connectionStatus } = useConnection();

/**
 * 获取 Ctrl 连接候选状态
 * 在 Ctrl 模式或边编辑模式下，当鼠标移动到节点上时会计算候选端口
 */
const ctrlConnectCandidate = computed(() => {
  if (!pluginManager) {
    return null;
  }

  const sharedState = pluginManager.getSharedState();
  const ctrlConnect = sharedState["ctrl-connect"];

  if (!ctrlConnect || !ctrlConnect.candidate) {
    return null;
  }

  const candidate = ctrlConnect.candidate.value;
  if (!candidate || !candidate.position) {
    return null;
  }

  return candidate;
});

/**
 * 判断当前端口是否是连接目标（优先使用 Ctrl 吸附候选，其次使用 VueFlow 提供的 endHandle）
 */
const isConnectionTarget = computed((): boolean => {
  const candidate = ctrlConnectCandidate.value;
  if (candidate) {
    return (
      candidate.nodeId === props.nodeId &&
      candidate.handleId === props.id &&
      candidate.handleType === props.type
    );
  }

  const handle = endHandle.value;
  if (!handle) {
    return false;
  }

  if (handle.nodeId !== props.nodeId || handle.type !== props.type) {
    return false;
  }

  return handle.id === props.id;
});

/**
 * 判断连接是否有效（候选优先，其次使用 VueFlow 的连接状态）
 */
const isValidConnectionLocal = computed((): boolean => {
  if (!isConnectionTarget.value) {
    return true;
  }

  const candidate = ctrlConnectCandidate.value;
  if (candidate) {
    return candidate.isValid;
  }

  const status = connectionStatus.value as ConnectionStatus | null;
  if (!status) {
    return true;
  }

  return status === "valid";
});

const isValidConnection = (connection: Connection) => {
  // 禁止
  if (connection.targetHandle === "loop-in") {
    return false;
  }
  return isValidConnectionLocal.value;
};

/**
 * 获取高亮 CSS 类
 */
const highlightClass = computed((): string => {
  if (!isConnectionTarget.value) {
    return "";
  }

  return isValidConnectionLocal.value
    ? "port-valid-target"
    : "port-invalid-target";
});

/**
 * 计算最终的 CSS 类
 */
const computedClass = computed(() => {
  const classes: string[] = [];

  // 基础样式类
  if (props.variant === "ellipse") {
    classes.push(PORT_STYLE.ellipse);
  } else {
    classes.push(PORT_STYLE.circle);
  }

  // 端口类型类
  if (props.type === "source") {
    classes.push("port-output");
  } else {
    classes.push("port-input");
  }

  // 高亮类
  if (highlightClass.value) {
    classes.push(highlightClass.value);
  }

  // 自定义类
  if (props.class) {
    if (Array.isArray(props.class)) {
      classes.push(...props.class);
    } else {
      classes.push(props.class);
    }
  }

  return classes;
});
</script>
