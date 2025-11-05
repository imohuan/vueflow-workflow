<template>
  <div class="flex h-full bg-slate-100">
    <VerticalTabNav />

    <div class="relative flex-1 overflow-hidden">
      <FloatingPanel />

      <section
        class="absolute inset-0 flex items-center justify-center overflow-hidden bg-linear-to-b from-sky-100 via-slate-200 to-slate-100"
      >
        <div
          class="max-w-xl rounded-2xl bg-white/80 p-8 text-center shadow-2xl backdrop-blur"
        >
          <p class="text-lg font-semibold text-slate-900">画布区域占位</p>
          <p class="mt-2 text-sm leading-6 text-slate-600">
            重构阶段暂未接入 VueFlow。后续将在此挂载 CanvasService
            驱动的节点编辑器。
          </p>
          <div class="mt-4 space-y-1 text-xs text-slate-500">
            <span class="block"
              >缩放：{{ canvasService.viewport.zoom.toFixed(2) }}</span
            >
            <span class="block"
              >偏移：({{ canvasService.viewport.x }},
              {{ canvasService.viewport.y }})</span
            >
            <span class="block"
              >小地图：{{
                canvasService.isMiniMapVisible ? "显示" : "隐藏"
              }}</span
            >
          </div>
        </div>
      </section>

      <div
        class="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2"
      >
        <div class="pointer-events-auto">
          <CanvasToolbar
            @fit-view="handleFitView"
            @auto-layout="handleAutoLayout"
            @toggle-mini-map="canvasService.toggleMiniMap"
            @execute-workflow="handleExecute"
          />
        </div>
      </div>

      <div class="absolute bottom-1 left-1">
        <NodeInfoCard />
      </div>

      <QuickNodeMenu
        :visible="quickMenu.visible"
        :position="quickMenu.position"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import CanvasToolbar from "./components/CanvasToolbar.vue";
import QuickNodeMenu from "./components/QuickNodeMenu.vue";
import VerticalTabNav from "./components/VerticalTabNav.vue";
import FloatingPanel from "./components/FloatingPanel.vue";
import NodeInfoCard from "./components/NodeInfoCard.vue";
import { useCanvasService } from "@/newCode/services/canvasService";
import { useCanvasStore } from "@/newCode/stores/canvas";

const canvasService = useCanvasService();
const canvasStore = useCanvasStore();

const quickMenu = reactive({
  visible: false,
  position: { x: 320, y: 220 },
});

function handleFitView() {
  canvasService.setViewport({ zoom: 1, x: 0, y: 0 });
}

function handleAutoLayout() {
  // 占位逻辑：模拟自适应布局
  canvasService.setViewport({ zoom: 0.85 });
}

function handleExecute() {
  canvasStore.setExecuting(true);
  setTimeout(() => canvasStore.setExecuting(false), 1500);
}
</script>

<style scoped></style>
