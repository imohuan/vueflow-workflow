<template>
  <div class="absolute top-0 bottom-0 left-0 z-20 w-64 pointer-events-auto">
    <PanelShell
      title="工作流菜单占位"
      size="full"
      padding="sm"
      :closable="true"
      :header-sticky="true"
      class="h-full rounded-none!"
    >
      <div class="space-y-4 text-sm leading-6 text-slate-600">
        <p>重构阶段占位。后续将在此渲染 WorkflowTree / NodeLibrary 等模块。</p>
        <ul class="list-disc space-y-1 pl-5">
          <li>支持搜索、筛选工作流</li>
          <li>支持拖拽节点到画布</li>
          <li>支持快捷操作按钮</li>
        </ul>
      </div>
      <template #footer>
        <div class="flex items-center justify-between text-xs text-slate-500">
          <span>占位内容</span>
        </div>
      </template>
    </PanelShell>
  </div>
</template>

<script setup lang="ts">
import { PanelShell } from "@/newCode/components/ui";
</script>

<style scoped></style>
