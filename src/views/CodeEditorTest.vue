<script setup lang="ts">
import { ref, onMounted } from "vue";
import CodeEditor from "@/components/common/CodeEditor.vue";
import type * as Monaco from "monaco-editor";
import type { MonacoInstance } from "@/utils/monaco";

/** 左侧 TypeScript 声明 */
const declarations = ref(`// main 函数参数类型声明

/** 配置选项 */
interface Config {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否启用缓存 */
  cache?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
}

/** 上下文信息 */
interface Context {
  /** 当前用户ID */
  userId: string;
  /** 会话ID */
  sessionId: string;
  /** 时间戳 */
  timestamp: number;
  /** 环境变量 */
  env: {
    /** 运行环境 */
    mode: 'development' | 'production' | 'test';
    /** API 基础地址 */
    apiBaseUrl: string;
  };
}

/** 输入数据 */
interface InputData {
  /** 输入文本 */
  text: string;
  /** 输入类型 */
  type: 'json' | 'xml' | 'text' | 'binary';
  /** 编码格式 */
  encoding?: 'utf-8' | 'gbk' | 'ascii';
  /** 元数据 */
  metadata?: Record<string, any>;
}

/** main 函数参数 */
interface MainParams {
  /** 输入数据 */
  input: InputData;
  /** 配置选项 */
  config: Config;
  /** 上下文信息 */
  context: Context;
  /** 回调函数 */
  onProgress?: (progress: number) => void;
  /** 日志函数 */
  log?: (message: string, level?: 'info' | 'warn' | 'error') => void;
}

/** main 函数参数（快捷访问） */
declare const params: MainParams;
`);

/** 右侧代码内容 */
const code = ref(`/**
 * 主函数入口
 * @param {MainParams} params - 函数参数
 */
export async function main(params) {
  // 测试 params 参数的智能提示
  // 1. 输入 params. 查看所有可用属性
  // 2. 输入 params.input. 查看 InputData 的属性
  // 3. 输入 params.config. 查看 Config 的属性
  // 4. 输入 params.context. 查看 Context 的属性
  
  // 获取输入数据
  const inputText = params.input.text;
  const inputType = params.input.
  
  // 获取配置
  const timeout = params.config.
  
  // 获取上下文信息
  const userId = params.context.
  const mode = params.context.env.
  
  // 调用回调函数
  if (params.onProgress) {
    params.onProgress(50);
  }
  
  // 使用日志函数
  params.log?.('处理开始', 'info');
  
  return {
    success: true,
    data: inputText
  };
}
`);

/** 编辑器是否就绪 */
const editorReady = ref(false);
const declarationsReady = ref(false);

let monacoInstance: MonacoInstance | null = null;
let libDisposable: { dispose: () => void } | null = null;
let codeEditorInstance: Monaco.editor.IStandaloneCodeEditor | null = null;
let declarationsEditorInstance: Monaco.editor.IStandaloneCodeEditor | null =
  null;

/** 声明编辑器就绪 */
function onDeclarationsReady(
  editor: Monaco.editor.IStandaloneCodeEditor,
  monaco: MonacoInstance
) {
  console.log("📝 声明编辑器已就绪");
  declarationsEditorInstance = editor;
  if (!monacoInstance) {
    monacoInstance = monaco;
  }
  declarationsReady.value = true;
  checkAndUpdateDeclarations();
}

/** 代码编辑器就绪 */
function onCodeReady(
  editor: Monaco.editor.IStandaloneCodeEditor,
  monaco: MonacoInstance
) {
  console.log("💻 代码编辑器已就绪");
  codeEditorInstance = editor;
  if (!monacoInstance) {
    monacoInstance = monaco;
  }
  editorReady.value = true;

  // 调试信息：检查编辑器配置
  const model = editor.getModel();
  if (model) {
    const language = model.getLanguageId();
    console.log("📋 编辑器语言模式：", language);
    console.log("📋 编辑器模型 URI：", model.uri.toString());
  }

  // 检查 JavaScript 默认配置
  const jsOptions =
    monaco.languages.typescript.javascriptDefaults.getCompilerOptions();
  console.log("⚙️ JavaScript 编译选项：", jsOptions);

  const jsEagerSync =
    monaco.languages.typescript.javascriptDefaults.getEagerModelSync();
  console.log("⚙️ JavaScript EagerModelSync：", jsEagerSync);

  checkAndUpdateDeclarations();
}

/** 检查并更新类型声明 */
function checkAndUpdateDeclarations() {
  if (editorReady.value && declarationsReady.value && monacoInstance) {
    setTimeout(() => {
      updateTypeDeclarations();
    }, 500);
  }
}

