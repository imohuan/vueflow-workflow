<template>
  <div class="mb-6 space-y-4">
    <div class="absolute right-0 top-0 pr-4 h-[34px] flex items-center">
      <ToggleButtonGroup v-model="activeTab" :options="tabOptions" size="sm" />
    </div>

    <!-- Tab 内容 -->
    <!-- 基础配置 Tab -->
    <div v-if="activeTab === 'config'" class="space-y-4">
      <!-- Base URL -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-slate-700">Base URL</label>
        <VariableTextInput
          v-model="config.baseUrl"
          placeholder="https://api.openai.com/v1"
          :show-border="isDraggingVariable"
          preview-mode="bottom"
          @update:model-value="
            (val) => {
              config.baseUrl = val;
              handleConfigUpdate();
            }
          "
        />
      </div>

      <!-- API Key -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-slate-700">API Key</label>
        <VariableTextInput
          v-model="config.apiKey"
          placeholder="输入 API Key"
          :show-border="isDraggingVariable"
          :multiline="true"
          preview-mode="bottom"
          @update:model-value="
            (val) => {
              config.apiKey = val;
              handleConfigUpdate();
            }
          "
        />
      </div>

      <!-- 模型选择 -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-slate-700">模型</label>
        <InputItem
          v-model="config.model"
          placeholder="输入或选择模型名称，如 gpt-3.5-turbo"
          :is-dragging-variable="isDraggingVariable"
          @update:model-value="handleModelChange"
        >
          <n-select
            v-model:value="config.model"
            :options="modelOptionsWithType"
            placeholder="输入或选择模型名称，如 gpt-3.5-turbo"
            filterable
            clearable
            :loading="loadingModels"
            :disabled="!config.baseUrl || !config.apiKey"
            :render-label="renderModelLabel"
            :render-option="renderModelOption"
            class="model-select"
            @update:value="handleModelChange"
            @focus="handleModelSelectFocus"
          >
            <template #empty>
              <div class="px-3 py-2 text-sm text-slate-400 text-center">
                {{ modelError || "暂无模型" }}
              </div>
            </template>
          </n-select>
        </InputItem>
        <p class="text-xs text-slate-400">
          输入模型名称搜索，或从下拉列表选择（需要先配置 Base URL 和 API Key）
        </p>
      </div>

      <!-- 大模型配置项 -->
      <div class="space-y-4 border-t border-slate-200 pt-4">
        <h4 class="text-sm font-semibold text-slate-700">模型配置</h4>

        <!-- Temperature -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-slate-700"
              >Temperature</label
            >
            <span class="text-xs text-slate-400">{{ config.temperature }}</span>
          </div>
          <n-slider
            v-model:value="config.temperature"
            :min="0"
            :max="2"
            :step="0.1"
            @update:value="handleConfigUpdate"
          />
          <p class="text-xs text-slate-400">控制输出的随机性（0-2）</p>
        </div>

        <!-- Max Tokens -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-slate-700">Max Tokens</label>
          <InputItem
            v-model="config.maxTokens"
            :is-dragging-variable="isDraggingVariable"
            @update:model-value="
                  (val) => {
                    config.maxTokens = val as any;
                    handleConfigUpdate();
                  }
                "
          >
            <n-input-number
              :value="parseInt(config.maxTokens as any)"
              :min="1"
              :max="32000"
              class="w-full"
              @update:value="
                (val) => {
                  config.maxTokens = val ?? 2048;
                  handleConfigUpdate();
                }
              "
            />
          </InputItem>
          <p class="text-xs text-slate-400">最大生成的 token 数</p>
        </div>

        <!-- Top P -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-slate-700">Top P</label>
            <span class="text-xs text-slate-400">{{ config.topP }}</span>
          </div>
          <n-slider
            v-model:value="config.topP"
            :min="0"
            :max="1"
            :step="0.01"
            @update:value="handleConfigUpdate"
          />
          <p class="text-xs text-slate-400">核采样参数（0-1）</p>
        </div>

        <!-- Frequency Penalty -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-slate-700"
              >Frequency Penalty</label
            >
            <span class="text-xs text-slate-400">{{
              config.frequencyPenalty
            }}</span>
          </div>
          <n-slider
            v-model:value="config.frequencyPenalty"
            :min="-2"
            :max="2"
            :step="0.1"
            @update:value="handleConfigUpdate"
          />
          <p class="text-xs text-slate-400">频率惩罚（-2 到 2）</p>
        </div>

        <!-- Presence Penalty -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-slate-700"
              >Presence Penalty</label
            >
            <span class="text-xs text-slate-400">{{
              config.presencePenalty
            }}</span>
          </div>
          <n-slider
            v-model:value="config.presencePenalty"
            :min="-2"
            :max="2"
            :step="0.1"
            @update:value="handleConfigUpdate"
          />
          <p class="text-xs text-slate-400">存在惩罚（-2 到 2）</p>
        </div>
      </div>

      <!-- 测试按钮 -->
      <div class="border-t border-slate-200 pt-4">
        <n-button
          type="primary"
          block
          :loading="testing"
          :disabled="!config.baseUrl || !config.apiKey || !config.model"
          @click="testModel"
        >
          <template #icon>
            <IconPlay class="h-4 w-4" />
          </template>
          {{ testing ? "测试中..." : "测试模型" }}
        </n-button>
        <p
          v-if="testResult"
          class="mt-2 text-xs"
          :class="testResult.success ? 'text-green-600' : 'text-red-600'"
        >
          {{ testResult.message }}
        </p>
      </div>
    </div>

    <!-- 提示词 Tab -->
    <div v-else-if="activeTab === 'prompts'" class="space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-semibold text-slate-700">消息列表</h4>
        <n-button size="small" type="primary" ghost @click="addMessage">
          <template #icon>
            <IconPlus class="h-3.5 w-3.5" />
          </template>
          添加
        </n-button>
      </div>
      <div
        v-if="messages.length === 0"
        class="text-sm text-slate-400 text-center py-4"
      >
        暂无消息，点击"添加"创建
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="rounded-md border border-slate-200 bg-white p-3 space-y-2"
        >
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold text-gray-300">[{{ index }}]</span>
            <!-- Role 下拉框 -->
            <n-select
              v-model:value="msg.role"
              :options="[
                { label: '系统', value: 'system' },
                { label: '用户', value: 'user' },
                { label: '助手', value: 'assistant' },
              ]"
              size="small"
              class="w-20"
              @update:value="handleMessagesUpdate"
            />
            <!-- Type 下拉框 -->
            <div class="w-32">
              <n-select
                v-model:value="msg.type"
                :options="[
                  { label: '文本', value: 'text' },
                  { label: '图片', value: 'image' },
                ]"
                size="small"
                @update:value="handleMessagesUpdate"
              />
            </div>
            <!-- 删除按钮 -->
            <n-button
              text
              size="small"
              class="ml-auto"
              @click="removeMessage(index)"
            >
              <template #icon>
                <IconDelete class="h-4 w-4" />
              </template>
            </n-button>
          </div>
          <VariableTextInput
            v-model="msg.message"
            :placeholder="
              msg.type === 'text' ? '输入提示词内容' : '输入图片 URL'
            "
            :preview-mode="'dropdown'"
            :show-tip="false"
            :show-border="isDraggingVariable"
            multiline
            @update:model-value="handleMessagesUpdate"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, h } from "vue";
