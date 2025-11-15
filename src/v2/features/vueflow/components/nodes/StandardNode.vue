<template>
  <div
    class="relative bg-white shadow-sm min-h-24 h-full max-w-[280px]"
    :class="{
      'animate-pulse': data.status === 'running',
    }"
    :style="nodeStyle"
    @click="handleNodeClick"
  >
    <!-- 执行起点标记（左上角） -->
    <div
      v-if="data.isExecutionStart"
      class="absolute -top-9 left-2 h-8 px-3 flex items-center rounded-lg text-[11px] font-bold bg-gradient-to-r from-red-500 to-red-600 text-white border-2 border-red-700 shadow-lg z-10 gap-1 whitespace-nowrap"
      :title="'执行起点'"
    >
      <IconExecutionStart class="w-4 h-4" />
      <span>起点</span>
    </div>

    <!-- 执行状态徽章 -->
    <NodeExecutionBadge :node-id="id" />

    <!-- 输入端点 -->
    <template v-if="showInputPort">
      <slot
        name="inputPorts"
        :node-id="id"
        :position="Position.Left"
        :default-port="defaultInputPort"
      >
        <!-- 默认渲染：单个输入端口 -->
        <PortHandle
          :id="defaultInputPort.id"
          :type="defaultInputPort.type"
          :position="defaultInputPort.position"
          :node-id="defaultInputPort.nodeId"
          :variant="defaultInputPort.variant"
          :style="defaultInputPort.style"
        />
      </slot>
    </template>

    <div class="rounded-md overflow-hidden">
      <!-- 顶部标题区域 -->
      <div class="flex items-center text-white" :style="headerStyle">
        <!-- 图标 -->
        <component
          v-if="showIcon && iconComponent"
          :is="iconComponent"
          class="shrink-0 text-white"
          :style="iconStyle"
        />
        <div
          v-else-if="showIcon && iconSvg"
          class="shrink-0 flex items-center justify-center text-white [&_svg]:w-full [&_svg]:h-full [&_svg]:text-inherit"
          :style="iconStyle"
          v-html="iconSvg"
        />
        <span
          v-else-if="showIcon && iconText"
          class="text-lg leading-none shrink-0 flex items-center justify-center"
          :style="{
            fontSize: `${NODE_SIZE.iconSize}px`,
          }"
        >
          {{ iconText }}
        </span>

        <!-- 标题 -->
        <div
          class="flex-1 text-[13px] font-medium overflow-hidden text-ellipsis whitespace-nowrap"
        >
          <span v-if="!isRenaming"> {{ data.label || "节点" }}</span>
          <!-- 重命名输入框 -->
          <div v-else class="w-full min-w-0 max-w-[100px] nodrag">
            <n-input
              ref="renameInputRef"
              v-model:value="editingLabel"
              size="tiny"
              class="w-full"
              placeholder="输入名称"
              :input-props="{ class: 'text-white' }"
              :style="{
                '--n-color': 'rgba(255, 255, 255, 0.2)',
                '--n-color-focus': 'rgba(255, 255, 255, 0.2)',
                '--n-border': '1px solid rgba(255, 255, 255, 0.3)',
                '--n-border-focus': '1px solid rgba(255, 255, 255, 0.6)',
                '--n-border-hover': '1px solid rgba(255, 255, 255, 0.4)',
                '--n-text-color': 'white',
                '--n-caret-color': 'white',
                '--n-font-size': '13px',
              }"
              @keydown.enter="confirmRename"
              @keydown.esc="cancelRename"
              @blur="confirmRename"
              @click.stop
            />
          </div>
        </div>

        <!-- 状态指示器 -->
        <div v-if="data.status" class="shrink-0">
          <div
            class="w-2 h-2 rounded-full"
            :class="{
              'bg-white shadow-[0_0_0_2px_rgba(255,255,255,0.3)]':
                data.status === 'success',
              'bg-red-200 shadow-[0_0_0_2px_rgba(254,202,202,0.3)]':
                data.status === 'error',
              'bg-yellow-100 shadow-[0_0_0_2px_rgba(254,243,199,0.3)] animate-ping':
                data.status === 'running',
              'bg-slate-200': data.status === 'pending',
            }"
          />
        </div>

        <!-- 标题栏右侧按钮 -->
        <div class="shrink-0 flex items-center gap-1 ml-auto" @click.stop>
          <!-- 默认按钮：执行和删除 -->
          <button
            v-if="showExecuteButton"
            class="rounded hover:bg-white/20 transition-colors flex items-center justify-center"
            :style="buttonStyle"
            :title="'执行节点'"
            @click="handleExecute"
          >
            <IconPlay :style="iconStyle" class="text-white" />
          </button>
          <n-dropdown
            v-if="showDeleteButton"
            :options="menuOptions"
            @select="handleMenuSelect"
            trigger="click"
            placement="bottom-end"
          >
            <button
              class="p-1 rounded hover:bg-white/20 transition-colors flex items-center justify-center"
              :style="buttonStyle"
              :title="'更多操作'"
              @click.stop
            >
              <IconCog :style="iconStyle" class="text-white" />
            </button>
          </n-dropdown>
          <slot name="headerActions"> </slot>
        </div>
      </div>

      <!-- 内容板块 -->
      <div class="bg-white nopan" :style="bodyStyle">
        <slot>
          <div
            v-if="data.description"
            class="text-xs text-gray-600 leading-relaxed line-clamp-3"
          >
            {{ data.description }}
          </div>
          <div v-else class="text-xs text-gray-400 italic">暂无配置</div>

          <StandardNodeContent :data="data" />
        </slot>
      </div>
    </div>

    <!-- 输出端点 -->
    <template v-if="showOutputPort">
      <slot
        name="outputPorts"
        :node-id="id"
        :position="Position.Right"
        :default-port="defaultOutputPort"
      >
        <!-- 默认渲染：单个输出端口 -->
        <PortHandle
          :id="defaultOutputPort.id"
          :type="defaultOutputPort.type"
          :position="defaultOutputPort.position"
          :node-id="defaultOutputPort.nodeId"
          :variant="defaultOutputPort.variant"
          :style="defaultOutputPort.style"
        />
      </slot>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  type Component,
  h,
  ref,
  nextTick,
  onMounted,
  onUnmounted,
} from "vue";
import { Position } from "@vue-flow/core";
import { NDropdown, NIcon, NInput } from "naive-ui";
import type { DropdownOption } from "naive-ui";
import { PortHandle } from "../ports";
import { NODE_SIZE, NODE_COLORS, NODE_SPACING } from "../../../../config";
import { NodeExecutionBadge } from "../widgets";
import type { NodeStyleConfig } from "workflow-flow-nodes";
import { createNodeInstance } from "workflow-flow-nodes";
import IconPlay from "@/icons/IconPlay.vue";
import IconDelete from "@/icons/IconDelete.vue";
import IconEdit from "@/icons/IconEdit.vue";
import IconCog from "@/icons/IconCog.vue";
import IconExternalLink from "@/icons/IconExternalLink.vue";
import IconCopy from "@/icons/IconCopy.vue";
import IconExecutionStart from "@/icons/IconExecutionStart.vue";
import { eventBusUtils } from "../../events";
import StandardNodeContent from "./StandardNodeContent.vue";
import { getNodeIcon } from "./nodeIcons";
import "../ports/portStyles.css";

