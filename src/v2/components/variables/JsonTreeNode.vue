<template>
  <div class="json-tree-node-wrapper">
    <!-- 自定义拖拽跟随元素 -->
    <Teleport to="body">
      <!-- 手掌图标 - 跟随鼠标实时移动 -->
      <div
        v-if="dropTargetState !== 'default'"
        class="fixed pointer-events-none z-10001 w-8 h-8 flex items-center justify-center"
        :style="{
          left: dragPosition.x + 'px',
          top: dragPosition.y + 'px',
          transform: 'translate(-50%, -50%)',
        }"
      >
        <IconHand class="w-5 h-5 text-slate-800" />
      </div>

      <!-- 拖拽信息提示框 -->
      <div
        v-if="showDragFollower"
        class="fixed pointer-events-none z-10000 px-3 py-1 text-xs font-medium rounded-lg shadow-lg backdrop-blur"
        :class="[
          isCtrlPressed
            ? 'bg-purple-100/95 border-2 border-purple-400 text-purple-700'
            : dropTargetState === 'empty'
            ? 'bg-emerald-100/95 border-2 border-emerald-400 text-emerald-700'
            : dropTargetState === 'hasContent'
            ? 'bg-blue-100/95 border-2 border-blue-400 text-blue-700'
            : 'bg-red-100/95 border-2 border-red-400 text-red-700',
        ]"
        :style="dragFollowerStyle"
      >
        <div class="flex items-center gap-1.5">
          <!-- 状态图标指示器 -->
          <span
            v-if="isCtrlPressed"
            class="text-purple-600 text-xs"
            >⟳</span
          >
          <span
            v-else-if="dropTargetState === 'empty'"
            class="text-emerald-600 text-xs"
            >⇱</span
          >
          <span
            v-else-if="dropTargetState === 'hasContent'"
            class="text-blue-600 text-xs"
            >↓</span
          >

          {{ keyName }}

          <!-- 提示文字 -->
          <span
            v-if="isCtrlPressed"
            class="text-[10px] opacity-70"
            >替换</span
          >
          <span
            v-else-if="dropTargetState === 'empty'"
            class="text-[10px] opacity-70"
            >吸附左侧</span
          >
          <span
            v-else-if="dropTargetState === 'hasContent'"
            class="text-[10px] opacity-70"
            >插入位置</span
          >
        </div>
      </div>
    </Teleport>

    <!-- 节点行 -->
    <div class="json-tree-node">
      <!-- 左侧缩进和虚线 -->
      <div class="json-indent">
        <template v-for="i in depth" :key="i">
          <div
            class="json-indent-unit"
            :class="{
              'has-line': shouldShowLineAtLevel(i - 1),
            }"
          ></div>
        </template>
      </div>

      <!-- 内容区域 -->
      <span class="json-content">
        <!-- 如果有键名，先显示键名 -->
        <template v-if="keyName !== null">
          <ContextMenu :items="keyContextMenuItems">
            <span class="json-key">
              <span
                class="json-key-content"
                :class="{
                  'cursor-grab active:cursor-grabbing': props.enableDrag,
                  'cursor-default': !props.enableDrag,
                  'is-dragging': isDragging,
                  'is-highlight': isHighlighted,
                }"
                @mousedown="handleKeyMouseDown"
              >
                "{{ keyName }}"
              </span>
              <span class="json-colon">: </span>
            </span>
          </ContextMenu>
        </template>

        <!-- 然后根据值类型显示内容 -->
        <!-- 对象或数组的开始括号 -->
        <template v-if="isExpandable">
          <span class="json-brackets cursor-pointer" @click="toggleExpand">
            {{ openBracket }}
          </span>

          <!-- 折叠时显示预览 -->
          <template v-if="!isExpanded">
            <span
              class="json-collapsed-content cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
              @click="toggleExpand"
            >
              ...
            </span>
            <span class="json-brackets cursor-pointer" @click="toggleExpand">
              {{ closeBracket }}
            </span>
            <span class="json-item-count text-gray-400 ml-2">
              // {{ itemCountLabel }}
            </span>
            <span v-if="!isLast" class="json-comma">,</span>
          </template>
        </template>

        <!-- 基本类型值 -->
        <template v-else>
          <ContextMenu :items="valueContextMenuItems">
            <span
              class="json-value"
              :class="[valueClass, { 'is-highlight': isHighlighted }]"
            >
              {{ formattedValue }}
            </span>
          </ContextMenu>
          <span v-if="!isLast" class="json-comma">,</span>
        </template>
      </span>
    </div>

    <!-- 子节点 -->
    <template v-if="isExpanded && isExpandable">
      <JsonTreeNode
        v-for="(childValue, childKey, index) in childEntries"
        :key="getChildKey(childKey, index)"
        :data="childValue"
        :key-name="isArrayNode ? null : String(childKey)"
        :depth="depth + 1"
        :path="getChildPath(childKey, index)"
        :is-last="isLastChild(index)"
        :parent-is-last="isLast"
        :enable-drag="props.enableDrag"
        :expand-all="props.expandAll"
      />
      <!-- 闭合括号 -->
      <div class="json-tree-node">
        <div class="json-indent">
          <template v-for="i in depth" :key="i">
            <div
              class="json-indent-unit"
              :class="{
                'has-line': shouldShowLineAtLevel(i - 1),
              }"
            ></div>
          </template>
        </div>
        <span class="json-content">
          <span class="json-brackets cursor-pointer" @click="toggleExpand">
            {{ closeBracket }}
          </span>
          <span v-if="!isLast" class="json-comma">,</span>
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useEditableDrag } from "@/v2/composables/useEditableDrag";
import IconHand from "@/icons/IconHand.vue";
import { useMessage } from "naive-ui";
import ContextMenu from "@/v2/components/common/ContextMenu.vue";
import IconCopyKey from "@/icons/IconCopyKey.vue";
import IconCopyValue from "@/icons/IconCopyValue.vue";
import IconCopyPath from "@/icons/IconCopyPath.vue";
import IconCopyReference from "@/icons/IconCopyReference.vue";

