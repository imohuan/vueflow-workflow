<template>
  <div class="h-full overflow-y-auto variable-scroll">
    <!-- 未选中节点时的提示 -->
    <div
      v-if="!selectedNode"
      class="flex h-full items-center justify-center text-slate-400"
    >
      <div class="text-center">
        <IconConfig class="mx-auto mb-3 h-12 w-12 opacity-50" />
        <p class="text-sm">请在画布中选择一个节点</p>
        <p class="mt-1 text-xs text-slate-500">点击节点即可进行配置</p>
      </div>
    </div>

    <!-- 选中节点时显示配置表单 -->
    <div v-else class="p-4">
      <!-- If 节点特殊配置 -->
      <IfNodeEditor
        v-if="selectedNode.type === 'if'"
        :selected-node="selectedNode"
        :node-config="nodeConfig"
        @update:params="handleParamsUpdate"
      />

      <!-- Code 节点特殊配置 -->
      <CodeNodeEditor
        v-else-if="selectedNode.type === 'code'"
        :selected-node="selectedNode"
        :node-config="nodeConfig"
        @update:params="handleParamsUpdate"
      />

      <!-- 默认节点配置 -->
      <DefaultNodeEditor
        v-else
        :node-type-config="nodeTypeConfig"
        :model-value="nodeConfig.params"
        :is-dragging-variable="isDraggingVariable"
        @update:param="handleParamChange"
      />

      <!-- 操作按钮 -->
      <div class="flex gap-2 border-t border-slate-200 pt-4">
        <n-button size="small" @click="handleReset">
          <template #icon>
            <n-icon :component="IconReset" />
          </template>
          重置
        </n-button>
        <n-button type="error" size="small" secondary @click="handleDeleteNode">
          <template #icon>
            <n-icon :component="IconTrash" />
          </template>
          删除节点
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Node } from "@vue-flow/core";
import IconConfig from "@/icons/IconConfig.vue";
import IconReset from "@/icons/IconReset.vue";
import IconTrash from "@/icons/IconTrash.vue";
import IfNodeEditor from "./editors/IfNodeEditor.vue";
import CodeNodeEditor from "./editors/CodeNodeEditor.vue";
import DefaultNodeEditor from "./editors/DefaultNodeEditor.vue";
import type { ConfigField as ConfigFieldType } from "@/v2/typings/config";
import type { NodeConfigData } from "./types";

interface Props {
  selectedNode: Node | undefined;
  nodeConfig: NodeConfigData;
  nodeTypeConfig: ConfigFieldType[];
  isDraggingVariable: boolean;
}

interface Emits {
  (e: "param-change", key: string, value: any): void;
  (e: "reset"): void;
  (e: "delete"): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

function handleParamChange(key: string, value: any) {
  emit("param-change", key, value);
}

function handleParamsUpdate(params: Record<string, any>) {
  // 批量更新参数
  Object.entries(params).forEach(([key, value]) => {
    // 避免将 Proxy/响应式对象直接写入配置，统一转换为普通对象
    const plainValue =
      value && typeof value === "object"
        ? JSON.parse(JSON.stringify(value))
        : value;
    emit("param-change", key, plainValue);
    console.log("[NodeConfigTab handleParamsUpdate]", key, plainValue);
  });
}

function handleReset() {
  emit("reset");
}

function handleDeleteNode() {
  emit("delete");
}
</script>
