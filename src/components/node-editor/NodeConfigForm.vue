<!-- 节点配置表单 - 根据节点类型渲染专用配置界面 -->
<template>
  <div
    class="flex flex-col bg-white border border-gray-200 rounded-md overflow-hidden"
  >
    <div
      class="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50"
    >
      <span class="text-sm font-semibold text-slate-700">配置数据</span>
    </div>
    <div class="p-4 space-y-4">
      <!-- For 节点配置 -->
      <div v-if="nodeType === 'for'" class="space-y-4">
        <!-- 模式选择 -->
        <div class="flex flex-col gap-2">
          <label
            class="text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            数据来源
          </label>
          <Select
            v-model="localConfig.mode"
            :options="forModeOptions"
            optionLabel="label"
            optionValue="value"
            class="h-9"
            @change="handleForModeChange"
          />
        </div>

        <!-- 输入模式 -->
        <template v-if="localConfig.mode === 'input'">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-slate-600"
              >集合字段路径</label
            >
            <InputText
              v-model="localConfig.itemsPath"
              type="text"
              class="h-9"
              placeholder="例如 data.items 或留空直接使用输入"
              @change="updateConfig"
            />
            <p class="text-xs text-slate-400 leading-relaxed">
              支持点语法访问对象字段，例如
              <code
                class="bg-slate-100 text-purple-500 px-1.5 py-0.5 rounded font-mono text-xs"
                >payload.list</code
              >。留空时直接使用输入端口提供的数组。
            </p>
          </div>
        </template>

        <!-- 静态数组模式 -->
        <template v-else-if="localConfig.mode === 'static'">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-slate-600"
              >静态数组 (JSON)</label
            >
            <textarea
              v-model="staticItemsText"
              class="w-full font-mono text-sm leading-relaxed text-slate-700 bg-white border border-slate-200 rounded-md px-3 py-2.5 transition-colors duration-200 outline-none resize-none hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              rows="4"
              placeholder='["task1", "task2"]'
              @change="updateStaticItems"
            />
          </div>
        </template>

        <!-- 范围模式 -->
        <template v-else-if="localConfig.mode === 'range'">
          <div class="grid grid-cols-3 gap-3">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-slate-600">起始值</label>
              <VariableTextInput
                :model-value="toDisplayValue(localConfig.range?.start)"
                @update:modelValue="(val) => setRangeValue('start', val)"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-slate-600">结束值</label>
              <VariableTextInput
                :model-value="toDisplayValue(localConfig.range?.end)"
                @update:modelValue="(val) => setRangeValue('end', val)"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-slate-600">步长</label>
              <VariableTextInput
                :model-value="toDisplayValue(localConfig.range?.step)"
                @update:modelValue="(val) => setRangeValue('step', val)"
              />
            </div>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            步长支持正数或负数，不能为 0。范围按
            <code
              class="bg-slate-100 text-purple-500 px-1.5 py-0.5 rounded font-mono text-xs"
              >[start, end)</code
            >
            规则生成。
          </p>
        </template>

        <!-- 变量配置 -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-slate-600">迭代变量名</label>
            <InputText
              v-model="localConfig.itemName"
              type="text"
              class="h-9"
              placeholder="默认 item"
              @change="updateConfig"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-slate-600">索引变量名</label>
            <InputText
              v-model="localConfig.indexName"
              type="text"
              class="h-9"
              placeholder="默认 index"
              @change="updateConfig"
            />
          </div>
        </div>

        <div
          class="text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-md p-2.5 leading-relaxed"
        >
          循环体容器 ID：
          <span class="font-mono text-purple-600">
            {{ localConfig.containerId || "创建节点后自动生成" }}
          </span>
        </div>
      </div>

      <!-- If 节点配置 -->
      <div v-else-if="nodeType === 'if'">
        <ConditionEditor v-model="ifConfigProxy" />
      </div>

      <!-- Merge 节点配置 -->
      <div v-else-if="nodeType === 'merge'" class="space-y-4">
        <!-- 模式选择 -->
        <div class="flex flex-col gap-2">
          <label
            class="text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            合并模式
          </label>
          <Select
            v-model="localConfig.mode"
            :options="[
              { label: '对象模式', value: 'object' },
              { label: '数组模式', value: 'array' },
            ]"
            optionLabel="label"
            optionValue="value"
            class="h-9"
            @change="updateConfig"
          />
        </div>

        <!-- 对象模式：配置键名 -->
        <div v-if="localConfig.mode === 'object'" class="space-y-2.5">
          <label class="text-sm font-medium text-slate-600"
            >键名配置（对应5个输入端口）</label
          >
          <div
            v-for="(_key, index) in localConfig.keys"
            :key="index"
            class="flex items-center gap-3"
          >
            <span class="text-xs text-slate-400 w-16 shrink-0"
              >输入{{ index + 1 }}:</span
            >
            <InputText
              v-model="localConfig.keys[index]"
              type="text"
              class="flex-1 h-9"
              :placeholder="`key${index + 1}`"
              @change="updateConfig"
            />
          </div>
        </div>

        <div
          v-else
          class="text-xs text-slate-500 p-2.5 bg-slate-50 border border-slate-200 rounded-md"
        >
          数组模式下将按顺序收集所有非空输入
        </div>
      </div>

      <!-- Code 节点配置 -->
      <div v-else-if="nodeType === 'code'" class="space-y-4">
        <!-- 代码编辑器 -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-slate-600">代码</label>
          <textarea
            v-model="localConfig.code"
            class="w-full font-mono text-sm leading-relaxed text-slate-700 bg-white border border-slate-200 rounded-md px-3 py-2.5 transition-colors duration-200 outline-none resize-none hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            rows="15"
            placeholder="输入 JavaScript 代码..."
            @change="updateConfig"
          />
        </div>

        <div
          class="text-xs text-slate-500 p-2.5 bg-slate-50 border border-slate-200 rounded-md space-y-1.5"
        >
          <div><strong class="text-slate-600">可用变量:</strong></div>
          <div>• input1, input2, input3 - 输入数据</div>
          <div>• JSON, Math, Date, console - 内置对象</div>
          <div class="pt-1">
            <strong class="text-slate-600">注意:</strong> 代码需要返回结果 (使用
            return 语句)
          </div>
        </div>
      </div>

      <!-- 通用配置（其他节点类型） -->
      <div v-else class="space-y-4">
        <!-- 根据输入端口渲染配置项 -->
        <div
          v-for="input in inputDefinitions"
          :key="input.id"
          class="flex flex-col gap-2"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-slate-700">
              {{ input.name || input.id }}
            </span>
            <span
              class="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500"
            >
              {{ input.type || "any" }}
            </span>
            <span
              v-if="input.required"
              class="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-500"
            >
              必填
            </span>
          </div>

          <VariableTextInput
            :model-value="toDisplayValue(getConfigValue(input.id))"
            :multiline="
              shouldUseMultiline(input.type, getConfigValue(input.id))
            "
            @update:modelValue="
              (val) => setConfigValue(input.id, val, input.type)
            "
          />

          <p
            v-if="input.description"
            class="text-xs text-slate-400 leading-relaxed"
          >
            {{ input.description }}
          </p>
        </div>

        <!-- 额外的配置键（未在输入端口中定义） -->
        <template v-if="additionalConfigKeys.length">
          <div class="h-px bg-slate-100"></div>
          <div
            v-for="key in additionalConfigKeys"
            :key="key"
            class="flex flex-col gap-2"
          >
            <label class="text-sm font-medium text-slate-700">{{ key }}</label>
            <VariableTextInput
              :model-value="toDisplayValue(getConfigValue(key))"
              :multiline="shouldUseMultiline(undefined, getConfigValue(key))"
              @update:modelValue="(val) => setConfigValue(key, val)"
            />
          </div>
        </template>

        <div
          v-if="
            inputDefinitions.length === 0 && additionalConfigKeys.length === 0
          "
          class="p-5 text-center text-slate-400 text-sm italic bg-slate-50 border-2 border-dashed border-slate-200 rounded-md"
        >
          暂无配置项
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useNodeEditorStore } from "@/stores/nodeEditor";
import InputText from "@/components/common/InputText.vue";
import Select from "@/components/common/Select.vue";
import VariableTextInput from "./VariableTextInput.vue";
import ConditionEditor from "./ConditionEditor.vue";
import type { IfConfig } from "@/core/nodes/flow/IfNode";

