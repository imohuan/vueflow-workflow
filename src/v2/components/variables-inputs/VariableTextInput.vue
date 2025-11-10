<template>
  <div v-bind="$attrs" class="space-y-2">
    <!-- 顶部预览 -->
    <VariablePreview
      v-if="previewMode === 'top' && isFocused"
      :value="internalValue"
    />

    <!-- 编辑器容器 -->
    <Dropdown
      v-model="showDropdown"
      :width-mode="previewMode === 'dropdown' ? 'trigger' : 'auto'"
      placement="bottom-start"
      :offset="4"
    >
      <!-- 触发器插槽 -->
      <template #trigger>
        <div
          :class="[
            'variable-text-input',
            'relative flex items-stretch h-full rounded-md border transition-all duration-200',
            showBorder
              ? 'border-dashed border-red-600'
              : isFocused
              ? 'border-slate-400 ring-2 ring-slate-200'
              : 'border-slate-200',
          ]"
        >
          <!-- FX 图标 - 左侧铺满整个输入框高度 -->
          <div
            class="pointer-events-none flex items-center justify-center w-7 text-gray-600 rounded-l-md shrink-0 border-r border-gray-200"
            style="background-color: #f1f3f9"
          >
            <IconFx class="w-4 h-4" />
          </div>

          <!-- 编辑器包裹容器 -->
          <div class="relative flex-1 min-w-0">
            <!-- Placeholder -->
            <span
              v-if="showPlaceholder"
              :class="[
                'pointer-events-none absolute select-none text-slate-400',
                density === 'compact'
                  ? 'left-2 top-1 text-xs'
                  : 'left-2 top-2 text-sm',
              ]"
            >
              {{ placeholder }}
            </span>

            <!-- 编辑器 - 使用 contenteditable -->
            <div
              ref="editorRef"
              contenteditable="true"
              :class="[
                'w-full cursor-text font-mono text-slate-700 bg-white outline-none wrap-break-word',
                // 字体大小
                density === 'compact' ? 'text-xs' : 'text-sm',
                // 左右 padding
                'px-2',
                // 上下 padding 和高度
                multiline
                  ? density === 'compact'
                    ? 'py-1 min-h-12 max-h-52 overflow-y-auto variable-scroll whitespace-pre-wrap resize-y'
                    : 'py-2 min-h-16 max-h-60 overflow-y-auto variable-scroll whitespace-pre-wrap resize-y'
                  : density === 'compact'
                  ? 'h-7 flex items-center overflow-hidden whitespace-nowrap resize-none'
                  : 'h-8 flex items-center overflow-hidden whitespace-nowrap resize-none',
              ]"
              @input="handleInput"
              @variable-drop="handleVariableDrop"
              @paste="handlePaste"
              @keydown="handleKeyDown"
              @focus="handleFocus"
              @blur="handleBlur"
              @mousedown="handleMouseDown"
              @mouseup="handleMouseUp"
            ></div>
          </div>

          <!-- 打开变量编辑器按钮 - 右侧紧贴 -->
          <div class="w-5 h-8 pt-3">
            <button
              type="button"
              class="flex items-center justify-center w-full h-full border-l rounded-tl-md border-t border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 hover:bg-slate-100 rounded-r-md shrink-0"
              @click.stop="openVariableEditor"
              title="打开变量编辑器"
            >
              <IconExternalLink class="h-3 w-3" />
            </button>
          </div>
        </div>
      </template>

      <!-- 下拉预览面板 -->
      <template #default>
        <div v-if="previewMode === 'dropdown'" class="overflow-hidden">
          <!-- 标题栏 -->
          <div
            class="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-2 py-1.5"
          >
            <div
              class="text-[10px] font-semibold uppercase tracking-wide text-slate-500"
            >
              Result
            </div>
            <div class="flex items-center gap-1 text-[10px] text-slate-500">
              <span class="font-medium">Page</span>
              <input
                :value="pageInput"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                :disabled="!previewItems.length"
                class="h-5 w-7 rounded bg-white px-1 text-center text-[10px] font-medium text-slate-600 shadow-inner ring-1 ring-inset ring-slate-200 transition focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
                @input="handlePageInputChange"
                @blur="handlePageInputCommit"
                @keydown="handlePageInputKeydown"
              />
              <span>/ {{ previewItems.length || 0 }}</span>
              <button
                type="button"
                class="flex h-5 w-5 items-center justify-center text-slate-400 transition-colors hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
                :disabled="!canNavigatePrev"
                aria-label="上一页"
                @click.stop="goPrevItem"
              >
                <IconChevronRight class="h-3 w-3 -rotate-180" />
              </button>
              <button
                type="button"
                class="flex h-5 w-5 items-center justify-center text-slate-400 transition-colors hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
                :disabled="!canNavigateNext"
                aria-label="下一页"
                @click.stop="goNextItem"
              >
                <IconChevronRight class="h-3 w-3" />
              </button>
            </div>
          </div>

          <!-- 预览内容 -->
          <div class="max-h-56 overflow-y-auto variable-scroll px-2 py-2">
            <VariablePreview
              v-if="previewItems.length"
              :value="internalValue"
              :current-item-index="currentPreviewIndex"
              inline
            />
            <p v-else class="text-xs text-slate-400">
              <span class="font-mono bg-gray-100">[empty]</span>
              <!-- 暂无可预览数据 -->
            </p>
          </div>

          <!-- 提示信息 -->
          <div class="border-t border-slate-100 bg-slate-50 px-2 py-1.5">
            <p class="text-[10px] leading-tight text-slate-400">
              Tip: 支持拖拽变量插入，变量以
              <span class="font-mono text-emerald-600"
                >&#123;&#123; 节点名.字段 &#125;&#125;</span
              >
              形式表示
            </p>
          </div>
        </div>
      </template>
    </Dropdown>

    <!-- 底部预览 -->
    <VariablePreview
      v-if="previewMode === 'bottom' && isFocused"
      :value="internalValue"
    />

    <!-- 提示文本 -->
    <p
      v-if="previewMode !== 'dropdown' && isFocused"
      class="text-[10px] leading-tight text-slate-400 px-1"
    >
      Tip: 支持拖拽变量插入，变量以
      <span class="font-mono text-emerald-600"
        >&#123;&#123; 节点名.字段 &#125;&#125;</span
      >
      形式表示
    </p>
  </div>

