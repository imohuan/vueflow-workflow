<template>
  <div>
    <!-- 自定义拖拽跟随元素 -->
    <div
      v-if="showDragFollower"
      class="fixed pointer-events-none z-9999 scale-100 px-3 py-1 text-xs font-medium text-slate-800 bg-white/90 rounded-lg border border-slate-200 shadow-lg backdrop-blur"
      :style="{
        left: dragPosition.x + 'px',
        top: dragPosition.y + 'px',
        transform: 'translate(-50%, -100%)',
      }"
    >
      {{ node.label }}
    </div>

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
          'cursor-grabbing': node.reference && isDragging,
        }"
        :draggable="Boolean(node.reference)"
        @dragstart="handleDragStart"
        @drag="handleDrag"
        @dragend="handleDragEnd"
        @mousedown.stop
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
const hasChildren = computed(
  () => Array.isArray(props.node.children) && props.node.children.length > 0
);

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

function handleDrag(event: DragEvent) {
  // 更新跟随元素位置
  if (event.clientX === 0 && event.clientY === 0) return; // 拖拽结束时会触发一次 (0, 0)

  dragPosition.value = {
    x: event.clientX,
    y: event.clientY,
  };
}

function handleDragEnd() {
  isDragging.value = false;
  showDragFollower.value = false;
}

function handleDragStart(event: DragEvent) {
  isDragging.value = true;
  if (!props.node.reference || !event.dataTransfer) return;

  // 显示自定义跟随元素（左上方，右下角对齐鼠标）
  showDragFollower.value = true;
  dragPosition.value = {
    x: event.clientX,
    y: event.clientY,
  };

  const variableRef = props.node.reference.trim();

  const payload = {
    reference: variableRef,
    type: props.node.valueType,
    label: props.node.label,
  };

  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData("application/x-variable", JSON.stringify(payload));
  event.dataTransfer.setData("text/plain", variableRef);

  // 隐藏浏览器默认的拖拽图像（使用1x1透明像素）
  const emptyImage = document.createElement("canvas");
  emptyImage.width = 1;
  emptyImage.height = 1;
  const emptyCtx = emptyImage.getContext("2d");
  if (emptyCtx) {
    emptyCtx.clearRect(0, 0, 1, 1);
  }
  event.dataTransfer.setDragImage(emptyImage, 0, 0);
}
</script>
