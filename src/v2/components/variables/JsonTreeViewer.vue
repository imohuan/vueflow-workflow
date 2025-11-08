<template>
  <div class="json-tree-viewer">
    <div class="json-tree-list">
      <JsonTreeNode :data="data" :depth="0" :path="''" :is-last="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import JsonTreeNode from "./JsonTreeNode.vue";

interface Props {
  /** JSON 数据 */
  data: unknown;
}

defineProps<Props>();
</script>

<style scoped>
.json-tree-viewer {
  width: 100%;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
    "Liberation Mono", monospace;
  font-size: 14px;
  line-height: 1.6;
}

.json-tree-list {
  position: relative;
}
</style>
