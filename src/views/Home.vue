<template>
  <div class="h-screen flex flex-col bg-gray-100">
    <!-- 顶部状态栏 -->
    <div class="bg-white shadow-md px-6 py-4 flex items-center justify-between">
      <!-- 左侧标题 -->
      <h1 class="text-2xl font-bold text-gray-800">{{ currentPageTitle }}</h1>

      <!-- 右侧 Tab 按钮 -->
      <div class="flex items-center gap-2">
        <button
          v-for="page in pages"
          :key="page.path"
          @click="selectPage(page)"
          :class="[
            'px-4 py-2 rounded-lg transition-colors font-medium',
            currentPath === page.path
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          ]"
        >
          {{ page.title }}
        </button>
      </div>
    </div>

    <!-- 页面内容容器 - 使用 iframe -->
    <div class="flex-1 overflow-hidden">
      <iframe
        :src="currentPath"
        class="w-full h-full border-0"
        frameborder="0"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useLocalStorage } from "@vueuse/core";

interface Page {
  path: string;
  title: string;
}

const pages: Page[] = [
  { path: "/node-editor", title: "节点编辑器" },
  { path: "/mcp-test", title: "MCP 测试" },
];

// 使用 localStorage 持久化当前页面路径
const currentPath = useLocalStorage<string>(
  "current-page-path",
  "/node-editor"
);

// 计算当前页面标题
const currentPageTitle = computed(() => {
  const page = pages.find((p) => p.path === currentPath.value);
  return page?.title || "AI 浏览器工具";
});

// 选择页面
const selectPage = (page: Page) => {
  currentPath.value = page.path;
};
</script>