interface Props {
  /** 节点 ID */
  id: string;
  /** 节点数据 */
  data: {
    /** 节点类型 */
    type?: string;
    /** 节点标签 */
    label?: string;
    /** 节点描述 */
    description?: string;
    /** 节点状态 */
    status?: "pending" | "running" | "success" | "error";
    /** 是否隐藏输入端口 */
    noInputs?: boolean;
    /** 是否隐藏输出端口 */
    noOutputs?: boolean;
    /** 自定义样式配置（覆盖节点元数据中的样式） */
    style?: NodeStyleConfig;
    /** 是否显示执行按钮 */
    showExecuteButton?: boolean;
    /** 是否显示删除按钮 */
    showDeleteButton?: boolean;
    /** 是否为执行起点 */
    isExecutionStart?: boolean;
    /** 其他自定义数据 */
    [key: string]: any;
  };
  /** 是否选中 */
  selected?: boolean;
  /** 父节点 ID（如果在容器内） */
  parent?: string;
}

const props = defineProps<Props>();

// 重命名状态
const isRenaming = ref(false);
const editingLabel = ref("");
const renameInputRef = ref<any>(null);

// 获取样式配置（优先使用 data.style，其次从 BaseFlowNode 实例获取）
const styleConfig = computed<NodeStyleConfig>(() => {
  // 优先使用 data.style
  if (props.data.style) {
    return props.data.style;
  }

  // 其次尝试从 BaseFlowNode 实例获取样式
  if (props.data.type) {
    try {
      const nodeInstance = createNodeInstance(props.data.type);
      return nodeInstance.getStyle();
    } catch (error) {
      // 如果节点类型不是 BaseFlowNode 类型，忽略错误
      // console.debug("[StandardNode] 无法从 BaseFlowNode 获取样式:", error);
    }
  }

  return {};
});

