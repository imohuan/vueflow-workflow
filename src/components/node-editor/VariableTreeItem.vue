<template>
  <div>
    <!-- 自定义拖拽跟随元素 - 使用 Teleport 渲染到 body 避免父容器样式影响 -->
    <Teleport to="body">
      <!-- 手掌图标 - 跟随鼠标实时移动 -->
      <div
        v-if="dropTargetState !== 'default'"
        class="fixed pointer-events-none z-[10001] w-8 h-8 flex items-center justify-center"
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
        class="fixed pointer-events-none z-10000 scale-100 px-3 py-1 text-xs font-medium rounded-lg shadow-lg backdrop-blur"
        :class="[
          dropTargetState === 'empty'
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
            v-if="dropTargetState === 'empty'"
            class="text-emerald-600 text-xs"
            >⇱</span
          >
          <span
            v-else-if="dropTargetState === 'hasContent'"
            class="text-blue-600 text-xs"
            >↓</span
          >

          {{ node.label }}

          <!-- 提示文字 -->
          <span
            v-if="dropTargetState === 'empty'"
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

    <div
      class="flex items-center gap-2 px-3 py-2 rounded-md transition-colors duration-150 group hover:bg-slate-100/70"
      :style="{ paddingLeft: `${level * 16 + 8}px` }"
      :class="{ 'cursor-pointer': hasChildren }"
      @click="handleRowClick"
    >
      <!-- 展开/收起按钮 -->
      <button
        v-if="hasChildren"
        class="w-3 h-3 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shrink-0"
        @click.stop="toggle"
      >
        <IconChevronRight
          class="transition-transform"
          :class="{ 'rotate-90': expanded }"
        />
      </button>
      <span v-else class="w-3 h-3 shrink-0"></span>

      <!-- 变量名 - 白底黑字+阴影，表示可拖拽 -->
      <span
        class="px-2.5 py-1 text-xs font-medium text-slate-800 bg-white/90 rounded-lg shadow-sm border border-slate-200 shrink-0 transition-all duration-150 hover:shadow-md"
        :class="{
          'cursor-grab': node.reference,
        }"
        @mousedown.stop="handleMouseDown"
      >
        {{ node.label }}
      </span>

      <!-- 分隔符和值预览（仅非根节点显示） -->
      <template v-if="node.valueType !== 'node'">
        <span class="text-xs text-slate-300 shrink-0">:</span>

        <!-- 值预览 -->
        <span
          :class="valueClass"
          class="text-xs truncate flex-1 min-w-0 font-mono"
          :title="formattedValue"
        >
          {{ formattedValue }}
        </span>

        <!-- 类型标签（仅在悬停时显示） -->
        <span
          class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          {{ node.valueType }}
        </span>
      </template>
    </div>

    <!-- 子节点 -->
    <div v-if="expanded && hasChildren" class="space-y-0.5">
      <VariableTreeItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :level="level + 1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import IconChevronRight from "@/icons/IconChevronRight.vue";
import type { VariableTreeNode } from "@/utils/variableResolver";
import IconHand from "@/icons/IconHand.vue";

defineOptions({ name: "VariableTreeItem" });

interface Props {
  node: VariableTreeNode;
  level?: number;
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
});

const expanded = ref(props.level < 1);
const isDragging = ref(false);
const showDragFollower = ref(false);
const dragPosition = ref({ x: 0, y: 0 });
const dropTargetState = ref<"default" | "empty" | "hasContent">("default");
const currentEditableElement = ref<HTMLElement | null>(null);
const hasChildren = computed(
  () => Array.isArray(props.node.children) && props.node.children.length > 0
);

// 计算拖拽跟随元素的样式（实现吸附效果）
const dragFollowerStyle = computed(() => {
  const editable = currentEditableElement.value;

  // 只有空输入框才吸附到左侧
  if (editable && dropTargetState.value === "empty") {
    const rect = editable.getBoundingClientRect();
    // 定位到输入框左侧，向左偏移 8px 间距
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
      // transform: "translate(12px, -50%)",
    };
  }

  // 其他情况（有内容的输入框、默认状态）都跟随鼠标，显示在右下角
  return {
    left: dragPosition.value.x + "px",
    top: dragPosition.value.y + "px",
    transform: "translate(-50%, -100%)",
  };
});

