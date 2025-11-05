<template>
  <div
    class="flex items-center gap-2 rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-xs text-slate-600 shadow-lg"
  >
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
import IconFit from "@/icons/IconFit.vue";
import IconLayout from "@/icons/IconLayout.vue";
import IconMap from "@/icons/IconMap.vue";
import IconPlay from "@/icons/IconPlay.vue";

const emit = defineEmits<{
  (event: "fitView"): void;
  (event: "autoLayout"): void;
  (event: "toggleMiniMap"): void;
  (event: "executeWorkflow"): void;
}>();
</script>

<style scoped></style>
