<template>
  <div class="json-tree-node-wrapper">
    <!-- 自定义拖拽跟随元素 -->
    <Teleport to="body">
      <!-- 拖拽信息提示框 -->
      <div
        v-if="showDragFollower"
        class="fixed pointer-events-none z-10000 px-3 py-1 text-xs font-medium rounded-lg shadow-lg backdrop-blur"
        :class="[
          dropTargetState === 'empty'
            ? 'bg-emerald-100/95 border-2 border-emerald-400 text-emerald-700'
            : dropTargetState === 'hasContent'
            ? 'bg-blue-100/95 border-2 border-blue-400 text-blue-700'
            : 'bg-red-100/95 border-2 border-red-400 text-red-700',
        ]"
        :style="dragFollowerStyle"
      >
        {{ keyName }}
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
          </template>
        </template>

        <!-- 键值对 -->
        <template v-else-if="keyName !== null">
          <span class="json-key">
            <span
              class="json-key-content cursor-grab active:cursor-grabbing"
              :class="{
                'is-dragging': isDragging,
                'is-highlight': isHighlighted,
              }"
              @mousedown="handleKeyMouseDown"
            >
              "{{ keyName }}"
            </span>
            <span class="json-colon">: </span>
          </span>
          <span
            class="json-value"
            :class="[valueClass, { 'is-highlight': isHighlighted }]"
          >
            {{ formattedValue }}
          </span>
          <span v-if="!isLast" class="json-comma">,</span>
        </template>

        <!-- 基本类型值（数组元素） -->
        <template v-else>
          <span class="json-value" :class="valueClass">
            {{ formattedValue }}
          </span>
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
}

const props = withDefaults(defineProps<Props>(), {
  keyName: null,
  depth: 0,
  path: "",
  isLast: true,
  parentIsLast: true,
});

// 展开状态
const isExpanded = ref(props.depth < 2);

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

// 拖拽相关
const isDragging = ref(false);
const showDragFollower = ref(false);
const dragPosition = ref({ x: 0, y: 0 });
const initialMousePosition = ref({ x: 0, y: 0 });
const dropTargetState = ref<"default" | "empty" | "hasContent">("default");
const currentEditableElement = ref<HTMLElement | null>(null);
const isHighlighted = ref(false);

const DRAG_THRESHOLD = 5;

interface DraggedKeyData {
  key: string;
  path: string;
  value: unknown;
}

let draggedKeyData: DraggedKeyData | null = null;

// 计算拖拽跟随元素的样式
const dragFollowerStyle = computed(() => {
  const editable = currentEditableElement.value;

  if (editable && dropTargetState.value === "empty") {
    const rect = editable.getBoundingClientRect();
    return {
      left: rect.left - 8 + "px",
      top: rect.top + rect.height / 2 + "px",
      transform: "translate(12px, -50%)",
    };
  }

  if (editable && dropTargetState.value === "hasContent") {
    return {
      left: dragPosition.value.x + "px",
      top: dragPosition.value.y + "px",
    };
  }

  return {
    left: dragPosition.value.x + "px",
    top: dragPosition.value.y + "px",
    transform: "translate(-50%, -100%)",
  };
});

// 处理键的鼠标按下事件
const handleKeyMouseDown = (event: MouseEvent) => {
  if (props.keyName === null) return;

  event.preventDefault();
  event.stopPropagation();

  isDragging.value = true;
  showDragFollower.value = false;
  dropTargetState.value = "default";
  currentEditableElement.value = null;
  isHighlighted.value = true;

  initialMousePosition.value = {
    x: event.clientX,
    y: event.clientY,
  };

  dragPosition.value = {
    x: event.clientX,
    y: event.clientY,
  };

  draggedKeyData = {
    key: props.keyName,
    path: props.path,
    value: props.data,
  };

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
};

// 处理鼠标移动
const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value) return;

  dragPosition.value = {
    x: event.clientX,
    y: event.clientY,
  };

  const deltaX = event.clientX - initialMousePosition.value.x;
  const deltaY = event.clientY - initialMousePosition.value.y;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  if (distance > DRAG_THRESHOLD) {
    if (!showDragFollower.value) {
      showDragFollower.value = true;
      document.body.style.cursor = "grabbing";
    }
  } else {
    return;
  }

  const target = document.elementFromPoint(event.clientX, event.clientY);
  if (!target) {
    dropTargetState.value = "default";
    currentEditableElement.value = null;
    return;
  }

  const isEditable =
    target.getAttribute("contenteditable") === "true" ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement;

  let editableElement: HTMLElement | null = null;

  if (!isEditable) {
    const editableParent = target.closest("[contenteditable='true']");
    if (!editableParent) {
      dropTargetState.value = "default";
      currentEditableElement.value = null;
      return;
    }
    editableElement = editableParent as HTMLElement;
  } else {
    editableElement = target as HTMLElement;
  }

  currentEditableElement.value = editableElement;

  const content = getPlainTextContent(editableElement);
  dropTargetState.value = content.trim() === "" ? "empty" : "hasContent";
};

// 获取纯文本内容
const getPlainTextContent = (element: HTMLElement): string => {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return element.value;
  }
  return (
    element.textContent?.replace(/\u00a0/g, " ").replace(/\u200B/g, "") || ""
  );
};

// 处理鼠标抬起
const handleMouseUp = (event: MouseEvent) => {
  if (!isDragging.value) return;

  isDragging.value = false;
  showDragFollower.value = false;
  dropTargetState.value = "default";
  currentEditableElement.value = null;
  isHighlighted.value = false;

  document.body.style.cursor = "";

  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);

  const target = document.elementFromPoint(event.clientX, event.clientY);
  if (target && draggedKeyData) {
    const dropEvent = new CustomEvent("json-key-drop", {
      bubbles: true,
      detail: draggedKeyData,
    });
    target.dispatchEvent(dropEvent);
  }

  draggedKeyData = null;
};
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
