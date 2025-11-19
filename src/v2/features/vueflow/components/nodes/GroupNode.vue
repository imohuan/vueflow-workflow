<template>
  <div
    ref="nodeRef"
    tabindex="-1"
    class="group-node relative flex h-full w-full flex-col overflow-hidden rounded-lg border-2 transition-all duration-200 focus:outline-none"
    :class="[
      selected
        ? 'border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.15)]'
        : 'border-transparent',
      isResizing ? 'select-none' : '',
    ]"
    :style="{
      ...nodeStyle,
      ...(data as any)?.style?.bodyStyle,
    }"
  >
    <NodeExecutionBadge
      :node-id="id"
      class="pointer-events-none absolute left-3 top-3"
    />

    <div
      class="flex items-center gap-2 text-sm font-semibold text-indigo-600"
      :style="headerStyle"
      @dblclick.stop="handleStartEditing"
    >
      <span class="text-base leading-none">📦</span>

      <template v-if="!isEditingTitle">
        <span class="truncate" :title="localTitle">{{ localTitle }}</span>
      </template>

      <input
        v-else
        ref="titleInputRef"
        v-model="editingTitle"
        class="h-6 w-full rounded-md border border-indigo-200 bg-white/90 px-2 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        placeholder="输入分组标题"
        @blur="handleSaveTitle"
        @keydown.enter.prevent="handleSaveTitle"
        @keydown.esc.prevent="handleCancelEditing"
      />
    </div>

    <div class="pointer-events-none flex-1 bg-transparent"></div>

    <ResizeHandle
      ref="resizeHandleRef"
      :node-id="id"
      :node-data="props.data"
      :resize-options="{
        minWidth: 200,
        minHeight: 150,
      }"
      :selected="selected"
      @update:node-style11="handleNodeStyleUpdate"
      @update:is-resizing="handleIsResizingUpdate"
      class="group-node__resize-handle"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  watch,
  computed,
  type Ref,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { type NodeProps } from "@vue-flow/core";
import { NODE_SIZE, NODE_SPACING } from "../../../../config";
import { NodeExecutionBadge } from "../widgets";
import ResizeHandle from "../widgets/ResizeHandle.vue";

interface GroupNodeData {
  params?: {
    title?: string;
    description?: string;
    backgroundColor?: string;
    borderColor?: string;
  };
  style?: {
    bodyStyle?: Record<string, any>;
  };
}

type Props = NodeProps<GroupNodeData>;

const props = defineProps<Props>();

const localTitle = ref(props.data?.params?.title || "分组");
const editingTitle = ref(localTitle.value);
const nodeRef: Ref<HTMLElement | null> = ref(null);
const resizeHandleRef = ref<InstanceType<typeof ResizeHandle> | null>(null);
const isResizingState = ref(false);
const isEditingTitle = ref(false);
const titleInputRef = ref<HTMLInputElement | null>(null);

const isResizing = computed(() => isResizingState.value);

const nodeStyle = computed(() => {
  const params = props.data?.params;

  const backgroundColor = params?.backgroundColor || "#8b5cf6";
  const borderColor = params?.borderColor || "#8b5cf6";

  return {
    background: backgroundColor,
    borderColor,
  };
});

const headerStyle = computed(() => ({
  height: `${NODE_SIZE.headerHeight}px`,
  paddingLeft: `${NODE_SPACING.headerPadding.horizontal}px`,
  paddingRight: `${NODE_SPACING.headerPadding.horizontal}px`,
  paddingTop: `${NODE_SPACING.headerPadding.vertical}px`,
  paddingBottom: `${NODE_SPACING.headerPadding.vertical}px`,
}));

function focusTitleInput() {
  nextTick(() => {
    titleInputRef.value?.focus();
    titleInputRef.value?.select();
  });
}

function handleStartEditing() {
  if (isEditingTitle.value) return;
  editingTitle.value = localTitle.value;
  isEditingTitle.value = true;
  focusTitleInput();
}

function handleCancelEditing() {
  isEditingTitle.value = false;
  editingTitle.value = localTitle.value;
}

function persistTitle(title: string) {
  localTitle.value = title;
  if (!props.data) return;
  if (!props.data.params) {
    props.data.params = {};
  }
  props.data.params.title = title;
}

function handleSaveTitle() {
  const trimmed = editingTitle.value.trim();
  if (trimmed) {
    persistTitle(trimmed);
  } else {
    editingTitle.value = localTitle.value;
  }
  isEditingTitle.value = false;
}

function handleIsResizingUpdate(value: boolean) {
  isResizingState.value = value;
}

function handleNodeStyleUpdate(style: { width: string; height: string }) {
  const width = parseInt(style.width);
  const height = parseInt(style.height);

  if (props.data && !props.data.style) {
    props.data.style = {};
  }
  if (props.data?.style) {
    if (!props.data.style.bodyStyle) {
      props.data.style.bodyStyle = {};
    }
    props.data.style.bodyStyle.width = `${width}px`;
    props.data.style.bodyStyle.height = `${height}px`;
  }
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key !== "F2") return;
  if (!props.selected || isEditingTitle.value) return;
  event.preventDefault();
  handleStartEditing();
}

onMounted(() => {
  window.addEventListener("keydown", handleGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleGlobalKeydown);
});

watch(
  () => props.data?.params?.title,
  (newTitle) => {
    if (newTitle !== undefined && newTitle !== localTitle.value) {
      localTitle.value = newTitle;
      if (!isEditingTitle.value) {
        editingTitle.value = newTitle;
      }
    }
  }
);

watch(
  () => props.selected,
  (selected) => {
    if (!selected && isEditingTitle.value) {
      handleCancelEditing();
    }
  }
);
</script>

<style scoped>
.group-node__resize-handle {
  position: absolute;
}
</style>
