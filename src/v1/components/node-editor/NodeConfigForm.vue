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

        <!-- 变量模式 -->
        <template v-if="localConfig.mode === 'variable'">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-slate-600">
              循环变量
              <span class="text-[11px] text-slate-400 font-normal ml-1">
                (选填)
              </span>
            </label>
            <VariableTextInput
              :model-value="localConfig.variable || ''"
              placeholder="拖拽变量或输入变量引用，如 {{ 节点.result.list }}"
              @update:modelValue="(val: string) => setVariableValue(val)"
            />
            <p class="text-xs text-slate-400 leading-relaxed">
              支持拖拽变量到输入框，或手动输入变量引用。如不填写，则使用输入端口连接的数据。
            </p>
          </div>
        </template>

        <!-- 范围模式 -->
        <template v-else-if="localConfig.mode === 'range'">
          <div class="grid grid-cols-3 gap-3">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-slate-600">起始值</label>
              <VariableTextInput
                :model-value="toDisplayValue(localConfig.range?.start)"
                placeholder="0"
                @update:modelValue="(val: string) => setRangeValue('start', val)"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-slate-600">结束值</label>
              <VariableTextInput
                :model-value="toDisplayValue(localConfig.range?.end)"
                placeholder="10"
                @update:modelValue="(val: string) => setRangeValue('end', val)"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-slate-600">步长</label>
              <VariableTextInput
                :model-value="toDisplayValue(localConfig.range?.step)"
                placeholder="1"
                @update:modelValue="(val: string) => setRangeValue('step', val)"
              />
            </div>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            支持数字或变量引用 步长不能为 0。范围按
            <code
              class="bg-slate-100 text-purple-500 px-1.5 py-0.5 rounded font-mono text-xs"
              >[start, end)</code
            >
            规则生成。解析失败时返回 0。
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
        <section class="space-y-2">
          <header class="flex items-center justify-between">
            <div>
              <div
                class="text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                数据映射
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">
                将变量映射到
                <span class="font-mono text-emerald-600">params</span> 对象
              </p>
            </div>
            <button
              type="button"
              class="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 transition hover:border-purple-400 hover:text-purple-600"
              @click="addCodeDataItem"
            >
              <IconPlus class="h-3 w-3" />
              <span>新增参数</span>
            </button>
          </header>

          <div
            v-if="codeDataItems.length === 0"
            class="rounded-md border border-dashed border-slate-300 bg-slate-50/60 px-3 py-3 text-[11px] text-slate-400"
          >
            尚未配置参数，点击“新增参数”即可开始映射变量。
          </div>

          <div
            v-for="(item, index) in codeDataItems"
            :key="index"
            class="rounded-md border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div class="flex items-center gap-5">
              <!-- 左侧：键名 -->
              <div class="w-40 space-y-1.5">
                <label
                  class="flex items-center justify-between text-[11px] font-medium text-slate-600"
                >
                  <span>键名</span>
                  <span class="font-mono text-[10px] text-slate-400"
                    >[A-Za-z][A-Za-z0-9_]*</span
                  >
                </label>
                <input
                  v-model="item.key"
                  class="w-full rounded border border-slate-200 px-2 py-1 text-[11px] focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="例如 userInfo"
                  @input="handleCodeDataInput"
                />
                <p
                  v-if="codeKeyErrorMap[index]"
                  class="text-[11px] text-red-500"
                >
                  {{ codeKeyErrorMap[index] }}
                </p>
              </div>

              <!-- 右侧：值/变量 -->
              <div class="flex-1 space-y-1.5">
                <label class="text-[11px] font-medium text-slate-600"
                  >值 / 变量</label
                >
                <VariableTextInput
                  :model-value="item.value ?? ''"
                  density="compact"
                  preview-mode="dropdown"
                  placeholder="拖入变量或直接输入"
                  @update:modelValue="(val: string) => handleCodeValueUpdate(index, val)"
                />
              </div>

              <!-- 删除按钮 -->
              <button
                type="button"
                class="mt-5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                title="删除参数"
                @click="removeCodeDataItem(index)"
              >
                <IconTrash class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        <section class="space-y-2">
          <header class="flex items-center justify-between gap-4">
            <div class="flex-1">
              <div
                class="text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                代码预览
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">
                点击打开编辑器进行编辑
              </p>
            </div>
            <!-- 切换按钮：代码 / 类型声明 -->
            <button
              v-if="localConfig.typeDeclarations"
              type="button"
              class="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition"
              :class="
                isTypeEditorMode
                  ? 'border-purple-400 bg-purple-50 text-purple-600'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:text-purple-600'
              "
              @click="toggleTypeEditorMode()"
            >
              <IconCode v-if="isTypeEditorMode" class="w-3.5 h-3.5" />
              <IconType v-else class="w-3.5 h-3.5" />
              <span>{{ isTypeEditorMode ? "查看代码" : "查看类型" }}</span>
            </button>
          </header>
          <div
            class="relative w-full overflow-hidden rounded-md border border-slate-200 transition-all duration-200 bg-white group"
            :class="
              isTypeEditorMode
                ? 'cursor-default'
                : 'cursor-pointer hover:border-purple-400 hover:shadow-sm'
            "
            style="height: 16rem"
            @click="handleEditorClick"
          >
            <!-- 只读编辑器 -->
            <CodeEditor
              ref="codeEditorRef"
              :model-value="
                isTypeEditorMode
                  ? localConfig.typeDeclarations || ''
                  : localConfig.code || CODE_DEFAULT_SOURCE
              "
              :language="isTypeEditorMode ? 'typescript' : 'javascript'"
              theme="vs"
              :readonly="true"
              :options="{ minimap: { enabled: false } }"
            />
            <!-- 遮罩提示 -->
            <div
              v-if="!isTypeEditorMode"
              class="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none"
            >
              <div
                class="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-slate-200"
              >
                <p class="text-sm text-slate-700 font-medium">
                  点击打开代码编辑器
                </p>
              </div>
            </div>
          </div>
        </section>

        <div
          class="text-[11px] text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-md p-2.5 leading-relaxed"
        >
          <div class="font-semibold text-slate-600">运行时说明</div>
          <div>• main(params) 将接收到上方映射构建的对象</div>
          <div>• 支持返回同步值或 Promise，结果将作为节点输出</div>
          <div>• 可直接使用 JSON、Math、Date、console 等内置对象</div>
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
              (val: string) => setConfigValue(input.id, val, input.type)
            "
          />

          <p
            v-if="input.description"
            class="text-xs text-slate-400 leading-relaxed"
          >
            {{ input.description }}
          </p>
        </div>

        <div
          v-if="inputDefinitions.length === 0"
          class="p-5 text-center text-slate-400 text-sm italic bg-slate-50 border-2 border-dashed border-slate-200 rounded-md"
        >
          暂无配置项
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick, toRaw } from "vue";
import { useNodeEditorStore } from "../../stores/nodeEditor";
import InputText from "../common/InputText.vue";
import Select from "../common/Select.vue";
import VariableTextInput from "./VariableTextInput.vue";
import ConditionEditor from "./ConditionEditor.vue";
import CodeEditor from "../common/CodeEditor.vue";
import type { IfConfig } from "../../workflow/nodes";
import { useDebounceFn } from "@vueuse/core";
import IconPlus from "@/icons/IconPlus.vue";
import IconTrash from "@/icons/IconTrash.vue";
import IconCode from "@/icons/IconCode.vue";
import IconType from "@/icons/IconType.vue";
import { generateParamsInterface } from "../../utils/typeInference";
import {
  buildVariableContext,
  resolveConfigWithVariables,
} from "../../workflow/variables/variableResolver";

