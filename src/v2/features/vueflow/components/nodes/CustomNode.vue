<template>
  <StandardNode
    :id="id"
    :data="standardNodeData"
    :selected="selected"
    :parent="parent"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import StandardNode from "./StandardNode.vue";
import type { NodeStyleConfig } from "workflow-flow-nodes";

interface Props {
  id: string;
  data: {
    label: string;
    type?: string;
    description?: string;
    icon?: any;
    color?: string;
    status?: "pending" | "running" | "success" | "error";
    noInputs?: boolean;
    noOutputs?: boolean;
    showExecuteButton?: boolean;
    showDeleteButton?: boolean;
    [key: string]: any;
  };
  selected?: boolean;
  parent?: string;
}

const props = defineProps<Props>();

// 将 CustomNode 的 data 转换为 StandardNode 的 data 格式
const standardNodeData = computed(() => {
  const style: NodeStyleConfig = {
    // 如果提供了 color，使用它作为 headerColor
    ...(props.data.color && { headerColor: props.data.color }),
    // 如果提供了 icon，使用它
    ...(props.data.icon && { icon: props.data.icon }),
  };

  return {
    ...props.data,
    style: Object.keys(style).length > 0 ? style : undefined,
  };
});
</script>