const store = useNodeEditorStore();
// 本地配置副本
const localConfig = ref<Record<string, any>>({});
const staticItemsText = ref("[]");

const forModeOptions = [
  { label: "输入集合", value: "input" },
  { label: "静态数组", value: "static" },
  { label: "数字范围", value: "range" },
];

// 计算节点类型
const nodeType = computed(() => {
  const node = store.selectedNode;
  if (!node) return "";
  return node.id.split("_")[0] || "";
});

const inputDefinitions = computed(() => {
  return store.selectedNode?.data?.inputs ?? [];
});

const additionalConfigKeys = computed(() => {
  const config = localConfig.value || {};
  const inputIds = new Set(inputDefinitions.value.map((input) => input.id));
  return Object.keys(config).filter((key) => !inputIds.has(key));
});

const ifConfigProxy = computed<IfConfig>({
  get() {
    const conditions = Array.isArray(localConfig.value.conditions)
      ? localConfig.value.conditions
      : [];
    return { conditions };
  },
  set(value) {
    localConfig.value = {
      ...localConfig.value,
      conditions: value.conditions,
    };
    updateConfig();
  },
});

// 监听选中节点变化，更新本地配置
watch(
  () => store.selectedNode,
  (node) => {
    if (node && node.data && node.data.config) {
      localConfig.value = { ...node.data.config };

      if (nodeType.value === "for") {
        prepareForConfig();
      }

      if (nodeType.value === "if") {
        prepareIfConfig();
      }
    }
  },
  { immediate: true, deep: true }
);

