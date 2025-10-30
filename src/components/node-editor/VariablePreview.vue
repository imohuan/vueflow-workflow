<template>
  <div
    v-if="resolvedValue"
    class="p-3 bg-white/90 border border-slate-200 rounded-md shadow-sm"
  >
    <div class="flex items-center justify-between mb-2">
      <span class="text-[10px] font-semibold tracking-wide text-slate-500"
        >实时预览</span
      >
      <span class="text-[9px] text-slate-400">已解析变量</span>
    </div>
    <div
      class="text-xs text-slate-700 font-mono whitespace-pre-wrap wrap-break-word max-h-32 overflow-y-auto"
    >
      {{ resolvedValue }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNodeEditorStore } from "@/stores/nodeEditor";
import {
  resolveConfigWithVariables,
  buildVariableContext,
} from "@/utils/variableResolver";

interface Props {
  value?: string | number;
}

const props = defineProps<Props>();

const store = useNodeEditorStore();

// 实时预览解析后的内容
const resolvedValue = computed(() => {
  const value = props.value;
  if (!value || typeof value !== "string") return "";

  // 检查是否包含变量
  const hasVariable = /\{\{\s*\$?[^{}]+?\s*\}\}/.test(value);
  if (!hasVariable) return "";

  if (!store.selectedNodeId) return "";

  try {
    // 获取变量上下文
    const { map: contextMap } = buildVariableContext(
      store.selectedNodeId,
      store.nodes,
      store.edges
    );

    // 解析变量
    const resolved = resolveConfigWithVariables(
      { preview: value },
      [],
      contextMap
    );

    const result = resolved.preview;

    // 如果解析后的值和原值一样，说明变量没有被替换（可能不存在）
    if (result === value) return "";

    // 格式化输出
    if (typeof result === "object") {
      return JSON.stringify(result, null, 2);
    }
    return String(result);
  } catch (error) {
    return `解析错误: ${error}`;
  }
});
</script>