defineOptions({ name: "JsonTreeNode" });

interface Props {
  /** 节点数据 */
  data: unknown;
  /** 键名（null 表示数组元素） */
  keyName?: string | null;
  /** 嵌套深度 */
  depth?: number;
  /** JSON 路径 */
  path?: string;
  /** 是否为最后一个元素 */
  isLast?: boolean;
  /** 父节点是否为最后一个 */
  parentIsLast?: boolean;
  /** 是否启用拖拽 */
  enableDrag?: boolean;
  /** 是否展开所有节点 */
  expandAll?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  keyName: null,
  depth: 0,
  path: "",
  isLast: true,
  parentIsLast: true,
  enableDrag: true,
  expandAll: false,
});

// 展开状态
const isExpanded = ref(props.expandAll || props.depth < 2);

// 判断是否可展开（对象或数组）
const isExpandable = computed(() => {
  return props.data !== null && typeof props.data === "object";
});

// 是否为数组节点
const isArrayNode = computed(() => Array.isArray(props.data));

// 开始括号
const openBracket = computed(() => {
  if (Array.isArray(props.data)) return "[";
  if (typeof props.data === "object" && props.data !== null) return "{";
  return "";
});

// 闭合括号
const closeBracket = computed(() => {
  if (Array.isArray(props.data)) return "]";
  if (typeof props.data === "object" && props.data !== null) return "}";
  return "";
});

// 子节点条目
const childEntries = computed(() => {
  if (!isExpandable.value) return [];
  if (Array.isArray(props.data)) {
    return props.data;
  }
  return props.data as Record<string, unknown>;
});

// 项目数量标签
const itemCountLabel = computed(() => {
  if (Array.isArray(props.data)) {
    const count = props.data.length;
    return count === 1 ? "1 item" : `${count} items`;
  }
  if (typeof props.data === "object" && props.data !== null) {
    const count = Object.keys(props.data).length;
    return count === 1 ? "1 key" : `${count} keys`;
  }
  return "";
});

// 获取子节点的键
const getChildKey = (key: string | number, index: number) => {
  if (isArrayNode.value) return index;
  return String(key);
};

// 获取子节点的路径
const getChildPath = (key: string | number, index: number) => {
  if (isArrayNode.value) {
    return props.path ? `${props.path}[${index}]` : `[${index}]`;
  }
  const keyStr = String(key);
  return props.path ? `${props.path}.${keyStr}` : keyStr;
};

// 判断是否为最后一个子节点
const isLastChild = (index: number) => {
  const entries = childEntries.value;
  if (Array.isArray(entries)) {
    return index === entries.length - 1;
  }
  const keys = Object.keys(entries);
  return index === keys.length - 1;
};