/**
 * For 配置初始化
 */
function prepareForConfig() {
  if (!localConfig.value.mode) {
    localConfig.value.mode = "input";
  }

  if (!localConfig.value.range) {
    localConfig.value.range = { start: 0, end: 5, step: 1 };
  }

  if (!localConfig.value.itemName) {
    localConfig.value.itemName = "item";
  }

  if (!localConfig.value.indexName) {
    localConfig.value.indexName = "index";
  }

  try {
    staticItemsText.value = JSON.stringify(
      localConfig.value.staticItems ?? [],
      null,
      2
    );
  } catch {
    staticItemsText.value = "[]";
  }
}

/**
 * If 配置初始化
 */
function prepareIfConfig() {
  if (!Array.isArray(localConfig.value.conditions)) {
    // 默认创建1个条件
    localConfig.value.conditions = [
      {
        logic: "and",
        subConditions: [
          {
            field: "",
            dataType: "string",
            operator: "is equal to",
            value: "",
          },
        ],
      },
    ];
  } else if (localConfig.value.conditions.length < 1) {
    // 如果没有条件，至少创建1个
    localConfig.value.conditions = [
      {
        logic: "and",
        subConditions: [
          {
            field: "",
            dataType: "string",
            operator: "is equal to",
            value: "",
          },
        ],
      },
    ];
  }

  // 注意：不在这里调用 syncIfNodePorts，避免触发 watch 无限循环
  // syncIfNodePorts 会在 IfNode.vue 的 onMounted 和 updateConfig 时自动调用
}

/**
 * 更新配置
 */
function updateConfig() {
  const node = store.selectedNode;
  if (node) {
    store.updateNodeData(node.id, {
      config: { ...localConfig.value },
    });
    if (nodeType.value === "if") {
      store.syncIfNodePorts(node.id);
    }
  }
}

/**
 * For 模式切换
 */
function handleForModeChange() {
  if (localConfig.value.mode === "range" && !localConfig.value.range) {
    localConfig.value.range = { start: 0, end: 5, step: 1 };
  }
  updateConfig();
}

/**
 * 更新静态数组
 */
function updateStaticItems() {
  try {
    localConfig.value.staticItems = JSON.parse(staticItemsText.value || "[]");
    updateConfig();
  } catch (error) {
    console.error("静态数组格式错误:", error);
  }
}
function setConfigValue(key: string, value: string, fallbackType?: string) {
  const type = getInputType(key) ?? fallbackType;
  localConfig.value[key] = coerceValueByType(value, type);
  updateConfig();
}

function getConfigValue(key: string) {
  return localConfig.value?.[key];
}

function setRangeValue(field: "start" | "end" | "step", value: string) {
  if (!localConfig.value.range) {
    localConfig.value.range = { start: 0, end: 0, step: 1 };
  }
  localConfig.value.range[field] = coerceValueByType(value, "number");
  updateConfig();
}

function getInputType(key: string): string | undefined {
  const node = store.selectedNode;
  return node?.data?.inputs.find((item) => item.id === key)?.type;
}

function coerceValueByType(value: string, type?: string): any {
  if (!type) {
    return value;
  }

  if (value.includes("{{")) {
    return value;
  }

  const trimmed = value.trim();

  switch (type) {
    case "number": {
      if (!trimmed) return undefined;
      const parsed = Number(trimmed);
      return Number.isNaN(parsed) ? value : parsed;
    }
    case "boolean": {
      if (!trimmed) return undefined;
      if (["true", "1"].includes(trimmed.toLowerCase())) return true;
      if (["false", "0"].includes(trimmed.toLowerCase())) return false;
      return value;
    }
    case "object":
    case "array": {
      if (!trimmed) return type === "array" ? [] : {};
      try {
        const parsed = JSON.parse(trimmed);
        return parsed;
      } catch {
        return value;
      }
    }
    default:
      return value;
  }
}

function toDisplayValue(val: unknown): string {
  if (val === undefined || val === null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

function shouldUseMultiline(type?: string, value?: unknown): boolean {
  if (type === "object" || type === "array") return true;
  if (typeof value === "string") {
    return value.includes("\n") || value.length > 60;
  }
  return false;
}
</script>

<style scoped>
/* Linear App 风格 - 使用 Tailwind CSS */
</style>
