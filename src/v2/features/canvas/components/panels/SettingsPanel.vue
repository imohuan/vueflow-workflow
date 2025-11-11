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
          <div class="space-y-3">
            <n-input
              v-model:value="config.serverUrl"
              placeholder="http://localhost:3001"
            >
              <template #prefix>
                <IconGlobe class="text-slate-400" />
              </template>
            </n-input>

            <!-- 测试连接按钮 -->
            <div class="flex flex-wrap items-center gap-2">
              <n-button
                :loading="testingConnection"
                :disabled="!config.serverUrl"
                @click="testConnection"
              >
                <template #icon>
                  <IconBolt />
                </template>
                测试连接
              </n-button>

              <!-- 连接状态指示器 -->
              <div
                v-if="connectionStatus !== null"
                :class="[
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap',
                  connectionStatus === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700',
                ]"
              >
                <IconCheckCircle
                  class="w-4 h-4"
                  v-if="connectionStatus === 'success'"
                />
                <IconXCircle class="w-4 h-4" v-else />
                <span>{{
                  connectionStatus === "success"
                    ? "连接成功"
                    : connectionMessage
                }}</span>
              </div>
            </div>
          </div>
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

        <!-- 连线箭头 -->
        <ConfigSection title="连线箭头" description="连接线终点的箭头显示">
          <div
            class="flex items-center justify-between rounded-lg bg-slate-50 p-3"
          >
            <span class="text-sm font-medium text-slate-700">显示箭头</span>
            <n-switch v-model:value="config.edgeShowArrow" />
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

        <!-- 自动布局 -->
        <ConfigSection
          title="自动布局"
          description="一键整理节点位置的布局算法设置"
        >
          <div class="space-y-4">
            <!-- 布局方向 -->
            <div class="hidden">
              <label class="mb-2 block text-sm font-medium text-slate-700"
                >布局方向</label
              >
              <n-radio-group v-model:value="config.autoLayoutDirection">
                <n-radio-button value="LR">
                  <div class="flex items-center gap-1">
                    <span>→</span>
                    <span class="text-xs">从左到右</span>
                  </div>
                </n-radio-button>
                <n-radio-button value="RL">
                  <div class="flex items-center gap-1">
                    <span>←</span>
                    <span class="text-xs">从右到左</span>
                  </div>
                </n-radio-button>
                <n-radio-button value="TB">
                  <div class="flex items-center gap-1">
                    <span>↓</span>
                    <span class="text-xs">从上到下</span>
                  </div>
                </n-radio-button>
                <n-radio-button value="BT">
                  <div class="flex items-center gap-1">
                    <span>↑</span>
                    <span class="text-xs">从下到上</span>
                  </div>
                </n-radio-button>
              </n-radio-group>
            </div>

            <!-- 同列节点间距（垂直） -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-slate-700"
                  >同列节点间距</label
                >
                <div class="flex items-center gap-2">
                  <n-input-number
                    v-model:value="config.autoLayoutNodeSpacing"
                    :min="50"
                    :max="400"
                    :step="10"
                    class="w-24"
                  />
                  <span class="text-xs text-slate-500">px</span>
                </div>
              </div>
              <n-slider
                v-model:value="config.autoLayoutNodeSpacing"
                :min="50"
                :max="400"
                :step="10"
              />
              <p class="text-xs text-slate-500">
                同一列内节点的垂直间距（上下距离）
              </p>
            </div>

            <!-- 列间距（水平） -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-slate-700">列间距</label>
                <div class="flex items-center gap-2">
                  <n-input-number
                    v-model:value="config.autoLayoutRankSpacing"
                    :min="100"
                    :max="600"
                    :step="10"
                    class="w-24"
                  />
                  <span class="text-xs text-slate-500">px</span>
                </div>
              </div>
              <n-slider
                v-model:value="config.autoLayoutRankSpacing"
                :min="100"
                :max="600"
                :step="10"
              />
              <p class="text-xs text-slate-500">
                不同列之间的水平间距（左右距离）
              </p>
            </div>

            <!-- 布局边距 -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-slate-700"
                  >布局边距</label
                >
                <div class="flex items-center gap-2">
                  <n-input-number
                    v-model:value="config.autoLayoutPadding"
                    :min="0"
                    :max="300"
                    :step="10"
                    class="w-24"
                  />
                  <span class="text-xs text-slate-500">px</span>
                </div>
              </div>
              <n-slider
                v-model:value="config.autoLayoutPadding"
                :min="0"
                :max="300"
                :step="10"
              />
              <p class="text-xs text-slate-500">整体布局与画布边缘的距离</p>
            </div>

            <!-- 自动适应视图 -->
            <div
              class="flex items-center justify-between rounded-lg bg-slate-50 p-3"
            >
              <div class="flex flex-col">
                <span class="text-sm font-medium text-slate-700"
                  >自动适应视图</span
                >
                <span class="text-xs text-slate-500"
                  >布局后自动调整画布视图</span
                >
              </div>
              <n-switch v-model:value="config.autoLayoutFitView" />
            </div>

            <!-- 适应视图内边距 -->
            <div v-if="config.autoLayoutFitView" class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-slate-700"
                  >视图内边距</label
                >
                <div class="flex items-center gap-2">
                  <n-input-number
                    v-model:value="config.autoLayoutFitViewPadding"
                    :min="0"
                    :max="1"
                    :step="0.05"
                    class="w-24"
                  />
                </div>
              </div>
              <n-slider
                v-model:value="config.autoLayoutFitViewPadding"
                :min="0"
                :max="1"
                :step="0.05"
              />
              <p class="text-xs text-slate-500">
                适应视图时的内边距比例（0-1）
              </p>
            </div>

            <!-- 动画时长 -->
            <div v-if="config.autoLayoutFitView" class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-slate-700"
                  >动画时长</label
                >
                <div class="flex items-center gap-2">
                  <n-input-number
                    v-model:value="config.autoLayoutFitViewDuration"
                    :min="0"
                    :max="1000"
                    :step="50"
                    class="w-24"
                  />
                  <span class="text-xs text-slate-500">ms</span>
                </div>
              </div>
              <n-slider
                v-model:value="config.autoLayoutFitViewDuration"
                :min="0"
                :max="1000"
                :step="50"
              />
              <p class="text-xs text-slate-500">适应视图动画的持续时间</p>
            </div>
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
import { ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useMessage } from "naive-ui";
import { useEditorConfigStore } from "../../../../stores/editorConfig";
import ConfigSection from "../../../../components/common/ConfigSection.vue";
import ExecutionModeSelector from "../../../../components/settings/ExecutionModeSelector.vue";
import EdgeTypeSelector from "../../../../components/settings/EdgeTypeSelector.vue";
import GridTypeSelector from "../../../../components/settings/GridTypeSelector.vue";
import ColorPicker from "../../../../components/settings/ColorPicker.vue";
import { useVueFlowExecution } from "../../../vueflow/executor/VueFlowExecution";
import IconSettings from "@/icons/IconSettings.vue";
import IconPlay from "@/icons/IconPlay.vue";
import IconCanvas from "@/icons/IconCanvas.vue";
import IconCheck from "@/icons/IconCheck.vue";
import IconReset from "@/icons/IconReset.vue";
import IconGlobe from "@/icons/IconGlobe.vue";
import IconBolt from "@/icons/IconBolt.vue";
import IconCheckCircle from "@/icons/IconCheckCircle.vue";
import IconXCircle from "@/icons/IconXCircle.vue";

