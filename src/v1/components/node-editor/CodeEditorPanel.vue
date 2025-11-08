<!-- 节点编辑面板 - Linear App 风格 -->
<template>
  <div
    class="fixed inset-0 bg-black/10 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-200"
    @click.self="handleClose"
  >
    <div
      class="w-[95vw] h-[95vh] bg-[#fafafa] rounded-md overflow-hidden flex flex-col border border-slate-200 shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition-transform duration-300"
    >
      <!-- 未选中节点时 -->
      <div
        v-if="!selectedNode"
        class="flex flex-col items-center justify-center h-full px-8 py-12"
      >
        <IconEmptyNode />
        <p class="mt-5 text-[15px] font-medium text-center text-slate-600">
          选择一个节点进行编辑
        </p>
      </div>

      <!-- 已选中节点时 -->
      <div v-else class="flex flex-col h-full">
        <!-- 头部 -->
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
              代码编辑器
            </h3>
          </div>
          <button
            class="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700"
            @click="handleClose"
          >
            <IconClose class="w-4 h-4" />
          </button>
        </div>

        <!-- 内容区域 -->
        <div class="w-full h-full flex flex-col bg-[#f6f6f8]">
          <!-- 编辑器工具栏 -->
          <div
            class="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200"
          >
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium text-slate-600">代码编辑器</span>
              <span class="text-xs text-slate-400"
                >export function main(params)</span
              >
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

          <!-- 代码编辑器 -->
          <div class="flex-1 overflow-hidden">
            <CodeEditor
              ref="codeEditorRef"
              :model-value="codeValue"
              language="javascript"
              theme="vs"
              @update:model-value="handleCodeChange"
              @ready="handleEditorReady"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useNodeEditorStore } from "../../stores/nodeEditor";
import IconEmptyNode from "@/icons/IconEmptyNode.vue";
import CodeEditor from "../common/CodeEditor.vue";
import IconCog from "@/icons/IconCog.vue";
import IconClose from "@/icons/IconClose.vue";
import IconReset from "@/icons/IconReset.vue";
import IconPlayCircle from "@/icons/IconPlayCircle.vue";
import type { MonacoInstance } from "../../utils/monaco";

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

const store = useNodeEditorStore();
const { selectedNode } = store;

const codeEditorRef = ref<InstanceType<typeof CodeEditor>>();
let monacoInstance: MonacoInstance | null = null;
let typeLibDisposable: any | null = null;

/** 获取节点配置中的类型声明 */
const typeDeclarations = computed(() => {
  if (!selectedNode) return "";
  const config = selectedNode.data?.config;
  return typeof config?.typeDeclarations === "string"
    ? config.typeDeclarations
    : "";
});

const codeValue = computed(() => {
  if (!selectedNode) return CODE_DEFAULT_SOURCE;
  const config = selectedNode.data?.config;
  return config?.code || CODE_DEFAULT_SOURCE;
});

/**
 * 编辑器就绪回调
 */
function handleEditorReady(_editor: any, monaco: MonacoInstance) {
  monacoInstance = monaco;
  console.log("✅ Monaco 编辑器已就绪");
  // 立即应用类型声明
  updateTypeDeclaration();
}

/**
 * 更新类型声明
 */
function updateTypeDeclaration() {
  if (!monacoInstance) return;

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
  const uri = monacoInstance.Uri.parse(
    `file:///node_modules/@types/code-node/index.d.ts`
  );

  typeLibDisposable =
    monacoInstance.languages.typescript.javascriptDefaults.addExtraLib(
      typeDecl,
      uri.toString()
    );
}

/**
 * 处理代码变化
 */
function handleCodeChange(value: string) {
  if (selectedNode) {
    store.updateNodeData(selectedNode.id, {
      config: {
        ...(selectedNode.data?.config || {}),
        code: value,
      },
    });
  }
}

/**
 * 重置代码
 */
function handleResetCode() {
  if (!selectedNode) return;
  store.updateNodeData(selectedNode.id, {
    config: {
      ...(selectedNode.data?.config || {}),
      code: CODE_DEFAULT_SOURCE,
    },
  });
}

/**
 * 执行代码
 */
function handleExecuteCode() {
  if (selectedNode) {
    store.executeNode(selectedNode.id);
  }
}

/**
 * 关闭面板
 */
function handleClose() {
  store.closeCodeEditorPanel();
}

// 监听类型声明变化，自动更新
watch(typeDeclarations, () => {
  updateTypeDeclaration();
});
</script>
