<template>
  <div class="flex max-w-xs flex-col border-l border-slate-200/60 bg-white/90">
    <header class="border-b border-slate-200/60 px-4 py-3">
      <h3 class="text-sm font-semibold text-slate-900">节点输出预览</h3>
      <p class="mt-1 text-xs text-slate-500">
        重构阶段占位，展示最近执行的节点结果。
      </p>
    </header>

    <div class="flex-1 overflow-y-auto">
      <div v-if="results.length === 0" class="px-4 py-5 text-xs text-slate-400">
        暂无执行结果。执行工作流后将在此处显示节点输出。
      </div>
      <div
        v-for="item in results"
        :key="item.id"
        class="border-b border-slate-100 px-4 py-3 text-xs text-slate-600"
      >
        <div class="mb-2 flex items-center justify-between text-[11px] text-slate-400">
          <span class="font-semibold text-slate-500">{{ item.id }}</span>
          <span>{{ item.timestamp }}</span>
        </div>
        <pre class="max-h-40 overflow-auto variable-scroll rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
{{ item.preview }}
        </pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useCanvasStore } from "../../../stores/canvas";

const canvasStore = useCanvasStore();

const results = computed(() => canvasStore.lastNodeResults);
</script>

<style scoped></style>

