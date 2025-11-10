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
          @update:key="(value: string) => updateDataItemKey(index, value)"
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
          :model-value="isDeclarationView ? typeDeclarationsValue : codeValue"
          :readonly="isDeclarationView"
          language="typescript"
          :options="{
            minimap: { enabled: false },
            lineNumbers: 'on',
            fontSize: 13,
          }"
          class="code-editor-container"
          @update:model-value="handleEditorInput"
        />

        <div class="w-5 h-8 pt-3 absolute bottom-0 right-0">
          <button
            type="button"
            class="flex items-center justify-center w-full h-full border-l rounded-tl-md border-t border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 hover:bg-slate-100 rounded-r-md shrink-0"
            title="打开变量编辑器"
          >
            <IconExternalLink class="h-3 w-3" />
          </button>
        </div>
      </div>

      <div class="mt-2 text-xs text-slate-500">
        <p>
          提示：编写
          <code
            class="rounded bg-slate-100 px-1 py-0.5 font-mono text-emerald-600"
          >
            export function main(params)
          </code>
          函数，参数将从上方配置的映射中获取
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
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

interface CodeNodeDataItem {
  key: string;
  value: string;
}

interface CodeNodeConfig {
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

// 默认类型声明
const DEFAULT_TYPE_DECLARATIONS = `/**
 * 可以在此处声明类型以辅助编辑器智能提示
 * 例如：
 *
 * interface ExampleParams {
 *   user: { id: string; name: string };
 * }
 */
`;

// 键名验证正则
const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

// 从节点配置中获取当前值
const currentConfig = computed<CodeNodeConfig>(() => {
  return props.selectedNode.data.params?.config || {};
});

// 数据项
const dataItems = ref<CodeNodeDataItem[]>(currentConfig.value.dataItems || []);

// 代码值
const codeValue = ref(currentConfig.value.code || DEFAULT_CODE);

// 类型声明值
const typeDeclarationsValue = ref(
  currentConfig.value.typeDeclarations || DEFAULT_TYPE_DECLARATIONS
);

// 监听节点变化
watch(
  () => props.selectedNode.data.params?.config,
  (newConfig) => {
    if (newConfig) {
      dataItems.value = newConfig.dataItems || [];
      codeValue.value = newConfig.code || DEFAULT_CODE;
      typeDeclarationsValue.value =
        newConfig.typeDeclarations || DEFAULT_TYPE_DECLARATIONS;
    }
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
  updateConfig({
    dataItems: dataItems.value,
  });
}

/**
 * 更新代码
 */
function updateCode(value: string) {
  codeValue.value = value;
  updateConfig({
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
  if (isDeclarationView.value) {
    // 重置声明
    typeDeclarationsValue.value = DEFAULT_TYPE_DECLARATIONS;
    updateConfig({
      typeDeclarations: DEFAULT_TYPE_DECLARATIONS,
    });
  } else {
    // 重置代码
    updateCode(DEFAULT_CODE);
  }
}

/**
 * 更新配置
 */
function updateConfig(partial: Partial<CodeNodeConfig>) {
  const currentParams = props.selectedNode.data.params || {};
  const newConfig = {
    ...currentConfig.value,
    ...partial,
  };

  updateNode(props.selectedNode.id, {
    data: {
      ...props.selectedNode.data,
      params: {
        ...currentParams,
        config: newConfig,
      },
    },
  });

  emit("update:params", {
    ...currentParams,
    config: newConfig,
  });
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
</script>

<style scoped>
.code-editor-container {
  height: 300px;
}
</style>