// 判断在指定层级是否应该显示虚线
// level 是缩进层级索引 (0-based, 0 表示第一层)
const shouldShowLineAtLevel = (level: number) => {
  // 如果当前节点不是最后一个,则所有层级都显示虚线
  if (!props.isLast) return true;

  // 如果当前节点是最后一个,但父节点不是最后一个,则显示虚线
  // 这意味着当前层级及以上的层级都应该显示虚线
  if (props.isLast && props.parentIsLast === false) {
    return level < props.depth;
  }

  // 如果当前节点是对象或数组的开始括号,且该对象/数组有子节点,则应该显示虚线到闭合括号
  // 对于展开的对象/数组，即使它是最后一个，也应该显示虚线到闭合括号
  if (props.isLast && isExpandable.value && isExpanded.value) {
    // 对于所有层级的节点（包括根节点），如果展开且有子节点，都应该显示虚线
    // 但根节点（depth=0）本身不显示虚线，因为根节点没有父级
    if (props.depth === 0) {
      return false;
    }
    // 对于其他层级的节点，显示虚线
    return level < props.depth;
  }

  // 如果当前节点是最后一个属性/元素（非根节点），应该显示虚线
  // 因为虚线需要延伸到父节点的闭合括号
  // 只要 depth > 0，说明有父节点，且父节点肯定是展开的（否则这个节点不会显示）
  if (props.isLast && props.depth > 0) {
    return level < props.depth;
  }

  // 其他情况不显示虚线
  return false;
};

// 切换展开状态
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

// 数据类型
const dataType = computed(() => {
  if (props.data === null) return "null";
  if (Array.isArray(props.data)) return "array";
  return typeof props.data;
});

// 格式化的值
const formattedValue = computed(() => {
  switch (dataType.value) {
    case "string":
      return `"${props.data}"`;
    case "null":
      return "null";
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
    string: "json-value-string",
    number: "json-value-number",
    boolean: "json-value-boolean",
    null: "json-value-null",
  };
  return typeStyleMap[dataType.value] || "";
});

// 键的上下文菜单项
const keyContextMenuItems = computed(() => {
  const items: Array<{
    label: string;
    value: string;
    color: string;
    icon: any;
    onClick: () => void;
    layout?: 'vertical' | 'horizontal';
  }> = [];

  if (props.keyName === null) return items;

  // 复制 key - 水平布局
  items.push({
    label: "复制 Key",
    value: props.keyName,
    color: "#a855f7",
    icon: IconCopyKey,
    layout: 'horizontal',
    onClick: () => {
      copyToClipboard(props.keyName!);
    },
  });

  // 复制路径 - 水平布局
  if (props.path) {
    items.push({
      label: "复制路径",
      value: props.path,
      color: "#d97706",
      icon: IconCopyPath,
      layout: 'horizontal',
      onClick: () => {
        copyToClipboard(props.path);
      },
    });

    // 复制引用 - 垂直布局
    const reference = `{{ ${props.path} }}`;
    items.push({
      label: "复制引用",
      value: reference,
      color: "#0284c7",
      icon: IconCopyReference,
      layout: 'vertical',
      onClick: () => {
        copyToClipboard(reference);
      },
    });
  }

  return items;
});

// 值的上下文菜单项
const valueContextMenuItems = computed(() => {
  const items: Array<{
    label: string;
    value: string;
    color: string;
    icon: any;
    onClick: () => void;
    layout?: 'vertical' | 'horizontal';
  }> = [];

  // 复制 value - 水平布局
  items.push({
    label: "复制 Value",
    value: formattedValue.value,
    color: "#059669",
    icon: IconCopyValue,
    layout: 'horizontal',
    onClick: () => {
      copyToClipboard(String(props.data));
    },
  });

  // 如果有 keyName，复制 key - 水平布局
  if (props.keyName) {
    items.push({
      label: "复制 Key",
      value: props.keyName,
      color: "#a855f7",
      icon: IconCopyKey,
      layout: 'horizontal',
      onClick: () => {
        copyToClipboard(props.keyName!);
      },
    });
  }

  // 复制路径 - 水平布局
  if (props.path) {
    items.push({
      label: "复制路径",
      value: props.path,
      color: "#d97706",
      icon: IconCopyPath,
      layout: 'horizontal',
      onClick: () => {
        copyToClipboard(props.path);
      },
    });

    // 复制引用 - 垂直布局
    const reference = `{{ ${props.path} }}`;
    items.push({
      label: "复制引用",
      value: reference,
      color: "#0284c7",
      icon: IconCopyReference,
      layout: 'vertical',
      onClick: () => {
        copyToClipboard(reference);
      },
    });
  }

  return items;
});

