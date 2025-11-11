<template>
  <div class="json-tree-viewer">
    <div class="json-tree-list">
      <JsonTreeNode
        :data="props.data"
        :depth="0"
        :path="''"
        :is-last="true"
        :enable-drag="props.enableDrag"
        :expand-all="props.expandAll"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import JsonTreeNode from "./JsonTreeNode.vue";

interface Props {
  /** JSON 数据 */
  data: unknown;
  /** 是否启用拖拽 */
  enableDrag?: boolean;
  /** 是否展开所有节点 */
  expandAll?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  enableDrag: true,
  expandAll: false,
});
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
