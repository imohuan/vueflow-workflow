<template>
  <div class="space-y-2">
    <!-- 顶部预览 -->
    <VariablePreview v-if="previewMode === 'top'" :value="internalValue" />

    <!-- 编辑器容器 -->
    <div class="relative">
      <div
        class="pointer-events-none absolute flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 shadow-sm"
        :class="fxIconPositionClass"
      >
        fx
      </div>
      <span
        v-if="showPlaceholder"
        class="pointer-events-none absolute select-none text-slate-400"
        :class="placeholderPositionClass"
      >
        {{ placeholder }}
      </span>
      <!-- 编辑器 - 使用 contenteditable -->
      <div
        ref="editorRef"
        contenteditable="true"
        :class="[
          baseEditorClass,
          multiline ? multilineClass : singleLineClass,
          editorPaddingClass,
        ]"
        @input="handleInput"
        @drop="handleDrop"
        @dragover.prevent
        @paste="handlePaste"
        @keydown="handleKeyDown"
        @focus="handleFocus"
        @blur="handleBlur"
      ></div>

      <!-- 下拉预览按钮 -->
      <button
        v-if="previewMode === 'dropdown'"
        type="button"
        class="absolute right-2 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-700"
        :class="[dropdownButtonPositionClass, dropdownButtonSizeClass]"
        @click.stop="toggleDropdown"
      >
        <IconChevronDown
          class="h-4 w-4 transition-transform"
          :class="{ 'rotate-180': showDropdown }"
        />
      </button>

      <!-- 下拉预览面板 -->
      <div
        v-if="previewMode === 'dropdown' && showDropdown"
        class="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
        @mousedown.prevent
      >
        <div
          class="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-3 py-2"
        >
          <div
            class="text-[10px] font-semibold uppercase tracking-wide text-slate-500"
          >
            Result
          </div>
          <div class="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span class="font-medium">Page</span>
            <input
              :value="pageInput"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              placeholder="0"
              :disabled="!previewItems.length"
              class="h-6 w-12 rounded-md bg-white px-1 text-center text-[10px] font-medium text-slate-600 shadow-inner ring-1 ring-inset ring-slate-200 transition focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
              @input="handlePageInputChange"
              @blur="handlePageInputCommit"
              @keydown="handlePageInputKeydown"
            />
            <span>/ {{ previewItems.length || 0 }}</span>
            <button
              type="button"
              class="flex h-6 w-6 items-center justify-center text-slate-400 transition-colors hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
              :disabled="!canNavigatePrev"
              aria-label="上一页"
              @click.stop="goPrevItem"
            >
              <IconChevronRight class="h-3.5 w-3.5 -rotate-180" />
            </button>
            <button
              type="button"
              class="flex h-6 w-6 items-center justify-center text-slate-400 transition-colors hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
              :disabled="!canNavigateNext"
              aria-label="下一页"
              @click.stop="goNextItem"
            >
              <IconChevronRight class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div class="max-h-56 overflow-y-auto px-3 py-3">
          <div
            v-if="previewItems.length"
            class="whitespace-pre-wrap font-mono text-xs leading-5 text-slate-700"
            v-html="currentPreviewItemHtml"
          ></div>
          <p v-else class="text-xs text-slate-400">暂无可预览数据</p>
        </div>
        <div class="border-t border-slate-100 bg-slate-50 px-3 py-2">
          <p class="text-[10px] leading-tight text-slate-400">
            Tip: 支持拖拽变量插入，变量以
            <span class="font-mono text-emerald-600"
              >&#123;&#123; $path &#125;&#125;</span
            >
            形式表示
          </p>
        </div>
      </div>
    </div>

    <!-- 底部预览（保留原有的位置，作为默认） -->
    <VariablePreview v-if="previewMode === 'bottom'" :value="internalValue" />

    <p
      v-if="previewMode !== 'dropdown'"
      class="text-[10px] leading-tight text-slate-400"
    >
      Tip: 支持拖拽变量插入，变量以
      <span class="font-mono text-emerald-600"
        >&#123;&#123; $path &#125;&#125;</span
      >
      形式表示
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import IconChevronDown from "@/icons/IconChevronDown.vue";
import IconChevronRight from "@/icons/IconChevronRight.vue";
import VariablePreview from "./VariablePreview.vue";
import { useNodeEditorStore } from "@/stores/nodeEditor";
import {
  buildVariableContext,
  resolveConfigWithVariables,
} from "@/utils/variableResolver";

