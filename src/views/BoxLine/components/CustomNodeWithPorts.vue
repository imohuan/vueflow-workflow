<template>
  <div class="custom-node-content">
    <Handle
      id="left"
      type="target"
      :position="Position.Left"
      class="custom-handle handle-left"
    />
    <div class="node-label">{{ label || data?.label || "节点" }}</div>
    <Handle
      id="right"
      type="source"
      :position="Position.Right"
      class="custom-handle handle-right"
    />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core";

defineProps<{
  id?: string;
  label?: string | any;
  data?: any;
  [key: string]: any;
}>();
</script>

<style scoped>
.custom-node-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 10px;
}

.node-label {
  text-align: center;
}

.custom-handle {
  width: 12px;
  height: 12px;
  background: #555;
  border: 2px solid white;
  border-radius: 50%;
  transition: all 0.2s;
}

.custom-handle:hover {
  width: 16px;
  height: 16px;
  background: #ff0000;
}

.handle-left {
  left: 0;
  transform: translateX(-50%);
}

.handle-right {
  right: 0;
  transform: translateX(50%);
}

/* 保持悬停时的居中位置 */
.handle-left:hover {
  transform: translateX(-50%);
}

.handle-right:hover {
  transform: translateX(50%);
}
</style>
