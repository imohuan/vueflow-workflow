<template>
  <div class="mb-6 space-y-6">
    <!-- 参数映射配置 -->
    <div>
      <div class="mb-3 flex items-center justify-between">
        <h4
          class="flex items-center gap-2 text-sm font-semibold text-slate-700"
        >
          <IconDatabase class="h-4 w-4" />
          参数映射 (params)
        </h4>
        <n-button size="small" type="primary" ghost @click="addDataItem">
          <template #icon>
            <IconPlus class="h-3.5 w-3.5" />
          </template>
          添加参数
        </n-button>
      </div>

      <div
        v-if="dataItems.length === 0"
        class="rounded-md border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-400"
      >
        暂无参数映射，点击"添加参数"创建
      </div>

      <div v-else class="space-y-2">
        <ParamItem
          v-for="(item, index) in dataItems"
          :key="index"
          :param-key="item.key"
          :value="item.value"
          :key-error="getKeyError(index)"
          @update:param-key="(value: string) => updateDataItemKey(index, value)"
          @update:value="(value: string) => updateDataItemValue(index, value)"
          @delete="removeDataItem(index)"
        />
      </div>
    </div>

    <!-- 代码编辑器 -->
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <h4
          class="flex items-center gap-2 text-sm font-semibold text-slate-700"
        >
          <IconCode class="h-4 w-4" />
          代码编辑器
        </h4>
        <div class="flex items-center gap-2">
          <!-- 右侧一个切换按钮 切换声明和代码 -->
          <ToggleButtonGroup
            class="overflow-hidden"
            size="sm"
            v-model="viewMode"
            :options="[
              { value: 'code', label: '代码', icon: IconCode },
              { value: 'declaration', label: '声明', icon: IconFileCode },
            ]"
          />
          <n-button size="tiny" type="primary" ghost @click="handleReset">
            <template #icon> <IconReset class="h-3.5 w-3.5" /></template>
            重置
          </n-button>
        </div>
      </div>

      <div
        class="relative rounded-md border border-slate-200 bg-white overflow-hidden"
      >
        <CodeEditor
          ref="codeEditorRef"
          :model-value="
            isDeclarationView ? generatedTypeDeclarations : codeValue
          "
          :readonly="isDeclarationView"
          :language="isDeclarationView ? 'typescript' : 'javascript'"
          :options="{
            minimap: { enabled: false },
            lineNumbers: 'off',
            wordWrap: 'on',
            fontSize: 13,
          }"
          class="code-editor-container"
          @update:model-value="handleEditorInput"
          @ready="handleEditorReady"
        />

        <div class="w-5 h-8 pt-3 absolute bottom-0 right-0">
          <button
            type="button"
            class="flex items-center justify-center w-full h-full border-l rounded-tl-md border-t border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 hover:bg-slate-100 rounded-r-md shrink-0"
            title="全屏编辑代码"
            @click="handleOpenEditorPanel"
          >
            <IconExternalLink class="h-3 w-3" />
          </button>
        </div>
      </div>

      <div class="mt-2 text-xs text-slate-500">
        <p v-if="!isDeclarationView">
          提示：编写
          <code
            class="rounded bg-slate-100 px-1 py-0.5 font-mono text-emerald-600"
          >
            export function main(params)
          </code>
          函数，参数将从上方配置的映射中获取
        </p>
        <p v-else>
          提示：类型声明根据上方参数映射自动生成，用于代码编辑器的智能提示
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from "vue";
import type { Node } from "@vue-flow/core";
import { useVueFlow } from "@vue-flow/core";
import { NButton } from "naive-ui";
import CodeEditor from "@/v2/components/code/CodeEditor.vue";
import IconCode from "@/icons/IconCode.vue";
import IconDatabase from "@/icons/IconDatabase.vue";
import IconPlus from "@/icons/IconPlus.vue";
import IconFileCode from "@/icons/IconFileCode.vue";
import IconExternalLink from "@/icons/IconExternalLink.vue";
import ParamItem from "../components/ParamItem.vue";
import ToggleButtonGroup from "@/v2/components/ui/ToggleButtonGroup.vue";
import IconReset from "@/icons/IconReset.vue";
import { generateParamsInterface } from "@/v2/features/canvas/utils/typeInference";
import { useVariableContext } from "@/v2/composables/useVariableContext";
import { resolveConfigWithVariables } from "workflow-flow-nodes";
import type { MonacoInstance } from "@/v2/components/code/monaco";
import type * as Monaco from "monaco-editor";
import { useUiStore } from "@/v2/stores/ui";

interface CodeNodeDataItem {
  key: string;
  value: string;
}

