<template>
  <SplitLayout
    center-title="AI Agent"
    :show-back-button="true"
    back-text="Back to canvas"
    :center-width="400"
    :min-left-width="0.2"
    :min-right-width="0.2"
    @back="handleBack"
    @resize="handleResize"
  >
    <!-- 左侧面板 -->
    <template #left>
      <div class="h-full flex flex-col">
        <div class="shrink-0 border-b border-slate-200 px-4 py-3">
          <div class="flex items-center justify-between gap-3">
            <h3
              class="text-sm font-semibold text-slate-900 uppercase tracking-wide"
            >
              输入
            </h3>
            <div class="flex items-center gap-2">
              <!-- 搜索区域（固定高度容器） -->
              <div class="h-7 flex items-center relative">
                <div
                  class="overflow-hidden transition-all duration-200 ease-out"
                  :style="{
                    width: isSearchExpanded ? '8rem' : '1.75rem',
                    opacity: isSearchExpanded ? 1 : 0,
                  }"
                >
                  <n-input
                    v-show="isSearchExpanded"
                    v-model:value="searchQuery"
                    size="small"
                    placeholder="搜索..."
                    class="w-32 n-input-gray"
                    @blur="handleSearchBlur"
                    @keyup.escape="isSearchExpanded = false"
                    ref="searchInputRef"
                  >
                    <template #prefix>
                      <IconSearch class="w-4 h-4 text-slate-400" />
                    </template>
                  </n-input>
                </div>
                <button
                  v-show="!isSearchExpanded"
                  @click="expandSearch"
                  class="absolute left-0 h-7 w-7 flex items-center justify-center text-slate-600 cursor-pointer transition-opacity duration-200"
                >
                  <IconSearch class="w-4 h-4" />
                </button>
              </div>
              <!-- 按钮组 -->
              <ToggleButtonGroup
                v-model="viewMode"
                :options="viewModeOptions"
              />
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-auto variable-scroll px-4 py-4">
          <!-- Schema 视图：JsonTreeViewer -->

          <template v-if="viewMode === 'json'">
            <!-- 下拉框和数据条数 -->
            <div class="shrink-0 flex items-center gap-2 pb-2">
              <div class="w-32">
                <n-select
                  v-model:value="selectedDataType"
                  :options="dataTypeOptions"
                  size="small"
                  placeholder="Code"
                />
              </div>
              <span class="text-xs text-slate-500 font-mono">
                {{ dataItemCount }}
              </span>
            </div>
            <JsonTreeViewer :data="sampleData" />
          </template>

          <!-- JSON 视图：VariableTreeItem -->
          <template v-else-if="viewMode === 'schema' && variableTree">
            <VariableTreeItem :node="variableTree" :level="0" />
          </template>
        </div>
        <div
          class="hidden shrink-0 border-t border-slate-200 px-4 py-2 text-xs text-slate-500"
        >
          <div>Logs</div>
        </div>
      </div>
    </template>

    <!-- 中间面板 -->
    <template #center>
      <div class="h-full flex flex-col">
        <!-- Tabs -->
        <div
          class="shrink-0 flex items-center gap-4 border-b border-slate-200 px-6"
        >
          <button
            class="px-3 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600"
          >
            Parameters
          </button>
          <button
            class="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Settings
          </button>
          <button
            class="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Docs
          </button>
          <div class="flex-1" />
        </div>

        <!-- 内容区域 -->
        <div class="flex-1 overflow-auto variable-scroll px-6 py-6 space-y-6">
          <!-- Tip 框 -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p class="text-sm text-blue-800">
              <strong>Tip:</strong> Information about agents. Check out the{" "}
              <a href="#" class="underline">tutorial</a> and{" "}
              <a href="#" class="underline">example</a>.
            </p>
          </div>

          <!-- Source for Prompt -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Source for Prompt (User Message)
            </label>
            <input
              type="text"
              class="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="[empty]"
            />
          </div>

          <!-- Toggle switches -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-slate-700">
                Require Specific Output Format
              </label>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer" />
                <div
                  class="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
                />
              </label>
            </div>
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-slate-700">
                Enable Fallback Model
              </label>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer" />
                <div
                  class="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
                />
              </label>
            </div>
          </div>

          <!-- Options -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-sm font-medium text-slate-700">Options</h4>
              <button
                class="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Add Option
              </button>
            </div>
            <p class="text-sm text-slate-500">No properties</p>
          </div>
        </div>

        <!-- 底部控件 -->
        <div
          class="shrink-0 border-t border-slate-200 px-6 py-4 flex items-center gap-4"
        >
          <button
            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <span>Chat Model *</span>
          </button>
          <button
            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <span>Memory</span>
          </button>
          <button
            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Tool</span>
          </button>
        </div>
      </div>
    </template>

    <!-- 右侧面板 -->
    <template #right>
      <div class="h-full flex flex-col">
        <div
          class="shrink-0 flex items-center justify-between border-b border-slate-200 px-4 py-3"
        >
          <ToggleButtonGroup
            v-model="rightPanelMode"
            :options="rightPanelOptions"
          />
          <!-- 编辑模式：显示保存和取消按钮 -->
          <div v-if="isEditing" class="flex items-center gap-2">
            <button
              class="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 rounded transition-colors"
              @click="handleCancel"
            >
              取消
            </button>
            <button
              class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              @click="handleSave"
            >
              保存
            </button>
          </div>
          <!-- 查看模式且为 output：显示编辑图标 -->
          <button
            v-else-if="rightPanelMode === 'output'"
            class="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
            @click="handleEdit"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        </div>
        <div class="flex-1 overflow-auto variable-scroll">
          <!-- 编辑模式：显示代码编辑器 -->
          <CodeEditor
            v-if="isEditing"
            v-model="editorContent"
            language="json"
            class="h-full"
            :options="{
              minimap: { enabled: false },
              fontSize: 13,
            }"
          />
          <!-- 查看模式：显示原有内容 -->
          <div v-else class="px-4 py-6">
            <p class="text-sm text-slate-500">
              Execute this node to view data or set mock data
            </p>
          </div>
        </div>
        <div
          class="hidden shrink-0 border-t border-slate-200 px-4 py-3 space-y-2"
        >
          <button
            class="w-full text-left text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            I wish this node would...
          </button>
          <button
            class="w-full text-left text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            Clear execution
          </button>
        </div>
      </div>
    </template>
  </SplitLayout>