import { NButton, NInputNumber, NSlider, NSelect, useMessage } from "naive-ui";
import type { SelectOption } from "naive-ui";
import type { Node } from "@vue-flow/core";
import type { NodeConfigData } from "../types";
import VariableTextInput from "@/v2/components/variables-inputs/VariableTextInput.vue";
import InputItem from "../components/InputItem.vue";
import ToggleButtonGroup from "@/v2/components/ui/ToggleButtonGroup.vue";
import IconPlus from "@/icons/IconPlus.vue";
import IconDelete from "@/icons/IconDelete.vue";
import IconPlay from "@/icons/IconPlay.vue";
import { useVariableDrag } from "../composables/useVariableDrag";

interface Message {
  role: "system" | "user" | "assistant";
  type: "text" | "image";
  message: string;
}

interface Model {
  id: string;
  owned_by?: string;
}

interface Config {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

interface Props {
  selectedNode: Node;
  nodeConfig: NodeConfigData;
}

interface Emits {
  (e: "update:params", params: Record<string, any>): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const message = useMessage();

// 使用变量拖拽 hooks
const { isDraggingVariable } = useVariableDrag();

const activeTab = ref<"config" | "prompts">("config");

// Tab 选项配置
const tabOptions = [
  { value: "config", label: "基础配置" },
  { value: "prompts", label: "提示词" },
];

const loadingModels = ref(false);
const models = ref<Model[]>([]);
const modelError = ref<string>("");
const testing = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

// 初始化配置
const config = ref<Config>({
  baseUrl: "",
  apiKey: "",
  model: "",
  temperature: 1,
  maxTokens: 2048,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
});

// 消息列表（统一管理）
const messages = ref<Message[]>([]);

// 从节点配置中初始化数据
function initializeData() {
  const params = props.nodeConfig.params || {};

  // 初始化配置
  config.value = {
    baseUrl: params.baseUrl || "https://api.openai.com/v1",
    apiKey: params.apiKey || "",
    model: params.model || "gpt-3.5-turbo",
    temperature: params.temperature ?? 1,
    maxTokens: params.maxTokens ?? 2048,
    topP: params.topP ?? 1,
    frequencyPenalty: params.frequencyPenalty ?? 0,
    presencePenalty: params.presencePenalty ?? 0,
  };

  // 初始化消息列表（兼容旧数据格式）
  const allMessages: Message[] = [];

  // 兼容旧的 systemMessages 格式
  if (
    Array.isArray(params.systemMessages) &&
    params.systemMessages.length > 0
  ) {
    params.systemMessages.forEach((msg: any) => {
      allMessages.push({
        role: "system" as const,
        type: msg.type || "text",
        message: msg.message || "",
      });
    });
  }

  // 兼容旧的 userMessages 格式
  if (Array.isArray(params.userMessages) && params.userMessages.length > 0) {
    params.userMessages.forEach((msg: any) => {
      allMessages.push({
        role: "user" as const,
        type: msg.type || "text",
        message: msg.message || "",
      });
    });
  }

  // 如果存在新的 messages 格式，优先使用
  if (Array.isArray(params.messages) && params.messages.length > 0) {
    messages.value = params.messages.map((msg: any) => ({
      role: msg.role || "user",
      type: msg.type || "text",
      message: msg.message || "",
    }));
  } else if (allMessages.length > 0) {
    messages.value = allMessages;
  } else {
    messages.value = [];
  }
}

// 监听节点配置变化
watch(
  () => props.nodeConfig,
  () => {
    initializeData();
  },
  { deep: true, immediate: true }
);

// 带类型信息的模型选项列表
const modelOptionsWithType = computed(() => {
  return models.value.map((model) => {
    const ownedBy = model.owned_by;
    return {
      label: ownedBy ? `${model.id} | ${ownedBy}` : model.id,
      value: model.id,
      ownedBy,
    };
  });
});

// 渲染模型标签（选中后显示的内容）
function renderModelLabel(option: SelectOption, selected: boolean) {
  // 如果已选中，只显示名称，使用 font-mono
  if (selected) {
    // 从 label 中提取模型名称（去掉类型信息）
    const label = option.label as string;
    const modelName = label.split(" | ")[0];
    return h("span", { class: "font-mono" }, modelName);
  }
  // 未选中时也返回简单标签（下拉列表中的显示由 render-option 处理）
  const label = option.label as string;
  const modelName = label.split(" | ")[0];
  return h("span", { class: "font-mono" }, modelName);
}

// 渲染模型选项（下拉列表中的显示）
function renderModelOption({
  node,
  option,
}: {
  node: any;
  option: SelectOption;
  selected: boolean;
}) {
  const label = option.label as string;
  const parts = label.split(" | ");
  const ownedBy = parts[1];

  // 直接使用 node 节点，只修改其内容和必要的属性，不复制样式
  return h("div", { class: "relative font-mono" }, [
    node,
    h(
      "span",
      {
        class:
          "text-xs text-slate-400 absolute right-10 top-0 bottom-0 flex items-center",
      },
      ownedBy
    ),
  ]);
}

// 补全 URL，如果没有 /v1 则补全
function normalizeBaseUrl(url: string): string {
  let normalized = url.replace(/\/$/, "");
  if (!normalized.endsWith("/v1")) {
    normalized = `${normalized}/v1`;
  }
  return normalized;
}

// 处理模型选择框获得焦点
function handleModelSelectFocus() {
  if (
    config.value.baseUrl &&
    config.value.apiKey &&
    models.value.length === 0 &&
    !loadingModels.value
  ) {
    loadModels();
  }
}

// 加载模型列表
async function loadModels() {
  if (!config.value.baseUrl || !config.value.apiKey) {
    modelError.value = "请先输入 Base URL 和 API Key";
    return;
  }

  loadingModels.value = true;
  modelError.value = "";

  try {
    const baseUrl = normalizeBaseUrl(config.value.baseUrl);
    const response = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.value.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `加载模型列表失败: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      modelError.value = errorMessage;
      models.value = [];
      return;
    }

    const data = await response.json();
    if (Array.isArray(data.data)) {
      models.value = data.data;
    } else {
      models.value = [];
      modelError.value = "模型列表格式错误";
    }
  } catch (error) {
    modelError.value = (error as Error).message || "加载模型列表失败";
    models.value = [];
  } finally {
    loadingModels.value = false;
  }
}

// 处理模型变更
function handleModelChange(value: string | null) {
  config.value.model = value || "";
  handleConfigUpdate();
}

// 处理配置更新
function handleConfigUpdate() {
  emitUpdate();
}

// 添加消息
function addMessage() {
  messages.value.push({
    role: "user",
    type: "text",
    message: "",
  });
  handleMessagesUpdate();
}

// 删除消息
function removeMessage(index: number) {
  messages.value.splice(index, 1);
  handleMessagesUpdate();
}

// 处理消息更新
function handleMessagesUpdate() {
  emitUpdate();
}

// 测试模型
async function testModel() {
  if (!config.value.baseUrl || !config.value.apiKey || !config.value.model) {
    message.warning("请先填写 Base URL、API Key 和模型名称");
    return;
  }

  testing.value = true;
  testResult.value = null;

  try {
    const baseUrl = normalizeBaseUrl(config.value.baseUrl);
    const requestBody = {
      model: config.value.model,
      messages: [
        {
          role: "user",
          content: "Hello",
        },
      ],
      max_tokens: 10,
    };

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.value.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `测试失败: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      testResult.value = {
        success: false,
        message: errorMessage,
      };
      return;
    }

    await response.json();
    testResult.value = {
      success: true,
      message: `测试成功！模型 ${config.value.model} 可用`,
    };
    message.success("模型测试成功");
  } catch (error) {
    testResult.value = {
      success: false,
      message: (error as Error).message || "测试失败",
    };
    message.error("模型测试失败");
  } finally {
    testing.value = false;
  }
}

// 发送更新事件
function emitUpdate() {
  // 为了兼容旧版本，同时发送 messages 和分离的 systemMessages/userMessages
  const systemMessages = messages.value.filter((msg) => msg.role === "system");
  const userMessages = messages.value.filter((msg) => msg.role === "user");

  emit("update:params", {
    baseUrl: config.value.baseUrl,
    apiKey: config.value.apiKey,
    model: config.value.model,
    temperature: config.value.temperature,
    maxTokens: config.value.maxTokens,
    topP: config.value.topP,
    frequencyPenalty: config.value.frequencyPenalty,
    presencePenalty: config.value.presencePenalty,
    messages: messages.value,
    systemMessages: systemMessages,
    userMessages: userMessages,
  });
}
</script>