interface CodeNodeParams {
  code?: string;
  dataItems?: CodeNodeDataItem[];
  typeDeclarations?: string;
}

interface Props {
  selectedNode: Node;
  nodeConfig: Record<string, any>;
}

interface Emits {
  (e: "update:params", params: Record<string, any>): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { updateNode } = useVueFlow();

// 获取变量上下文
const { contextMap } = useVariableContext();

// UI Store
const uiStore = useUiStore();

// Monaco 编辑器实例
const codeEditorRef = ref<InstanceType<typeof CodeEditor>>();
let monacoInstance: MonacoInstance | null = null;
let typeLibDisposable: Monaco.IDisposable | null = null;

const isDeclarationView = ref(false);
const viewMode = computed({
  get() {
    return isDeclarationView.value ? "declaration" : "code";
  },
  set(v: string) {
    isDeclarationView.value = v === "declaration";
  },
});

// 默认代码
const DEFAULT_CODE = `/**
 * 主函数入口
 * @param {MainParams} params - 函数参数
 */
export async function main(params) {
  return {
    receivedKeys: Object.keys(params),
    example: params,
  };
}`;

// 键名验证正则
const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

// 从节点配置中获取当前值
const currentParams = computed<CodeNodeParams>(() => {
  const rawParams = (props.selectedNode.data.params || {}) as Record<
    string,
    unknown
  >;
  const { config: legacyConfig, ...rest } = rawParams as {
    config?: CodeNodeParams;
  } & CodeNodeParams;

  return {
    ...(legacyConfig || {}),
    ...(rest as CodeNodeParams),
  };
});

// 数据项
const dataItems = ref<CodeNodeDataItem[]>(currentParams.value.dataItems || []);

// 代码值
const codeValue = ref(currentParams.value.code || DEFAULT_CODE);

// 自动生成的类型声明
const generatedTypeDeclarations = computed(() => {
  return generateTypeDeclarationFromDataItems(dataItems.value);
});

// 监听节点变化
watch(
  () => props.selectedNode.data.params,
  (newParams) => {
    if (!newParams) {
      dataItems.value = [];
      codeValue.value = DEFAULT_CODE;
      return;
    }

    const rawParams = newParams as Record<string, unknown>;
    const { config: legacyConfig, ...rest } = rawParams as {
      config?: CodeNodeParams;
    } & CodeNodeParams;
    const mergedParams: CodeNodeParams = {
      ...(legacyConfig || {}),
      ...(rest as CodeNodeParams),
    };

    dataItems.value = mergedParams.dataItems || [];
    codeValue.value = mergedParams.code || DEFAULT_CODE;
  },
  { deep: true }
);

// 监听 dataItems 变化，自动更新类型声明
watch(
  [dataItems, contextMap],
  () => {
    updateTypeDeclaration();
  },
  { deep: true }
);

/**
 * 添加数据项
 */
function addDataItem() {
  dataItems.value.push({
    key: "",
    value: "",
  });
  updateDataItems();
}

/**
 * 删除数据项
 */
function removeDataItem(index: number) {
  dataItems.value.splice(index, 1);
  updateDataItems();
}

/**
 * 更新数据项的 Key
 */
function updateDataItemKey(index: number, key: string) {
  if (dataItems.value[index]) {
    dataItems.value[index].key = key;
    updateDataItems();
  }
}

/**
 * 更新数据项的 Value
 */
function updateDataItemValue(index: number, value: string) {
  if (dataItems.value[index]) {
    dataItems.value[index].value = value;
    updateDataItems();
  }
}

/**
 * 更新数据项
 */
function updateDataItems() {
  updateParams({
    dataItems: dataItems.value,
  });
}

/**
 * 更新代码
 */
function updateCode(value: string) {
  codeValue.value = value;
  updateParams({
    code: value,
  });
}

/**
 * 编辑器输入处理：仅在代码模式下更新
 */
function handleEditorInput(value: string) {
  if (!isDeclarationView.value) {
    updateCode(value);
  }
}

/**
 * 重置当前视图内容为默认
 */
function handleReset() {
  // 只重置代码，声明是自动生成的
  updateCode(DEFAULT_CODE);
}

/**
 * 打开编辑器面板模态框
 */
function handleOpenEditorPanel() {
  // 获取当前显示的代码内容
  const currentContent = isDeclarationView.value
    ? generatedTypeDeclarations.value
    : codeValue.value;

  // 获取当前语言
  const currentLanguage = isDeclarationView.value ? "typescript" : "javascript";

  // 获取节点标签作为标题
  const nodeLabel = props.selectedNode.data?.label || "代码节点";
  const title = `${nodeLabel} - ${
    isDeclarationView.value ? "类型声明（只读）" : "代码编辑"
  }`;

  // 打开编辑器面板
  // 如果是声明模式，不传递保存回调（只读模式）
  // 如果是代码模式，传递保存回调
  uiStore.openEditorPanelModal(
    title,
    currentContent,
    currentLanguage,
    isDeclarationView.value
      ? undefined // 声明模式下不允许保存
      : (value: string) => {
          // 代码模式下更新代码
          updateCode(value);
        }
  );
}

/**
 * 更新配置
 */
function updateParams(partial: Partial<CodeNodeParams>) {
  const existingParams = props.selectedNode.data.params || {};
  const sanitizedParams = {
    ...(existingParams as Record<string, unknown>),
  };
  delete sanitizedParams.config;

  const mergedParams = {
    ...(sanitizedParams as CodeNodeParams),
    ...partial,
  };

  updateNode(props.selectedNode.id, {
    data: {
      ...props.selectedNode.data,
      params: mergedParams,
    },
  });

  emit("update:params", mergedParams);
}

/**
 * 获取键名错误
 */
function getKeyError(index: number): string {
  const item = dataItems.value[index];
  const key = item?.key?.trim() || "";

  if (!key) {
    return "";
  }

  if (!KEY_PATTERN.test(key)) {
    return "仅支持以字母开头的字母、数字、下划线";
  }

  // 检查重复
  const duplicateIndex = dataItems.value.findIndex(
    (d, i) => i !== index && d.key.trim() === key
  );
  if (duplicateIndex !== -1) {
    return `与第 ${duplicateIndex + 1} 项重复`;
  }

  return "";
}

/**
 * 编辑器就绪回调
 */
function handleEditorReady(
  _editor: Monaco.editor.IStandaloneCodeEditor,
  monaco: MonacoInstance
) {
  monacoInstance = monaco;
  console.log("✅ Monaco 编辑器已就绪");
  // 立即应用类型声明
  updateTypeDeclaration();
}

/**
 * 根据 dataItems 生成类型声明
 */
function generateTypeDeclarationFromDataItems(
  items: CodeNodeDataItem[]
): string {
  if (!items || items.length === 0) {
    return `interface MainParams {
  [key: string]: any;
}`;
  }

  // 解析所有变量值
  const resolvedValues: Record<string, unknown> = {};

  try {
    // 构建配置对象用于解析
    const configToResolve: Record<string, string> = {};
    items.forEach((item) => {
      const key = item.key?.trim();
      if (key) {
        configToResolve[key] = item.value || "";
      }
    });

    // 如果有变量上下文，解析变量
    if (contextMap.value && contextMap.value.size > 0) {
      const resolved = resolveConfigWithVariables(
        configToResolve,
        contextMap.value
      );

      // 提取解析后的值
      Object.keys(configToResolve).forEach((key) => {
        resolvedValues[key] = resolved[key];
      });
    }
  } catch (error) {
    console.warn("生成类型声明时解析变量失败:", error);
  }

  // 生成 MainParams 接口声明
  return generateParamsInterface(items, resolvedValues, "MainParams");
}

/**
 * 更新类型声明到 Monaco 编辑器
 * 在代码模式下，类型声明会被添加到 JavaScript 默认配置中，提供智能提示
 */
function updateTypeDeclaration() {
  if (!monacoInstance) {
    return;
  }

  // 清除旧的类型库
  if (typeLibDisposable) {
    typeLibDisposable.dispose();
    typeLibDisposable = null;
  }

  const typeDecl = generatedTypeDeclarations.value.trim();
  if (!typeDecl) {
    console.log("📝 无类型声明");
    return;
  }

  console.log("📝 更新类型声明（代码模式下引用）:\n", typeDecl);

  // 添加新的类型库到 JavaScript 默认配置
  // 这样在代码模式下编写 JavaScript 代码时，也能获得类型提示
  const uri = monacoInstance.Uri.parse(
    `file:///node_modules/@types/code-node/index.d.ts`
  );

  // 添加到 JavaScript 默认配置（用于代码模式的智能提示）
  typeLibDisposable =
    monacoInstance.languages.typescript.javascriptDefaults.addExtraLib(
      typeDecl,
      uri.toString()
    );
}

// 组件卸载时清理
onBeforeUnmount(() => {
  if (typeLibDisposable) {
    typeLibDisposable.dispose();
    typeLibDisposable = null;
  }
});
</script>

<style scoped>
.code-editor-container {
  height: 300px;
}
</style>
