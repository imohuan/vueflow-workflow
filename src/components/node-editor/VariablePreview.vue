<template>
  <!-- 内联模式：不显示边框和标题 -->
  <div
    v-if="inline && resolvedValue"
    class="text-xs text-slate-700 font-mono whitespace-pre-wrap wrap-break-word"
    v-html="resolvedValueHtml"
  ></div>

  <!-- 完整模式：带边框和标题 -->
  <div
    v-else-if="!inline && resolvedValue"
    class="p-3 bg-white/90 border border-slate-200 rounded-md shadow-sm"
  >
    <div class="flex items-center justify-between mb-2">
      <span class="text-[10px] font-semibold tracking-wide text-slate-500"
        >实时预览</span
      >
      <span class="text-[9px] text-slate-400">已解析变量</span>
    </div>
    <div
      class="text-xs text-slate-700 font-mono whitespace-pre-wrap wrap-break-word max-h-32 overflow-y-auto variable-scroll"
      v-html="resolvedValueHtml"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNodeEditorStore } from "../../stores/nodeEditor";
import {
  resolveConfigWithVariables,
  buildVariableContext,
} from "../../workflow/variables/variableResolver";

interface Props {
  value?: string | number;
  /** 用于显示数组中的特定项（用于分页预览） */
  currentItemIndex?: number;
  /** 是否为内联模式（不显示边框和标题） */
  inline?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  currentItemIndex: undefined,
  inline: false,
});

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

    // 如果指定了 currentItemIndex，且结果是数组，返回对应项
    if (
      props.currentItemIndex !== undefined &&
      Array.isArray(result) &&
      result[props.currentItemIndex] !== undefined
    ) {
      return formatValue(result[props.currentItemIndex]);
    }

    // 格式化输出
    return formatValue(result);
  } catch (error) {
    return `解析错误: ${error}`;
  }
});

// 高亮显示解析后的变量
const resolvedValueHtml = computed(() => {
  const value = props.value;
  if (!value || typeof value !== "string") return "";

  const hasVariable = /\{\{\s*\$?[^{}]+?\s*\}\}/.test(value);
  if (!hasVariable) return "";

  if (!store.selectedNodeId) return "";

  try {
    const { map: contextMap } = buildVariableContext(
      store.selectedNodeId,
      store.nodes,
      store.edges
    );

    // 统一使用 highlightResolvedVariables，如果指定了 currentItemIndex 则传入
    return highlightResolvedVariables(
      value,
      contextMap,
      props.currentItemIndex
    );
  } catch (error) {
    return escapeHtml(`解析错误: ${error}`);
  }
});

/**
 * 高亮解析后的变量值
 */
function highlightResolvedVariables(
  original: string,
  contextMap: Map<string, any>,
  itemIndex?: number
): string {
  const tokenRegex = /\{\{\s*\$?[^{}]+?\s*\}\}/g;
  let lastIndex = 0;
  let result = "";
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(original)) !== null) {
    const token = match[0];
    const start = match.index;

    // 添加变量前的普通文本
    result += escapeHtml(original.slice(lastIndex, start));

    // 解析单个变量的值
    const tempConfig = { temp: token };
    const tempResolved = resolveConfigWithVariables(tempConfig, [], contextMap);

    // 如果指定了 itemIndex 且解析结果是数组，取对应索引的值
    let variableValue: string;
    if (itemIndex !== undefined && Array.isArray(tempResolved.temp)) {
      variableValue = formatValue(tempResolved.temp[itemIndex]);
    } else {
      variableValue = formatValue(tempResolved.temp);
    }

    // 用高亮样式包裹解析后的变量值
    result += `<span class="inline-flex items-baseline mx-[1px] bg-indigo-100/80 text-[12px] font-medium text-indigo-700 shadow-sm" title="${escapeHtml(
      token
    )}">${escapeHtml(variableValue)}</span>`;

    lastIndex = start + token.length;
  }

  // 添加剩余的普通文本
  result += escapeHtml(original.slice(lastIndex));
  return result;
}

/**
 * 格式化值
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  }

  return String(value);
}

/**
 * HTML 转义
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
</script>
