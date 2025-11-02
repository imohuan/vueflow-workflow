<template>
  <div
    ref="nodeWrapperRef"
    :class="[
      'node-wrapper min-w-[280px] max-w-[400px] bg-white border-2 rounded-md shadow-lg cursor-pointer text-sm overflow-visible backdrop-blur-xl transition-all duration-300 ease-out relative',
      'border-slate-200 hover:shadow-xl',
      executionStatusClass,
    ]"
    :style="{
      borderColor: isSelected ? selectedBorderColor : undefined,
      boxShadow: isSelected ? `0 0 0 1px ${selectedBorderColor}25` : undefined,
    }"
    @click="handleClick"
    @dblclick.stop="handleDoubleClick"
  >
    <!-- 执行状态指示器 -->
    <div
      v-if="executionStatusBadge"
      class="absolute -top-7 right-0 z-10 px-4 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1"
      :class="executionStatusBadge.class"
    >
      <span>{{ executionStatusBadge.icon }}</span>
      <span class="text-[10px]">{{ executionStatusBadge.text }}</span>
    </div>
    <div
      class="flex items-center justify-between gap-2 px-3 py-2 text-white font-semibold relative overflow-hidden rounded-t"
      :style="{
        background: `linear-gradient(to bottom right, ${headerColorFrom}, ${headerColorTo})`,
      }"
    >
      <div
        class="absolute inset-0 bg-linear-to-br from-white/10 to-transparent pointer-events-none"
      ></div>
      <div
        class="flex items-center gap-2 flex-1 text-[9px] tracking-wide relative z-10"
      >
        <!-- 图标 -->
        <div
          v-if="showIcon && iconContent"
          class="shrink-0 w-4 h-4 flex items-center justify-center text-white"
        >
          <!-- SVG 字符串 -->
          <span
            v-if="isSvgString"
            v-html="iconContent"
            class="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:fill-current"
          ></span>
          <!-- 组件图标 -->
          <component
            v-else-if="isComponentName && iconComponent"
            :is="iconComponent"
            class="w-full h-full"
          />
          <!-- 普通字符串（emoji 或文本） -->
          <span v-else class="text-xs leading-none">{{ iconContent }}</span>
        </div>
        <!-- 标题 -->
        <div class="flex-1 min-w-0">
          <template v-if="isRenaming">
            <input
              ref="renameInputRef"
              v-model="editingLabel"
              type="text"
              class="w-full text-[9px] px-2 py-1 rounded bg-white/95 text-slate-700 focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-1 focus:ring-offset-slate-500 placeholder:text-slate-400"
              placeholder="请输入节点名称"
              @keydown.enter.stop.prevent="handleRenameSubmit"
              @keydown.esc.stop.prevent="handleRenameCancel"
              @blur="handleRenameBlur"
            />
          </template>
          <span v-else class="block truncate">
            {{ displayLabel }}
          </span>
        </div>
      </div>
      <div class="flex items-center gap-1.5 relative z-10">
        <button
          class="w-[22px] h-[22px] flex items-center justify-center bg-white/95 hover:bg-white border-none rounded-md cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105"
          :style="{ color: headerColorFrom }"
          @click.stop="handleExecute"
          title="执行节点"
        >
          <IconPlay />
        </button>
        <button
          class="w-[22px] h-[22px] flex items-center justify-center bg-white/15 border-none rounded-md text-white text-base cursor-pointer transition-all duration-200 backdrop-blur-xl hover:bg-white/25 hover:scale-105"
          @click.stop="handleDelete"
          title="删除节点"
        >
          ×
        </button>
      </div>
    </div>

    <div class="relative">
      <slot
        name="handles"
        :data="data"
        :getPortHoverClass="getPortHoverClass"
        :handlePortHover="handlePortHover"
        :handlePortLeave="handlePortLeave"
        :getHandleStyle="getHandleStyle"
      >
        <template v-if="!props.customHandles">
          <Handle
            v-for="(port, inputIndex) in inputPorts"
            :key="`input-${port.id}`"
            :id="port.id"
            type="target"
            :position="Position.Left"
            :is-connectable="true"
            :class="[
              'port-input',
              PORT_STYLE.ellipse,
              getPortHoverClass(port.id),
            ]"
            :style="getHandleStyle(inputIndex, inputPorts.length, 'input')"
            @mouseenter="handlePortHover(port.id, true)"
            @mouseleave="handlePortLeave(port.id)"
          />

          <Handle
            v-for="(port, outputIndex) in outputPorts"
            :key="`output-${port.id}`"
            :id="port.id"
            type="source"
            :position="Position.Right"
            :is-connectable="true"
            :class="[
              'port-output',
              PORT_STYLE.ellipse,
              getPortHoverClass(port.id),
            ]"
            :style="getHandleStyle(outputIndex, outputPorts.length, 'output')"
            @mouseenter="handlePortHover(port.id, false)"
            @mouseleave="handlePortLeave(port.id)"
          />
        </template>
        <template v-else>
          <slot
            name="custom-handles"
            :Handle="Handle"
            :Position="Position"
            :data="data"
            :getPortHoverClass="getPortHoverClass"
            :handlePortHover="handlePortHover"
            :handlePortLeave="handlePortLeave"
            :getHandleStyle="getHandleStyle"
          />
        </template>
      </slot>

      <div
        ref="contentRef"
        :class="[
          'p-3 min-h-[80px] bg-linear-to-b from-slate-50 to-white',
          data.result ? '' : 'rounded-b',
        ]"
      >
        <slot />
      </div>

      <NodeResult
        v-if="data.result"
        :result="data.result"
        :expanded="data.resultExpanded"
        @toggle="handleToggleResult"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  ref,
  watch,
  nextTick,
  onMounted,
  onUnmounted,
  type Component,
} from "vue";
import { Handle, Position, useVueFlow } from "@vue-flow/core";
import type { NodeData } from "@/typings/nodeEditor";
import { useNodeEditorStore } from "@/stores/nodeEditor";
import IconPlay from "@/icons/IconPlay.vue";
import NodeResult from "../NodeResult.vue";
import { getNodeTheme } from "@/config/nodeTheme";
import { PORT_STYLE } from "../ports";
import { usePortPositionUpdate } from "./usePortPositionUpdate";
import { useDebounceFn } from "@vueuse/core";

