<template>
  <StandardNode :id="id" :data="standardNodeData" :selected="selected">
    <template #default>
      <div v-if="data.description" class="end-node__description">
        {{ data.description }}
      </div>
      <div v-else class="end-node__placeholder">工作流程结束</div>
    </template>
  </StandardNode>
</template>

<script setup lang="ts">
import { computed } from "vue";
import StandardNode from "./StandardNode.vue";
import type { NodeStyleConfig } from "workflow-flow-nodes";

interface Props {
  id: string;
  data: {
    label?: string;
    description?: string;
    status?: "pending" | "running" | "success" | "error";
    [key: string]: any;
  };
  selected?: boolean;
}

const props = defineProps<Props>();

// 将 EndNode 的 data 转换为 StandardNode 的 data 格式
const standardNodeData = computed(() => {
  const style: NodeStyleConfig = {
    // 使用红色渐变作为标题栏颜色
    headerColor: ["#ef4444", "#dc2626"],
    // 使用停止图标
    icon: "■",
    showIcon: true,
  };

  return {
    ...props.data,
    label: props.data.label || "结束",
    noOutputs: true, // 结束节点没有输出
    style,
  };
});
</script>

<style scoped>
.end-node__description {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.end-node__placeholder {
  font-size: 12px;
  color: #ef4444;
  font-style: italic;
}
</style>
