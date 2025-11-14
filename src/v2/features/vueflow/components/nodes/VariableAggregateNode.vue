<template>
  <StandardNode
    :id="id"
    :data="standardNodeData"
    :selected="selected"
    :parent="parent"
  >
    <!-- 自定义内容区域 -->
    <template #default>
      <!-- 分组信息 -->
      <div v-if="groupInfo.length > 0" class="space-y-1">
        <div class="text-xs font-semibold text-gray-600 mb-2">
          📊 分组信息 ({{ groupInfo.length }})
        </div>
        <div
          v-for="(group, idx) in groupInfo"
          :key="idx"
          class="text-xs bg-gray-50 rounded p-2 border border-gray-200"
        >
          <div class="font-medium text-gray-700">{{ group.name }}</div>
          <div class="text-gray-500 text-[11px] mt-1">
            类型: {{ group.type }} | 项数: {{ group.itemCount }}
          </div>
          <div
            v-if="group.firstItem !== null && group.firstItem !== undefined"
            class="text-[11px] text-gray-600 mt-1 truncate"
          >
            首项: {{ formatValue(group.firstItem) }}
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="text-xs text-gray-400 text-center py-4">
        连接数据源以显示分组信息
      </div>
    </template>
  </StandardNode>
</template>

<script setup lang="ts">
import { computed } from "vue";
import StandardNode from "./StandardNode.vue";
import type { NodeStyleConfig } from "workflow-flow-nodes";

interface Props {
  id: string;
  data?: Record<string, any>;
  selected?: boolean;
  parent?: string;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => ({}),
  selected: false,
});

// 将 data 转换为 StandardNode 的格式
const standardNodeData = computed(() => {
  const style: NodeStyleConfig = {
    headerColor: ["#06b6d4", "#0891b2"], // 青色渐变
    icon: "📦",
    showIcon: true,
  };

  return {
    ...props.data,
    style,
  };
});

// 从执行结果中获取分组信息
const groupInfo = computed(() => {
  const executionResult = props.data?.executionResult;
  if (!executionResult?.summary?.groups) {
    return [];
  }
  return executionResult.summary.groups;
});

// 格式化值显示
const formatValue = (value: any): string => {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "string") {
    return value.length > 30 ? value.substring(0, 30) + "..." : value;
  }
  if (typeof value === "object") {
    const str = JSON.stringify(value);
    return str.length > 30 ? str.substring(0, 30) + "..." : str;
  }
  return String(value);
};
</script>

<style scoped>
.variable-aggregate-node {
  width: 280px;
  min-height: 120px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
}

/* 滚动条样式 */
.variable-aggregate-node ::-webkit-scrollbar {
  width: 6px;
}

.variable-aggregate-node ::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.variable-aggregate-node ::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.variable-aggregate-node ::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