</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import IconChevronRight from "@/icons/IconChevronRight.vue";
import IconFx from "@/icons/IconFx.vue";
import IconExternalLink from "@/icons/IconExternalLink.vue";
import Dropdown from "../common/Dropdown.vue";
import VariablePreview from "./VariablePreview.vue";
import { storeToRefs } from "pinia";
import { useUiStore } from "../../stores/ui";
import { useVariableContext } from "../../composables/useVariableContext";
import { resolveConfigWithVariables } from "workflow-flow-nodes";

defineOptions({
  inheritAttrs: false,
});

interface Props {
  modelValue?: string | number;
  placeholder?: string;
  rows?: number;
  multiline?: boolean;
  /** 预览模式: top=顶部, bottom=底部, dropdown=下拉菜单, none=不显示 */
  previewMode?: "top" | "bottom" | "dropdown" | "none";
  /** 密度 */
  density?: "default" | "compact";
  /** 是否显示边框 */
  showBorder?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "",
  rows: 1,
  multiline: false,
  previewMode: "bottom",
  density: "default",
  showBorder: false,
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const editorRef = ref<HTMLDivElement | null>(null);
const internalValue = ref(normalizeValue(props.modelValue));
const showDropdown = ref(false);
const currentPreviewIndex = ref(0);
const pageInput = ref("0");
const isFocused = ref(false);
let isUpdating = false; // 防止重复触发
const shouldForceCursorToEnd = ref(false);

const CURSOR_PLACEHOLDER = "\u200B";
const CURSOR_PLACEHOLDER_REGEX = new RegExp(CURSOR_PLACEHOLDER, "g");
const VARIABLE_TOKEN_PATTERN = "\\{\\{\\s*[^{}]+?\\s*\\}\\}";
const VARIABLE_TOKEN_LEADING_REGEX = new RegExp(`^${VARIABLE_TOKEN_PATTERN}`);
const VARIABLE_TOKEN_TRAILING_REGEX = new RegExp(`${VARIABLE_TOKEN_PATTERN}$`);
const CURSOR_PLACEHOLDER_HTML =
  '<span data-cursor-anchor="true" style="display:inline-block;width:1px;">&#8203;</span>';

const uiStore = useUiStore();
const { selectedNodeId } = storeToRefs(uiStore);
const { contextMap } = useVariableContext();

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

// 检查是否包含变量
const hasVariable = computed(() => {
  const value = internalValue.value;
  if (!value || typeof value !== "string") return false;
  return /\{\{\s*[^{}]+?\s*\}\}/.test(value);
});

// 计算预览项数量（用于分页）
const previewItems = computed(() => {
  const value = internalValue.value;
  if (!value) return [];

  if (!hasVariable.value) {
    return [value];
  }

  if (!selectedNodeId.value || !contextMap.value || contextMap.value.size === 0) {
    return [value];
  }

  try {
    const resolved = resolveConfigWithVariables({ preview: value }, contextMap.value);

    const result = resolved.preview;

    if (Array.isArray(result)) {
      return result;
    }

    if (result === null || result === undefined) {
      return [];
    }

    return [result];
  } catch (error) {
    return ["解析错误"];
  }
});

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

/**
 * 处理焦点事件
 */
function handleFocus() {
  isFocused.value = true;
  if (props.previewMode === "dropdown") {
    currentPreviewIndex.value = 0;
    showDropdown.value = true;
  }
}

/**
 * 处理失焦事件
 */
function handleBlur() {
  isFocused.value = false;
}

function handleMouseDown(event: MouseEvent) {
  if (!editorRef.value) return;
  const target = event.target as HTMLElement | null;
  shouldForceCursorToEnd.value =
    target === editorRef.value || target?.dataset.cursorAnchor === "true";
}

function handleMouseUp() {
  if (!editorRef.value) return;
  if (!shouldForceCursorToEnd.value) return;

  const cursorPos = getCursorPosition();
  if (cursorPos === 0 && internalValue.value) {
    setCursorPosition(internalValue.value.length);
  }

  shouldForceCursorToEnd.value = false;
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
  return (
    element.textContent
      ?.replace(/\u00a0/g, " ") // 替换不间断空格
      .replace(/\u200B/g, "") ?? // 移除零宽空格
    ""
  );
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

  const text = preCaretRange.toString().replace(CURSOR_PLACEHOLDER_REGEX, "");
  return text.length;
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
    return;
  }

