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
      <div v-if="configGroups.length > 0" class="space-y-2">
        <div
          v-for="(group, idx) in displayGroups"
          :key="group.name ?? idx"
          class="flex items-start gap-3"
        >
          <!-- 左侧：分组标题 -->
          <div
            class="text-[10px] font-medium text-gray-500 whitespace-nowrap min-w-fit"
          >
            {{ group.name }}
          </div>

          <!-- 右侧：Tag 组（横向排列，自动换行） -->
          <div class="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-2">
            <span
              v-for="(label, childIdx) in group.items"
              :key="label + ':' + childIdx"
              class="inline-flex items-center px-1 py-0.5 rounded-md text-[8px] font-medium bg-gray-200 text-gray-800 truncate max-w-[140px]"
              :title="label"
            >
              {{ label }}
            </span>
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

const STANDARD_STYLE: NodeStyleConfig = {
  headerColor: ["#06b6d4", "#0891b2"],
  icon: "📦",
  showIcon: true,
};

const standardNodeData = computed(() => {
  return {
    ...props.data,
    style: STANDARD_STYLE,
  };
});

// 从节点配置中获取分组信息
const configGroups = computed(() => {
  const params = props.data?.params;
  if (!params?.data || !Array.isArray(params.data)) {
    return [];
  }
  return params.data;
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

const getChildRawValue = (child: any): any => {
  if (child && typeof child === "object") {
    if (child.name !== undefined && child.name !== null) return child.name;
    if (child.label !== undefined && child.label !== null) return child.label;
    if (child.value !== undefined && child.value !== null) return child.value;
    return undefined;
  }
  return child;
};

const isEmptyChild = (child: any): boolean => {
  const v = getChildRawValue(child);
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  return s.length === 0;
};

const getFilteredChildren = (children: any[] | undefined): any[] => {
  return (children || []).filter((c) => !isEmptyChild(c));
};

const childValueLabel = (child: any): string => {
  const v = getChildRawValue(child);
  if (v === null || v === undefined) return "";
  const s = String(v);
  return s.length > 30 ? s.substring(0, 30) + "..." : s;
};

const displayGroups = computed(() => {
  return configGroups.value.map((g: any) => {
    const children = getFilteredChildren(g?.children);
    const items = children.map((c) => childValueLabel(c));
    return {
      name: g?.name ?? "",
      items,
    };
  });
});
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