// 导入所有图标组件
import IconBell from "@/icons/IconBell.vue";
import IconCanvas from "@/icons/IconCanvas.vue";
import IconCheck from "@/icons/IconCheck.vue";
import IconChevronDown from "@/icons/IconChevronDown.vue";
import IconChevronRight from "@/icons/IconChevronRight.vue";
import IconClose from "@/icons/IconClose.vue";
import IconCog from "@/icons/IconCog.vue";
import IconConfig from "@/icons/IconConfig.vue";
import IconDocument from "@/icons/IconDocument.vue";
import IconEdgeStyle from "@/icons/IconEdgeStyle.vue";
import IconEmptyNode from "@/icons/IconEmptyNode.vue";
import IconExternalLink from "@/icons/IconExternalLink.vue";
import IconFit from "@/icons/IconFit.vue";
import IconFx from "@/icons/IconFx.vue";
import IconHand from "@/icons/IconHand.vue";
import IconLayout from "@/icons/IconLayout.vue";
import IconLink from "@/icons/IconLink.vue";
import IconLock from "@/icons/IconLock.vue";
import IconMap from "@/icons/IconMap.vue";
import IconMinus from "@/icons/IconMinus.vue";
import IconNodeEditor from "@/icons/IconNodeEditor.vue";
import IconPlayCircle from "@/icons/IconPlayCircle.vue";
import IconPlus from "@/icons/IconPlus.vue";
import IconRedo from "@/icons/IconRedo.vue";
import IconReset from "@/icons/IconReset.vue";
import IconSettings from "@/icons/IconSettings.vue";
import IconTrash from "@/icons/IconTrash.vue";
import IconUndo from "@/icons/IconUndo.vue";
import IconUnlock from "@/icons/IconUnlock.vue";
import IconWidget from "@/icons/IconWidget.vue";
import IconZoomIn from "@/icons/IconZoomIn.vue";
import IconZoomOut from "@/icons/IconZoomOut.vue";
import IconZoomRange from "@/icons/IconZoomRange.vue";

