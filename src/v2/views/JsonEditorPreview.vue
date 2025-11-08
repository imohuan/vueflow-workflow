<template>
  <div class="h-screen flex flex-col bg-slate-50">
    <!-- 顶部标题栏 -->
    <div
      class="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm"
    >
      <h1 class="text-xl font-semibold text-slate-900">JSON 数据编辑器预览</h1>

      <!-- 数据选择器 -->
      <div class="flex items-center gap-3">
        <label class="text-sm text-slate-600">选择示例数据：</label>
        <select
          v-model="selectedDataKey"
          class="px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option
            v-for="key in Object.keys(sampleData)"
            :key="key"
            :value="key"
          >
            {{ key }}
          </option>
        </select>
      </div>
    </div>

    <!-- 内容区域 - 三栏布局 -->
    <div class="flex-1 flex gap-4 p-4 overflow-hidden">
      <!-- 左侧：JsonCodeViewer 预览 -->
      <div
        class="flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden"
      >
        <div class="px-4 py-2 bg-slate-50 border-b border-slate-200">
          <h2 class="text-sm font-semibold text-slate-700">JSON 代码预览</h2>
        </div>
        <div class="flex-1 overflow-auto variable-scroll p-4">
          <JsonCodeViewer :data="currentData" :indent="2" :formatted="true" />
        </div>
      </div>

      <!-- 中间：JsonViewer 预览 -->
      <div
        class="flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden"
      >
        <div class="px-4 py-2 bg-slate-50 border-b border-slate-200">
          <h2 class="text-sm font-semibold text-slate-700">JsonViewer 预览</h2>
        </div>
        <div class="flex-1 overflow-auto variable-scroll p-4">
          <JsonViewer
            :data="currentData"
            root-name="root"
            :expand-mode="expandMode"
            :expand-trigger="expandTrigger"
          />
        </div>
      </div>

      <!-- 右侧：VariableTreeItem 预览 -->
      <div
        class="flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden"
      >
        <div class="px-4 py-2 bg-slate-50 border-b border-slate-200">
          <h2 class="text-sm font-semibold text-slate-700">
            VariableTreeItem 预览
          </h2>
        </div>
        <div class="flex-1 overflow-auto variable-scroll p-4">
          <div class="space-y-0.5">
            <VariableTreeItem
              v-if="variableTree"
              :node="variableTree"
              :level="0"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 底部控制栏 -->
    <div
      class="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm"
    >
      <div class="flex items-center gap-4">
        <label class="text-sm text-slate-600">展开模式：</label>
        <div class="flex gap-2">
          <button
            v-for="mode in expandModes"
            :key="mode.value"
            @click="expandMode = mode.value"
            class="px-3 py-1.5 text-sm rounded-md transition-colors"
            :class="
              expandMode === mode.value
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            "
          >
            {{ mode.label }}
          </button>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <button
          @click="expandTrigger++"
          class="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          触发展开
        </button>
        <button
          @click="expandTrigger = 0"
          class="px-4 py-1.5 text-sm bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors"
        >
          重置
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import JsonCodeViewer from "@/v2/components/json/JsonCodeViewer.vue";
import JsonViewer from "@/v2/components/json/JsonViewer.vue";
import VariableTreeItem from "@/v2/components/variables/VariableTreeItem.vue";
import { jsonToVariableTree } from "@/v2/components/json/jsonToVariableTree";
import type { VariableTreeNode } from "workflow-node-executor";

defineOptions({ name: "JsonEditorPreview" });

// 示例数据
const sampleData: Record<string, unknown> = {
  简单对象: {
    name: "张三",
    age: 25,
    email: "zhangsan@example.com",
    active: true,
  },
  嵌套对象: {
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
  },
  数组数据: [
    { id: 1, name: "项目A", status: "active" },
    { id: 2, name: "项目B", status: "pending" },
    { id: 3, name: "项目C", status: "completed" },
  ],
  复杂嵌套: {
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
  },
  混合类型: {
    string: "文本内容",
    number: 42,
    boolean: true,
    nullValue: null,
    array: [1, 2, 3, "four", true],
    object: {
      nested: "嵌套值",
      deep: {
        value: "深层值",
      },
    },
  },
};

const selectedDataKey = ref<string>(Object.keys(sampleData)[0] ?? "");
const expandMode = ref<"none" | "first" | "all">("first");
const expandTrigger = ref(0);

const currentData = computed(() => sampleData[selectedDataKey.value]);

const variableTree = computed<VariableTreeNode | null>(() => {
  try {
    return jsonToVariableTree(currentData.value);
  } catch (error) {
    console.error("转换 VariableTreeNode 失败:", error);
    return null;
  }
});

const expandModes = [
  { value: "none" as const, label: "不展开" },
  { value: "first" as const, label: "展开首项" },
  { value: "all" as const, label: "全部展开" },
];
</script>
