<template>
  <!-- 内联模式：不显示边框和标题 -->
  <div
    v-if="inline && resolvedValue"
    class="text-xs text-slate-700 whitespace-pre-wrap wrap-break-word"
    style="
      font-family: 'Fira Code', 'Courier New', 'Microsoft YaHei', 'SimHei',
        monospace;
    "
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
      class="text-xs text-slate-700 whitespace-pre-wrap wrap-break-word max-h-32 overflow-y-auto variable-scroll"
      style="
        font-family: 'Fira Code', 'Courier New', 'Microsoft YaHei', 'SimHei',
          monospace;
      "
      v-html="resolvedValueHtml"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useVariableContext } from "../../composables/useVariableContext";
import { resolveConfigWithVariables } from "workflow-flow-nodes";

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

// 使用统一的变量上下文，避免重复计算
const { contextMap } = useVariableContext();

// 实时预览解析后的内容
const resolvedValue = computed(() => {
  const value = props.value;
  if (!value || typeof value !== "string") return "";

  // 检查是否包含变量
  const hasVariable = /\{\{\s*\$?[^{}]+?\s*\}\}/.test(value);

  // 如果没有变量，直接返回原值
  if (!hasVariable) return value;

  // 如果没有 contextMap，说明没有选中节点，返回原值
  if (!contextMap.value || contextMap.value.size === 0) return value;

  try {
    // 解析变量
    const resolved = resolveConfigWithVariables(
      { preview: value },
      contextMap.value
    );

    const result = resolved.preview;

    // 如果解析后的值和原值一样，说明变量没有被替换（可能不存在），返回原值
    if (result === value) return value;

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

  // 如果没有变量，直接返回转义后的原值
  if (!hasVariable) return escapeHtml(value);

  // 如果没有 contextMap，说明没有选中节点，返回转义后的原值
  if (!contextMap.value || contextMap.value.size === 0)
    return escapeHtml(value);

  try {
    // 统一使用 highlightResolvedVariables，如果指定了 currentItemIndex 则传入
    const highlighted = highlightResolvedVariables(
      value,
      contextMap.value,
      props.currentItemIndex
    );

    // 如果高亮后的结果为空（可能所有变量都解析失败），返回转义后的原值
    if (!highlighted) return escapeHtml(value);

    return highlighted;
  } catch (error) {
    return escapeHtml(`解析错误: ${error}`);
  }
});

/**
 * 高亮解析后的变量值
 */
function highlightResolvedVariables(
  original: string,
  contextMap: Map<string, unknown>,
  itemIndex?: number
): string {
  const tokenRegex = /\{\{\s*\$?[^{}]+?\s*\}\}/g;
  let lastIndex = 0;
  let result = "";
  let match: RegExpExecArray | null;
  let hasMatched = false;

  while ((match = tokenRegex.exec(original)) !== null) {
    hasMatched = true;
    const token = match[0];
    const start = match.index;

    // 添加变量前的普通文本
    result += escapeHtml(original.slice(lastIndex, start));

    try {
      // 解析单个变量的值
      const tempConfig = { temp: token };
      const tempResolved = resolveConfigWithVariables(tempConfig, contextMap);

      // 如果指定了 itemIndex 且解析结果是数组，取对应索引的值
      let variableValue: string;
      if (itemIndex !== undefined && Array.isArray(tempResolved.temp)) {
        if (tempResolved.temp[itemIndex] !== undefined) {
          variableValue = formatValue(tempResolved.temp[itemIndex]);
        } else {
          // 如果数组索引不存在，显示原变量
          variableValue = token;
        }
      } else {
        variableValue = formatValue(tempResolved.temp);
      }

      // 如果解析后的值和原变量一样，说明变量没有被替换，显示原变量（不高亮）
      if (variableValue === token || tempResolved.temp === token) {
        result += escapeHtml(token);
      } else {
        // 用高亮样式包裹解析后的变量值
        result += `<span class="inline-flex items-baseline mx-[1px] bg-indigo-100/80 text-[12px] font-medium text-indigo-700 shadow-sm" title="${escapeHtml(
          token
        )}">${escapeHtml(variableValue)}</span>`;
      }
    } catch (error) {
      // 解析失败，显示原变量
      result += escapeHtml(token);
    }

    lastIndex = start + token.length;
  }

  // 添加剩余的普通文本
  result += escapeHtml(original.slice(lastIndex));

  // 如果没有匹配到任何变量，返回空字符串（这种情况不应该发生，因为调用前已经检查过）
  return hasMatched ? result : escapeHtml(original);
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
