<template>
  <ModalShell
    v-model="editorPanelModalVisible"
    :title="editorPanelContent.title || '代码编辑器'"
    width="full"
    padding="none"
    @close="handleClose"
  >
    <div class="relative flex h-full flex-col">
      <!-- 编辑器区域 -->
      <div class="flex-1 overflow-hidden">
        <CodeEditor
          ref="editorRef"
          v-model="editorContent"
          :language="currentLanguage"
          :readonly="!hasSaveCallback"
          :options="editorOptions"
          @ready="handleEditorReady"
        />
      </div>

      <!-- 底部右侧操作按钮 -->
      <div class="absolute z-10 bottom-4 right-6 flex items-center gap-2">
        <!-- 取消/关闭按钮 -->
        <n-button size="small" @click="handleClose">
          {{ hasSaveCallback ? "取消" : "关闭" }}
        </n-button>
        <!-- 保存按钮（仅在可保存模式下显示） -->
        <n-button
          v-if="hasSaveCallback"
          size="small"
          type="primary"
          @click="handleSave"
        >
          保存
        </n-button>
      </div>
    </div>
  </ModalShell>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { storeToRefs } from "pinia";
import { useMessage } from "naive-ui";
import type * as Monaco from "monaco-editor";
import type { MonacoInstance } from "@/v2/components/code/monaco";
import { ModalShell } from "@/v2/components/ui";
import CodeEditor from "@/v2/components/code/CodeEditor.vue";
import { useUiStore } from "@/v2/stores/ui";

const uiStore = useUiStore();
const { editorPanelModalVisible, editorPanelContent } = storeToRefs(uiStore);
const message = useMessage();

const editorRef = ref<InstanceType<typeof CodeEditor> | null>(null);
const editorContent = ref("");
const currentLanguage = ref("javascript");

// 是否有保存回调
const hasSaveCallback = computed(() => {
  return !!editorPanelContent.value.onSave;
});

// 编辑器选项
const editorOptions = computed(() => ({
  minimap: { enabled: true },
  fontSize: 14,
  lineNumbers: "on" as const,
  wordWrap: "off" as const,
  automaticLayout: true,
  scrollBeyondLastLine: false,
}));

// 编辑器就绪回调
function handleEditorReady(
  _editor: Monaco.editor.IStandaloneCodeEditor,
  _monaco: MonacoInstance
) {
  console.log("[EditorPanelModal] 编辑器已就绪");
}

// 监听模态框打开，同步内容
watch(
  () => editorPanelModalVisible.value,
  (visible) => {
    if (visible) {
      editorContent.value = editorPanelContent.value.content || "";
      currentLanguage.value = editorPanelContent.value.language || "javascript";
    }
  },
  { immediate: true }
);

// 保存代码
function handleSave() {
  if (editorPanelContent.value.onSave) {
    editorPanelContent.value.onSave(editorContent.value);
    message.success("代码已保存");
    uiStore.closeEditorPanelModal();
  } else {
    message.warning("当前模式不支持保存");
  }
}

// 关闭模态框
function handleClose() {
  uiStore.closeEditorPanelModal();
}
</script>

<style scoped>
@import "@/v2/style.css";
</style>