const formattedValue = computed(() => {
  const val = props.node.value;
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (Array.isArray(val)) return `Array(${val.length})`;
  if (typeof val === "object")
    return `Object(${Object.keys(val as object).length})`;
  if (typeof val === "string") return `"${val}"`;
  return String(val);
});

const valueClass = computed(() => {
  const typeStyleMap: Record<string, string> = {
    string: "text-green-600",
    number: "text-blue-600",
    boolean: "text-orange-600",
    null: "text-slate-400 italic",
    undefined: "text-slate-400 italic",
    array: "text-slate-500",
    object: "text-slate-500",
  };
  return typeStyleMap[props.node.valueType] || "text-slate-600";
});

function toggle() {
  expanded.value = !expanded.value;
}

function handleRowClick() {
  // 只有在有子节点时才展开/收起
  if (hasChildren.value) {
    toggle();
  }
}

function handleMouseDown(event: MouseEvent) {
  if (!props.node.reference) return;

  event.preventDefault();

  isDragging.value = true;
  showDragFollower.value = true;
  dropTargetState.value = "default";
  currentEditableElement.value = null;

  // 设置拖拽时的手掌光标样式
  document.body.style.cursor = "grabbing";

  dragPosition.value = {
    x: event.clientX,
    y: event.clientY,
  };

  // 准备拖拽数据
  const variableRef = props.node.reference.trim();
  const payload = {
    reference: variableRef,
    type: props.node.valueType,
    label: props.node.label,
  };

  // 存储拖拽数据到全局变量，供 drop 时使用
  (window as any).__draggedVariableData = {
    payload,
    reference: variableRef,
  };

  // 绑定全局事件
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
}

function handleMouseMove(event: MouseEvent) {
  if (!isDragging.value) return;

  dragPosition.value = {
    x: event.clientX,
    y: event.clientY,
  };

  // 检测鼠标下方的元素
  const target = document.elementFromPoint(event.clientX, event.clientY);
  if (!target) {
    dropTargetState.value = "default";
    currentEditableElement.value = null;
    return;
  }

  // 检查是否是可编辑的元素（contenteditable 或 input/textarea）
  const isEditable =
    target.getAttribute("contenteditable") === "true" ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement;

  let editableElement: HTMLElement | null = null;

  if (!isEditable) {
    // 检查父元素是否可编辑
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

  // 更新当前可编辑元素
  currentEditableElement.value = editableElement;

  // 检查可编辑元素是否有内容
  const content = getPlainTextContent(editableElement);
  dropTargetState.value = content.trim() === "" ? "empty" : "hasContent";
}

/**
 * 获取元素的纯文本内容
 */
function getPlainTextContent(element: HTMLElement): string {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return element.value;
  }
  return (
    element.textContent?.replace(/\u00a0/g, " ").replace(/\u200B/g, "") || ""
  );
}

function handleMouseUp(event: MouseEvent) {
  if (!isDragging.value) return;

  isDragging.value = false;
  showDragFollower.value = false;
  dropTargetState.value = "default";
  currentEditableElement.value = null;

  // 恢复鼠标样式
  document.body.style.cursor = "";

  // 移除全局事件监听
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);

  // 触发 drop 事件到鼠标位置的元素
  const target = document.elementFromPoint(event.clientX, event.clientY);
  if (target) {
    // 创建自定义事件传递数据
    const dropEvent = new CustomEvent("variable-drop", {
      bubbles: true,
      detail: (window as any).__draggedVariableData,
    });
    target.dispatchEvent(dropEvent);
  }

  // 清理拖拽数据
  delete (window as any).__draggedVariableData;
}
</script>
