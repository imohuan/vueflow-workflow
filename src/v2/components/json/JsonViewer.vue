<template>
  <div class="font-mono text-sm leading-relaxed">
    <JsonNode
      :data="data"
      :name="rootName"
      :depth="0"
      :is-root="true"
      :is-first-branch="true"
      :expand-mode="expandMode"
      :expand-trigger="expandTrigger"
    />
  </div>
</template>

<script setup lang="ts">
import JsonNode from "./JsonNode.vue";

interface Props {
  /** JSON 数据 */
  data: unknown;
  /** 根节点名称 */
  rootName?: string;
  /** 展开模式 */
  expandMode?: "none" | "first" | "all";
  /** 展开触发次数 */
  expandTrigger?: number;
}

withDefaults(defineProps<Props>(), {
  rootName: "root",
  expandMode: "none",
  expandTrigger: 0,
});
</script>