// 图标组件映射
const iconComponentMap: Record<string, Component> = {
  IconBell,
  IconCanvas,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconClose,
  IconCog,
  IconConfig,
  IconDocument,
  IconEdgeStyle,
  IconEmptyNode,
  IconExternalLink,
  IconFit,
  IconFx,
  IconHand,
  IconLayout,
  IconLink,
  IconLock,
  IconMap,
  IconMinus,
  IconNodeEditor,
  IconPlay,
  IconPlayCircle,
  IconPlus,
  IconRedo,
  IconReset,
  IconSettings,
  IconTrash,
  IconUndo,
  IconUnlock,
  IconWidget,
  IconZoomIn,
  IconZoomOut,
  IconZoomRange,
};

interface Props {
  id: string;
  data: NodeData;
  selected?: boolean;
  customHandles?: boolean;
  customGetHandleStyle?: (
    index: number,
    total: number,
    portType: "input" | "output"
  ) => Record<string, string>;
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  customHandles: false,
});

const store = useNodeEditorStore();
const { getSelectedNodes, getNodes, updateNodeDimensions } = useVueFlow();
const contentRef = ref<HTMLDivElement | null>(null);
const nodeWrapperRef = ref<HTMLDivElement | null>(null);

const nodeTheme = computed(() => getNodeTheme(props.data.category || ""));

/**
 * 解析 headerColor 配置
 * 支持字符串、对象格式，返回 from 和 to 颜色值
 */
const parseHeaderColor = computed((): { from: string; to: string } => {
  const headerColor = props.data.style?.headerColor;

  // 如果未配置，使用主题默认值
  if (!headerColor) {
    return {
      from: nodeTheme.value.headerFrom,
      to: nodeTheme.value.headerTo,
    };
  }

  // 字符串格式：单色
  if (typeof headerColor === "string") {
    return {
      from: headerColor,
      to: headerColor,
    };
  }

  // 对象格式
  if (typeof headerColor === "object") {
    // { color: string } 格式
    if ("color" in headerColor) {
      return {
        from: headerColor.color,
        to: headerColor.color,
      };
    }

    // { from: string, to?: string } 格式
    if ("from" in headerColor) {
      return {
        from: headerColor.from,
        to: headerColor.to || headerColor.from, // 如果没有 to，使用 from 作为单色
      };
    }
  }

  // 默认值
  return {
    from: nodeTheme.value.headerFrom,
    to: nodeTheme.value.headerTo,
  };
});

// 计算标题栏颜色
const headerColorFrom = computed(() => parseHeaderColor.value.from);
const headerColorTo = computed(() => parseHeaderColor.value.to);

// 选中边框颜色使用 header 的起始颜色
const selectedBorderColor = computed(() => headerColorFrom.value);

// 是否显示图标
const showIcon = computed(() => {
  return props.data.style?.showIcon ?? false;
});

// 图标内容
const iconContent = computed(() => {
  return props.data.style?.icon || "";
});

// 判断是否为 SVG 字符串
const isSvgString = computed(() => {
  return (
    iconContent.value &&
    typeof iconContent.value === "string" &&
    iconContent.value.trim().startsWith("<svg")
  );
});

// 判断是否为组件名称
const isComponentName = computed(() => {
  return (
    iconContent.value &&
    typeof iconContent.value === "string" &&
    !isSvgString.value &&
    iconComponentMap[iconContent.value] !== undefined
  );
});

// 获取图标组件
const iconComponent = computed(() => {
  if (isComponentName.value && iconContent.value) {
    return iconComponentMap[iconContent.value];
  }
  return null;
});

const renameInputRef = ref<HTMLInputElement | null>(null);
const editingLabel = ref("");
const originalLabel = ref("");

const isRenaming = computed(() => store.renamingNodeId === props.id);

const isSelected = computed(
  () => (props.selected ?? false) || store.selectedNodeId === props.id
);