  if (event.key === "Backspace") {
    if (handleVariableDeletion(event, "backward")) {
      return;
    }
  }

  if (event.key === "Delete") {
    if (handleVariableDeletion(event, "forward")) {
      return;
    }
  }
}

function handleVariableDeletion(
  event: KeyboardEvent,
  direction: "backward" | "forward"
): boolean {
  const editor = editorRef.value;
  if (!editor) return false;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);
  const value = internalValue.value;

  if (!range.collapsed) {
    const startOffset = getRangeBoundaryOffset(range, "start");
    const endOffset = getRangeBoundaryOffset(range, "end");
    if (startOffset === null || endOffset === null) {
      return false;
    }

    const { start, end } = expandOffsetsToTokenBoundary(
      value,
      startOffset,
      endOffset
    );
    if (start === end) {
      return false;
    }

    event.preventDefault();
    applyValueChange(value.slice(0, start) + value.slice(end), start);
    return true;
  }

  const cursorPos = getCursorPosition();
  if (cursorPos === null) {
    return false;
  }

  if (direction === "backward") {
    if (cursorPos === 0) {
      return false;
    }

    const before = value.slice(0, cursorPos);
    const trailingMatch = before.match(VARIABLE_TOKEN_TRAILING_REGEX);
    if (trailingMatch) {
      const token = trailingMatch[0];
      const start = cursorPos - token.length;
      event.preventDefault();
      applyValueChange(value.slice(0, start) + value.slice(cursorPos), start);
      return true;
    }
  } else {
    const after = value.slice(cursorPos);
    const leadingMatch = after.match(VARIABLE_TOKEN_LEADING_REGEX);
    if (leadingMatch) {
      const token = leadingMatch[0];
      const end = cursorPos + token.length;
      event.preventDefault();
      applyValueChange(value.slice(0, cursorPos) + value.slice(end), cursorPos);
      return true;
    }
  }

  const tokenRegex = new RegExp(VARIABLE_TOKEN_PATTERN, "g");
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(value)) !== null) {
    const tokenStart = match.index;
    const tokenEnd = tokenStart + match[0].length;

    const isWithinBackward =
      direction === "backward" &&
      cursorPos > tokenStart &&
      cursorPos <= tokenEnd;
    const isWithinForward =
      direction === "forward" &&
      cursorPos >= tokenStart &&
      cursorPos < tokenEnd;

    if (isWithinBackward || isWithinForward) {
      event.preventDefault();
      applyValueChange(
        value.slice(0, tokenStart) + value.slice(tokenEnd),
        tokenStart
      );
      return true;
    }
  }

  return false;
}

