<template>
  <ModalShell
    v-model="uiStore.nodeConfigModalVisible"
    title="节点配置"
    width="full"
    padding="none"
    @close="handleClose"
  >
    <!-- 未选中节点时 -->
    <div
      v-if="!selectedNode"
      class="flex flex-col items-center justify-center h-full px-8 py-12"
    >
      <IconEmptyNode />
      <p class="mt-5 text-[15px] font-medium text-center text-slate-600">
        选择一个节点进行编辑
      </p>
    </div>

    <!-- 已选中节点时 -->
    <div v-else class="flex flex-col h-full">
      <n-split
        direction="horizontal"
        class="flex-1"
        :default-size="0.25"
        :max="0.5"
        :min="0.15"
      >
        <template #1>
          <div
            class="w-full h-full overflow-hidden bg-white border-r border-slate-200"
          >
            <VariablePanel :variables="availableVariables" />
          </div>
        </template>
        <template #2>
          <div
            class="w-full h-full overflow-y-auto variable-scroll bg-[#f6f6f8]"
          >
            <div class="max-w-3xl mx-auto p-4 space-y-3">
              <!-- 节点配置面板 -->
              <NodeConfigPanel />
            </div>
          </div>
        </template>
      </n-split>
    </div>
  </ModalShell>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useVueFlow } from "@vue-flow/core";
import type { Node } from "@vue-flow/core";
import ModalShell from "../../../../components/ui/ModalShell.vue";
import NodeConfigPanel from "../panels/NodeConfigPanel.vue";
import VariablePanel from "../../../../components/variables/VariablePanel.vue";
import IconEmptyNode from "@/icons/IconEmptyNode.vue";
import { useUiStore } from "../../../../stores/ui";
import { useCanvasStore } from "../../../../stores/canvas";
import { buildVariableContext } from "@/v1/workflow/variables/variableResolver";
import type { VariableTreeNode } from "@/v1/workflow/variables/variableResolver";

const uiStore = useUiStore();
const canvasStore = useCanvasStore();
const { findNode } = useVueFlow();
const { selectedNodeId } = storeToRefs(uiStore);

/** 当前选中的节点 */
const selectedNode = computed<Node | undefined>(() => {
  if (!selectedNodeId.value) return undefined;
  return findNode(selectedNodeId.value);
});

/** 可用变量列表 */
const availableVariables = computed<VariableTreeNode[]>(() => {
  if (!selectedNodeId.value) {
    return [];
  }
  try {
    const nodes = (canvasStore.nodes || []) as Node[];
    const edges = (canvasStore.edges || []) as any[];
    const { tree } = buildVariableContext(selectedNodeId.value, nodes, edges);
    return tree;
  } catch (error) {
    console.error("[NodeConfigModal] 获取可用变量失败:", error);
    return [];
  }
});

/**
 * 关闭模态框
 */
function handleClose() {
  uiStore.closeNodeConfigModal();
  uiStore.clearNodeSelection();
}
</script>

<style scoped></style>