const displayLabel = computed(() => {
  const label = props.data.label;
  if (typeof label !== "string") {
    return "节点";
  }
  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed : "节点";
});

// 执行状态样式类
const executionStatusClass = computed(() => {
  const status = props.data.executionStatus;
  if (!status) return "";

  const statusClasses: Record<string, string> = {
    pending: "execution-pending",
    running: "execution-running",
    success: "execution-success",
    error: "execution-error",
    skipped: "execution-skipped",
  };

  return statusClasses[status] || "";
});

// 执行状态徽章
const executionStatusBadge = computed(() => {
  const status = props.data.executionStatus;
  if (!status || status === "pending") return null;

  const badges: Record<string, { icon: string; text: string; class: string }> =
    {
      running: {
        icon: "⏳",
        text: "执行中",
        class: "bg-blue-500 text-white animate-pulse",
      },
      success: {
        icon: "✓",
        text: "成功",
        class: "bg-green-500 text-white",
      },
      error: {
        icon: "✕",
        text: "失败",
        class: "bg-red-500 text-white",
      },
      skipped: {
        icon: "⏭",
        text: "跳过",
        class: "bg-gray-400 text-white",
      },
    };

  return badges[status] || null;
});

watch(isRenaming, (enabled) => {
  if (enabled) {
    originalLabel.value = props.data.label ?? "";
    if (typeof props.data.label === "string" && props.data.label.trim()) {
      editingLabel.value = props.data.label;
    } else {
      editingLabel.value = displayLabel.value;
    }
    nextTick(() => {
      if (!renameInputRef.value) return;
      renameInputRef.value.focus();
      renameInputRef.value.select();
    });
  } else {
    editingLabel.value = "";
    originalLabel.value = "";
  }
});

const inputPorts = computed(() =>
  (props.data.inputs ?? []).filter((port) => port.isPort === true)
);
const outputPorts = computed(() =>
  (props.data.outputs ?? []).filter((port) => port.isPort === true)
);

// 端口数量
const inputPortsCount = computed(() => inputPorts.value.length);
const outputPortsCount = computed(() => outputPorts.value.length);

// 使用端口位置更新 Hook
usePortPositionUpdate({
  nodeId: props.id,
  watchSource: [inputPortsCount, outputPortsCount],
});

// ==================== 节点高度监听和更新 ====================
let resizeObserver: ResizeObserver | null = null;
let lastHeight = 0;

/**
 * @deprecated 废弃，使用 updateNodeDimensions 替代
 * 更新节点高度到 VueFlow（只更新高度，保持宽度不变）
 */
function _updateNodeHeight() {
  if (!nodeWrapperRef.value) return;

  const rect = nodeWrapperRef.value.getBoundingClientRect();
  const height = Math.ceil(rect.height);

  // 仅在高度确实变化时更新，避免无效调用
  if (height === lastHeight) {
    return;
  }
  console.log(
    "updateNodeHeight",
    lastHeight,
    height,
    nodeWrapperRef.value,
    rect
  );
  lastHeight = height;
  // 获取当前节点的宽度（保持宽度不变）
  const node = getNodes.value.find((n) => n.id === props.id);
  // 如果节点有宽度，使用节点的宽度（可能是数字或字符串），否则使用当前 DOM 宽度
  const nodeWidth = node?.width;
  const width =
    typeof nodeWidth === "number"
      ? nodeWidth
      : typeof nodeWidth === "string"
      ? parseFloat(nodeWidth) || Math.ceil(rect.width)
      : Math.ceil(rect.width);
  // 更新 VueFlow 节点尺寸（只更新高度）
  store.updateNodeDimensions(props.id, { width, height });
}

/**
 * 防抖版本的高度更新函数
 */
const debouncedUpdateNodeHeight = useDebounceFn(() => {
  nextTick(() => {
    if (!nodeWrapperRef.value) return;
    updateNodeDimensions([{ id: props.id, nodeElement: nodeWrapperRef.value }]);
  });
}, 300);

