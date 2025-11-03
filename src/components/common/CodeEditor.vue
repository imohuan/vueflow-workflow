<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, type PropType } from "vue";
import { loadMonaco, type MonacoInstance } from "@/utils/monaco";
import type * as Monaco from "monaco-editor";

const props = defineProps({
  /** 编辑器内容 */
  modelValue: {
    type: String,
    default: "",
  },
  /** 编程语言 */
  language: {
    type: String,
    default: "javascript",
  },
  /** 是否只读 */
  readonly: {
    type: Boolean,
    default: false,
  },
  /** 编辑器主题 */
  theme: {
    type: String as PropType<"vs" | "vs-dark" | "hc-black" | "hc-light">,
    default: "vs",
  },
  /** 编辑器选项 */
  options: {
    type: Object as PropType<Monaco.editor.IStandaloneEditorConstructionOptions>,
    default: () => ({}),
  },
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  ready: [editor: Monaco.editor.IStandaloneCodeEditor, monaco: MonacoInstance];
}>();

const editorContainer = ref<HTMLDivElement>();
let editor: Monaco.editor.IStandaloneCodeEditor | null = null;
let monaco: MonacoInstance | null = null;

/** 初始化编辑器 */
async function initEditor() {
  if (!editorContainer.value) return;

  monaco = await loadMonaco();

  // 关键修复：先创建模型，指定正确的 URI
  const fileExtension =
    props.language === "typescript"
      ? "ts"
      : props.language === "javascript"
      ? "js"
      : props.language === "json"
      ? "json"
      : props.language === "html"
      ? "html"
      : props.language === "css"
      ? "css"
      : "txt";

  const modelUri = monaco.Uri.parse(
    `file:///editor-${Date.now()}.${fileExtension}`
  );
  const model = monaco.editor.createModel(
    props.modelValue,
    props.language,
    modelUri
  );

  console.log(
    `✅ 创建编辑器模型: ${modelUri.toString()}, 语言: ${props.language}`
  );

  const defaultOptions: Monaco.editor.IStandaloneEditorConstructionOptions = {
    model: model, // 使用预创建的模型，而不是 value
    theme: props.theme,
    readOnly: props.readonly,
    automaticLayout: true,
    minimap: {
      enabled: true,
    },
    scrollBeyondLastLine: false,
    fontSize: 14,
    fontWeight: "bold",
    // fontFamily:
    //   "'JetBrains Mono', 'Fira Code', UI-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    lineNumbers: "on",
    roundedSelection: false,
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
    },
    tabSize: 2,
    wordWrap: "off",
    // 启用完整的代码提示功能
    quickSuggestions: {
      other: "on",
      comments: false,
      strings: false,
    },
    parameterHints: {
      enabled: true,
    },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnCommitCharacter: true,
    acceptSuggestionOnEnter: "on",
    wordBasedSuggestions: "allDocuments",
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showClasses: true,
      showFunctions: true,
      showVariables: true,
      showModules: true,
      showProperties: true,
      showValues: true,
      showConstants: true,
      showMethods: true,
    },
  };

  editor = monaco.editor.create(editorContainer.value, {
    ...defaultOptions,
    ...props.options,
  });

  console.log("✅ 编辑器实例创建成功");

  // 监听内容变化
  editor.onDidChangeModelContent(() => {
    if (editor) {
      emit("update:modelValue", editor.getValue());
    }
  });

  // 支持 Ctrl + 鼠标滚轮缩放 - 监听编辑器的 DOM 元素
  const editorDomNode = editor.getDomNode();
  if (editorDomNode) {
    editorDomNode.addEventListener("wheel", handleWheel, {
      passive: false,
    });
  }

  // 触发 ready 事件
  emit("ready", editor, monaco);
}

/** 处理滚轮缩放 */
function handleWheel(event: WheelEvent) {
  if (event.ctrlKey && editor) {
    event.preventDefault();
    const currentFontSize = editor.getOption(
      monaco!.editor.EditorOption.fontSize
    );
    const delta = event.deltaY > 0 ? -1 : 1;
    const newFontSize = Math.max(8, Math.min(30, currentFontSize + delta));
    editor.updateOptions({ fontSize: newFontSize });
  }
}

/** 监听 modelValue 变化 */
watch(
  () => props.modelValue,
  (newValue) => {
    if (editor && editor.getValue() !== newValue) {
      editor.setValue(newValue);
    }
  }
);

/** 监听 language 变化 */
watch(
  () => props.language,
  (newLanguage) => {
    if (editor && monaco) {
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, newLanguage);
      }
    }
  }
);

/** 监听 theme 变化 */
watch(
  () => props.theme,
  (newTheme) => {
    if (monaco) {
      monaco.editor.setTheme(newTheme);
    }
  }
);

/** 监听 readonly 变化 */
watch(
  () => props.readonly,
  (newReadonly) => {
    if (editor) {
      editor.updateOptions({ readOnly: newReadonly });
    }
  }
);

onMounted(() => {
  initEditor();
});

onBeforeUnmount(() => {
  if (editor) {
    const editorDomNode = editor.getDomNode();
    if (editorDomNode) {
      editorDomNode.removeEventListener("wheel", handleWheel);
    }
    const model = editor.getModel();
    editor.dispose();
    editor = null;
    // 清理模型
    if (model) {
      model.dispose();
    }
  }
});

/** 获取编辑器实例 */
function getEditor() {
  return editor;
}

/** 获取 Monaco 实例 */
function getMonaco() {
  return monaco;
}

defineExpose({
  getEditor,
  getMonaco,
});
</script>

<template>
  <div ref="editorContainer" class="w-full h-full"></div>
</template>

<style scoped>
/* Monaco Editor 容器样式 */
div {
  position: relative;
}
</style>