// 拖拽相关
interface DraggedKeyData {
  key: string;
  path: string;
  value: unknown;
  reference: string; // 添加 reference 字段以兼容 VariableTextInput
  isReplace?: boolean;
}

const {
  isDragging,
  showDragFollower,
  dragPosition,
  dropTargetState,
  isHighlighted,
  isCtrlPressed,
  dragFollowerStyle,
  startDrag,
} = useEditableDrag<DraggedKeyData>({
  eventName: "variable-drop",
  enableHighlight: true,
});

// 处理键的鼠标按下事件
const handleKeyMouseDown = (event: MouseEvent) => {
  // 如果禁用了拖拽，则不处理
  if (!props.enableDrag || props.keyName === null) return;

  event.stopPropagation();

  // 创建符合变量引用格式的 reference: {{ path }}
  const reference = props.path ? `{{ ${props.path} }}` : "";

  const draggedKeyData: DraggedKeyData = {
    key: props.keyName,
    path: props.path,
    value: props.data,
    reference: reference,
    isReplace: event.ctrlKey || event.metaKey,
  };

  startDrag(event, draggedKeyData);
};

const message = useMessage();

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    message.success("已复制到剪贴板");
  }).catch(() => {
    message.error("复制失败");
  });
}
</script>

<style scoped>
.json-tree-node {
  display: flex;
  align-items: flex-start;
  min-height: 26px;
  position: relative;
  width: 100%;
}

.json-indent {
  display: flex;
  flex-shrink: 0;
  position: relative;
}

.json-indent-unit {
  width: 20px;
  position: relative;
  min-height: 26px;
}

.json-tree-node-wrapper {
  position: relative;
}

.json-indent-unit.has-line {
  position: relative;
}

.json-indent-unit.has-line::before {
  content: "";
  position: absolute;
  left: 2px;
  top: 0;
  width: 1px;
  background-image: repeating-linear-gradient(
    to bottom,
    rgb(203 213 225) 0,
    rgb(203 213 225) 4px,
    transparent 4px,
    transparent 8px
  );
  background-size: 1px 8px;
  pointer-events: none;
  z-index: 0;
}

/* 虚线延伸到父容器底部（包含所有子节点） */
.json-tree-node-wrapper .json-indent-unit.has-line::before {
  bottom: 0;
  height: 100%;
}

/* 确保虚线在每个节点行都能完整显示 */
.json-tree-node .json-indent-unit.has-line::before {
  height: 100%;
}

.json-content {
  flex: 1;
  display: inline-flex;
  align-items: baseline;
  white-space: nowrap;
  min-width: 0;
}

.json-brackets {
  color: rgb(100 116 139);
  font-weight: 500;
  user-select: none;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.15s;
}

.json-brackets:hover {
  /** background-color: rgb(239 246 255); */
  color: rgb(37 99 235);
}

.json-collapsed-content {
  user-select: none;
}

.json-item-count {
  font-style: italic;
  user-select: none;
  font-size: 0.9em;
}

.json-key {
  color: rgb(139 92 246);
}

.json-key-content {
  font-weight: 500;
  padding: 1px 4px;
  border-radius: 3px;
  transition: background-color 0.15s;
  display: inline-block;
}

.json-key-content:hover:not(.is-highlight) {
  background-color: rgb(241 245 249);
}

.json-key-content.is-dragging {
  opacity: 0.5;
}

.json-key-content.is-highlight {
  background-color: rgb(219 234 254) !important;
  opacity: 1 !important;
}

.json-colon {
  color: rgb(100 116 139);
  margin: 0 4px;
}

.json-value {
  color: rgb(30 41 59);
  padding: 1px 4px;
  border-radius: 3px;
  transition: background-color 0.15s;
  display: inline-block;
}

.json-value.is-highlight {
  background-color: rgb(219 234 254) !important;
  opacity: 1 !important;
}

.json-value-string {
  color: rgb(22 163 74);
}

.json-value-number {
  color: rgb(37 99 235);
}

.json-value-boolean {
  color: rgb(234 88 12);
}

.json-value-null {
  color: rgb(148 163 184);
  font-style: italic;
}

.json-comma {
  color: rgb(100 116 139);
  margin-left: 4px;
}
</style>
