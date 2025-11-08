<template>
  <div
    class="connector-node"
    :class="{
      'connector-node--selected': selected,
    }"
  >
    <!-- 输入端口 -->
    <PortHandle
      id="input"
      type="target"
      :position="Position.Left"
      :node-id="id"
      variant="circle"
    />

    <!-- 输出端口 -->
    <PortHandle
      id="output"
      type="source"
      :position="Position.Right"
      :node-id="id"
      variant="circle"
    />
  </div>
</template>

<script setup lang="ts">
import { Position } from "@vue-flow/core";
import { PortHandle } from "../ports";
import "../ports/portStyles.css";

interface Props {
  id: string;
  data?: Record<string, any>;
  selected?: boolean;
}

defineProps<Props>();
</script>

<style scoped>
.connector-node {
  width: 40px;
  height: 30px;
  background: #ffffff;
  border: 2px solid #e5e7eb;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
  transition: all 0.2s ease;
}

.connector-node--selected {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
}
</style>
