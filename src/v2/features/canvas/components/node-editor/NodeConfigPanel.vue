<template>
  <div class="flex h-full flex-col bg-white">
    <!-- Tab 切换 -->
    <n-tabs
      v-model:value="activeTab"
      type="line"
      size="small"
      class="border-b border-slate-200 node-config-tabs relative h-full"
    >
      <n-tab-pane name="node" tab="节点配置">
        <NodeConfigTab
          :selected-node="selectedNode"
          :node-config="nodeConfig"
          :node-type-config="nodeTypeConfig"
          :is-dragging-variable="isDraggingVariable"
          @param-change="handleParamChange"
          @reset="handleReset"
          @delete="handleDeleteNode"
        />
      </n-tab-pane>

      <n-tab-pane name="general" tab="通用设置">
        <GeneralSettingsTab
          :selected-node="selectedNode"
          :node-config="nodeConfig"
          :node-color="nodeColor"
          @update:label="updateLabel"
          @update:description="updateDescription"
          @update:color="updateColor"
        />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { eventBusUtils } from "@/v2/features/vueflow/events";
import type { VariableDragEvents } from "@/v2/features/vueflow/events/eventTypes";
import NodeConfigTab from "./NodeConfigTab.vue";
import GeneralSettingsTab from "./GeneralSettingsTab.vue";
import { useNodeConfig } from "./composables/useNodeConfig";
import { useNodeConfigFields } from "./composables/useNodeConfigFields";

/** 当前激活的 Tab */
const activeTab = ref<"node" | "general">("node");

/** 是否正在拖拽变量 */
const isDraggingVariable = ref(false);

// 使用 composables
const {
  selectedNode,
  nodeColor,
  nodeConfig,
  handleConfigChange,
  handleParamChange,
  handleReset,
  handleDeleteNode,
} = useNodeConfig();

const { nodeTypeConfig } = useNodeConfigFields(selectedNode);

// 更新配置字段
function updateLabel(value: string) {
  nodeConfig.value.label = value;
  handleConfigChange();
}

function updateDescription(value: string) {
  nodeConfig.value.description = value;
  handleConfigChange();
}

function updateColor(value: string) {
  nodeConfig.value.color = value;
  handleConfigChange();
}

// 变量拖拽事件处理
function handleVariableDragStart(
  event: VariableDragEvents["variable:drag-start"]
) {
  console.log("[NodeConfigPanel] 变量拖拽开始:", event);
  isDraggingVariable.value = true;
}

function handleVariableDragEnd(event: VariableDragEvents["variable:drag-end"]) {
  console.log("[NodeConfigPanel] 变量拖拽结束:", event);
  isDraggingVariable.value = false;
}

onMounted(() => {
  eventBusUtils.on("variable:drag-start", handleVariableDragStart);
  eventBusUtils.on("variable:drag-end", handleVariableDragEnd);
});

onBeforeUnmount(() => {
  eventBusUtils.off("variable:drag-start", handleVariableDragStart);
  eventBusUtils.off("variable:drag-end", handleVariableDragEnd);
});
</script>

<style>
.node-config-tabs > .n-tabs-nav {
  padding: 0 1rem;
}

.node-config-tabs {
  @apply flex flex-col;
}

.node-config-tabs .n-tabs-nav {
  @apply flex-none;
}

.node-config-tabs .n-tab-pane {
  @apply flex-1 h-full overflow-hidden;
}
</style>
