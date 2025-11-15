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
                'pointer-events-none absolute select-none text-slate-400 z-10',
                density === 'compact'
                  ? 'left-2 top-1 text-xs'
                  : 'left-2 top-2 text-sm',
              ]"
            >
              {{ placeholder }}
            </span>

            <!-- ProseMirror 编辑器 -->
            <VariableEditor
              ref="editorRef"
              :model-value="internalValue"
              :multiline="multiline"
              :density="density"
              class="w-full"
              @update:model-value="handleEditorUpdate"
              @focus="handleFocus"
              @blur="handleBlur"
              @variable-drop="handleVariableDrop"
            />
          </div>

          <!-- 打开变量编辑器按钮 - 右侧紧贴 -->
          <div class="absolute right-0 bottom-0 w-5 h-8 pt-3">
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
          <div
            v-if="showTip"
            class="border-t border-slate-100 bg-slate-50 px-2 py-1.5"
          >
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
      v-if="previewMode !== 'dropdown' && isFocused && showTip"
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
import VariableEditor from "./editor/VariableEditor.vue";
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
  /** 是否显示提示信息 */
  showTip?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "",
  rows: 1,
  multiline: false,
  previewMode: "bottom",
  density: "default",
  showBorder: false,
  showTip: true,
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const editorRef = ref<InstanceType<typeof VariableEditor> | null>(null);
const internalValue = ref(normalizeValue(props.modelValue));
const showDropdown = ref(false);
const currentPreviewIndex = ref(0);
const pageInput = ref("0");
const isFocused = ref(false);

const uiStore = useUiStore();
const { selectedNodeId } = storeToRefs(uiStore);
const { contextMap } = useVariableContext();

const showPlaceholder = computed(
  () => !internalValue.value && props.placeholder
);

// 监听 modelValue 变化
watch(
  () => props.modelValue,
  (value) => {
    const newValue = normalizeValue(value);
    if (newValue !== internalValue.value) {
      internalValue.value = newValue;
    }
  }
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

  if (
    !selectedNodeId.value ||
    !contextMap.value ||
    contextMap.value.size === 0
  ) {
    return [value];
  }

  try {
    const resolved = resolveConfigWithVariables(
      { preview: value },
      contextMap.value
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

/**
 * 处理编辑器更新
 */
function handleEditorUpdate(value: string) {
  internalValue.value = value;
  emit("update:modelValue", value);
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
 * 处理拖放事件
 */
function handleVariableDrop(event: CustomEvent) {
  const dragData = event.detail;
  if (!dragData?.reference) return;

  const reference = dragData.reference.trim();
  if (!reference) return;

  // 如果按住 Ctrl，则替换整个内容；否则追加
  const newValue = dragData.isReplace
    ? reference
    : internalValue.value + reference;
  handleEditorUpdate(newValue);
}

/**
 * 打开变量编辑器
 */
function openVariableEditor() {
  uiStore.openVariableEditorModal(internalValue.value, (value: string) => {
    handleEditorUpdate(value);
  });
}
</script>

<style scoped>
:deep(.variable-token) {
  color: #10b981;
  background-color: #ecfdf5;
  padding: 0 2px;
  border-radius: 2px;
  font-weight: 500;
}

:deep(.ProseMirror) {
  outline: none;
}

:deep(.ProseMirror p) {
  margin: 0;
  padding: 0;
}

.variable-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
}

.variable-scroll::-webkit-scrollbar {
  width: 6px;
}

.variable-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.variable-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.variable-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.2);
}
</style>
