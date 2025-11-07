<template>
  <div
    class="vueflow-canvas-wrapper"
    :style="{ backgroundColor: editorConfig.bgColor }"
  >
    <VueFlow
      v-model:nodes="coreNodes"
      v-model:edges="coreEdges"
      :node-types="nodeTypes"
      :edge-types="edgeTypes"
      :default-zoom="editorConfig.defaultZoom"
      :min-zoom="editorConfig.minZoom"
      :max-zoom="editorConfig.maxZoom"
      :snap-to-grid="editorConfig.snapToGrid"
      :snap-grid="[editorConfig.gridSize, editorConfig.gridSize]"
      :fit-view-on-init="config.fitViewOnInit"
      :connect-on-click="config.connectOnClick"
      :default-edge-options="defaultEdgeOptions"
      :edges-updatable="true"
      :edge-updater-radius="20"
      connectable
      :connection-mode="config.connectionMode || 'loose'"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @connect="handleConnect"
      @connect-start="handleConnectStart"
      @connect-end="handleConnectEnd"
      @node-click="handleNodeClick"
      @node-double-click="handleNodeDoubleClick"
      @node-context-menu="handleNodeContextMenu"
      @edge-click="handleEdgeClick"
      @edge-update-start="handleEdgeUpdateStart"
      @edge-update="handleEdgeUpdate"
      @edge-update-end="handleEdgeUpdateEnd"
      @pane-click="handlePaneClick"
    >
      <!-- 自定义节点类型插槽 -->
      <template #node-custom="nodeProps">
        <slot name="node-custom" v-bind="nodeProps">
          <component :is="customNodeComponent" v-bind="nodeProps" />
        </slot>
      </template>

      <!-- Note 笔记节点插槽 -->
      <template #node-note="nodeProps">
        <NoteNode v-bind="nodeProps" />
      </template>

      <!-- 开始节点插槽 -->
      <template #node-start="nodeProps">
        <StartNode v-bind="nodeProps" />
      </template>

      <!-- 结束节点插槽 -->
      <template #node-end="nodeProps">
        <EndNode v-bind="nodeProps" />
      </template>

      <!-- 自定义连接线（拖拽时的临时连接线） -->
      <template #connection-line="connectionLineProps">
        <CustomConnectionEdge v-bind="connectionLineProps" />
      </template>

      <!-- 自定义边类型插槽 -->
      <template #edge-custom="edgeProps">
        <CustomEdge v-bind="edgeProps" />
      </template>

      <!-- 背景网格 -->
      <Background
        v-if="showBackground && editorConfig.showGrid"
        :pattern-color="editorConfig.gridColor"
        :gap="editorConfig.gridGap"
        :variant="gridVariant"
      />

      <!-- 控制按钮 -->
      <Controls
        v-if="showControls"
        :position="controlsConfig.position"
        :show-zoom="controlsConfig.showZoom"
        :show-fit-view="controlsConfig.showFitView"
        :show-interactive="controlsConfig.showInteractive"
        class="-scale-x-100"
      />

      <!-- 小地图 -->
      <MiniMap
        v-if="showMiniMap"
        :position="miniMapConfig.position"
        :pannable="miniMapConfig.pannable"
        :zoomable="miniMapConfig.zoomable"
        :node-color="getMiniMapNodeColor"
        :node-stroke-color="getMiniMapNodeStroke"
      />
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide } from "vue";
import { storeToRefs } from "pinia";
import {
  VueFlow,
  useVueFlow,
  type Node,
  type Edge,
  type Connection,
  type ConnectionMode,
} from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { MiniMap } from "@vue-flow/minimap";
import { useVueFlowCore } from "../core/useVueFlowCore";
import { useNodeExecutionStatus } from "../composables/useNodeExecutionStatus";
import {
  DEFAULT_VUEFLOW_CONFIG,
  BACKGROUND_CONFIG,
  CONTROLS_CONFIG,
  MINIMAP_CONFIG,
} from "../core/vueflowConfig";
import { useEditorConfigStore } from "@/newCode/stores/editorConfig";
import { NODE_SIZE } from "@/newCode/config";
import CustomNode from "./nodes/CustomNode.vue";
import NoteNode from "./nodes/NoteNode.vue";
import StartNode from "./nodes/StartNode.vue";
import EndNode from "./nodes/EndNode.vue";
import CustomConnectionEdge from "./edges/CustomConnectionEdge.vue";
import CustomEdge from "./edges/CustomEdge.vue";
import {
  PluginManager,
  PLUGIN_MANAGER_KEY,
  createConfigSyncPlugin,
  createCopyPastePlugin,
  createCanvasPersistencePlugin,
  createMultiSelectPlugin,
  createHistoryPlugin,
  createEdgeEditPlugin,
  createCtrlConnectPlugin,
  createAutoLayoutPlugin,
  createDeletePlugin,
} from "../plugins";

