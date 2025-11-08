<template>
  <ModalShell
    v-model="editorModalVisible"
    :title="uiStore.editorModalContent.title"
    width="full"
    @close="handleClose"
  >
    <!-- 编辑器工具栏 -->
    <div
      class="mb-4 flex items-center justify-between border-b border-slate-200 pb-3"
    >
      <div class="flex items-center gap-2">
        <n-select
          v-model:value="language"
          :options="languageOptions"
          size="small"
          class="w-32"
        />
        <n-button size="small" secondary @click="formatCode"> 格式化 </n-button>
      </div>
      <div class="flex items-center gap-2">
        <n-button size="small" secondary @click="copyCode">复制</n-button>
        <n-button size="small" type="primary" @click="handleSave">
          保存
        </n-button>
      </div>
    </div>

    <!-- 代码编辑区域 -->
    <div
      class="h-[calc(100vh-220px)] overflow-hidden rounded border border-slate-200"
    >
      <textarea
        v-model="code"
        class="h-full w-full resize-none bg-slate-50 p-4 font-mono text-sm leading-relaxed text-slate-800 outline-none"
        :placeholder="`输入 ${languageLabels[language]} 代码...`"
      />
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button @click="handleClose">取消</n-button>
        <n-button type="primary" @click="handleSave">保存</n-button>
      </div>
    </template>
  </ModalShell>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { storeToRefs } from "pinia";
import ModalShell from "../ui/ModalShell.vue";
import { useUiStore } from "../../stores/ui";
import { useMessage } from "naive-ui";

const uiStore = useUiStore();
const { editorModalVisible } = storeToRefs(uiStore);
const message = useMessage();

const code = ref("");
const language = ref("javascript");

// 语言选项
const languageOptions = [
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "JSON", value: "json" },
  { label: "HTML", value: "html" },
  { label: "CSS", value: "css" },
  { label: "Python", value: "python" },
  { label: "YAML", value: "yaml" },
  { label: "Markdown", value: "markdown" },
];

// 语言标签映射
const languageLabels: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  json: "JSON",
  html: "HTML",
  css: "CSS",
  python: "Python",
  yaml: "YAML",
  markdown: "Markdown",
};

// 监听 Modal 打开，同步内容
watch(
  () => uiStore.editorModalVisible,
  (visible) => {
    if (visible) {
      code.value = uiStore.editorModalContent.content;
      language.value = uiStore.editorModalContent.language || "javascript";
    }
  }
);

/** 格式化代码 */
function formatCode() {
  try {
    if (language.value === "json") {
      code.value = JSON.stringify(JSON.parse(code.value), null, 2);
      message?.success("格式化成功");
    } else {
      message?.warning("当前语言暂不支持自动格式化");
    }
  } catch (error) {
    message?.error("格式化失败：代码格式错误");
  }
}

/** 复制代码 */
function copyCode() {
  navigator.clipboard.writeText(code.value).then(() => {
    message?.success("代码已复制到剪贴板");
  });
}

/** 保存代码 */
function handleSave() {
  console.log("保存代码：", code.value);
  message?.success("代码已保存");
  uiStore.closeEditorModal();
}

/** 关闭 Modal */
function handleClose() {
  uiStore.closeEditorModal();
}
</script>

<style scoped></style>
