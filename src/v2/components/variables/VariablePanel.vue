<template>
  <div class="h-full flex flex-col">
    <!-- 标题栏 -->
    <div class="shrink-0 border-b border-slate-200 px-4 py-3">
      <div class="flex items-center justify-between gap-3">
        <!-- 左侧标题 -->
        <h3
          class="text-sm font-semibold text-slate-900 uppercase tracking-wide"
        >
          {{ title }}
        </h3>
        <!-- 右侧操作区 -->
        <div class="flex items-center gap-2">
          <!-- 自定义标题右侧内容插槽 -->
          <slot name="title-right">
            <!-- 搜索区域（固定高度容器） -->
            <div v-if="showSearch" class="h-7 flex items-center relative">
              <div
                class="overflow-hidden transition-all duration-200 ease-out"
                :style="{
                  width: isSearchExpanded ? '8rem' : '1.75rem',
                  opacity: isSearchExpanded ? 1 : 0,
                }"
              >
                <n-input
                  v-show="isSearchExpanded"
                  v-model:value="searchQuery"
                  size="small"
                  placeholder="搜索..."
                  class="w-32 n-input-gray"
                  @blur="handleSearchBlur"
                  @keyup.escape="isSearchExpanded = false"
                  ref="searchInputRef"
                >
                  <template #prefix>
                    <IconSearch class="w-4 h-4 text-slate-400" />
                  </template>
                </n-input>
              </div>
              <button
                v-show="!isSearchExpanded"
                @click="expandSearch"
                class="absolute left-0 h-7 w-7 flex items-center justify-center text-slate-600 cursor-pointer transition-opacity duration-200"
              >
                <IconSearch class="w-4 h-4" />
              </button>
            </div>
            <!-- 视图模式切换按钮组 -->
            <ToggleButtonGroup
              v-if="showViewModeToggle"
              v-model="viewMode"
              :options="viewModeOptions"
            />
            <!-- 自定义右侧按钮插槽 -->
            <slot name="header-actions"></slot>
          </slot>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="flex-1 overflow-auto variable-scroll">
      <!-- 自定义内容插槽，如果提供了则使用自定义内容 -->
      <slot name="content">
        <div class="px-4 py-4">
          <!-- Schema 视图：VariableTreeItem -->
          <template v-if="viewMode === 'schema'">
            <div
              v-if="filteredVariables.length === 0"
              class="flex items-center justify-center p-5"
            >
              <div
                class="text-[11px] text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-md p-4 text-center"
              >
                {{ emptyText || "暂无可用变量" }}<br />
                <span class="text-[10px]">{{
                  emptyHint || "执行上游节点后显示"
                }}</span>
              </div>
            </div>
            <div v-else class="space-y-1">
              <VariableTreeItem
                v-for="node in filteredVariables"
                :key="node.id"
                :node="node"
                :level="0"
                :enable-drag="props.enableDrag"
              />
            </div>
          </template>

          <!-- JSON 视图：JsonTreeViewer -->
          <template v-else-if="viewMode === 'json'">
            <!-- 下拉框和数据条数（仅在 showJsonSelector 为 true 时显示） -->
            <div
              v-if="props.showJsonSelector"
              class="shrink-0 flex items-center gap-2 pb-2"
            >
              <div class="w-32">
                <n-select
                  v-model:value="selectedVariableNode"
                  :options="variableNodeOptions"
                  size="small"
                  placeholder="选择变量"
                />
              </div>
              <span class="text-xs text-slate-500 font-mono">
                {{ dataItemCount }}
              </span>
            </div>
            <!-- 显示选中的变量数据 -->
            <JsonTreeViewer
              v-if="selectedVariableData"
              :data="selectedVariableData"
              :enable-drag="props.enableDrag"
            />
            <div
              v-else-if="props.showJsonSelector"
              class="flex items-center justify-center p-5 text-sm text-slate-400"
            >
              请选择一个变量节点
            </div>
            <!-- 不显示下拉菜单时，直接显示第一个变量的数据 -->
            <template v-else>
              <JsonTreeViewer
                v-if="props.variables.length > 0 && jsonRootData"
                :data="jsonRootData"
                :enable-drag="props.enableDrag"
              />
              <div
                v-else
                class="flex items-center justify-center p-5 text-sm text-slate-400"
              >
                {{ emptyText || "暂无数据" }}
              </div>
            </template>
          </template>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { NInput, NSelect } from "naive-ui";
