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
          <h3
            class="text-sm font-semibold text-slate-900 uppercase tracking-wide"
          >
            INPUT
          </h3>
        </div>
        <div class="flex-1 overflow-auto px-4 py-4 space-y-4">
          <!-- Code 区域 -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-slate-700">Code</h4>
            </div>
            <div class="space-y-2">
              <div>
                <label class="block text-xs text-slate-600 mb-1"
                  >myNewField</label
                >
                <input
                  type="text"
                  class="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value="Lorem ipsum dolor sit amet, consectetur adipiscing elit..."
                />
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="block text-xs text-slate-600 mb-1"
                    >myNewField1</label
                  >
                  <input
                    type="number"
                    class="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value="1"
                  />
                </div>
                <div>
                  <label class="block text-xs text-slate-600 mb-1"
                    >myNewField2</label
                  >
                  <input
                    type="number"
                    class="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value="1"
                  />
                </div>
                <div>
                  <label class="block text-xs text-slate-600 mb-1"
                    >myNewField3</label
                  >
                  <input
                    type="number"
                    class="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value="1"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- If 区域（折叠） -->
          <div class="space-y-2">
            <div class="flex items-center justify-between cursor-pointer">
              <h4 class="text-sm font-medium text-slate-700">If</h4>
              <svg
                class="h-4 w-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          <!-- When clicking 'Execute workflow' 区域（折叠） -->
          <div class="space-y-2">
            <div class="flex items-center justify-between cursor-pointer">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-slate-700">
                  When clicking 'Execute workflow'
                </span>
                <span class="text-red-500">⚡</span>
              </div>
              <svg
                class="h-4 w-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          <!-- Variables and context 区域（折叠） -->
          <div class="space-y-2">
            <div class="flex items-center justify-between cursor-pointer">
              <h4 class="text-sm font-medium text-slate-700">
                Variables and context
              </h4>
              <svg
                class="h-4 w-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
        <div
          class="shrink-0 border-t border-slate-200 px-4 py-2 text-xs text-slate-500"
        >
          <div>22 2652293750 2...</div>
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
        <div class="flex-1 overflow-auto px-6 py-6 space-y-6">
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
          <div class="flex gap-2">
            <button
              class="px-3 py-1 text-sm font-medium text-slate-700 border-b-2 border-blue-600"
            >
              Output
            </button>
            <button
              class="px-3 py-1 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Logs
            </button>
          </div>
          <button
            class="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
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
        <div class="flex-1 overflow-auto px-4 py-6">
          <p class="text-sm text-slate-500">
            Execute this node to view data or set mock data
          </p>
        </div>
        <div class="shrink-0 border-t border-slate-200 px-4 py-3 space-y-2">
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
import { ref } from "vue";
import { SplitLayout } from "../components/ui";

const leftWidth = ref(320);
const rightWidth = ref(320);

const handleBack = () => {
  console.log("Back clicked");
  // 这里可以添加路由跳转逻辑
};

const handleResize = (data: { leftWidth: number; rightWidth: number }) => {
  leftWidth.value = data.leftWidth;
  rightWidth.value = data.rightWidth;
};
</script>