interface Props {
  modelValue?: string | number;
  placeholder?: string;
  rows?: number;
  multiline?: boolean;
  /** 预览模式: top=顶部, bottom=底部, dropdown=下拉菜单, none=不显示 */
  previewMode?: "top" | "bottom" | "dropdown" | "none";
  /** 密度 */
  density?: "default" | "compact";
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "",
  rows: 1,
  multiline: false,
  previewMode: "bottom",
  density: "default",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const editorRef = ref<HTMLDivElement | null>(null);
const internalValue = ref(normalizeValue(props.modelValue));
const showDropdown = ref(false);
const currentPreviewIndex = ref(0);
const pageInput = ref("0");
let isUpdating = false; // 防止重复触发

const store = useNodeEditorStore();

const baseEditorClass = computed(() => {
  const classes = [
    "w-full",
    "cursor-text",
    "border",
    "border-slate-200",
    "rounded-md",
    "font-mono",
    "text-slate-700",
    "bg-white",
    "shadow-sm",
    "transition-all",
    "duration-200",
    "outline-none",
    "focus-visible:border-slate-400",
    "focus-visible:ring-2",
    "focus-visible:ring-slate-200",
    "break-words",
  ];

  if (props.density === "compact") {
    classes.push("text-xs");
  } else {
    classes.push("text-sm");
  }

  return classes.join(" ");
});

const singleLineClass = computed(() => {
  if (props.multiline) return "";
  return props.density === "compact"
    ? "h-8 overflow-hidden whitespace-nowrap resize-none"
    : "h-9 overflow-hidden whitespace-nowrap resize-none";
});

const multilineClass = computed(() => {
  return props.density === "compact"
    ? "min-h-[3.5rem] max-h-52 overflow-y-auto whitespace-pre-wrap resize-y"
    : "min-h-[4.5rem] max-h-60 overflow-y-auto whitespace-pre-wrap resize-y";
});

const editorPaddingClass = computed(() => {
  const left = props.density === "compact" ? "pl-10" : "pl-12";
  const right =
    props.previewMode === "dropdown"
      ? props.density === "compact"
        ? "pr-12"
        : "pr-14"
      : props.density === "compact"
      ? "pr-4"
      : "pr-5";
  const top = props.density === "compact" ? "pt-1.5" : "pt-2.5";
  const bottom =
    props.previewMode === "dropdown"
      ? props.density === "compact"
        ? "pb-4"
        : "pb-5"
      : props.density === "compact"
      ? "pb-2"
      : "pb-3";

  return [left, right, top, bottom].join(" ");
});

const dropdownButtonPositionClass = computed(() => {
  if (props.multiline) {
    return props.density === "compact" ? "bottom-2.5" : "bottom-3";
  }
  return props.density === "compact" ? "bottom-1.5" : "bottom-2";
});

const dropdownButtonSizeClass = computed(() =>
  props.density === "compact" ? "h-7 w-7" : "h-8 w-8"
);

const showPlaceholder = computed(
  () => !internalValue.value && props.placeholder
);

const placeholderPositionClass = computed(() =>
  props.density === "compact"
    ? "left-10 top-1.5 text-xs"
    : "left-12 top-3 text-sm"
);

const fxIconPositionClass = computed(() => {
  if (props.multiline) {
    return props.density === "compact"
      ? "left-2 top-3 h-7 w-7"
      : "left-2 top-3 h-8 w-8";
  }

  return props.density === "compact"
    ? "left-2 top-1/2 h-7 w-7 -translate-y-1/2"
    : "left-2 top-1/2 h-8 w-8 -translate-y-1/2";
});

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

// 检查是否包含变量
const hasVariable = computed(() => {
  const value = internalValue.value;
  if (!value || typeof value !== "string") return false;
  return /\{\{\s*\$?[^{}]+?\s*\}\}/.test(value);
});

const previewItems = computed(() => {
  const value = internalValue.value;
  if (!value) return [];

  if (!hasVariable.value) {
    return [normalizePreviewValue(value)];
  }

  if (!store.selectedNodeId) {
    return [normalizePreviewValue(value)];
  }

  try {
    const { map: contextMap } = buildVariableContext(
      store.selectedNodeId,
      store.nodes,
      store.edges
    );

    const resolved = resolveConfigWithVariables(
      { preview: value },
      [],
      contextMap
    );

    const result = resolved.preview;

    if (Array.isArray(result)) {
      return result.map((item) => normalizePreviewValue(item));
    }

    if (result === null || result === undefined) {
      return [];
    }

    return [normalizePreviewValue(result)];
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "未知错误");
    return [`解析错误: ${message}`];
  }
});

