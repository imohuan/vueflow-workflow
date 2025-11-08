<!-- 节点编辑面板 - Linear App 风格 -->
<template>
  <div
    class="fixed inset-0 bg-black/10 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-200"
    @click.self="handleClose"
  >
    <div
      class="w-[95vw] h-[95vh] bg-[#fafafa] rounded-md overflow-hidden flex flex-col border border-slate-200 shadow-[0_8px_40px_rgba(0,0,0,0.08)] transition-transform duration-300"
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
        <!-- 头部 -->
        <div
          class="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 shrink-0"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex items-center justify-center w-7 h-7 rounded-lg bg-linear-to-br from-purple-500 to-purple-700 text-white transition-transform duration-200 hover:scale-105"
            >
              <IconCog class="w-4 h-4" />
            </div>
            <h3 class="text-[15px] font-medium text-[#1a1a1a] tracking-tight">
              节点配置
            </h3>
          </div>
          <button
            class="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700"
            @click="handleClose"
          >
            <IconClose class="w-4 h-4" />
          </button>
        </div>

        <!-- 内容区域 -->
        <Splitter class="flex-1 border-0! rounded-none! overflow-hidden">
          <!-- 左侧变量面板 -->
          <SplitterPanel
            :size="25"
            :minSize="15"
            class="border-0! overflow-hidden h-full"
          >
            <div
              class="w-full h-full overflow-hidden bg-white border-r border-slate-200"
            >
              <VariablePanel :variables="availableVariables" />
            </div>
          </SplitterPanel>

          <!-- 右侧配置区域 -->
          <SplitterPanel
            :size="75"
            :minSize="50"
            class="border-0! overflow-hidden h-full"
          >
            <div
              class="w-full h-full overflow-y-auto variable-scroll bg-[#f6f6f8]"
            >
              <div class="max-w-3xl mx-auto p-4 space-y-3">
                <!-- 基本信息区域 -->
                <div
                  class="bg-white border border-slate-200 rounded-md overflow-hidden transition-colors duration-200 hover:border-slate-300"
                >
                  <div
                    class="px-4 py-2.5 bg-slate-50 border-b border-slate-200"
                  >
                    <span
                      class="text-sm font-medium text-slate-600 tracking-tight"
                      >基本信息</span
                    >
                  </div>
                  <div class="p-4 flex flex-col gap-2">
                    <label class="text-sm font-medium text-slate-600"
                      >节点标签</label
                    >
                    <InputText
                      v-model="nodeLabel"
                      type="text"
                      placeholder="输入节点标签"
                      @change="updateLabel"
                    />
                  </div>
                </div>

                <!-- 配置数据 -->
                <NodeConfigForm />

                <!-- 操作按钮组 -->
                <div
                  class="flex gap-3 p-3 bg-white border border-slate-200 rounded-md"
                >
                  <Button
                    class="flex-1"
                    variant="filled"
                    severity="primary"
                    @click="handleExecute"
                  >
                    <IconPlayCircle class="w-4 h-4" />
                    <span>执行节点</span>
                  </Button>
                  <Button
                    class="flex-1"
                    variant="outlined"
                    severity="secondary"
                    @click="handleDelete"
                  >
                    <IconTrash class="w-4 h-4" />
                    <span>删除节点</span>
                  </Button>
                </div>
              </div>
            </div>
          </SplitterPanel>
        </Splitter>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useNodeEditorStore } from "../../stores/nodeEditor";
import InputText from "../common/InputText.vue";
import IconEmptyNode from "@/icons/IconEmptyNode.vue";
import NodeConfigForm from "./NodeConfigForm.vue";
import VariablePanel from "./VariablePanel.vue";
import Button from "../common/Button.vue";
import IconCog from "@/icons/IconCog.vue";
import IconClose from "@/icons/IconClose.vue";
import IconPlayCircle from "@/icons/IconPlayCircle.vue";
import IconTrash from "@/icons/IconTrash.vue";
import Splitter from "@/volt/Splitter.vue";
import SplitterPanel from "primevue/splitterpanel";

const store = useNodeEditorStore();
const { selectedNode } = store;

const nodeLabel = ref("");
const availableVariables = computed(() => {
  if (!store.selectedNodeId) {
    return [];
  }
  const variables = store.getAvailableVariables(store.selectedNodeId);
  return variables;
});

// 监听选中节点变化，更新标签
watch(
  () => store.selectedNode,
  (node) => {
    if (node && node.data) {
      nodeLabel.value = node.data.label || "";
    }
  },
  { immediate: true }
);

/**
 * 更新节点标签
 */
function updateLabel() {
  if (selectedNode && selectedNode.data) {
    store.updateNodeData(selectedNode.id, { label: nodeLabel.value });
  }
}

/**
 * 关闭面板
 */
function handleClose() {
  store.closeNodeEditor();
  store.selectNode(null);
}

/**
 * 执行节点
 */
function handleExecute() {
  if (selectedNode) {
    store.executeNode(selectedNode.id);
  }
}

/**
 * 删除节点
 */
function handleDelete() {
  if (selectedNode) {
    const nodeId = selectedNode.id;
    store.removeNode(nodeId);
  }
}
</script>