const message = useMessage();
const editorConfigStore = useEditorConfigStore();
const { config } = storeToRefs(editorConfigStore);
const execution = useVueFlowExecution();

// 当前激活的标签页
const activeTab = ref("general");

// 连接测试状态
const testingConnection = ref(false);
const connectionStatus = ref<"success" | "error" | null>(null);
const connectionMessage = ref("");

// 监听执行模式变化并调用执行系统的切换函数
watch(
  () => config.value.executionMode,
  async (newMode, oldMode) => {
    if (newMode && newMode !== oldMode) {
      await execution.switchMode(newMode as any);
    }
  }
);

/**
 * 测试 WebSocket 连接
 */
async function testConnection() {
  if (!config.value.serverUrl) {
    return;
  }

  testingConnection.value = true;
  connectionStatus.value = null;
  connectionMessage.value = "";

  // 将 http:// 或 https:// 转换为 ws:// 或 wss://
  let wsUrl = config.value.serverUrl;
  if (wsUrl.startsWith("http://")) {
    wsUrl = wsUrl.replace("http://", "ws://");
  } else if (wsUrl.startsWith("https://")) {
    wsUrl = wsUrl.replace("https://", "wss://");
  } else if (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://")) {
    wsUrl = "ws://" + wsUrl;
  }

  let ws: WebSocket | null = null;
  let timeout: number | null = null;

  try {
    // 创建 WebSocket 连接
    ws = new WebSocket(wsUrl);

    // 设置超时（5秒）
    timeout = window.setTimeout(() => {
      if (ws && ws.readyState !== WebSocket.OPEN) {
        ws.close();
        connectionStatus.value = "error";
        connectionMessage.value = "连接超时";
        message?.error("连接超时，请检查服务器地址");
      }
    }, 5000);

    // 连接成功
    ws.onopen = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      connectionStatus.value = "success";
      message?.success("服务器连接成功！");
      testingConnection.value = false;

      // 2秒后关闭测试连接
      setTimeout(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }, 2000);
    };

    // 连接失败
    ws.onerror = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      connectionStatus.value = "error";
      connectionMessage.value = "连接失败";
      message?.error("无法连接到服务器，请检查地址和服务器状态");
      testingConnection.value = false;
    };

    // 连接关闭
    ws.onclose = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      testingConnection.value = false;
    };
  } catch (error) {
    if (timeout) {
      clearTimeout(timeout);
    }
    connectionStatus.value = "error";
    connectionMessage.value = "连接异常";
    message?.error(
      "连接异常: " + (error instanceof Error ? error.message : String(error))
    );
    testingConnection.value = false;
  }
}

/**
 * 重置配置
 */
function resetConfig() {
  editorConfigStore.resetConfig();
  message?.success("配置已重置为默认值");
}
</script>
