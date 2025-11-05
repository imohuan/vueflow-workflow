<template>
  <div
    class="flex items-center gap-2 rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-xs text-slate-600 shadow-lg"
  >
    <!-- 历史记录按钮 -->
    <n-button
      quaternary
      circle
      aria-label="撤销 (Ctrl+Z)"
      :disabled="!canUndo"
      @click="emit('undo')"
    >
      <template #icon>
        <n-icon><IconUndo /></n-icon>
      </template>
    </n-button>
    <n-button
      quaternary
      circle
      aria-label="重做 (Ctrl+Y)"
      :disabled="!canRedo"
      @click="emit('redo')"
    >
      <template #icon>
        <n-icon><IconRedo /></n-icon>
      </template>
    </n-button>

    <!-- 分隔线 -->
    <div class="h-4 w-px bg-slate-300"></div>

    <n-button quaternary circle aria-label="自适应" @click="emit('fitView')">
      <template #icon>
        <n-icon><IconFit /></n-icon>
      </template>
    </n-button>
    <n-button
      quaternary
      circle
      aria-label="自动布局"
      @click="emit('autoLayout')"
    >
      <template #icon>
        <n-icon><IconLayout /></n-icon>
      </template>
    </n-button>
    <n-button
      quaternary
      circle
      aria-label="小地图"
      @click="emit('toggleMiniMap')"
    >
      <template #icon>
        <n-icon><IconMap /></n-icon>
      </template>
    </n-button>
    <!-- <span class="ml-2 text-[11px] text-slate-400">Ctrl + / 查看快捷键</span> -->
    <n-button type="success" size="small" @click="emit('executeWorkflow')">
      <template #icon>
        <n-icon><IconPlay /></n-icon>
      </template>
      执行
    </n-button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useVueFlowEvents } from "@/newCode/features/vueflow";
import IconUndo from "@/icons/IconUndo.vue";
import IconRedo from "@/icons/IconRedo.vue";
import IconFit from "@/icons/IconFit.vue";
import IconLayout from "@/icons/IconLayout.vue";
import IconMap from "@/icons/IconMap.vue";
import IconPlay from "@/icons/IconPlay.vue";

// 历史记录状态（由历史记录插件通过事件更新）
const canUndo = ref(false);
const canRedo = ref(false);

// 监听历史记录插件的状态变化
const events = useVueFlowEvents();
const historyStatusHandler = (payload: any) => {
  canUndo.value = payload.canUndo;
  canRedo.value = payload.canRedo;
};

onMounted(() => {
  events.on("history:status-changed", historyStatusHandler);
});

onUnmounted(() => {
  events.off("history:status-changed", historyStatusHandler);
});

const emit = defineEmits<{
  (event: "undo"): void;
  (event: "redo"): void;
  (event: "fitView"): void;
  (event: "autoLayout"): void;
  (event: "toggleMiniMap"): void;
  (event: "executeWorkflow"): void;
}>();
</script>

<style scoped></style>