// 监听 result 和 resultExpanded 的变化（折叠展开）
watch(
  () => [props.data.result, props.data.resultExpanded],
  () => debouncedUpdateNodeHeight(),
  { deep: true }
);

// 组件挂载后初始化
onMounted(() => {
  if (!nodeWrapperRef.value) return;
  debouncedUpdateNodeHeight();
  // 创建 ResizeObserver 监听 DOM 高度变化
  // resizeObserver = new ResizeObserver(debouncedUpdateNodeHeight);
  // resizeObserver.observe(nodeWrapperRef.value);
});

// 组件卸载时清理
onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

const hoveredPortId = ref<string | null>(null);
const isHoveredPortValid = ref<boolean>(true);

function handleClick() {
  store.selectNode(props.id);
}

function handleDoubleClick() {
  if (isRenaming.value) {
    return;
  }

  // 只在单选状态下才触发双击打开编辑器
  // 多选时不触发双击事件，避免误触发
  const selectedNodes = getSelectedNodes.value ?? [];

  if (selectedNodes.length > 1) {
    // 多选状态下，不触发双击事件
    return;
  }

  store.openNodeEditor(props.id);
}

function handleRenameSubmit() {
  if (!isRenaming.value) {
    return;
  }
  store.renameNode(props.id, editingLabel.value);
  store.stopRenamingNode();
}

function handleRenameCancel() {
  if (!isRenaming.value) {
    return;
  }
  editingLabel.value = originalLabel.value;
  store.stopRenamingNode();
}

function handleRenameBlur() {
  if (!isRenaming.value) {
    return;
  }
  handleRenameSubmit();
}

function handleDelete() {
  store.removeNode(props.id);
}

function handleExecute() {
  store.executeNode(props.id);
}

function handleToggleResult(expanded: boolean) {
  store.updateNodeData(props.id, { resultExpanded: expanded });
}

function handlePortHover(portId: string, _isInput: boolean) {
  hoveredPortId.value = portId;

  const isConnecting = (window as any).__isConnecting?.();
  if (!isConnecting) {
    isHoveredPortValid.value = true;
    return;
  }

  const checkValidity = (window as any).__checkPortValidity;
  if (checkValidity) {
    isHoveredPortValid.value = checkValidity(props.id, portId);
  }
}

function handlePortLeave(portId: string) {
  if (hoveredPortId.value === portId) {
    hoveredPortId.value = null;
    isHoveredPortValid.value = true;
  }
}

function getPortHoverClass(portId: string): string {
  if (hoveredPortId.value !== portId) return "";

  const isConnecting = (window as any).__isConnecting?.();
  if (!isConnecting) return "";

  return isHoveredPortValid.value ? "port-valid-target" : "port-invalid-target";
}

function getHandleStyle(
  index: number,
  total: number,
  portType: "input" | "output"
): Record<string, string> {
  // 如果提供了自定义的 getHandleStyle，则使用自定义的
  if (props.customGetHandleStyle) {
    const style = props.customGetHandleStyle(index, total, portType);
    if (Object.keys(style).length > 0) {
      return style;
    }
  }

  // 默认实现：使用固定高度计算，避免初始渲染时的位置错误
  const DEFAULT_NODE_HEIGHT = 80;

  if (total <= 1) {
    // 单个端口居中对齐
    return {
      top: `${DEFAULT_NODE_HEIGHT / 2}px !important`,
    };
  }

  // 多个端口均匀分布
  const step = 100 / (total + 1);
  const top = (index + 1) * step;
  return {
    top: `${top}% !important`,
  };
}
</script>

<style scoped>
/* ==================== 执行状态样式 ==================== */

/* pending: 无特殊样式，保持默认样式 */

/* running: 蓝色边框 */
.execution-running {
  border-color: rgb(59 130 246) !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* success: 无特殊边框，通过右上角徽章显示状态 */

/* error: 红色边框 */
.execution-error {
  border-color: rgb(239 68 68) !important;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

/* skipped: 灰色虚线边框 */
.execution-skipped {
  border-color: rgb(203 213 225);
  border-style: dashed;
  opacity: 0.7;
}
</style>
