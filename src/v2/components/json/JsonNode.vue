<template>
  <div :class="isRoot ? '' : 'pl-5'">
    <!-- 对象或数组 -->
    <div v-if="isExpandable" class="space-y-0.5">
      <div
        class="flex items-center gap-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-1 -mx-1 transition-colors"
        @click="toggleExpand"
      >
        <!-- 展开/折叠图标 -->
        <span
          class="inline-flex items-center justify-center w-4 h-4 text-gray-400 transition-transform select-none"
          :class="{ 'rotate-90': isExpanded }"
        >
          <IconChevronRight class="w-3 h-3" />
        </span>

        <!-- 键名 -->
        <span
          v-if="name !== null"
          class="text-purple-600 dark:text-purple-400 font-medium select-text"
          >{{ name }}</span
        >
        <span class="text-gray-500 select-none">: </span>

        <!-- 类型标识 -->
        <span class="text-gray-600 dark:text-gray-400 select-none">{{
          nodeTypeLabel
        }}</span>

        <span
          v-if="!isExpanded && collapsedPreview"
          class="text-gray-400 dark:text-gray-500 text-xs ml-1 select-none"
        >
          {{ collapsedPreview }}
        </span>

        <!-- 长度信息 -->
        <span
          class="text-gray-400 dark:text-gray-500 text-xs ml-1 select-none"
          >{{ nodeCountLabel }}</span
        >
      </div>

      <!-- 子节点 - 只在展开时渲染 -->
      <div v-if="isExpanded" class="space-y-0.5">
        <JsonNode
          v-for="(value, key, index) in dataEntries"
          :key="String(key)"
          :name="String(key)"
          :data="value"
          :depth="props.depth + 1"
          :expand-mode="props.expandMode"
          :expand-trigger="props.expandTrigger"
          :is-first-branch="
            childIsFirstBranch(isArrayNode ? Number(key) : index)
          "
          :force-expand="
            childForceExpand(value, isArrayNode ? Number(key) : index)
          "
        />
      </div>
    </div>

    <!-- 基本类型值 -->
    <div v-else class="flex items-center gap-1 px-1">
      <!-- 占位符，保证与可折叠节点对齐 -->
      <span class="inline-flex w-4 h-4 select-none"></span>

      <!-- 键名 -->
      <span
        v-if="name !== null"
        class="text-purple-600 dark:text-purple-400 font-medium select-text"
        >{{ name }}</span
      >
      <span v-if="name !== null" class="text-gray-500 select-none">: </span>

      <!-- 值 -->
      <span
        :class="['flex-1 min-w-0 truncate select-text', valueClass]"
        :title="formattedValue"
      >
        {{ formattedValue }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import IconChevronRight from "@/icons/IconChevronRight.vue";
defineOptions({ name: "JsonNode" });

interface Props {
  /** 节点数据 */
  data: unknown;
  /** 节点名称（键名） */
  name?: string | null;
  /** 嵌套深度 */
  depth?: number;
  /** 是否为根节点 */
  isRoot?: boolean;
  /** 展开模式 */
  expandMode?: "none" | "first" | "all";
  /** 展开触发次数 */
  expandTrigger?: number;
  /** 当前路径是否在首项链路上 */
  isFirstBranch?: boolean;
  /** 是否强制展开 */
  forceExpand?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  name: null,
  depth: 0,
  isRoot: false,
  expandMode: "none",
  expandTrigger: 0,
  isFirstBranch: true,
  forceExpand: false,
});

// 展开状态
const isExpanded = ref(props.depth < 2); // 默认展开前两层

// 判断是否可展开（对象或数组）
const isExpandable = computed(() => {
  return props.data !== null && typeof props.data === "object";
});

// 数据类型
const dataType = computed(() => {
  if (props.data === null) return "null";
  if (Array.isArray(props.data)) return "array";
  return typeof props.data;
});

// 节点类型标签
const nodeTypeLabel = computed(() => {
  if (Array.isArray(props.data)) return "[";
  if (typeof props.data === "object" && props.data !== null) return "{";
  return "";
});

// 节点数量标签
const nodeCountLabel = computed(() => {
  if (Array.isArray(props.data)) {
    return props.data.length === 0 ? "]" : `${props.data.length} items`;
  }
  if (typeof props.data === "object" && props.data !== null) {
    const count = Object.keys(props.data).length;
    return count === 0 ? "}" : `${count} keys`;
  }
  return "";
});

// 闭合括号
const closeBracket = computed(() => {
  if (Array.isArray(props.data)) return "]";
  if (typeof props.data === "object" && props.data !== null) return "}";
  return "";
});

// 对象/数组的键值对
const dataEntries = computed(() => {
  if (!isExpandable.value) return [];
  if (Array.isArray(props.data)) {
    return props.data;
  }
  return props.data as Record<string, unknown>;
});

const isArrayNode = computed(() => Array.isArray(props.data));

// 格式化的基本类型值
const formattedValue = computed(() => {
  switch (dataType.value) {
    case "string":
      return `"${props.data}"`;
    case "null":
      return "null";
    case "undefined":
      return "undefined";
    case "boolean":
    case "number":
      return String(props.data);
    default:
      return String(props.data);
  }
});

// 值的样式类
const valueClass = computed(() => {
  const typeStyleMap: Record<string, string> = {
    string: "text-green-600 dark:text-green-400",
    number: "text-blue-600 dark:text-blue-400",
    boolean: "text-orange-600 dark:text-orange-400",
    null: "text-gray-400 dark:text-gray-500 italic",
    undefined: "text-gray-400 dark:text-gray-500 italic",
  };
  return typeStyleMap[dataType.value] || "text-gray-600 dark:text-gray-400";
});

// 切换展开状态
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

const collapsedPreview = computed(() => {
  if (!isExpandable.value || isExpanded.value) return "";
  const close = closeBracket.value || (isArrayNode.value ? "]" : "}");
  return `... ${close}`;
});

watch(
  () => [
    props.expandMode,
    props.expandTrigger,
    props.isFirstBranch,
    props.forceExpand,
  ],
  () => {
    if (!isExpandable.value) return;
    if (!props.expandTrigger) return;

    if (props.expandMode === "none") {
      isExpanded.value = false;
      return;
    }

    if (props.expandMode === "all") {
      isExpanded.value = true;
      return;
    }

    if (props.expandMode === "first") {
      if (props.forceExpand) {
        isExpanded.value = true;
        return;
      }
      isExpanded.value = props.isFirstBranch;
    }
  },
  { immediate: true }
);

const childIsFirstBranch = (index: number) => {
  if (props.expandMode === "all") return true;
  if (props.expandMode === "none") return false;

  if (props.expandMode === "first") {
    if (!props.isFirstBranch) return false;
    if (isArrayNode.value) {
      return index === 0;
    }
    return true;
  }

  return false;
};

const childForceExpand = (value: unknown, index: number) => {
  // 只在"展开首项"模式下才处理
  if (props.expandMode !== "first") return false;

  // expandTrigger 必须大于 0，表示用户点击了展开按钮
  if (!props.expandTrigger) return false;

  // 对于数组节点，第一个元素（index=0）如果是对象或数组，应该被强制展开
  if (isArrayNode.value && index === 0) {
    return value !== null && typeof value === "object";
  }

  // 对于在首项链路上的节点
  if (props.isFirstBranch) {
    // 子元素是数组，强制展开
    if (Array.isArray(value)) {
      return true;
    }
    // 对象的第一个属性，如果它是对象或数组，强制展开
    if (index === 0 && value !== null && typeof value === "object") {
      return true;
    }
  }

  return false;
};
</script>
