<template>
  <div
    class="h-full flex flex-col bg-white/90 backdrop-blur border-l border-slate-200"
  >
    <div
      class="flex items-center justify-between px-4 py-4 border-b border-slate-200 bg-white/80 shrink-0"
    >
      <h4 class="text-sm font-semibold text-slate-700 tracking-wide">
        可用变量
      </h4>
      <span
        class="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 text-[11px] font-medium text-purple-600 bg-purple-50 border border-purple-100 rounded-full"
      >
        {{ variables.length }}
      </span>
    </div>

    <div
      v-if="variables.length === 0"
      class="flex-1 flex items-center justify-center p-5"
    >
      <div
        class="text-[11px] text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-md p-4 text-center"
      >
        暂无可用变量<br />
        <span class="text-[10px]">执行上游节点后显示</span>
      </div>
    </div>

    <div v-else class="flex-1 overflow-y-auto p-4 space-y-1 variable-scroll">
      <VariableTreeItem
        v-for="node in variables"
        :key="node.id"
        :node="node"
        :level="0"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import VariableTreeItem from "./VariableTreeItem.vue";
import type { VariableTreeNode } from "@/workflow/variables/variableResolver";

interface Props {
  variables: VariableTreeNode[];
}

defineProps<Props>();
</script>

<style scoped>
.variable-scroll {
  scrollbar-width: thin;
}

.variable-scroll::-webkit-scrollbar {
  width: 6px;
}

.variable-scroll::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.4);
  border-radius: 9999px;
}

.variable-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.6);
}
</style>