// 配置 Store
const editorConfigStore = useEditorConfigStore();
const { config: editorConfig } = storeToRefs(editorConfigStore);

interface Props {
  /** 自定义节点组件 */
  customNodeComponent?: any;
  /** VueFlow 配置 */
  config?: Partial<typeof DEFAULT_VUEFLOW_CONFIG>;
  /** 是否显示背景 */
  showBackground?: boolean;
  /** 背景配置 */
  backgroundConfig?: Partial<typeof BACKGROUND_CONFIG>;
  /** 是否显示控制按钮 */
  showControls?: boolean;
  /** 控制按钮配置 */
  controlsConfig?: Partial<typeof CONTROLS_CONFIG>;
  /** 是否显示小地图 */
  showMiniMap?: boolean;
  /** 小地图配置 */
  miniMapConfig?: Partial<typeof MINIMAP_CONFIG>;
}

const props = withDefaults(defineProps<Props>(), {
  customNodeComponent: () => CustomNode,
  config: () => ({}),
  showBackground: true,
  backgroundConfig: () => ({}),
  showControls: true,
  controlsConfig: () => ({}),
  showMiniMap: false,
  miniMapConfig: () => ({}),
});

// 合并配置
const config = computed<
  typeof DEFAULT_VUEFLOW_CONFIG & {
    connectionMode?: ConnectionMode;
  }
>(() => ({
  ...DEFAULT_VUEFLOW_CONFIG,
  ...props.config,
}));

// 网格样式映射
const gridVariant = computed<"dots" | "lines">(() => {
  const gridType = editorConfig.value.gridType;
  return gridType === "dots" || gridType === "lines" ? gridType : "dots";
});

const controlsConfig = computed(() => ({
  ...CONTROLS_CONFIG,
  ...props.controlsConfig,
}));

const miniMapConfig = computed(() => ({
  ...MINIMAP_CONFIG,
  ...props.miniMapConfig,
}));

// 边的默认样式
const defaultEdgeOptions = computed(() => ({
  type: "custom", // 使用自定义边类型
  animated: editorConfig.value.edgeAnimation,
  style: {
    stroke: editorConfig.value.edgeColor,
    strokeWidth: editorConfig.value.edgeWidth,
  },
}));

// 节点类型映射
const nodeTypes = {
  custom: props.customNodeComponent,
  note: () => NoteNode,
  start: () => StartNode,
  end: () => EndNode,
};

// 边类型映射
const edgeTypes = { custom: CustomEdge };

/**
 * 节点类型特定数据配置
 * 只定义每种节点类型特有的字段，通用字段从 draggedNode 中获取
 */
const NODE_TYPE_SPECIFIC_DATA: Record<string, Record<string, any>> = {
  note: {
    content: "", // 笔记内容
    width: 200, // 默认宽度
    height: 120, // 默认高度
  },
  // start 和 end 节点没有特有字段，使用通用配置
};

// VueFlow API
const vueFlowApi = useVueFlow();
// VueFlow 核心逻辑
const vueFlowCore = useVueFlowCore({
  enableStoreSync: true,
  enableEvents: true,
});

const { nodes: coreNodes, edges: coreEdges, events } = vueFlowCore;

// 插件管理器
const pluginManager = new PluginManager();

// 提供插件管理器供子组件访问
provide(PLUGIN_MANAGER_KEY, pluginManager);

// 节点执行状态管理
const executionStatusManager = useNodeExecutionStatus();

// 提供节点执行状态给所有子节点组件
provide("nodeExecutionStatuses", executionStatusManager.nodeStatuses.value);

/**
 * 小地图节点颜色
 */
