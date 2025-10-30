<template>
  <div class="relative">
    <span
      v-if="showPlaceholder"
      class="pointer-events-none absolute left-3 top-2.5 text-sm text-slate-400 select-none"
    >
      {{ placeholder }}
    </span>
    <div
      ref="editorRef"
      contenteditable="true"
      :class="[baseEditorClass, multiline ? multilineClass : singleLineClass]"
      @input="handleInput"
      @variable-drop="handleVariableDrop"
      @paste="handlePaste"
      @keydown="handleKeyDown"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

interface Props {
  modelValue?: string | number;
  placeholder?: string;
  multiline?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "",
  multiline: false,
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const editorRef = ref<HTMLDivElement | null>(null);
const internalValue = ref(normalizeValue(props.modelValue));
let isUpdating = false;

const baseEditorClass =
  "w-full cursor-text border border-slate-200 rounded-md px-3 py-2.5 text-sm font-mono text-slate-700 bg-white/80 backdrop-blur shadow-sm transition-all duration-200 outline-none focus-visible:border-purple-400 focus-visible:ring-4 focus-visible:ring-purple-100 break-words";
const singleLineClass =
  "min-h-[2.5rem] max-h-[2.5rem] overflow-hidden whitespace-nowrap";
const multilineClass =
  "min-h-[5.5rem] max-h-64 overflow-y-auto whitespace-pre-wrap";

const showPlaceholder = computed(
  () => !internalValue.value && props.placeholder
);

// 初始化编辑器内容
watch(
  () => props.modelValue,
  (value) => {
    const newValue = normalizeValue(value);
    if (newValue !== internalValue.value) {
      internalValue.value = newValue;
      updateEditorContent(newValue, false);
    }
  }
);

// 组件挂载时设置初始内容
watch(
  editorRef,
  (editor) => {
    if (editor) {
      updateEditorContent(internalValue.value, false);
    }
  },
  { flush: "post" }
);

function normalizeValue(value: string | number | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

/**
 * 更新编辑器内容（带高亮）
 */
function updateEditorContent(text: string, restoreCursor = false) {
  const editor = editorRef.value;
  if (!editor) return;

  let cursorPos: number | null = null;
  if (restoreCursor) {
    cursorPos = getCursorPosition();
  }

  const html = highlightVariables(text) || "";
  if (editor.innerHTML !== html) {
    editor.innerHTML = html;
  }

  if (restoreCursor && cursorPos !== null) {
    setCursorPosition(cursorPos);
  }
}

/**
 * 获取纯文本内容
 */
function getPlainText(element: HTMLElement): string {
  return element.textContent?.replace(/\u00a0/g, " ") ?? "";
}

/**
 * 获取光标位置
 */
function getCursorPosition(): number | null {
  const editor = editorRef.value;
  if (!editor) return null;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.endContainer)) return null;

  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(editor);
  preCaretRange.setEnd(range.endContainer, range.endOffset);

  return preCaretRange.toString().length;
}

/**
 * 设置光标位置
 */
function setCursorPosition(offset: number) {
  const editor = editorRef.value;
  if (!editor) return;

  const selection = window.getSelection();
  if (!selection) return;

  const text = getPlainText(editor);
  const target = Math.max(0, Math.min(offset, text.length));

  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode() as Text | null;
  let traversed = 0;

  while (current) {
    const nodeLength = current.textContent?.length ?? 0;
    if (traversed + nodeLength >= target) {
      const innerOffset = target - traversed;
      const range = document.createRange();
      range.setStart(current, innerOffset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    traversed += nodeLength;
    current = walker.nextNode() as Text | null;
  }

  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * 处理输入事件
 */
function handleInput() {
  if (!editorRef.value || isUpdating) return;

  const plainText = getPlainText(editorRef.value);
  if (plainText === internalValue.value) return;
  internalValue.value = plainText;
  emit("update:modelValue", plainText);

  isUpdating = true;
  updateEditorContent(plainText, true);
  isUpdating = false;
}

/**
 * 处理粘贴事件（只粘贴纯文本）
 */
function handlePaste(event: ClipboardEvent) {
  event.preventDefault();
  const text = event.clipboardData?.getData("text/plain") || "";
  insertTextAtCursor(text);
  handleInput();
}

/**
 * 处理按键事件
 */
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === "Enter") {
    event.preventDefault();

    if (!props.multiline) {
      return;
    }

    insertTextAtCursor("\n");
    handleInput();
  }
}

/**
 * 处理拖放事件
 */
function handleVariableDrop(event: CustomEvent) {
  if (!editorRef.value) return;

  const dragData = event.detail;
  if (!dragData?.reference) return;

  const reference = dragData.reference.trim();
  if (!reference) return;

  insertTextAtCursor(reference);
  handleInput();
}

function insertTextAtCursor(text: string) {
  const editor = editorRef.value;
  if (!editor) return;

  const selection = window.getSelection();
  if (!selection) return;

  if (selection.rangeCount === 0) {
    editor.appendChild(document.createTextNode(text));
    return;
  }

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer)) {
    range.selectNodeContents(editor);
    range.collapse(false);
  }

  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);

  const newRange = document.createRange();
  newRange.setStart(node, node.length);
  newRange.collapse(true);

  selection.removeAllRanges();
  selection.addRange(newRange);
}

/**
 * 高亮变量
 */
function highlightVariables(value: string): string {
  if (!value) return "";

  const tokenRegex = /\{\{\s*\$?[^{}]+?\s*\}\}/g;
  let lastIndex = 0;
  let result = "";
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(value)) !== null) {
    const token = match[0];
    const start = match.index;
    result += escapeHtml(value.slice(lastIndex, start));
    result += `<span class="inline-flex items-center rounded-lg bg-purple-100/80 px-1.5 py-0.5 text-[12px] font-medium text-purple-600 shadow-sm">${escapeHtml(
      token
    )}</span>`;
    lastIndex = start + token.length;
  }

  result += escapeHtml(value.slice(lastIndex));
  return result;
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
