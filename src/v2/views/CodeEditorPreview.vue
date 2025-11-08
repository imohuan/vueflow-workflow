<!-- 代码编辑器预览界面 - 左侧声明，右侧代码 -->
<template>
  <div class="h-screen flex flex-col bg-slate-50">
    <!-- 顶部工具栏 -->
    <div
      class="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 shrink-0"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex items-center justify-center w-7 h-7 rounded-lg bg-linear-to-br from-purple-500 to-purple-700 text-white transition-transform duration-200 hover:scale-105"
        >
          <IconCode class="w-4 h-4" />
        </div>
        <h3 class="text-[15px] font-medium text-[#1a1a1a] tracking-tight">
          代码编辑器预览
        </h3>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
          @click="handleResetCode"
        >
          <IconReset class="w-3.5 h-3.5" />
          <span>重置代码</span>
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-md border border-purple-500 bg-purple-500 px-3 py-1.5 text-xs text-white transition hover:bg-purple-600 hover:border-purple-600"
          @click="handleExecuteCode"
        >
          <IconPlayCircle class="w-3.5 h-3.5" />
          <span>执行代码</span>
        </button>
      </div>
    </div>

    <!-- 主内容区域：左侧声明，右侧代码 -->
    <div class="flex-1 flex overflow-hidden bg-[#f6f6f8]">
      <!-- 左侧：类型声明编辑器 -->
      <div class="w-1/2 flex flex-col border-r border-slate-200 bg-white">
        <div
          class="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-slate-600">类型声明</span>
            <span class="text-xs text-slate-400">TypeScript</span>
          </div>
        </div>
        <div class="flex-1 overflow-hidden">
          <CodeEditor
            ref="typeEditorRef"
            v-model="typeDeclarations"
            language="typescript"
            theme="vs"
            @ready="handleTypeEditorReady"
          />
        </div>
      </div>

      <!-- 右侧：代码编辑器 -->
      <div class="w-1/2 flex flex-col bg-white">
        <div
          class="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-slate-600">代码编辑器</span>
            <span class="text-xs text-slate-400">JavaScript</span>
          </div>
        </div>
        <div class="flex-1 overflow-hidden">
          <CodeEditor
            ref="codeEditorRef"
            v-model="codeValue"
            language="javascript"
            theme="vs"
            @ready="handleCodeEditorReady"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import CodeEditor from "../components/code/CodeEditor.vue";
import IconCode from "@/icons/IconCode.vue";
import IconReset from "@/icons/IconReset.vue";
import IconPlayCircle from "@/icons/IconPlayCircle.vue";
import type { MonacoInstance } from "../components/code/monaco";

const CODE_DEFAULT_SOURCE = `/**
 * 主函数入口
 * @param {MainParams} params - 函数参数
 */
export async function main(params) {
  return {
    receivedKeys: Object.keys(params),
    example: params,
  };
}`;

const TYPE_DECLARATIONS_DEFAULT = `/**
 * 主函数参数类型定义
 */
interface MainParams {
  /** 示例字符串参数 */
  name?: string;
  /** 示例数字参数 */
  age?: number;
  /** 示例对象参数 */
  data?: Record<string, any>;
}
`;

const typeEditorRef = ref<InstanceType<typeof CodeEditor>>();
const codeEditorRef = ref<InstanceType<typeof CodeEditor>>();

const typeDeclarations = ref(TYPE_DECLARATIONS_DEFAULT);
const codeValue = ref(CODE_DEFAULT_SOURCE);

let typeMonacoInstance: MonacoInstance | null = null;
let codeMonacoInstance: MonacoInstance | null = null;
let typeLibDisposable: any | null = null;

/**
 * 类型编辑器就绪回调
 */
function handleTypeEditorReady(_editor: any, monaco: MonacoInstance) {
  typeMonacoInstance = monaco;
  console.log("✅ 类型声明编辑器已就绪");
  // 立即应用类型声明
  updateTypeDeclaration();
}

/**
 * 代码编辑器就绪回调
 */
function handleCodeEditorReady(_editor: any, monaco: MonacoInstance) {
  codeMonacoInstance = monaco;
  console.log("✅ 代码编辑器已就绪");
  // 立即应用类型声明
  updateTypeDeclaration();
}

/**
 * 更新类型声明
 */
function updateTypeDeclaration() {
  if (!codeMonacoInstance) return;

  // 清除旧的类型库
  if (typeLibDisposable) {
    typeLibDisposable.dispose();
    typeLibDisposable = null;
  }

  const typeDecl = typeDeclarations.value.trim();
  if (!typeDecl) {
    console.log("📝 无类型声明");
    return;
  }

  console.log("📝 更新类型声明:\n", typeDecl);

  // 添加新的类型库
  const uri = codeMonacoInstance.Uri.parse(
    `file:///node_modules/@types/code-node/index.d.ts`
  );

  typeLibDisposable =
    codeMonacoInstance.languages.typescript.javascriptDefaults.addExtraLib(
      typeDecl,
      uri.toString()
    );
}

/**
 * 监听类型声明变化，自动更新
 */
watch(typeDeclarations, () => {
  updateTypeDeclaration();
});

/**
 * 重置代码
 */
function handleResetCode() {
  codeValue.value = CODE_DEFAULT_SOURCE;
  typeDeclarations.value = TYPE_DECLARATIONS_DEFAULT;
}

/**
 * 执行代码
 */
function handleExecuteCode() {
  console.log("执行代码:", codeValue.value);
  // TODO: 实现代码执行逻辑
}
</script>

<style scoped>
/* 编辑器容器样式 */
</style>
