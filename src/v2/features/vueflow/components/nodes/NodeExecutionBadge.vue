<template>
  <div
    v-if="showBadge"
    class="absolute group h-6 -top-7 right-0 z-10 px-2 py-1 rounded-md text-xs font-medium leading-none whitespace-nowrap shadow backdrop-blur-sm cursor-pointer pointer-events-auto pb-1"
    :class="statusBgClass"
    :title="clickHint"
    @click.stop="handleClick"
  >
    <div
      class="flex items-center gap-1 hover:border-b group-hover:border-white"
    >
      <component
        :is="statusIconComponent"
        class="w-3.5 h-3.5"
        :class="executionStatus?.status === 'running' ? 'animate-spin' : ''"
      />
      <span class="text-xs">{{ statusText }}</span>
      <span
        v-if="duration !== null && executionStatus?.status !== 'running'"
        class="text-[11px] opacity-90 ml-0.5"
        >{{ duration }}ms</span
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from "vue";
import IconLoading from "@/icons/IconLoading.vue";
import IconCheckCircle from "@/icons/IconCheckCircle.vue";
import IconErrorCircle from "@/icons/IconErrorCircle.vue";
import IconCache from "@/icons/IconCache.vue";
import IconSkip from "@/icons/IconSkip.vue";
import { eventBusUtils } from "../../events";
import { useCanvasStore } from "@/v2/stores/canvas";

interface Props {
  /** 节点 ID */
  nodeId: string;
}

const props = defineProps<Props>();

// 直接使用 canvasStore 获取节点执行状态
const canvasStore = useCanvasStore();

// 获取当前节点的执行状态
const executionStatus = computed(() => {
  return canvasStore.getNodeExecutionStatus(props.nodeId);
});

/** 是否显示徽章 */
const showBadge = computed(() => {
  const status = executionStatus.value?.status;
  return status && status !== "pending";
});

/** 状态图标组件 */
const statusIconComponent = computed<Component>(() => {
  const status = executionStatus.value?.status;
  switch (status) {
    case "running":
      return IconLoading;
    case "success":
      return IconCheckCircle;
    case "error":
      return IconErrorCircle;
    case "cached":
      return IconCache;
    case "skipped":
      return IconSkip;
    default:
      return IconLoading;
  }
});

/** 状态文本 */
const statusText = computed(() => {
  const status = executionStatus.value?.status;
  switch (status) {
    case "running":
      return "执行中";
    case "success":
      return "成功";
    case "error":
      return "失败";
    case "cached":
      return "缓存";
    case "skipped":
      return "跳过";
    default:
      return "";
  }
});

/** 执行时长 */
const duration = computed(() => {
  return executionStatus.value?.duration ?? null;
});

/** 状态背景颜色类 */
const statusBgClass = computed(() => {
  const status = executionStatus.value?.status;
  switch (status) {
    case "running":
      return "bg-blue-500/90 text-white";
    case "success":
      return "bg-green-500/90 text-white";
    case "error":
      return "bg-red-500/90 text-white";
    case "cached":
      return "bg-purple-500/90 text-white";
    case "skipped":
      return "bg-gray-400/90 text-white";
    default:
      return "bg-gray-400/90 text-white";
  }
});

/** 点击提示文本 */
const clickHint = computed(() => {
  return "点击查看执行详情";
});

/** 处理点击事件 */
function handleClick() {
  const status = executionStatus.value?.status;
  if (props.nodeId && status) {
    console.log("[NodeExecutionBadge] 点击徽章:", {
      nodeId: props.nodeId,
      status,
      result: executionStatus.value,
    });

    // 直接通过事件总线发送预览事件
    eventBusUtils.emit("execution:result:preview" as any, {
      nodeId: props.nodeId,
      status,
      result: executionStatus.value,
    });
  }
}
</script>
