<template>
  <div
    class="vueflow-canvas-wrapper"
    :style="{ backgroundColor: editorConfig.bgColor }"
  >
    <VueFlow
      v-model:nodes="coreNodes"
      v-model:edges="coreEdges"
      :node-types="nodeTypes"
      :default-zoom="editorConfig.defaultZoom"
      :min-zoom="editorConfig.minZoom"
      :max-zoom="editorConfig.maxZoom"
      :snap-to-grid="editorConfig.snapToGrid"
      :snap-grid="[editorConfig.gridSize, editorConfig.gridSize]"
      :fit-view-on-init="config.fitViewOnInit"
      :connect-on-click="config.connectOnClick"
      :default-edge-options="defaultEdgeOptions"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @node-click="handleNodeClick"
      @node-double-click="handleNodeDoubleClick"
      @node-context-menu="handleNodeContextMenu"
      @edge-click="handleEdgeClick"
      @pane-click="handlePaneClick"
    >
      <!-- 自定义节点类型插槽 -->
      <template #node-custom="nodeProps">
        <slot name="node-custom" v-bind="nodeProps">
          <component :is="customNodeComponent" v-bind="nodeProps" />
        </slot>
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
import { computed, onMounted, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { VueFlow, useVueFlow, type Node, type Edge } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { MiniMap } from "@vue-flow/minimap";
import { useVueFlowCore } from "../core/useVueFlowCore";
import {
  DEFAULT_VUEFLOW_CONFIG,
  BACKGROUND_CONFIG,
  CONTROLS_CONFIG,
  MINIMAP_CONFIG,
} from "../core/vueflowConfig";
import { useEditorConfigStore } from "@/newCode/stores/editorConfig";
import CustomNode from "./nodes/CustomNode.vue";
import {
  PluginManager,
  createConfigSyncPlugin,
  createCopyPastePlugin,
  createCanvasPersistencePlugin,
  createMultiSelectPlugin,
  createHistoryPlugin,
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
const config = computed(() => ({
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
  type: editorConfig.value.edgeType,
  animated: editorConfig.value.edgeAnimation,
  style: {
    stroke: editorConfig.value.edgeColor,
    strokeWidth: editorConfig.value.edgeWidth,
  },
}));

// 节点类型映射
const nodeTypes = { custom: props.customNodeComponent };

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
  if (!nodeDataStr) return;

  try {
    const nodeData = JSON.parse(nodeDataStr);

    // 通过事件系统通知外部
    if (events) {
      events.emit("node:added", { node: nodeData });
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
    event.dataTransfer.dropEffect = "move";
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

  const canvasPersistencePlugin = createCanvasPersistencePlugin();
  pluginManager.register(canvasPersistencePlugin);

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