import { ToggleButtonGroup } from "@/v2/components/ui";
import VariableTreeItem from "./VariableTreeItem.vue";
import JsonTreeViewer from "./JsonTreeViewer.vue";
import IconSearch from "@/icons/IconSearch.vue";
import type { VariableTreeNode } from "../../features/canvas/utils/variableResolver";

interface Props {
  /** 面板标题 */
  title: string;
  /** 变量列表 */
  variables: VariableTreeNode[];
  /** 是否显示搜索框 */
  showSearch?: boolean;
  /** 是否显示视图模式切换 */
  showViewModeToggle?: boolean;
  /** 视图模式选项 */
  viewModeOptions?: Array<{ value: string; label: string }>;
  /** 空状态提示文本 */
  emptyText?: string;
  /** 空状态提示说明 */
  emptyHint?: string;
  /** 默认视图模式 */
  defaultViewMode?: "schema" | "json";
  /** 是否启用拖拽 */
  enableDrag?: boolean;
  /** 是否显示 JSON 视图的下拉选择器 */
  showJsonSelector?: boolean;
}

interface Emits {
  (e: "update:viewMode", value: "schema" | "json"): void;
  (e: "update:searchQuery", value: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  showSearch: true,
  showViewModeToggle: true,
  viewModeOptions: () => [
    { value: "schema", label: "Schema" },
    { value: "json", label: "JSON" },
  ],
  emptyText: "暂无可用变量",
  emptyHint: "执行上游节点后显示",
  defaultViewMode: "schema",
  enableDrag: true,
  showJsonSelector: true,
});

const emit = defineEmits<Emits>();

// 视图模式：使用 props.defaultViewMode 初始化，但支持外部更新
const viewMode = ref<"schema" | "json">(props.defaultViewMode);

// 监听 defaultViewMode 变化，同步到内部状态
watch(
  () => props.defaultViewMode,
  (newMode) => {
    if (newMode !== viewMode.value) {
      viewMode.value = newMode;
    }
  }
);

// 搜索相关
const isSearchExpanded = ref(false);
const searchQuery = ref("");
const searchInputRef = ref<InstanceType<typeof NInput> | null>(null);

// JSON 视图相关
const selectedVariableNode = ref<string | null>(null);

// 自动选中第一个变量节点（需要在 watch 之前定义）
const selectFirstVariable = () => {
  if (
    viewMode.value === "json" &&
    props.variables.length > 0 &&
    (!selectedVariableNode.value ||
      !props.variables.find((n) => n.id === selectedVariableNode.value))
  ) {
    selectedVariableNode.value = props.variables[0]?.id ?? null;
  }
};

// 监听视图模式变化
watch(
  () => viewMode.value,
  (newMode) => {
    emit("update:viewMode", newMode);
    if (newMode === "json") {
      selectFirstVariable();
    }
  }
);

// 监听搜索查询变化
watch(
  () => searchQuery.value,
  (newQuery) => {
    emit("update:searchQuery", newQuery);
  }
);

// 监听变量列表变化，自动选中第一个
watch(
  () => props.variables,
  () => {
    selectFirstVariable();
  },
  { immediate: true }
);

