<template>
  <div class="px-4 py-2 text-xs font-medium text-slate-600">
    节点 {{ canvasStore.nodeCount }}　连接 {{ canvasStore.edgeCount }}　状态
    {{ canvasStore.isExecuting ? "执行中" : "空闲" }}　FPS {{ canvasStore.fps }}
  </div>
</template>

<script setup lang="ts">
import { useCanvasStore } from "../../../stores/canvas";

const canvasStore = useCanvasStore();
</script>

<style scoped></style>
