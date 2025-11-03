<template>
  <component :is="currentComponent" v-bind="props" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { NodeData } from "@/typings/nodeEditor";
import BasicNode from "./nodes/BasicNode.vue";
import IfNode from "./nodes/IfNode.vue";
import ForNode from "./nodes/ForNode.vue";
import CodeExecutorNode from "./nodes/CodeExecutorNode.vue";

interface Props {
  id: string;
  data: NodeData;
  selected?: boolean;
}

const props = defineProps<Props>();

const componentMap = {
  default: BasicNode,
  if: IfNode,
  for: ForNode,
  code: CodeExecutorNode,
} as const;

const variant = computed(
  () => props.data.variant || props.id.split("_")[0] || ""
);

const currentComponent = computed(() => {
  if (variant.value === "for") {
    return componentMap.for;
  }
  if (variant.value === "if") {
    return componentMap.if;
  }
  if (variant.value === "code") {
    return componentMap.code;
  }
  return componentMap.default;
});
</script>