/** 过滤后的变量列表（根据搜索关键词） */
const filteredVariables = computed<VariableTreeNode[]>(() => {
  if (!searchQuery.value.trim()) {
    return props.variables;
  }

  const query = searchQuery.value.toLowerCase().trim();

  const filterNode = (node: VariableTreeNode): VariableTreeNode | null => {
    // 检查当前节点是否匹配
    const matchesLabel = node.label.toLowerCase().includes(query);

    // 递归过滤子节点
    const filteredChildren =
      node.children
        ?.map(filterNode)
        .filter((n): n is VariableTreeNode => n !== null) || [];

    // 如果当前节点匹配或有匹配的子节点，则保留
    if (matchesLabel || filteredChildren.length > 0) {
      return {
        ...node,
        children:
          filteredChildren.length > 0 ? filteredChildren : node.children,
      };
    }

    return null;
  };

  return props.variables
    .map(filterNode)
    .filter((n): n is VariableTreeNode => n !== null);
});

/** 变量节点选项（用于下拉框） */
const variableNodeOptions = computed(() => {
  return props.variables.map((node) => ({
    label: node.label,
    value: node.id,
  }));
});

/**
 * 将 VariableTreeNode 转换为 JSON 数据
 * 如果节点有子节点，从子节点构建对象/数组；否则使用节点的 value
 */
function variableTreeNodeToJson(node: VariableTreeNode): unknown {
  // 如果有子节点，从子节点构建数据结构
  if (node.children && node.children.length > 0) {
    // 判断是数组还是对象
    // 如果所有子节点的 label 都是数字索引格式（如 [0], [1]），则视为数组
    const isArray = node.children.every((child) => {
      const label = child.label.trim();
      return /^\[\d+\]$/.test(label);
    });

    if (isArray) {
      // 构建数组：按索引排序
      const array: unknown[] = [];
      node.children.forEach((child) => {
        const match = child.label.match(/^\[(\d+)\]$/);
        if (match && match[1]) {
          const index = parseInt(match[1], 10);
          array[index] = variableTreeNodeToJson(child);
        }
      });
      return array;
    } else {
      // 构建对象：使用 label 作为 key
      const obj: Record<string, unknown> = {};
      node.children.forEach((child) => {
        obj[child.label] = variableTreeNodeToJson(child);
      });
      return obj;
    }
  }

  // 没有子节点，直接返回 value
  return node.value;
}

/** 选中的变量数据 */
const selectedVariableData = computed(() => {
  if (!selectedVariableNode.value) {
    return null;
  }
  const node = props.variables.find((n) => n.id === selectedVariableNode.value);
  if (!node) {
    return null;
  }
  return variableTreeNodeToJson(node);
});

/** JSON 根数据（不显示下拉菜单时使用第一个变量） */
const jsonRootData = computed(() => {
  if (props.variables.length === 0) {
    return null;
  }
  // 直接使用第一个变量的数据
  const firstVariable = props.variables[0];
  if (!firstVariable) {
    return null;
  }
  return variableTreeNodeToJson(firstVariable);
});

/** 计算数据条数 */
const dataItemCount = computed(() => {
  const data = selectedVariableData.value;
  if (!data) return "0 items";

  if (Array.isArray(data)) {
    const count = data.length;
    return count === 1 ? "1 item" : `${count} items`;
  }
  if (typeof data === "object" && data !== null) {
    const count = Object.keys(data).length;
    return count === 1 ? "1 item" : `${count} items`;
  }
  return "1 item";
});

// 搜索相关处理
const handleSearchBlur = () => {
  if (!searchQuery.value) {
    isSearchExpanded.value = false;
  }
};

// 当搜索框展开时自动聚焦
const expandSearch = async () => {
  isSearchExpanded.value = true;
  await nextTick();
  searchInputRef.value?.focus();
};

// 暴露方法和属性供父组件使用
defineExpose({
  viewMode,
  searchQuery,
  selectedVariableNode,
  clearSearch: () => {
    searchQuery.value = "";
    isSearchExpanded.value = false;
  },
});
</script>

<style scoped>
@import "@/v2/style.css";
</style>
