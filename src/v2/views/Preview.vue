<template>
  <div class="h-screen flex flex-col bg-slate-50">
    <!-- 顶部 Tab 导航栏 -->
    <div
      class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm"
    >
      <!-- 左侧标题 -->
      <h1 class="text-xl font-semibold text-slate-900">预览中心</h1>

      <!-- 右侧 Tab 按钮 -->
      <n-space>
        <n-button
          v-for="tab in tabs"
          :key="tab.path"
          @click="selectTab(tab)"
          :type="currentPath === tab.path ? 'primary' : 'default'"
        >
          {{ tab.title }}
        </n-button>
      </n-space>
    </div>

    <!-- iframe 内容容器 -->
    <div class="flex-1 overflow-hidden bg-white">
      <iframe
        :src="currentPath"
        class="w-full h-full border-0"
        frameborder="0"
        allowfullscreen
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { getContext } from "@/v2/context";

interface Tab {
  path: string;
  title: string;
}

const tabs: Tab[] = [
  { path: "#/preview/ui-shell", title: "UI Shell" },
  { path: "#/preview/canvas", title: "Canvas" },
  { path: "#/preview/code-editor", title: "Code Editor" },
  { path: "#/preview/split-layout", title: "Split Layout" },
];

// 使用全局缓存持久化当前 tab（异步水合）
const STORAGE_KEY = "preview-current-tab";
const NAMESPACE = "v2";
const currentPath = ref<string>("#/preview/ui-shell");

onMounted(async () => {
  const ctx = getContext();
  const saved = await ctx.config.get<string>(`${NAMESPACE}:${STORAGE_KEY}`);
  if (saved) currentPath.value = saved;
});

// 选择 tab
const selectTab = (tab: Tab) => {
  currentPath.value = tab.path;
};

// 变更时写入缓存（防抖可选，这里频率较低直接写）
watch(
  currentPath,
  async (val) => {
    const ctx = getContext();
    await ctx.config.set(`${NAMESPACE}:${STORAGE_KEY}`, val);
  },
  { flush: "post" }
);
</script>