const CODE_DEBUG_ENABLED = false;

function codeDebug(...payload: unknown[]) {
  if (!CODE_DEBUG_ENABLED) return;
  const timestamp = new Date().toISOString();
  console.log("[CodeNodeConfig]", timestamp, ...payload);
}

function cloneForLog<T>(value: T): T {
  try {
    const raw = toRaw(value) as T;
    return JSON.parse(JSON.stringify(raw)) as T;
  } catch (error) {
    codeDebug("cloneForLog serialization failed", error);
    return value;
  }
}

function isConfigEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(toRaw(a)) === JSON.stringify(toRaw(b));
  } catch (error) {
    codeDebug("isConfigEqual failed", error);
    return false;
  }
}

const store = useNodeEditorStore();
// 本地配置副本
const localConfig = ref<Record<string, any>>({});
const staticItemsText = ref("[]");

interface CodeNodeDataItem {
  key: string;
  value: string;
}

const CODE_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
const CODE_DEFAULT_SOURCE = `export async function main(params) {
  return {
    receivedKeys: Object.keys(params),
    example: params,
  };
}`;

const codeEditorRef = ref<InstanceType<typeof CodeEditor>>();
const isTypeEditorMode = ref(false);
const toggleTypeEditorMode = () => {
  isTypeEditorMode.value = !isTypeEditorMode.value;
};
let skipNextStoreSync = false;

const codeDataItems = computed<CodeNodeDataItem[]>(() => {
  if (!Array.isArray(localConfig.value.dataItems)) {
    localConfig.value.dataItems = [];
  }
  return localConfig.value.dataItems as CodeNodeDataItem[];
});