function getMiniMapNodeColor(node: Node) {
  return node.data?.color || "#ffffff";
}

/**
 * 小地图节点边框颜色
 */
function getMiniMapNodeStroke(node: Node) {
  return node.data?.color || "#94a3b8";
}

/**
 * 处理拖放
 */
function handleDrop(event: DragEvent) {
  event.preventDefault();

  const nodeDataStr = event.dataTransfer?.getData("application/vueflow");
  if (!nodeDataStr) {
    console.warn("[VueFlowCanvas] 未找到拖拽数据");
    return;
  }

  try {
    const draggedNode = JSON.parse(nodeDataStr);

    // 将屏幕坐标转换为画布坐标
    const position = vueFlowApi.project({
      x: event.clientX,
      y: event.clientY,
    });

    // 调整位置：使鼠标释放点对应节点顶部标题的中心
    const adjustedPosition = {
      x: position.x - NODE_SIZE.defaultWidth / 2, // 水平居中
      y: position.y - NODE_SIZE.headerHeight / 2, // 垂直对齐到标题中心
    };

    // 确定节点类型（note、start、end 使用对应类型，其他使用 custom）
    const nodeType = ["note", "start", "end"].includes(draggedNode.id)
      ? draggedNode.id
      : "custom";

    // 获取节点类型特定数据
    const specificData = NODE_TYPE_SPECIFIC_DATA[draggedNode.id] || {};

    // 创建新的节点对象
    const newNode: Node = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: nodeType,
      position: adjustedPosition,
      data: {
        nodeType: draggedNode.id,
        // 通用字段：从 draggedNode 获取
        label: draggedNode.name,
        description: draggedNode.description,
        // 对于 custom 类型，添加 type 字段
        ...(nodeType === "custom" && { type: draggedNode.id }),
        // 节点类型特定字段
        ...specificData,
        // 保存节点的 inputs/outputs 配置（用于配置面板）
        inputs: draggedNode.inputs,
        outputs: draggedNode.outputs,
      },
    };

    // 添加到节点数组
    coreNodes.value.push(newNode);

    console.log(
      "[VueFlowCanvas] 添加新节点:",
      newNode,
      "原始坐标:",
      position,
      "调整后坐标:",
      adjustedPosition
    );

    // 通过事件系统通知外部
    if (events) {
      events.emit("node:added", { node: newNode });
    }
  } catch (error) {
    console.error("[VueFlowCanvas] 解析拖放数据失败:", error);
  }
}

/**
 * 处理拖动悬停
 */
function handleDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }
}

/**
 * 处理连接开始
 */
function handleConnectStart(params: any) {
  // 通过事件系统通知外部和插件
  if (events) {
    events.emit("edge:connect-start", params);
  }
}

/**
 * 处理连接结束
 */
function handleConnectEnd(event: any) {
  // 通过事件系统通知外部和插件
  if (events) {
    events.emit("edge:connect-end", event);
  }
}

/**
 * 处理节点连接
 */
function handleConnect(connection: Connection) {
  console.log("[VueFlowCanvas] 创建新连接:", connection);

  // 创建新的边
  const newEdge: Edge = {
    id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    ...defaultEdgeOptions.value,
  };

  // 添加到边数组
  coreEdges.value.push(newEdge);

  // 通过事件系统通知外部
  if (events) {
    events.emit("edge:connected", { connection });
    events.emit("edge:added", { edge: newEdge });
  }
}

/**
 * 处理节点点击
 */
function handleNodeClick({ node, event }: any) {
  if (events) {
    events.emit("node:clicked", { node, event: event as MouseEvent });
  }
}

/**
 * 处理节点双击
 */
function handleNodeDoubleClick({ node, event }: any) {
  if (events) {
    events.emit("node:double-clicked", { node, event: event as MouseEvent });
  }
}

/**
 * 处理节点右键菜单
 */
function handleNodeContextMenu({ node, event }: any) {
  if (event?.preventDefault) {
    event.preventDefault();
  }
  if (events) {
    events.emit("node:context-menu", { node, event: event as MouseEvent });
  }
}

/**
 * 处理边点击
 */
function handleEdgeClick({ edge }: { edge: Edge }) {
  if (events) {
    events.emit("edge:selected", { edge });
  }
}

