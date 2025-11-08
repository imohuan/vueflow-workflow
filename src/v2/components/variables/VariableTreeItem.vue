<template>
  <div>
    <!-- 自定义拖拽跟随元素 - 使用 Teleport 渲染到 body 避免父容器样式影响 -->
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
      class="flex items-center gap-2 px-2 py-1 rounded-md transition-colors duration-150 group hover:bg-slate-100/70"
      :style="{ paddingLeft: `${level * 12 + 6}px` }"
      :class="{ 'cursor-pointer': hasChildren }"
      @click="handleRowClick"
    >
      <!-- 展开/收起按钮 -->
      <button
        v-if="hasChildren"
        class="w-3 h-3 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shrink-0"
        @click.stop="toggle"
      >
        <IconRight
          class="transition-transform"
          :class="{ 'rotate-90': expanded }"
        />
      </button>
      <span v-else class="w-3 h-3 shrink-0"></span>

      <!-- 变量名 - 白底黑字+阴影，表示可拖拽 -->
      <span
        class="px-2 py-0.5 text-xs font-medium text-slate-800 bg-white/90 rounded-lg shadow-sm border border-slate-200 shrink-0 transition-all duration-150 hover:shadow-md"
        :class="{
          'cursor-grab': node.reference && props.enableDrag,
          'cursor-default': !props.enableDrag || !node.reference,
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
        :enable-drag="props.enableDrag"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import IconRight from "@/icons/IconRight.vue";
import type { VariableTreeNode } from "workflow-node-executor";
import IconHand from "@/icons/IconHand.vue";
import { useEditableDrag } from "@/v2/composables/useEditableDrag";

defineOptions({ name: "VariableTreeItem" });

interface Props {
  node: VariableTreeNode;
  level?: number;
  /** 是否启用拖拽 */
  enableDrag?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
  enableDrag: true,
});

const expanded = ref(props.level < 1);

// 拖拽相关
interface DraggedVariableData {
  payload: {
    reference: string;
    type: string;
    label: string;
  };
  reference: string;
}

const hasChildren = computed(
  () => Array.isArray(props.node.children) && props.node.children.length > 0
);

const {
  showDragFollower,
  dragPosition,
  dropTargetState,
  dragFollowerStyle,
  startDrag,
} = useEditableDrag<DraggedVariableData>({
  eventName: "variable-drop",
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
  // 如果禁用了拖拽，则不处理
  if (!props.enableDrag || !props.node.reference) return;

  // 准备拖拽数据
  const variableRef = props.node.reference.trim();
  const draggedVariableData: DraggedVariableData = {
    payload: {
      reference: variableRef,
      type: props.node.valueType,
      label: props.node.label,
    },
    reference: variableRef,
  };

  startDrag(event, draggedVariableData);
}
</script>