// 计算标题栏样式
const headerStyle = computed(() => {
  const style: Record<string, any> = {
    gap: `${NODE_SPACING.iconGap}px`,
    paddingTop: `${NODE_SPACING.headerPadding.vertical}px`,
    paddingBottom: `${NODE_SPACING.headerPadding.vertical}px`,
    paddingLeft: `${NODE_SPACING.headerPadding.horizontal}px`,
    paddingRight: `${NODE_SPACING.headerPadding.horizontal}px`,
    height: `${NODE_SIZE.headerHeight}px`,
    ...styleConfig.value.headerStyle,
  };

  // 处理 headerColor
  const headerColor = styleConfig.value.headerColor;
  if (headerColor) {
    if (Array.isArray(headerColor)) {
      // 渐变色
      const [from, to = from] = headerColor;
      style.background = `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
    } else if (typeof headerColor === "string") {
      // 单色
      style.backgroundColor = headerColor;
    }
  } else {
    // 默认颜色
    style.backgroundColor = NODE_COLORS.default;
  }

  return style;
});

// 计算主体区域样式
const bodyStyle = computed(() => {
  return {
    padding: `${NODE_SPACING.contentPadding}px`,
    minHeight: `${NODE_SIZE.contentMinHeight}px`,
    ...styleConfig.value.bodyStyle,
  };
});

// 计算节点整体样式
const nodeStyle = computed(() => {
  const style: Record<string, string> = {
    minWidth: `${NODE_SIZE.minWidth}px`,
    borderWidth: `${NODE_SIZE.borderWidth}px`,
    borderColor: props.selected
      ? NODE_COLORS.borderSelected
      : NODE_COLORS.border,
    borderRadius: `${NODE_SIZE.borderRadius}px`,
    boxShadow: props.selected
      ? "0 4px 12px rgba(59, 130, 246, 0.25)"
      : "0 2px 8px rgba(0, 0, 0, 0.08)",
  };
  return style;
});

// 计算图标样式
const iconStyle = computed(() => ({
  width: `${NODE_SIZE.iconSize}px`,
  height: `${NODE_SIZE.iconSize}px`,
}));

// 计算按钮样式
const buttonStyle = computed(() => ({
  width: `${NODE_SIZE.iconSize + 8}px`,
  height: `${NODE_SIZE.iconSize + 8}px`,
}));

// 是否显示执行按钮
const showExecuteButton = computed(() => {
  return props.data.showExecuteButton !== false; // 默认显示
});

// 是否显示删除按钮
const showDeleteButton = computed(() => {
  return props.data.showDeleteButton !== false; // 默认显示
});

// 处理执行按钮点击
function handleExecute() {
  eventBusUtils.emit("node:execute", { nodeId: props.id });
}

// 处理删除按钮点击
function handleDelete() {
  eventBusUtils.emit("node:delete-request", { nodeId: props.id });
}

// 处理重命名
function handleRename() {
  isRenaming.value = true;
  editingLabel.value = props.data.label || "节点";

  // 等待 DOM 更新后聚焦输入框并选中文本
  nextTick(() => {
    if (renameInputRef.value) {
      renameInputRef.value.focus();
      renameInputRef.value.select();
    }
  });
}

// 确认重命名
function confirmRename() {
  if (!isRenaming.value) return;

  const newLabel = editingLabel.value.trim();
  if (newLabel && newLabel !== props.data.label) {
    // 触发事件更新节点标签
    eventBusUtils.emit("node:label-updated", {
      nodeId: props.id,
      label: newLabel,
    });
  }

  isRenaming.value = false;
}

// 取消重命名
function cancelRename() {
  isRenaming.value = false;
  editingLabel.value = props.data.label || "节点";
}

// 处理 F2 快捷键
function handleKeyDown(e: KeyboardEvent) {
  // F2 键进入编辑状态
  if (e.key === "F2" && props.selected && !isRenaming.value) {
    e.preventDefault();
    e.stopPropagation();
    handleRename();
  }
}

// 组件挂载时监听键盘事件
onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});

// 组件卸载时移除监听
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});

// 处理复制
function handleDuplicate() {
  eventBusUtils.emit("node:duplicate-request", { nodeId: props.id });
}

// 处理从容器移出
function handleDetachFromContainer() {
  if (props.parent) {
    eventBusUtils.emit("node:detach-from-container", {
      nodeId: props.id,
      containerId: props.parent,
    });
  }
}

// 菜单选项
const menuOptions = computed<DropdownOption[]>(() => {
  const options: DropdownOption[] = [
    {
      label: "重命名",
      key: "rename",
      icon: () => h(NIcon, null, { default: () => h(IconEdit) }),
    },
    {
      label: "创建副本",
      key: "duplicate",
      icon: () => h(NIcon, null, { default: () => h(IconCopy) }),
    },
  ];

  // 如果节点在容器内，添加移出子画布选项
  if (props.parent) {
    options.unshift({
      label: "移出子画布",
      key: "detach",
      icon: () => h(NIcon, null, { default: () => h(IconExternalLink) }),
    });
  }

  // 添加执行起点设置选项
  options.push({
    label: props.data.isExecutionStart ? "取消执行起点" : "设置为执行起点",
    key: "toggle-execution-start",
  });

  options.push({
    type: "divider",
    key: "divider",
  });

  options.push({
    label: "删除",
    key: "delete",
    icon: () => h(NIcon, null, { default: () => h(IconDelete) }),
  });

  return options;
});

// 处理菜单选择
function handleMenuSelect(key: string) {
  switch (key) {
    case "rename":
      handleRename();
      break;
    case "duplicate":
      handleDuplicate();
      break;
    case "detach":
      handleDetachFromContainer();
      break;
    case "toggle-execution-start":
      handleToggleExecutionStart();
      break;
    case "delete":
      handleDelete();
      break;
  }
}

// 处理设置/取消执行起点
function handleToggleExecutionStart() {
  eventBusUtils.emit("node:toggle-execution-start", {
    nodeId: props.id,
    isExecutionStart: !props.data.isExecutionStart,
  });
}

// 处理节点点击（Ctrl + 左键快速设置为起点）
function handleNodeClick(event: MouseEvent) {
  // Ctrl + 左键点击快速设置为执行起点
  if (event.ctrlKey && event.button === 0) {
    event.stopPropagation();
    handleToggleExecutionStart();
  }
}

// 是否显示图标
const showIcon = computed(() => {
  if (styleConfig.value.showIcon !== undefined) {
    return styleConfig.value.showIcon;
  }
  // 如果有图标配置，默认显示
  return !!styleConfig.value.icon;
});

// 图标 SVG 字符串
const iconSvg = computed(() => {
  const icon = styleConfig.value.icon;
  if (!icon || typeof icon !== "string") return null;

  // 如果是 SVG 字符串
  if (icon.trim().startsWith("<svg")) {
    return icon;
  }

  return null;
});

// 图标组件或文本
const iconComponent = computed<Component | null>(() => {
  const icon = styleConfig.value.icon;
  if (!icon) return null;

  // 如果是 SVG 字符串，返回 null（使用 iconSvg）
  if (typeof icon === "string" && icon.trim().startsWith("<svg")) {
    return null;
  }

  // 如果是 Vue 组件（对象类型），直接返回
  if (typeof icon === "object") {
    return icon as Component;
  }

  // 如果是字符串，尝试通过名称获取图标组件
  if (typeof icon === "string") {
    const namedIcon = getNodeIcon(icon);
    if (namedIcon) {
      return namedIcon;
    }
  }

  // 否则返回 null（使用 iconText）
  return null;
});

// 图标文本（emoji 或普通文本）
const iconText = computed(() => {
  const icon = styleConfig.value.icon;
  if (!icon || typeof icon !== "string") return null;

  // 如果是 SVG 字符串，返回 null（使用 iconSvg）
  if (icon.trim().startsWith("<svg")) {
    return null;
  }

  // 如果是图标名称且已映射到组件，返回 null（应该使用 iconComponent）
  if (getNodeIcon(icon)) {
    return null;
  }

  // 否则作为文本返回（如 emoji）
  return icon;
});

// 是否显示输入端口
const showInputPort = computed(() => {
  return !props.data.noInputs;
});

// 是否显示输出端口
const showOutputPort = computed(() => {
  return !props.data.noOutputs;
});

const defaultPortPosition = computed(() => {
  return {
    top: `${NODE_SIZE.headerHeight + 20}px!important`,
  };
});

// 默认输入端口配置（供 slot 使用）
const defaultInputPort = computed(() => ({
  id: "input",
  type: "target" as const,
  position: Position.Left,
  nodeId: props.id,
  variant: "ellipse" as const,
  style: defaultPortPosition.value,
}));

// 默认输出端口配置（供 slot 使用）
const defaultOutputPort = computed(() => ({
  id: "output",
  type: "source" as const,
  position: Position.Right,
  nodeId: props.id,
  variant: "ellipse" as const,
  style: defaultPortPosition.value,
}));
</script>