</template>

<script setup lang="ts">
import { ref, nextTick, computed, watch } from "vue";
import { NInput, NSelect } from "naive-ui";
import { SplitLayout, ToggleButtonGroup } from "../components/ui";
import IconSearch from "@/icons/IconSearch.vue";
import JsonTreeViewer from "@/v2/components/variables/JsonTreeViewer.vue";
import VariableTreeItem from "@/v2/components/variables/VariableTreeItem.vue";
import { jsonToVariableTree } from "@/v2/components/json/jsonToVariableTree";
import type { VariableTreeNode } from "workflow-node-executor";
import CodeEditor from "@/v2/components/code/CodeEditor.vue";

const leftWidth = ref(320);
const rightWidth = ref(320);
const isSearchExpanded = ref(false);
const searchQuery = ref("");
const searchInputRef = ref<InstanceType<typeof NInput> | null>(null);
const viewMode = ref<"schema" | "json">("schema");
const rightPanelMode = ref<"output" | "logs">("output");
const isEditing = ref(false);
const editorContent = ref("");
const originalEditorContent = ref("");
const selectedDataType = ref<string | null>(null);

const viewModeOptions = [
  { value: "schema", label: "Schema" },
  { value: "json", label: "JSON" },
];

const rightPanelOptions = [
  { value: "output", label: "输出" },
  { value: "logs", label: "日志" },
];

const dataTypeOptions = [
  { label: "Code", value: "code" },
  { label: "JSON", value: "json" },
  { label: "Text", value: "text" },
];

// 计算数据条数
const dataItemCount = computed(() => {
  if (Array.isArray(sampleData)) {
    const count = sampleData.length;
    return count === 1 ? "1 item" : `${count} items`;
  }
  if (typeof sampleData === "object" && sampleData !== null) {
    const count = Object.keys(sampleData).length;
    return count === 1 ? "1 item" : `${count} items`;
  }
  return "0 items";
});

// 示例数据
const sampleData = {
  user: {
    id: 1,
    profile: {
      name: "李四",
      avatar: "https://example.com/avatar.jpg",
      settings: {
        theme: "dark",
        language: "zh-CN",
      },
    },
  },
  metadata: {
    createdAt: "2024-01-01",
    updatedAt: "2024-01-02",
  },
  users: [
    {
      id: 1,
      name: "用户1",
      roles: ["admin", "editor"],
      preferences: {
        theme: "dark",
        notifications: true,
      },
    },
    {
      id: 2,
      name: "用户2",
      roles: ["viewer"],
      preferences: {
        theme: "light",
        notifications: false,
      },
    },
  ],
  pagination: {
    page: 1,
    pageSize: 10,
    total: 100,
  },
};

// 转换为 VariableTreeNode
const variableTree = computed<VariableTreeNode | null>(() => {
  try {
    return jsonToVariableTree(sampleData);
  } catch (error) {
    console.error("转换 VariableTreeNode 失败:", error);
    return null;
  }
});

// 初始化编辑器内容
const initEditorContent = () => {
  try {
    editorContent.value = JSON.stringify(sampleData, null, 2);
  } catch (error) {
    console.error("初始化编辑器内容失败:", error);
    editorContent.value = "";
  }
};

// 监听编辑模式，初始化编辑器内容
watch(
  () => isEditing.value,
  (editing) => {
    if (editing) {
      if (!editorContent.value) {
        initEditorContent();
      }
      // 保存原始内容
      originalEditorContent.value = editorContent.value;
    }
  }
);

// 初始化编辑器内容
initEditorContent();

// 处理编辑
const handleEdit = () => {
  isEditing.value = true;
};

// 处理保存
const handleSave = () => {
  try {
    // 验证 JSON 格式
    JSON.parse(editorContent.value);
    // 保存成功，更新原始内容
    originalEditorContent.value = editorContent.value;
    isEditing.value = false;
    console.log("保存成功:", editorContent.value);
  } catch (error) {
    console.error("保存失败：JSON 格式错误", error);
    // 这里可以添加错误提示
    alert("保存失败：JSON 格式错误");
  }
};

// 处理取消
const handleCancel = () => {
  // 恢复原始内容
  editorContent.value = originalEditorContent.value;
  isEditing.value = false;
};

const handleBack = () => {
  console.log("Back clicked");
  // 这里可以添加路由跳转逻辑
};

const handleResize = (data: { leftWidth: number; rightWidth: number }) => {
  leftWidth.value = data.leftWidth;
  rightWidth.value = data.rightWidth;
};

const handleSearchBlur = () => {
  if (!searchQuery.value) {
    isSearchExpanded.value = false;
  }
};

// 当搜索框展开时自动聚焦
const expandSearch = async () => {
  isSearchExpanded.value = true;
  await nextTick();
  searchInputRef.value?.focus();
};
</script>

<style scoped>
@import "@/v2/style.css";
</style>