const currentPreviewItem = computed(
  () => previewItems.value[currentPreviewIndex.value] ?? ""
);

const currentPreviewItemHtml = computed(() =>
  highlightVariables(currentPreviewItem.value)
);

const canNavigatePrev = computed(
  () => previewItems.value.length > 1 && currentPreviewIndex.value > 0
);

const canNavigateNext = computed(
  () =>
    previewItems.value.length > 1 &&
    currentPreviewIndex.value < previewItems.value.length - 1
);

watch(
  previewItems,
  (items) => {
    if (!items.length) {
      currentPreviewIndex.value = 0;
      pageInput.value = "0";
      return;
    }

    if (currentPreviewIndex.value > items.length - 1) {
      currentPreviewIndex.value = items.length - 1;
    }

    pageInput.value = String(currentPreviewIndex.value + 1);
  },
  { immediate: true }
);

watch(currentPreviewIndex, (index) => {
  if (!previewItems.value.length) {
    pageInput.value = "0";
    return;
  }

  pageInput.value = String(index + 1);
});

function normalizeValue(value: string | number | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function normalizePreviewValue(value: unknown): string {
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
 * 切换下拉预览
 */
function toggleDropdown() {
  const next = !showDropdown.value;
  showDropdown.value = next;
  if (next) {
    currentPreviewIndex.value = 0;
  }
}

/**
 * 处理焦点事件
 */
function handleFocus() {
  if (props.previewMode !== "dropdown") return;
  currentPreviewIndex.value = 0;
  showDropdown.value = true;
}

/**
 * 处理失焦事件
 */
function handleBlur() {
  if (props.previewMode !== "dropdown") return;
  // 延迟关闭，以便点击下拉按钮时不会立即关闭
  setTimeout(() => {
    showDropdown.value = false;
  }, 200);
}

function goPrevItem() {
  if (currentPreviewIndex.value <= 0) return;
  currentPreviewIndex.value -= 1;
}

function goNextItem() {
  if (currentPreviewIndex.value >= previewItems.value.length - 1) return;
  currentPreviewIndex.value += 1;
}

function handlePageInputChange(event: Event) {
  if (!previewItems.value.length) {
    pageInput.value = "0";
    return;
  }

  const target = event.target as HTMLInputElement;
  const digits = target.value.replace(/[^0-9]/g, "");
  pageInput.value = digits;
}

function handlePageInputCommit() {
  if (!previewItems.value.length) {
    pageInput.value = "0";
    return;
  }

  const trimmed = pageInput.value.trim();
  if (!trimmed) {
    pageInput.value = String(currentPreviewIndex.value + 1);
    return;
  }

  const total = previewItems.value.length;
  const parsed = Number(trimmed);

  if (Number.isNaN(parsed)) {
    pageInput.value = String(currentPreviewIndex.value + 1);
    return;
  }

  const targetPage = Math.min(Math.max(Math.floor(parsed), 1), total);
  currentPreviewIndex.value = targetPage - 1;
  pageInput.value = String(targetPage);
}

function handlePageInputKeydown(event: KeyboardEvent) {
  if (event.key === "Enter") {
    event.preventDefault();
    handlePageInputCommit();
  }
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
function handleDrop(event: DragEvent) {
  event.preventDefault();

  if (!editorRef.value) return;

  moveCaretToEventPosition(event);

  const rawPayload =
    event.dataTransfer?.getData("application/x-variable") ||
    event.dataTransfer?.getData("text/plain") ||
    "";

  let reference = "";

  try {
    const parsed = JSON.parse(rawPayload);
    if (parsed && typeof parsed.reference === "string") {
      reference = parsed.reference;
    }
  } catch {
    reference = rawPayload.trim();
  }

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

function moveCaretToEventPosition(event: DragEvent) {
  const selection = window.getSelection();
  if (!selection) return;

  let range: Range | null = null;

  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (
      x: number,
      y: number
    ) => {
      offsetNode: Node;
      offset: number;
    } | null;
  };

  if (typeof doc.caretRangeFromPoint === "function") {
    range = doc.caretRangeFromPoint(event.clientX, event.clientY);
  } else if (typeof doc.caretPositionFromPoint === "function") {
    const position = doc.caretPositionFromPoint(event.clientX, event.clientY);
    if (position) {
      range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.collapse(true);
    }
  }

  if (!range) return;

  selection.removeAllRanges();
  selection.addRange(range);
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
    result += `<span class="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-100/80 px-1.5 py-0.5 text-[12px] font-medium text-emerald-700 shadow-sm">${escapeHtml(
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
