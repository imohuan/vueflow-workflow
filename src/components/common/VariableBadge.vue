<template>
  <div
    class="inline-flex items-center gap-0.5 rounded border bg-slate-100 border-slate-200 text-slate-700 whitespace-nowrap max-w-full"
    :class="[
      size === 'xs' ? 'px-1 py-px text-[6px]' : 'px-2 py-0.5 text-[7px]',
    ]"
  >
    <IconLink
      class="text-purple-500 shrink-0"
      :class="[size === 'xs' ? 'w-1.5 h-1.5' : 'w-2 h-2']"
    />
    <span class="font-mono truncate">{{ displayText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import IconLink from "@/icons/IconLink.vue";
import { simplifyVariableReference } from "@/utils/variableResolver";

interface Props {
  /** 变量值，如 "{{ 截图.result.name }}" */
  value: string | number | unknown;
  /** 默认显示文本（当无法解析时） */
  fallback?: string;
  /** 尺寸大小 */
  size?: "default" | "xs";
}

const props = withDefaults(defineProps<Props>(), {
  fallback: "变量",
  size: "default",
});

const displayText = computed(() => {
  if (!props.value || typeof props.value !== "string") {
    return props.fallback;
  }

  // 检测是否有多个变量
  const tokenRegex = /\{\{\s*([^{}]+?)\s*\}\}/g;
  const matches = [...props.value.matchAll(tokenRegex)];

  if (matches.length === 0) {
    return props.value;
  }

  // 如果有多个变量，只显示第一个变量的简化名称 + "..."
  if (matches.length > 1) {
    const firstMatch = matches[0];
    if (!firstMatch || !firstMatch[1]) return props.fallback;

    const path = firstMatch[1].trim();
    const parts = path.split(".");

    if (parts.length === 0) return props.fallback;

    const firstPart = parts[0];
    const lastPart = parts[parts.length - 1];

    // 如果只有一个部分或最后一部分是数字索引，只返回第一部分
    if (parts.length === 1 || /^\d+$/.test(lastPart || "")) {
      return `${firstPart}...`;
    }

    return `${firstPart} - ${lastPart}...`;
  }

  // 只有一个变量时，使用原有逻辑
  const simplified = simplifyVariableReference(props.value);
  return simplified || props.fallback;
});
</script>
