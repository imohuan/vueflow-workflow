<template>
  <div ref="containerRef" class="json-code-viewer">
    <pre
      ref="codeRef"
      class="font-mono text-sm leading-relaxed overflow-auto"
    ><code class="language-json"></code></pre>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from "vue";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import "highlight.js/styles/github.min.css";

// 注册 JSON 语言
hljs.registerLanguage("json", json);

interface Props {
  /** JSON 数据 */
  data: unknown;
  /** 缩进空格数 */
  indent?: number;
  /** 是否格式化 */
  formatted?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  indent: 2,
  formatted: true,
});

const containerRef = ref<HTMLElement | null>(null);
const codeRef = ref<HTMLElement | null>(null);

/**
 * 格式化 JSON 字符串
 */
function formatJson(data: unknown, indent: number): string {
  try {
    return JSON.stringify(data, null, indent);
  } catch (error) {
    console.error("JSON 格式化失败:", error);
    return String(data);
  }
}

/**
 * 更新代码内容并高亮
 */
async function updateCode() {
  if (!codeRef.value) return;

  const codeElement = codeRef.value.querySelector("code");
  if (!codeElement) return;

  // 格式化 JSON
  const jsonString = props.formatted
    ? formatJson(props.data, props.indent)
    : JSON.stringify(props.data);

  // 设置代码内容
  codeElement.textContent = jsonString;

  // 等待 DOM 更新
  await nextTick();

  try {
    // 使用 highlight.js 高亮 JSON
    hljs.highlightElement(codeElement);
  } catch (error) {
    console.error("代码高亮失败:", error);
  }
}

// 监听数据变化
watch(
  () => [props.data, props.indent, props.formatted],
  () => {
    updateCode();
  },
  { immediate: true, deep: true }
);

onMounted(() => {
  updateCode();
});
</script>

<style scoped>
.json-code-viewer {
  width: 100%;
}

.json-code-viewer pre {
  margin: 0;
  padding: 1rem;
  background-color: rgb(248 250 252);
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
}

.json-code-viewer code {
  display: block;
  white-space: pre;
  background-color: transparent;
}

/* 覆盖 highlight.js 的默认样式，使其更符合设计 */
.json-code-viewer :deep(.hljs) {
  background-color: transparent;
  color: rgb(30 41 59);
}

.json-code-viewer :deep(.hljs-string) {
  color: rgb(22 163 74);
}

.json-code-viewer :deep(.hljs-number) {
  color: rgb(37 99 235);
}

.json-code-viewer :deep(.hljs-literal) {
  color: rgb(234 88 12);
}

.json-code-viewer :deep(.hljs-keyword) {
  color: rgb(147 51 234);
}

.json-code-viewer :deep(.hljs-punctuation) {
  color: rgb(100 116 139);
}
</style>
