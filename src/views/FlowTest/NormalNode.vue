<template>
  <div class="normal-node" :class="{ selected: selected }">
    <div class="node-header">
      <div class="node-icon">
        <IconBell class="w-4 h-4" />
      </div>
      <div class="node-label">{{ label }}</div>
    </div>

    <!-- 输出端口（右侧） -->
    <Handle
      id="output"
      type="source"
      :position="Position.Right"
      class="custom-handle handle-output"
    />

    <!-- 输入端口（左侧） -->
    <Handle
      id="input"
      type="target"
      :position="Position.Left"
      class="custom-handle handle-input"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position } from "@vue-flow/core";
import IconBell from "@/icons/IconBell.vue";

interface Props {
  data: {
    label: string;
  };
  selected?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
});

const label = computed(() => props.data.label);
</script>

<style scoped>
.normal-node {
  background: white;
  border: 3px solid #3b82f6;
  border-radius: 12px;
  padding: 16px 20px;
  min-width: 160px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  color: #1e40af;
}

.normal-node.selected {
  border-color: #1d4ed8;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.node-icon {
  width: 28px;
  height: 28px;
  background: #dbeafe;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
}

.node-label {
  font-weight: 600;
  font-size: 14px;
}

.custom-handle {
  width: 12px;
  height: 12px;
  border: 2px solid #3b82f6;
  background: white;
}

.handle-output {
  right: -6px;
}

.handle-input {
  left: -6px;
}
</style>