function applyValueChange(newValue: string, cursorOffset: number) {
  internalValue.value = newValue;
  emit("update:modelValue", newValue);
  updateEditorContent(newValue, false);
  setCursorPosition(cursorOffset);
}

function getRangeBoundaryOffset(
  range: Range,
  type: "start" | "end"
): number | null {
  const editor = editorRef.value;
  if (!editor) return null;

  const boundaryRange = range.cloneRange();
  boundaryRange.selectNodeContents(editor);

  if (type === "start") {
    boundaryRange.setEnd(range.startContainer, range.startOffset);
  } else {
    boundaryRange.setEnd(range.endContainer, range.endOffset);
  }

  const text = boundaryRange.toString().replace(CURSOR_PLACEHOLDER_REGEX, "");
  return text.length;
}

function expandOffsetsToTokenBoundary(
  value: string,
  start: number,
  end: number
): { start: number; end: number } {
  if (start === end) {
    return { start, end };
  }

  const tokenRegex = new RegExp(VARIABLE_TOKEN_PATTERN, "g");
  let match: RegExpExecArray | null;
  let adjustedStart = start;
  let adjustedEnd = end;

  while ((match = tokenRegex.exec(value)) !== null) {
    const tokenStart = match.index;
    const tokenEnd = tokenStart + match[0].length;

    if (tokenStart < adjustedStart && tokenEnd > adjustedStart) {
      adjustedStart = tokenStart;
    }

    if (tokenStart < adjustedEnd && tokenEnd > adjustedEnd) {
      adjustedEnd = tokenEnd;
    }
  }

  return { start: adjustedStart, end: adjustedEnd };
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
 * 高亮变量（用于编辑器中显示原始的 {{ }} 变量）
 */
function highlightVariables(value: string): string {
  // 空内容时返回零宽空格，保持光标正常显示
  if (!value) return CURSOR_PLACEHOLDER;

  const tokenRegex = new RegExp(VARIABLE_TOKEN_PATTERN, "g");
  tokenRegex.lastIndex = 0;
  let lastIndex = 0;
  let result = "";
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(value)) !== null) {
    const token = match[0];
    const start = match.index;
    result += escapeHtml(value.slice(lastIndex, start));
    result += `<span class="variable-token">${escapeHtml(token)}</span>`;
    lastIndex = start + token.length;
  }

  result += escapeHtml(value.slice(lastIndex));
  return result + CURSOR_PLACEHOLDER_HTML;
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

/**
 * 打开变量编辑器
 */
function openVariableEditor() {
  uiStore.openVariableEditorModal(internalValue.value, (value: string) => {
    internalValue.value = value;
    emit("update:modelValue", value);
    updateEditorContent(value, false);
  });
}
</script>
