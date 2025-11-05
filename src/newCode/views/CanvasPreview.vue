<template>
  <div class="min-h-screen bg-slate-100 p-6">
    <div class="mx-auto max-w-6xl space-y-6">
      <header class="space-y-2">
        <h1 class="text-2xl font-semibold text-slate-900">Canvas 重构预览</h1>
        <p class="text-sm text-slate-500">
          展示阶段 1 拆分后的 Canvas 模块骨架，用于 UI 联调与交互验证。
        </p>
      </header>

      <PanelShell
        title="CanvasView"
        description="当前为占位版本，后续会接入 VueFlow 与执行服务"
        size="full"
        padding="none"
      >
        <div class="h-[640px]">
          <CanvasView />
        </div>
      </PanelShell>
    </div>
  </div>
</template>

<script setup lang="ts">
import CanvasView from "@/newCode/features/canvas/CanvasView.vue";
import { PanelShell } from "@/newCode/components/ui";
</script>

