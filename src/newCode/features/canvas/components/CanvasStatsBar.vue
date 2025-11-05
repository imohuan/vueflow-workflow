<template>
  <div
    class="flex items-center gap-4 border-t border-slate-200/60 bg-slate-50/80 px-4 py-3 text-xs text-slate-500 backdrop-blur"
  >
    <div class="flex items-center gap-2">
      <span class="font-medium text-slate-600">节点</span>
      <span class="rounded bg-white px-2 py-1 text-slate-800 shadow-sm">{{
        nodeCount
      }}</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="font-medium text-slate-600">连线</span>
      <span class="rounded bg-white px-2 py-1 text-slate-800 shadow-sm">{{
        edgeCount
      }}</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="font-medium text-slate-600">执行状态</span>
      <span
        :class="
          isExecuting ? 'text-emerald-600 font-semibold' : 'text-slate-500'
        "
      >
        {{ isExecuting ? "执行中" : "空闲" }}
      </span>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  nodeCount: number;
  edgeCount: number;
  isExecuting: boolean;
}

defineProps<Props>();
</script>

<style scoped></style>
