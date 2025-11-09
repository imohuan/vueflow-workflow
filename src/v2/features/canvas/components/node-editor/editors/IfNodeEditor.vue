<template>
  <div class="mb-6">
    <h4
      class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"
    >
      <IconCode class="h-4 w-4" />
      条件配置
    </h4>

    <ConditionEditor
      :model-value="ifConfig"
      @update:model-value="handleIfConfigChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Node } from "@vue-flow/core";
import { useVueFlow } from "@vue-flow/core";
import ConditionEditor from "../components/ConditionEditor2.vue";
import IconCode from "@/icons/IconCode.vue";
import type { IfConfig } from "workflow-flow-nodes";

interface Props {
  selectedNode: Node;
  nodeConfig: Record<string, any>;
}

interface Emits {
  (e: "update:params", params: Record<string, any>): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { updateNode } = useVueFlow();

/**
 * If 节点配置
 * 统一从 data.params.config 读取
 */
const ifConfig = computed<IfConfig>(() => {
  return props.selectedNode.data.params?.config || { conditions: [] };
});

/**
 * 处理 If 节点配置变更
 * 统一保存到 data.params.config
 */
function handleIfConfigChange(config: IfConfig) {
  // 统一保存到 data.params.config
  const currentParams = props.selectedNode.data.params || {};

  updateNode(props.selectedNode.id, {
    data: {
      ...props.selectedNode.data,
      params: {
        ...currentParams,
        config, // 统一使用 params.config
      },
    },
  });

  // 通知父组件更新本地状态
  emit("update:params", {
    ...currentParams,
    config,
  });
}
</script>
