<template>
  <ModalShell
    :model-value="variableEditorModalVisible"
    title="变量编辑器"
    width="full"
    padding="none"
    :z-index="100"
    @update:model-value="handleModalUpdate"
    @close="handleClose"
  >
    <template #icon>
      <IconCog class="w-4 h-4" />
    </template>

    <!-- 主体内容 - 两栏布局 -->
    <div class="flex h-full flex-1 overflow-hidden">
      <!-- 左侧：变量面板 -->
      <div
        class="w-[360px] border-r border-slate-200 overflow-hidden shrink-0 bg-white"
      >
        <VariablePanel title="可用变量" :variables="availableVariables" />
      </div>

      <!-- 右侧：编辑器和预览 -->
      <div class="flex-1 flex overflow-hidden">
        <!-- 编辑器 -->
        <div class="flex-1 flex flex-col border-r border-slate-200">
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
          <div class="flex-1 p-4 overflow-y-auto variable-scroll">
            <div class="w-full h-full min-h-[200px] bg-white border border-slate-200 rounded-md overflow-hidden">
              <VariableEditor
                ref="editorRef"
                :model-value="internalValue"
                :multiline="true"
                class="w-full"
                @update:model-value="handleEditorUpdate"
                @focus="handleFocus"
                @blur="handleBlur"
                @variable-drop="handleVariableDrop"
              />
            </div>
          </div>
        </div>

        <!-- 预览 -->
        <div class="flex-1 flex flex-col">
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
          <div class="flex-1 overflow-y-auto variable-scroll p-4">
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
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button
          class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          @click="handleClose"
        >
          取消
        </button>
        <button
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          @click="handleSave"
        >
          确定
        </button>
      </div>
    </template>
  </ModalShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import IconCog from "@/icons/IconCog.vue";
import IconChevronRight from "@/icons/IconChevronRight.vue";
import ModalShell from "../ui/ModalShell.vue";
import VariablePanel from "../variables/VariablePanel.vue";
import VariablePreview from "./VariablePreview.vue";
import VariableEditor from "./editor/VariableEditor.vue";
import { useUiStore } from "../../stores/ui";
import { useVariableContext } from "../../composables/useVariableContext";
import { resolveConfigWithVariables } from "workflow-flow-nodes";

const uiStore = useUiStore();
const {
  selectedNodeId,
  variableEditorModalVisible,
  variableEditorModalContent,
} = storeToRefs(uiStore);
const editorRef = ref<InstanceType<typeof VariableEditor> | null>(null);
const internalValue = ref("");
const currentPreviewIndex = ref(0);
const pageInput = ref("0");

// 使用统一的变量上下文，避免重复计算
const { variableTree: availableVariables, contextMap } = useVariableContext();

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

// 监听 store 中的 value 变化，更新内部值
watch(
  () => variableEditorModalContent.value.value,
  (newValue) => {
    if (variableEditorModalVisible.value && newValue !== undefined) {
      internalValue.value = newValue || "";
    }
  },
  { immediate: true }
);

// 监听模态框显示状态，初始化内容
watch(variableEditorModalVisible, (visible) => {
  if (visible) {
    const value = variableEditorModalContent.value.value || "";
    internalValue.value = value;
    // 重置预览索引
    currentPreviewIndex.value = 0;
    pageInput.value = "0";
  }
});

function handleModalUpdate(value: boolean) {
  if (!value) {
    handleClose();
  }
}

function handleClose() {
  uiStore.closeVariableEditorModal();
}

function handleSave() {
  const onSave = variableEditorModalContent.value.onSave;
  if (onSave) {
    onSave(internalValue.value);
  }
  handleClose();
}

function handleFocus() {
  // 可以在这里添加聚焦逻辑
}

function handleBlur() {
  // 可以在这里添加失焦逻辑
}

function handleEditorUpdate(value: string) {
  internalValue.value = value;
}

function handleVariableDrop(event: CustomEvent) {
  const dragData = event.detail;
  if (!dragData?.reference) return;

  const reference = dragData.reference.trim();
  if (!reference) return;

  // 如果按住 Ctrl，则替换整个内容；否则追加
  const newValue = dragData.isReplace ? reference : internalValue.value + reference;
  handleEditorUpdate(newValue);
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

</script>
