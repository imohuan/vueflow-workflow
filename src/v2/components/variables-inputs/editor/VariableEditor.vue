<template>
  <div
    ref="editorContainer"
    class="variable-editor-container"
    @focus="handleFocus"
    @blur="handleBlur"
  ></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { EditorView } from "prosemirror-view";
import {
  createSchema,
  createEditorState,
  getEditorContent,
  setEditorContent,
} from "./prosemirrorSetup";

interface Props {
  modelValue?: string;
  placeholder?: string;
  multiline?: boolean;
  density?: "default" | "compact";
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "",
  multiline: false,
  density: "default",
  readonly: false,
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "focus"): void;
  (e: "blur"): void;
  (e: "variable-drop", event: CustomEvent): void;
}>();

const editorContainer = ref<HTMLDivElement | null>(null);
const isFocused = ref(false);
let editorView: EditorView | null = null;
let schema = createSchema();
let isUpdating = false;

/**
 * 初始化编辑器
 */
function initEditor() {
  if (!editorContainer.value) return;

  const initialState = createEditorState(schema, props.modelValue, {
    multiline: props.multiline,
  });

  editorView = new EditorView(editorContainer.value, {
    state: initialState,
    dispatchTransaction(tr) {
      if (!editorView) return;

      const newState = editorView.state.apply(tr);
      editorView.updateState(newState);

      // 发出更新事件
      if (!isUpdating) {
        const content = getEditorContent(newState);
        emit("update:modelValue", content);
      }
    },
    attributes: {
      class: "ProseMirror variable-scroll-x",
      style: `
        outline: none;
        border: none;
        padding: ${props.density === "compact" ? "0.25rem 0.5rem" : "0.5rem"};
        font-family: 'Fira Code', 'Courier New', 'Microsoft YaHei', 'SimHei', monospace;
        font-size: ${props.density === "compact" ? "0.75rem" : "0.875rem"};
        line-height: 1.5;
        min-height: ${
          props.multiline
            ? props.density === "compact"
              ? "3rem"
              : "4rem"
            : "auto"
        };
        max-height: ${props.multiline ? "15rem" : "auto"};
        overflow-y: ${props.multiline ? "auto" : "hidden"};
        white-space: ${props.multiline ? "pre-wrap" : "nowrap"};
        word-wrap: break-word;
      `,
    },
    editable: () => !props.readonly,
  });

  // 绑定焦点事件
  editorView.dom.addEventListener("focus", handleFocus);
  editorView.dom.addEventListener("blur", handleBlur);

  // 绑定拖放事件
  editorView.dom.addEventListener(
    "variable-drop",
    handleVariableDrop as EventListener
  );
}

/**
 * 销毁编辑器
 */
function destroyEditor() {
  if (editorView) {
    editorView.dom.removeEventListener("focus", handleFocus);
    editorView.dom.removeEventListener("blur", handleBlur);
    editorView.dom.removeEventListener(
      "variable-drop",
      handleVariableDrop as EventListener
    );
    editorView.destroy();
    editorView = null;
  }
}

/**
 * 处理焦点
 */
function handleFocus() {
  isFocused.value = true;
  emit("focus");
}

/**
 * 处理失焦
 */
function handleBlur() {
  isFocused.value = false;
  emit("blur");
}

/**
 * 处理拖放事件
 */
function handleVariableDrop(event: Event) {
  emit("variable-drop", event as CustomEvent);
}

/**
 * 监听 modelValue 变化
 */
watch(
  () => props.modelValue,
  (newValue) => {
    if (!editorView) return;

    const currentContent = getEditorContent(editorView.state);
    if (currentContent !== newValue) {
      isUpdating = true;
      const newState = setEditorContent(
        editorView.state,
        schema,
        newValue || ""
      );
      editorView.updateState(newState);
      isUpdating = false;
    }
  }
);

/**
 * 生命周期钩子
 */
onMounted(() => {
  initEditor();
});

onBeforeUnmount(() => {
  destroyEditor();
});

/**
 * 暴露公共方法
 */
defineExpose({
  focus: () => editorView?.focus(),
  blur: () => editorView?.dom.blur(),
  getContent: () => (editorView ? getEditorContent(editorView.state) : ""),
  setContent: (content: string) => {
    if (editorView) {
      const newState = setEditorContent(editorView.state, schema, content);
      editorView.updateState(newState);
    }
  },
});
</script>

<style scoped>
:deep(.ProseMirror) {
  outline: none;
  caret-color: inherit;
}

:deep(.variable-token) {
  color: #10b981 !important;
  background-color: #ecfdf5 !important;
  padding: 0 2px !important;
  border-radius: 2px !important;
  font-weight: 500 !important;
  pointer-events: none;
}

:deep(.ProseMirror p) {
  margin: 0;
  padding: 0;
}

/* 确保装饰在任何状态下都显示 */
:deep(.ProseMirror.ProseMirror-focused .variable-token),
:deep(.ProseMirror .variable-token) {
  color: #10b981 !important;
  background-color: #ecfdf5 !important;
}
</style>