/** 更新 TypeScript 类型声明 */
function updateTypeDeclarations() {
  if (!monacoInstance) {
    console.warn("⚠️ Monaco 实例未初始化");
    return;
  }
  if (!editorReady.value || !declarationsReady.value) {
    console.log("⏳ 等待编辑器初始化...", {
      editorReady: editorReady.value,
      declarationsReady: declarationsReady.value,
    });
    return;
  }
  if (!codeEditorInstance) {
    console.warn("⚠️ 代码编辑器实例未找到");
    return;
  }

  try {
    // 清理旧的类型声明
    if (libDisposable) {
      console.log("🗑️ 清理旧的类型声明");
      libDisposable.dispose();
      libDisposable = null;
    }

    // 添加全局类型声明到 JavaScript 默认配置
    console.log("📦 添加类型声明到 JavaScript 配置");

    const libSource = declarations.value;
    const libUri = "ts:filename/global.d.ts";

    libDisposable =
      monacoInstance.languages.typescript.javascriptDefaults.addExtraLib(
        libSource,
        libUri
      );

    // 强制刷新代码编辑器的模型，让 TypeScript 服务重新分析
    const model = codeEditorInstance.getModel();
    if (model) {
      console.log("🔄 触发模型内容变化，强制刷新 TypeScript 服务");
      const currentValue = model.getValue();
      // 通过添加和删除一个空格来触发重新分析
      model.setValue(currentValue + " ");
      setTimeout(() => {
        model.setValue(currentValue);
        console.log("✅ 类型声明已更新并刷新成功！");
        console.log("💡 提示：在 main 函数内输入 'params.' 测试参数智能提示");
        console.log("💡 也可以按 Ctrl + Space 手动触发代码提示");
      }, 100);
    }
  } catch (error) {
    console.error("❌ 更新类型声明失败：", error);
  }
}

/** 监听声明变化，实时更新类型提示 */
function onDeclarationsChange() {
  console.log("📝 类型声明内容已修改，准备更新...");
  setTimeout(() => {
    updateTypeDeclarations();
  }, 300);
}

/** 手动测试类型声明 */
function testTypeDeclarations() {
  if (!monacoInstance || !codeEditorInstance) {
    alert("编辑器尚未完全初始化");
    return;
  }

  console.log("🧪 开始测试类型声明...");

  // 获取当前的额外库
  const extraLibs =
    monacoInstance.languages.typescript.javascriptDefaults.getExtraLibs();
  console.log("📚 当前额外库数量：", Object.keys(extraLibs).length);
  console.log("📚 额外库列表：", Object.keys(extraLibs));

  if (Object.keys(extraLibs).length === 0) {
    console.warn("⚠️ 没有找到额外的类型库，尝试重新加载...");
    updateTypeDeclarations();
  } else {
    console.log("✅ 类型声明已加载");
    alert(
      "类型声明已加载！\n请在右侧编辑器中测试：\n1. 在 main 函数内输入 'params.' 查看参数提示\n2. 输入 'params.input.' 查看输入数据属性\n3. 按 Ctrl+Space 手动触发提示"
    );
  }
}

onMounted(() => {
  console.log("🚀 代码编辑器测试页面已挂载");
});
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- 顶部标题栏 -->
    <div class="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">
            main 函数参数智能提示测试
          </h1>
          <p class="text-sm text-gray-600 mt-1">
            左侧定义 params 类型声明，右侧测试 main(params) 函数的智能提示 |
            <span class="font-semibold text-blue-600">Ctrl + 滚轮缩放</span> |
            <span class="font-semibold text-green-600"
              >输入 params. 查看智能提示</span
            >
          </p>
        </div>
        <button
          @click="testTypeDeclarations"
          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          🧪 测试类型声明
        </button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 左侧：TypeScript 声明 -->
      <div class="w-1/2 flex flex-col border-r border-gray-300">
        <div class="bg-gray-100 px-4 py-2 border-b border-gray-300">
          <h2 class="text-sm font-semibold text-gray-700">
            MainParams 类型声明 (params.d.ts)
          </h2>
        </div>
        <div class="flex-1">
          <CodeEditor
            v-model="declarations"
            language="typescript"
            theme="vs"
            @update:model-value="onDeclarationsChange"
            @ready="onDeclarationsReady"
          />
        </div>
      </div>

      <!-- 右侧：JavaScript 代码编辑器 -->
      <div class="w-1/2 flex flex-col">
        <div class="bg-gray-100 px-4 py-2 border-b border-gray-300">
          <h2 class="text-sm font-semibold text-gray-700">
            JavaScript 代码 (main.js)
          </h2>
        </div>
        <div class="flex-1">
          <CodeEditor
            v-model="code"
            language="javascript"
            theme="vs"
            @ready="onCodeReady"
          />
        </div>
      </div>
    </div>

    <!-- 底部提示栏 -->
    <div
      class="bg-gray-800 text-white px-6 py-2 text-sm flex items-center gap-4"
    >
      <span class="flex items-center gap-2">
        <span
          :class="[
            'w-2 h-2 rounded-full',
            editorReady && declarationsReady
              ? 'bg-green-500 animate-pulse'
              : 'bg-yellow-500',
          ]"
        ></span>
        <span>{{
          editorReady && declarationsReady ? "就绪" : "加载中..."
        }}</span>
      </span>
      <span class="text-gray-400">|</span>
      <span
        >按住 <kbd class="px-1 py-0.5 bg-gray-700 rounded">Ctrl</kbd> + 滚轮
        可缩放编辑器</span
      >
      <span class="text-gray-400">|</span>
      <span
        >按 <kbd class="px-1 py-0.5 bg-gray-700 rounded">Ctrl</kbd> +
        <kbd class="px-1 py-0.5 bg-gray-700 rounded">Space</kbd>
        手动触发代码提示</span
      >
      <span class="text-gray-400">|</span>
      <span>查看控制台了解详细日志</span>
    </div>
  </div>
</template>

<style scoped>
/* 确保编辑器容器正确填充 */
.flex-1 {
  min-height: 0;
}

/* kbd 样式 */
kbd {
  font-family: monospace;
  font-size: 0.85em;
}
</style>
