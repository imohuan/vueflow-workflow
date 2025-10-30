<template>
  <div class="parent-node-content">
    <!-- 左侧端口（作为 source 输出到子节点，连接线向右侧延伸） -->
    <Handle
      id="left-out"
      type="source"
      :position="Position.Right"
      class="custom-handle handle-left parent-handle handle-left-out"
    />
    <div class="node-label">{{ label || data?.label || "父节点" }}</div>
    <!-- 右侧端口（作为 target 从子节点接收，连接线从左侧进入） -->
    <Handle
      id="right-in"
      type="target"
      :position="Position.Left"
      class="custom-handle handle-right parent-handle handle-right-in"
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
.parent-node-content {
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

/* 保持悬停时的居中位置 */
.handle-left:hover,
.handle-left-out:hover {
  transform: translateX(-50%);
}

.handle-right:hover,
.handle-right-in:hover {
  transform: translateX(50%);
}

.parent-handle {
  background: #10b981;
  z-index: 10;
}

.parent-handle:hover {
  background: #059669;
}

.handle-left {
  left: 0;
  right: auto;
  transform: translateX(-50%);
}

.handle-right {
  right: 0;
  left: auto;
  transform: translateX(50%);
}

/* 强制左侧输出端口显示在左侧（虽然 position 是 Right） */
.handle-left-out {
  left: 0 !important;
  right: auto !important;
  transform: translateX(-50%) !important;
}

/* 强制右侧输入端口显示在右侧（虽然 position 是 Left） */
.handle-right-in {
  right: 0 !important;
  left: auto !important;
  transform: translateX(50%) !important;
}
</style>