const codeKeyErrorMap = computed<Record<number, string>>(() => {
  const errors: Record<number, string> = {};
  const seen = new Map<string, number>();

  codeDataItems.value.forEach((item, index) => {
    const key = item.key.trim();
    if (!key) {
      errors[index] = "键名不能为空";
      return;
    }
    if (!CODE_KEY_PATTERN.test(key)) {
      errors[index] = "仅支持以字母开头的字母、数字、下划线";
      return;
    }
    if (seen.has(key)) {
      const first = seen.get(key)!;
      errors[index] = `与第 ${first + 1} 行重复`;
    } else {
      seen.set(key, index);
    }
  });

  return errors;
});

const updateDataItemsDebounced = useDebounceFn(() => {
  codeDebug(
    "debounced:updateDataItems",
    cloneForLog(localConfig.value.dataItems ?? [])
  );

  // 自动生成 MainParams 类型声明
  autoGenerateTypeDeclaration();

  updateConfig();
}, 200);

const forModeOptions = [
  { label: "变量循环", value: "variable" },
  { label: "范围循环", value: "range" },
];

// 计算节点类型
const nodeType = computed(() => {
  const node = store.selectedNode;
  if (!node) return "";
  return node.id.split("_")[0] || "";
});

const inputDefinitions = computed(() => {
  const inputs = store.selectedNode?.data?.inputs ?? [];
  // 过滤掉默认的数据流端口，只保留配置项
  return inputs.filter(
    (input: any) => input.id !== "__input__" && input.id !== "__output__"
  );
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
    codeDebug("watch:selectedNode", {
      nodeId: node?.id,
      nodeType: nodeType.value,
    });
    if (skipNextStoreSync) {
      codeDebug("watch:selectedNode skipped due to skipNextStoreSync");
      return;
    }
    if (node && node.data && node.data.config) {
      const newConfig = node.data.config;
      if (isConfigEqual(newConfig, localConfig.value)) {
        codeDebug("watch:selectedNode no changes");
        return;
      }
      localConfig.value = { ...newConfig };
      codeDebug("watch:selectedNode applied config", localConfig.value);

      if (nodeType.value === "for") {
        prepareForConfig();
      }

      if (nodeType.value === "if") {
        prepareIfConfig();
      }

      if (nodeType.value === "code") {
        prepareCodeConfig();
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

function prepareCodeConfig() {
  let changed = false;

  const rawCode = localConfig.value.code;
  if (typeof rawCode !== "string" || !rawCode.trim()) {
    localConfig.value.code = CODE_DEFAULT_SOURCE;
    changed = true;
  }

  if (!Array.isArray(localConfig.value.dataItems)) {
    localConfig.value.dataItems = [];
    changed = true;
  }

  if (typeof localConfig.value.typeDeclarations !== "string") {
    localConfig.value.typeDeclarations = "";
    changed = true;
  }

  if (changed) {
    updateConfig();
  }
}

/**
 * 更新配置
 */
function updateConfig() {
  const node = store.selectedNode;
  codeDebug("updateConfig invoked", {
    nodeId: node?.id,
    nodeType: nodeType.value,
    config: cloneForLog(localConfig.value),
  });
  if (node) {
    skipNextStoreSync = true;
    store.updateNodeData(node.id, {
      config: { ...localConfig.value },
    });
    if (nodeType.value === "if") {
      store.syncIfNodePorts(node.id);
    }
    nextTick(() => {
      skipNextStoreSync = false;
    });
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

function setConfigValue(key: string, value: string, fallbackType?: string) {
  const type = getInputType(key) ?? fallbackType;
  localConfig.value[key] = coerceValueByType(value, type);
  updateConfig();
}

function getConfigValue(key: string) {
  return localConfig.value?.[key];
}

function setVariableValue(value: string) {
  localConfig.value.variable = value;
  updateConfig();
}

function setRangeValue(field: "start" | "end" | "step", value: string) {
  if (!localConfig.value.range) {
    localConfig.value.range = { start: 0, end: 0, step: 1 };
  }
  // 对于 start 和 end，支持变量引用（字符串形式）
  if (field === "start" || field === "end") {
    // 如果是变量引用格式，保持字符串；否则转换为数字
    if (/^\{\{.+\}\}$/.test(value.trim())) {
      localConfig.value.range[field] = value;
    } else {
      localConfig.value.range[field] = coerceValueByType(value, "number");
    }
  } else {
    // step 只支持数字
    localConfig.value.range[field] = coerceValueByType(value, "number");
  }
  updateConfig();
}

function getInputType(key: string): string | undefined {
  const node = store.selectedNode;
  return node?.data?.inputs.find((item: any) => item.id === key)?.type;
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

function openCodeEditorPanel() {
  if (!store.selectedNode) return;
  store.openCodeEditorPanel(store.selectedNode.id);
}

function handleEditorClick() {
  // 如果在类型预览模式下，不打开编辑器
  if (isTypeEditorMode.value) {
    return;
  }
  openCodeEditorPanel();
}

function addCodeDataItem() {
  if (!Array.isArray(localConfig.value.dataItems)) {
    localConfig.value.dataItems = [];
  }
  codeDebug(
    "action:addCodeDataItem(before)",
    cloneForLog(localConfig.value.dataItems)
  );
  (localConfig.value.dataItems as CodeNodeDataItem[]).push({
    key: "",
    value: "",
  });
  codeDebug(
    "action:addCodeDataItem(after)",
    cloneForLog(localConfig.value.dataItems)
  );
  updateDataItemsDebounced();
}

function removeCodeDataItem(index: number) {
  if (!Array.isArray(localConfig.value.dataItems)) {
    return;
  }
  codeDebug("action:removeCodeDataItem(before)", {
    index,
    items: cloneForLog(localConfig.value.dataItems),
  });
  (localConfig.value.dataItems as CodeNodeDataItem[]).splice(index, 1);
  codeDebug(
    "action:removeCodeDataItem(after)",
    cloneForLog(localConfig.value.dataItems)
  );
  updateDataItemsDebounced();
}

function handleCodeDataInput() {
  codeDebug(
    "event:handleCodeDataInput",
    cloneForLog(localConfig.value.dataItems)
  );
  updateDataItemsDebounced();
}

function handleCodeValueUpdate(index: number, value: string) {
  if (!Array.isArray(localConfig.value.dataItems)) {
    localConfig.value.dataItems = [];
  }
  const items = localConfig.value.dataItems as CodeNodeDataItem[];
  if (!items[index]) {
    items[index] = { key: "", value: "" };
  }
  codeDebug("event:handleCodeValueUpdate(before)", {
    index,
    value,
    items: cloneForLog(items),
  });
  items[index]!.value = value;
  codeDebug("event:handleCodeValueUpdate(after)", cloneForLog(items));
  updateDataItemsDebounced();
}

/**
 * 自动生成类型声明
 * 根据 dataItems 和解析后的变量值生成类型
 */
function autoGenerateTypeDeclaration() {
  if (!Array.isArray(localConfig.value.dataItems)) {
    localConfig.value.typeDeclarations = "";
    return;
  }

  const dataItems = localConfig.value.dataItems as CodeNodeDataItem[];

  if (dataItems.length === 0) {
    localConfig.value.typeDeclarations = `interface MainParams {
  [key: string]: any;
}`;
    return;
  }

  // 解析所有变量值
  const resolvedValues: Record<string, unknown> = {};

  try {
    if (!store.selectedNodeId) {
      codeDebug("autoGenerateTypeDeclaration: no selectedNodeId");
      // 没有选中节点，无法解析变量，使用 any 类型
      const mainParamsInterface = generateParamsInterface(
        dataItems,
        {},
        "MainParams"
      );
      localConfig.value.typeDeclarations = mainParamsInterface;
      return;
    }

    // 构建变量上下文
    const { map: contextMap } = buildVariableContext(
      store.selectedNodeId,
      store.nodes,
      store.edges
    );

    // 构建配置对象用于解析
    const configToResolve: Record<string, string> = {};
    dataItems.forEach((item) => {
      if (item.key?.trim()) {
        configToResolve[item.key.trim()] = item.value || "";
      }
    });

    // 解析所有变量
    const resolved = resolveConfigWithVariables(
      configToResolve,
      [],
      contextMap
    );

    // 提取解析后的值
    Object.keys(configToResolve).forEach((key) => {
      resolvedValues[key] = resolved[key];
    });

    codeDebug("autoGenerateTypeDeclaration: resolved values", resolvedValues);
  } catch (error) {
    codeDebug(
      "autoGenerateTypeDeclaration: failed to resolve variables",
      error
    );
  }

  // 生成 MainParams 接口声明
  const mainParamsInterface = generateParamsInterface(
    dataItems,
    resolvedValues,
    "MainParams"
  );

  localConfig.value.typeDeclarations = mainParamsInterface;

  codeDebug("autoGenerateTypeDeclaration", {
    dataItems: dataItems.length,
    generated: mainParamsInterface,
  });
}
</script>

<style scoped>
/* Linear App 风格 - 使用 Tailwind CSS */
</style>
