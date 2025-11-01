<template>
  <!-- 遮罩层 -->
  <Transition name="fade">
    <div
      v-if="modelValue"
      class="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center"
      @click.self="handleClose"
    >
      <!-- 弹窗容器 -->
      <div
        class="w-[95vw] h-[95vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden"
        @click.stop
      >
        <!-- 标题栏 -->
        <div
          class="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 shrink-0"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex items-center justify-center w-7 h-7 rounded-lg bg-linear-to-br from-purple-500 to-purple-700 text-white transition-transform duration-200 hover:scale-105"
            >
              <IconCog class="w-4 h-4" />
            </div>
            <h3 class="text-[15px] font-medium text-[#1a1a1a] tracking-tight">
              变量编辑器
            </h3>
          </div>
          <button
            type="button"
            class="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700"
            @click="handleClose"
          >
            <IconClose class="w-4 h-4" />
          </button>
        </div>

        <!-- 主体内容 - 三栏布局 -->
        <div class="flex flex-1 overflow-hidden">
          <!-- 左侧：变量面板 -->
          <div
            class="w-[360px] border-r border-slate-200 overflow-hidden shrink-0 bg-white"
          >
            <VariablePanel :variables="availableVariables" />
          </div>

          <!-- 右侧：使用 Splitter 分割编辑器和预览 -->
          <Splitter class="flex-1 border-0! rounded-none!">
            <!-- 中间：编辑器 -->
            <SplitterPanel :size="50" :minSize="30" class="flex flex-col">
              <!-- 编辑器标题 -->
              <div
                class="px-4 py-2 border-b border-slate-200 bg-slate-50/50 shrink-0"
              >
                <div class="text-xs font-medium text-slate-600">表达式编辑</div>
                <div class="text-[10px] text-slate-400 mt-0.5">
                  支持拖拽变量插入，使用
                  <span class="font-mono text-emerald-600"
                    >&#123;&#123; 节点名.字段 &#125;&#125;</span
                  >
                  格式
                </div>
              </div>

              <!-- 编辑器主体 -->
              <div class="flex-1 p-4 overflow-y-auto">
                <div
                  ref="editorRef"
                  contenteditable="true"
                  class="w-full h-full min-h-[200px] p-3 font-mono text-sm text-slate-700 bg-white border border-slate-200 rounded-md outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 whitespace-pre-wrap wrap-break-word"
                  @input="handleInput"
                  @variable-drop="handleVariableDrop"
                  @paste="handlePaste"
                  @focus="handleFocus"
                  @blur="handleBlur"
                ></div>
              </div>
            </SplitterPanel>

            <!-- 右侧：预览 -->
            <SplitterPanel :size="50" :minSize="20" class="flex flex-col">
              <!-- 预览标题栏 -->
              <div
                class="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50/80 shrink-0"
              >
                <div class="text-xs font-semibold text-slate-600">实时预览</div>
                <div
                  v-if="previewItems.length > 1"
                  class="flex items-center gap-1 text-[10px] text-slate-500"
                >
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
              <div class="flex-1 overflow-y-auto p-4">
                <div
                  v-if="previewItems.length"
                  class="p-3 bg-slate-50/50 border border-slate-200 rounded-md"
                >
                  <VariablePreview
                    :value="internalValue"
                    :current-item-index="currentPreviewIndex"
                    inline
                  />
                </div>
                <p v-else class="text-xs text-slate-400">
                  <span class="font-mono bg-gray-100 px-2 py-1 rounded"
                    >[empty]</span
                  >
                </p>
              </div>
            </SplitterPanel>
          </Splitter>
        </div>

        <!-- 底部按钮 -->
        <div
          class="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50/80 shrink-0"
        >
          <Button variant="outlined" @click="handleClose">取消</Button>
          <Button @click="handleSave">确定</Button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import IconClose from "@/icons/IconClose.vue";
import IconCog from "@/icons/IconCog.vue";
import IconChevronRight from "@/icons/IconChevronRight.vue";
import VariablePanel from "./VariablePanel.vue";
import VariablePreview from "./VariablePreview.vue";
import Button from "@/components/common/Button.vue";
import Splitter from "@/volt/Splitter.vue";
import SplitterPanel from "primevue/splitterpanel";
import { useNodeEditorStore } from "@/stores/nodeEditor";
import {
  buildVariableContext,
  resolveConfigWithVariables,
} from "@/workflow/variables/variableResolver";

interface Props {
  modelValue?: boolean;
  value?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  value: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "update:value", value: string): void;
  (e: "save", value: string): void;
}>();

const store = useNodeEditorStore();
const editorRef = ref<HTMLDivElement | null>(null);
const internalValue = ref(props.value || "");
const currentPreviewIndex = ref(0);
const pageInput = ref("0");

// 获取可用变量
const availableVariables = computed(() => {
  if (!store.selectedNodeId) return [];

  const { tree } = buildVariableContext(
    store.selectedNodeId,
    store.nodes,
    store.edges
  );

  return tree;
});

// 检查是否包含变量
const hasVariable = computed(() => {
  const value = internalValue.value;
  if (!value || typeof value !== "string") return false;
  return /\{\{\s*\$?[^{}]+?\s*\}\}/.test(value);
});

// 计算预览项数量（用于分页）
const previewItems = computed(() => {
  const value = internalValue.value;
  if (!value) return [];

  if (!hasVariable.value) {
    return [value];
  }

  if (!store.selectedNodeId) {
    return [value];
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

// 监听外部值变化
watch(
  () => props.value,
  (newValue) => {
    internalValue.value = newValue || "";
    updateEditorContent(internalValue.value, false);
  }
);

// 监听编辑器挂载
watch(
  editorRef,
  (editor) => {
    if (editor) {
      updateEditorContent(internalValue.value, false);
    }
  },
  { flush: "post" }
);

// 监听预览项变化
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

function handleClose() {
  emit("update:modelValue", false);
}

function handleSave() {
  emit("update:value", internalValue.value);
  emit("save", internalValue.value);
  handleClose();
}

function handleFocus() {
  // 可以在这里添加聚焦逻辑
}

function handleBlur() {
  // 可以在这里添加失焦逻辑
}

function handleInput() {
  if (!editorRef.value) return;

  const plainText = getPlainText(editorRef.value);
  if (plainText === internalValue.value) return;
  internalValue.value = plainText;

  updateEditorContent(plainText, true);
}

function handlePaste(event: ClipboardEvent) {
  event.preventDefault();
  const text = event.clipboardData?.getData("text/plain") || "";
  insertTextAtCursor(text);
  handleInput();
}

function handleVariableDrop(event: CustomEvent) {
  if (!editorRef.value) return;

  const dragData = event.detail;
  if (!dragData?.reference) return;

  const reference = dragData.reference.trim();
  if (!reference) return;

  insertTextAtCursor(reference);
  handleInput();
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

function getPlainText(element: HTMLElement): string {
  return (
    element.textContent?.replace(/\u00a0/g, " ").replace(/\u200B/g, "") ?? ""
  );
}

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

function highlightVariables(value: string): string {
  if (!value) return "\u200B";

  const tokenRegex = /\{\{\s*\$?[^{}]+?\s*\}\}/g;
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
  return result;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
</script>

<style scoped>
/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  /* stylelint-disable-next-line at-rule-no-unknown */
  @apply transition-opacity duration-200;
}

.fade-enter-from,
.fade-leave-to {
  /* stylelint-disable-next-line at-rule-no-unknown */
  @apply opacity-0;
}
</style>