/**
 * 处理画布点击
 */
function handlePaneClick(event: MouseEvent) {
  if (events) {
    events.emit("canvas:clicked", { event });
  }
}

/**
 * 处理边更新开始
 */
function handleEdgeUpdateStart(event: any) {
  if (events) {
    events.emit("edge:update-start", { edge: event.edge });
  }
}

/**
 * 处理边更新
 */
function handleEdgeUpdate(event: any) {
  if (events) {
    events.emit("edge:update", event);
  }
}

/**
 * 处理边更新结束
 */
function handleEdgeUpdateEnd(event: any) {
  if (events) {
    events.emit("edge:update-end", { edge: event.edge });
  }
}

onMounted(() => {
  // 设置插件上下文（在挂载后设置，确保 VueFlow 已初始化）
  pluginManager.setContext({
    core: vueFlowCore,
    vueflow: vueFlowApi,
  });

  // 注册并启用插件
  const configSyncPlugin = createConfigSyncPlugin();
  pluginManager.register(configSyncPlugin);

  const copyPastePlugin = createCopyPastePlugin();
  pluginManager.register(copyPastePlugin);

  const multiSelectPlugin = createMultiSelectPlugin();
  pluginManager.register(multiSelectPlugin);

  const historyPlugin = createHistoryPlugin();
  pluginManager.register(historyPlugin);

  const edgeEditPlugin = createEdgeEditPlugin({
    allowReconnectToOriginal: true,
  });
  pluginManager.register(edgeEditPlugin);

  const canvasPersistencePlugin = createCanvasPersistencePlugin();
  pluginManager.register(canvasPersistencePlugin);

  const ctrlConnectPlugin = createCtrlConnectPlugin({
    debug: true, // 开启调试模式，可以在控制台看到日志
    allowReconnectToOriginal: true, // 允许重连回原端口（边编辑时）
    validateConnection: (connection) => {
      // 检查连接是否已存在
      const exists = coreEdges.value.some(
        (edge: Edge) =>
          edge.source === connection.source &&
          edge.sourceHandle === connection.sourceHandle &&
          edge.target === connection.target &&
          edge.targetHandle === connection.targetHandle
      );
      // 只要连接不存在且不是同一个节点，就是有效的
      return !exists && connection.source !== connection.target;
    },
  });
  pluginManager.register(ctrlConnectPlugin);

  const autoLayoutPlugin = createAutoLayoutPlugin();
  pluginManager.register(autoLayoutPlugin);

  const deletePlugin = createDeletePlugin();
  pluginManager.register(deletePlugin);

  console.log("[VueFlowCanvas] 画布已挂载");
  console.log(
    "[VueFlowCanvas] 背景网格:",
    editorConfig.value.showGrid ? "启用" : "禁用"
  );
  console.log(
    "[VueFlowCanvas] 控制按钮:",
    props.showControls ? "启用" : "禁用"
  );
  console.log("[VueFlowCanvas] 小地图:", props.showMiniMap ? "启用" : "禁用");
  console.log("[VueFlowCanvas] 边类型:", editorConfig.value.edgeType);
  console.log("[VueFlowCanvas] 边宽度:", editorConfig.value.edgeWidth);
  console.log("[VueFlowCanvas] 边颜色:", editorConfig.value.edgeColor);
  console.log(
    "[VueFlowCanvas] 边动画:",
    editorConfig.value.edgeAnimation ? "启用" : "禁用"
  );
  const enabledPlugins = pluginManager
    .getEnabledPlugins()
    .map((p) => p.config.name);
  console.log("[VueFlowCanvas] 已注册插件:", enabledPlugins);
});

onUnmounted(() => {
  // 清理所有插件
  pluginManager.getEnabledPlugins().forEach((plugin) => {
    pluginManager.disable(plugin.config.id);
  });
  console.log("[VueFlowCanvas] 画布已卸载，插件已清理");
});
</script>

<style>
.vueflow-canvas-wrapper {
  width: 100%;
  height: 100%;
}

/* 边的选中/激活状态样式 */
.vueflow-canvas-wrapper .vue-flow__edge.selected path,
.vueflow-canvas-wrapper .vue-flow__edge:hover path {
  stroke: v-bind("editorConfig.edgeActiveColor") !important;
}
</style>
