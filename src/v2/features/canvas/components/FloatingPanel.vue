<template>
  <Transition name="slide-fade">
    <div
      v-if="uiStore.floatingPanelVisible"
      class="pointer-events-auto absolute bottom-0 left-0 top-0 z-20"
      :style="{ width: `${uiStore.panelWidth}px` }"
    >
      <PanelShell
        :title="currentPanelTitle"
        size="full"
        padding="none"
        :closable="true"
        :header-sticky="true"
        class="h-full rounded-none!"
        @close="uiStore.closeFloatingPanel"
      >
        <!-- 动态内容渲染 -->
        <component :is="currentPanelComponent" v-if="uiStore.activeTab" />

        <!-- 空状态 -->
        <div
          v-else
          class="flex h-full items-center justify-center text-slate-400"
        >
          <div class="text-center">
            <p class="text-sm">请选择一个菜单项</p>
          </div>
        </div>
      </PanelShell>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, type Component } from "vue";
import { PanelShell } from "../../../components/ui";
import { useUiStore } from "../../../stores/ui";
import TestMenuPanel from "./panels/TestMenuPanel.vue";
import WorkflowTreePanel from "./panels/WorkflowTreePanel.vue";
import NodeLibraryPanel from "./panels/NodeLibraryPanel.vue";
import NodeConfigPanel from "./node-editor/NodeConfigPanel.vue";
import NodeResultPreviewPanel from "./panels/NodeResultPreviewPanel.vue";
import VariableEditorPanel from "./panels/VariableEditorPanel.vue";
import HistoryPanel from "./panels/HistoryPanel.vue";
import SettingsPanel from "./panels/SettingsPanel.vue";

const uiStore = useUiStore();

// 面板组件映射表
const panelComponents: Record<string, Component> = {
  workflows: WorkflowTreePanel,
  "node-library": NodeLibraryPanel,
  "node-config": NodeConfigPanel,
  "node-result-preview": NodeResultPreviewPanel,
  variables: VariableEditorPanel,
  "execution-history": HistoryPanel,
  "test-menu": TestMenuPanel,
  settings: SettingsPanel,
};

// 面板标题映射表
const panelTitles: Record<string, string> = {
  workflows: "工作流",
  "node-library": "节点库",
  "node-config": "节点配置",
  "node-result-preview": "节点预览",
  variables: "变量管理",
  "execution-history": "执行记录",
  "test-menu": "测试菜单",
  settings: "设置",
};

/** 当前面板组件 */
const currentPanelComponent = computed(() => {
  if (!uiStore.activeTab) return null;
  return panelComponents[uiStore.activeTab] || null;
});

/** 当前面板标题 */
const currentPanelTitle = computed(() => {
  if (!uiStore.activeTab) return "面板";
  return panelTitles[uiStore.activeTab] || "面板";
});
</script>

<style scoped>
/* 进入和离开动画 */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
</style>
