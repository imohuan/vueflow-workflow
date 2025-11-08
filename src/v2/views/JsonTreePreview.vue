<template>
  <div class="h-screen flex flex-col bg-slate-50">
    <!-- 顶部标题栏 -->
    <div
      class="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm"
    >
      <h1 class="text-xl font-semibold text-slate-900">JSON 树形渲染预览</h1>

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

    <!-- 内容区域 -->
    <div class="flex-1 p-4 overflow-auto">
      <div
        class="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-slate-200 p-6"
      >
        <JsonTreeViewer :data="currentData" />
      </div>
    </div>

    <!-- 底部说明 -->
    <div
      class="bg-white border-t border-slate-200 px-6 py-3 flex items-center gap-4 shadow-sm"
    >
      <div class="flex items-center gap-2 text-sm text-slate-600">
        <span class="font-medium">功能说明：</span>
        <span>• 点击括号可以折叠/展开</span>
        <span>• 拖拽 key 可以插入到可编辑区域</span>
        <span>• 左侧虚线显示层级关系</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import JsonTreeViewer from "@/v2/components/json/JsonTreeViewer.vue";

defineOptions({ name: "JsonTreePreview" });

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
  测试数据: [
    {
      myNewField: 1,
      myNewField1: 1,
      myNewField2: 1,
      myNewField3: 1,
    },
  ],
};

const selectedDataKey = ref<string>(Object.keys(sampleData)[0] ?? "");

const currentData = computed(() => sampleData[selectedDataKey.value]);
</script>
