<template>
  <div class="h-full flex flex-col bg-white">
    <!-- 顶部标签页 -->
    <div class="shrink-0 border-b border-slate-200 bg-white px-4 pt-4">
      <n-tabs v-model:value="activeTab" type="segment" animated>
        <n-tab-pane name="general" tab="常规设置">
          <template #tab>
            <div class="flex items-center gap-2">
              <IconSettings class="h-4 w-4" />
              <span>常规设置</span>
            </div>
          </template>
        </n-tab-pane>
        <n-tab-pane name="execution" tab="执行模式">
          <template #tab>
            <div class="flex items-center gap-2">
              <IconPlay class="h-4 w-4" />
              <span>执行模式</span>
            </div>
          </template>
        </n-tab-pane>
        <n-tab-pane name="canvas" tab="画布设置">
          <template #tab>
            <div class="flex items-center gap-2">
              <IconCanvas class="h-4 w-4" />
              <span>画布设置</span>
            </div>
          </template>
        </n-tab-pane>
      </n-tabs>
    </div>

    <!-- 内容区域 -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- 常规设置 -->
      <div v-show="activeTab === 'general'">
        <!-- 自动保存 -->
        <ConfigSection title="自动保存" description="自动保存工作流更改">
          <div
            class="flex items-center justify-between rounded-lg bg-slate-50 p-3"
          >
            <span class="text-sm font-medium text-slate-700">启用自动保存</span>
            <n-switch v-model:value="config.autoSave" />
          </div>
        </ConfigSection>

        <!-- 网格设置 -->
        <ConfigSection title="网格大小" description="画布网格尺寸">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-slate-700">网格间距</label>
              <div class="flex items-center gap-2">
                <n-input-number
                  v-model:value="config.gridSize"
                  :min="10"
                  :max="50"
                  :step="5"
                  class="w-24"
                />
                <span class="text-xs text-slate-500">px</span>
              </div>
            </div>
            <n-slider
              v-model:value="config.gridSize"
              :min="10"
              :max="50"
              :step="5"
            />
          </div>
        </ConfigSection>

        <!-- 对齐到网格 -->
        <ConfigSection
          title="对齐到网格"
          description="拖拽节点时自动对齐到网格"
        >
          <div
            class="flex items-center justify-between rounded-lg bg-slate-50 p-3"
          >
            <span class="text-sm font-medium text-slate-700">启用对齐</span>
            <n-switch v-model:value="config.snapToGrid" />
          </div>
        </ConfigSection>
      </div>

      <!-- 执行模式 -->
      <div v-show="activeTab === 'execution'">
        <!-- 执行模式选择 -->
        <ConfigSection title="执行模式" description="选择工作流执行方式">
          <ExecutionModeSelector v-model="config.executionMode" />
        </ConfigSection>

        <!-- 服务器地址 -->
        <ConfigSection
          v-if="config.executionMode === 'server'"
          title="服务器地址"
          description="远程服务器的 API 地址"
        >
          <n-input
            v-model:value="config.serverUrl"
            placeholder="http://localhost:3000"
          >
            <template #prefix>
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
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
            </template>
          </n-input>
        </ConfigSection>

        <!-- 最大并发数 -->
        <ConfigSection
          title="最大并发节点数"
          description="同时执行的节点数量上限"
        >
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-slate-700">并发数量</label>
              <div class="flex items-center gap-2">
                <n-input-number
                  v-model:value="config.maxConcurrent"
                  :min="1"
                  :max="10"
                  :step="1"
                  class="w-24"
                />
                <span class="text-xs text-slate-500">个</span>
              </div>
            </div>
            <n-slider
              v-model:value="config.maxConcurrent"
              :min="1"
              :max="10"
              :step="1"
            />
          </div>
        </ConfigSection>
      </div>

      <!-- 画布设置 -->
      <div v-show="activeTab === 'canvas'">
        <!-- 连线样式 -->
        <ConfigSection title="连线样式" description="节点间连接线的外观">
          <EdgeTypeSelector v-model="config.edgeType" />
        </ConfigSection>

        <!-- 线条粗细 -->
        <ConfigSection title="线条粗细" description="连接线的宽度">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-slate-700">线条宽度</label>
              <div class="flex items-center gap-2">
                <n-input-number
                  v-model:value="config.edgeWidth"
                  :min="1"
                  :max="5"
                  :step="0.5"
                  class="w-24"
                />
                <span class="text-xs text-slate-500">px</span>
              </div>
            </div>
            <n-slider
              v-model:value="config.edgeWidth"
              :min="1"
              :max="5"
              :step="0.5"
            />
          </div>
        </ConfigSection>

        <!-- 连线颜色 -->
        <ConfigSection
          title="连线颜色"
          description="自定义连接线和激活状态的颜色"
        >
          <div class="grid grid-cols-2 gap-4">
            <ColorPicker v-model="config.edgeColor" label="默认颜色" />
            <ColorPicker v-model="config.edgeActiveColor" label="激活颜色" />
          </div>
        </ConfigSection>

        <!-- 连线动画 -->
        <ConfigSection title="连线动画" description="连接线的动画效果">
          <div
            class="flex items-center justify-between rounded-lg bg-slate-50 p-3"
          >
            <span class="text-sm font-medium text-slate-700">启用动画效果</span>
            <n-switch v-model:value="config.edgeAnimation" />
          </div>
        </ConfigSection>

        <!-- 画布缩放 -->
        <ConfigSection title="画布缩放" description="画布缩放级别设置">
          <div class="space-y-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-slate-700"
                  >默认缩放</label
                >
                <div class="flex items-center gap-2">
                  <n-input-number
                    v-model:value="config.defaultZoom"
                    :min="0.1"
                    :max="4"
                    :step="0.1"
                    class="w-24"
                  />
                  <span class="text-xs text-slate-500">x</span>
                </div>
              </div>
              <n-slider
                v-model:value="config.defaultZoom"
                :min="0.1"
                :max="4"
                :step="0.1"
              />
              <p class="text-xs text-slate-500">画布初始化时的缩放级别</p>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-slate-700"
                  >最小缩放</label
                >
                <div class="flex items-center gap-2">
                  <n-input-number
                    v-model:value="config.minZoom"
                    :min="0.1"
                    :max="1"
                    :step="0.1"
                    class="w-24"
                  />
                  <span class="text-xs text-slate-500">x</span>
                </div>
              </div>
              <n-slider
                v-model:value="config.minZoom"
                :min="0.1"
                :max="1"
                :step="0.1"
              />
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-slate-700"
                  >最大缩放</label
                >
                <div class="flex items-center gap-2">
                  <n-input-number
                    v-model:value="config.maxZoom"
                    :min="2"
                    :max="8"
                    :step="0.5"
                    class="w-24"
                  />
                  <span class="text-xs text-slate-500">x</span>
                </div>
              </div>
              <n-slider
                v-model:value="config.maxZoom"
                :min="2"
                :max="8"
                :step="0.5"
              />
            </div>
          </div>
        </ConfigSection>

        <!-- 小地图 -->
        <ConfigSection title="小地图" description="显示画布小地图导航">
          <div
            class="flex items-center justify-between rounded-lg bg-slate-50 p-3"
          >
            <span class="text-sm font-medium text-slate-700">显示小地图</span>
            <n-switch v-model:value="config.showMiniMap" />
          </div>
        </ConfigSection>

        <!-- 网格背景 -->
        <ConfigSection title="网格背景" description="显示画布网格背景">
          <div class="space-y-4">
            <div
              class="flex items-center justify-between rounded-lg bg-slate-50 p-3"
            >
              <span class="text-sm font-medium text-slate-700">显示网格</span>
              <n-switch v-model:value="config.showGrid" />
            </div>

            <div
              class="flex items-center justify-between rounded-lg bg-slate-50 p-3"
            >
              <div class="flex flex-col">
                <span class="text-sm font-medium text-slate-700">节点吸附</span>
                <span class="text-xs text-slate-500"
                  >节点移动时自动对齐网格</span
                >
              </div>
              <n-switch v-model:value="config.snapToGrid" />
            </div>

            <div v-if="config.showGrid" class="space-y-4">
              <div>
                <label class="mb-2 block text-sm font-medium text-slate-700"
                  >网格类型</label
                >
                <GridTypeSelector v-model="config.gridType" />
              </div>

              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-sm font-medium text-slate-700"
                    >网格间距</label
                  >
                  <div class="flex items-center gap-2">
                    <n-input-number
                      v-model:value="config.gridGap"
                      :min="10"
                      :max="50"
                      :step="5"
                      class="w-24"
                    />
                    <span class="text-xs text-slate-500">px</span>
                  </div>
                </div>
                <n-slider
                  v-model:value="config.gridGap"
                  :min="10"
                  :max="50"
                  :step="5"
                />
              </div>

              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-sm font-medium text-slate-700"
                    >网格大小</label
                  >
                  <div class="flex items-center gap-2">
                    <n-input-number
                      v-model:value="config.gridSize"
                      :min="10"
                      :max="50"
                      :step="5"
                      class="w-24"
                    />
                    <span class="text-xs text-slate-500">px</span>
                  </div>
                </div>
                <n-slider
                  v-model:value="config.gridSize"
                  :min="10"
                  :max="50"
                  :step="5"
                />
                <p class="text-xs text-slate-500">吸附网格的单元格大小</p>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <ColorPicker v-model="config.bgColor" label="背景颜色" />
                <ColorPicker v-model="config.gridColor" label="网格颜色" />
              </div>
            </div>
          </div>
        </ConfigSection>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <IconCheck class="h-3.5 w-3.5 text-green-500" />
          <span>配置自动保存</span>
        </div>
        <n-button @click="resetConfig">
          <template #icon>
            <IconReset class="h-4 w-4" />
          </template>
          重置默认
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useMessage } from "naive-ui";
import { useEditorConfigStore } from "@/newCode/stores/editorConfig";
import ConfigSection from "@/newCode/components/common/ConfigSection.vue";
import ExecutionModeSelector from "@/newCode/components/settings/ExecutionModeSelector.vue";
import EdgeTypeSelector from "@/newCode/components/settings/EdgeTypeSelector.vue";
import GridTypeSelector from "@/newCode/components/settings/GridTypeSelector.vue";
import ColorPicker from "@/newCode/components/settings/ColorPicker.vue";
import IconSettings from "@/icons/IconSettings.vue";
import IconPlay from "@/icons/IconPlay.vue";
import IconCanvas from "@/icons/IconCanvas.vue";
import IconCheck from "@/icons/IconCheck.vue";
import IconReset from "@/icons/IconReset.vue";

const message = useMessage();
const editorConfigStore = useEditorConfigStore();
const { config } = storeToRefs(editorConfigStore);

// 当前激活的标签页
const activeTab = ref("general");

/**
 * 重置配置
 */
function resetConfig() {
  editorConfigStore.resetConfig();
  message?.success("配置已重置为默认值");
}
</script>
