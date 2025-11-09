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

      <!-- 连接节点插槽 -->
      <template #node-connector="nodeProps">
        <ConnectorNode v-bind="nodeProps" />
      </template>

      <!-- If 条件判断节点插槽 -->
      <template #node-if="nodeProps">
        <IfNode v-bind="nodeProps" />
      </template>

      <!-- For 循环节点插槽 -->
      <template #node-for="nodeProps">
        <ForNode v-bind="nodeProps" />
      </template>

      <!-- For 循环容器节点插槽 -->
      <template #node-forLoopContainer="nodeProps">
        <ForLoopContainerNode v-bind="nodeProps" />
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
import { useConnectionValidation } from "../composables/useConnectionValidation";
import {
  DEFAULT_VUEFLOW_CONFIG,
  BACKGROUND_CONFIG,
  CONTROLS_CONFIG,
  MINIMAP_CONFIG,
} from "../core/vueflowConfig";
import { useEditorConfigStore } from "../../../stores/editorConfig";
import { NODE_SIZE } from "../../../config";
import { eventBusUtils } from "../events";
import CustomNode from "./nodes/CustomNode.vue";
import NoteNode from "./nodes/NoteNode.vue";
import StartNode from "./nodes/StartNode.vue";
import EndNode from "./nodes/EndNode.vue";
import ConnectorNode from "./nodes/ConnectorNode.vue";
import IfNode from "./nodes/IfNode.vue";
import ForNode from "./nodes/ForNode.vue";
import ForLoopContainerNode from "./nodes/ForLoopContainerNode.vue";
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
  createAutoReconnectPlugin,
  createForLoopPlugin,
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
  connector: () => ConnectorNode,
  if: () => IfNode,
  for: () => ForNode,
  forLoopContainer: () => ForLoopContainerNode,
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
// 插件管理器（需要在 useVueFlowCore 之前创建）
const pluginManager = new PluginManager();
// VueFlow 核心逻辑
const vueFlowCore = useVueFlowCore({
  enableStoreSync: true,
  enableEvents: true,
  pluginManager,
});

const { nodes: coreNodes, edges: coreEdges, events } = vueFlowCore;

// 连接验证工具
const { validateConnection } = useConnectionValidation(coreEdges);

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

    // 确定节点类型（note、start、end、connector、if 使用对应类型，其他使用 custom）
    const nodeType = [
      "note",
      "start",
      "end",
      "connector",
      "if",
      "for",
      "forLoopContainer",
    ].includes(draggedNode.id)
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

    // 如果是 for 节点，自动创建容器节点并连接
    if (nodeType === "for") {
      const containerId = `for-container-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      // 创建容器节点（放在 for 节点下方）
      const containerNode: Node = {
        id: containerId,
        type: "forLoopContainer",
        position: {
          x: adjustedPosition.x - NODE_SIZE.defaultWidth / 2,
          y:
            adjustedPosition.y + 100 + editorConfig.value.autoLayoutRankSpacing, // 放在 for 节点下方 150px
        },
        data: {
          label: "批处理体",
          type: "forLoopContainer",
          config: {
            forNodeId: newNode.id,
          },
        },
        width: 400,
        height: 200,
      };

      // 添加容器节点
      coreNodes.value.push(containerNode);

      // 创建连接边（for 节点的 loop 端口 -> 容器的 loop-in 端口）
      const edgeId = `edge-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      const connectionEdge: Edge = {
        id: edgeId,
        source: newNode.id,
        sourceHandle: "loop",
        target: containerId,
        targetHandle: "loop-in",
        type: "custom",
        updatable: false, // 禁止编辑装饰性边
      };

      coreEdges.value.push(connectionEdge);

      // 更新 for 节点的 config，保存 containerId
      newNode.data = {
        ...newNode.data,
        config: {
          ...(newNode.data.config || {}),
          containerId: containerId,
          mode: "variable",
          variable: "",
          itemName: "item",
          indexName: "index",
        },
      };

      console.log(
        "[VueFlowCanvas] 自动创建 For 容器节点:",
        containerNode,
        "连接边:",
        connectionEdge
      );
    }

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
 * 获取边的唯一标识 key
 * 包含 source、target、sourceHandle、targetHandle、sourceY、targetY
 * 注意：一个节点可能存在多个输出端口，需要添加 sourceY 坐标来区分
 */
function getEdgeKey(edge: Edge): string {
  // 尝试从多个来源获取 sourceY 和 targetY
  let sourceY: number | string = "";
  let targetY: number | string = "";

  if ("sourceY" in edge && typeof edge.sourceY === "number") {
    sourceY = edge.sourceY;
  }
  if ("targetY" in edge && typeof edge.targetY === "number") {
    targetY = edge.targetY;
  }

  // 生成唯一标识符：source_target_sourceHandle_targetHandle_sourceY_targetY
  return `${edge.source}_${edge.target}_${edge.sourceHandle || ""}_${
    edge.targetHandle || ""
  }_${sourceY}_${targetY}`;
}

/**
 * 删除重复的边
 * 根据 source、target、sourceHandle、targetHandle、sourceY、targetY 判断是否重复
 * 保留第一个出现的边，删除后续重复的边
 */
function removeDuplicateEdges() {
  const seen = new Set<string>();
  const uniqueEdges: Edge[] = [];
  const removedEdgeIds: string[] = [];

  for (const edge of coreEdges.value) {
    const key = getEdgeKey(edge);

    if (!seen.has(key)) {
      seen.add(key);
      uniqueEdges.push(edge);
    } else {
      // 记录被删除的重复边
      removedEdgeIds.push(edge.id);
      console.log("[VueFlowCanvas] 删除重复的边:", edge.id, key);
    }
  }

  // 如果有重复的边被删除，更新边数组并发送事件
  if (removedEdgeIds.length > 0) {
    coreEdges.value = uniqueEdges;
    console.log(`[VueFlowCanvas] 已删除 ${removedEdgeIds.length} 条重复的边`);

    // 发送边删除事件
    if (events) {
      removedEdgeIds.forEach((edgeId) => {
        events.emit("edge:deleted", { edgeId });
      });
    }
  }
}

/**
 * 处理连接结束
 */
function handleConnectEnd(event: any) {
  // 通过事件系统通知外部和插件
  console.log("[VueFlowCanvas] 连接结束:", event);

  // 延迟删除重复的边，确保新连接的边已经添加到数组中
  setTimeout(() => {
    removeDuplicateEdges();
  }, 100);

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

/**
 * 处理节点删除请求（从按钮触发）
 */
function handleNodeDelete({ nodeId }: { nodeId: string }) {
  console.log("[VueFlowCanvas] 节点删除请求:", nodeId);
  // 使用 vueFlowCore 的 deleteNode 方法删除节点
  vueFlowCore.deleteNode(nodeId);
}

onMounted(() => {
  // 设置插件上下文（在挂载后设置，确保 VueFlow 已初始化）
  pluginManager.setContext({
    core: vueFlowCore,
    vueflow: vueFlowApi,
  });

  // 监听节点删除事件（从按钮触发的删除）
  eventBusUtils.on("node:delete-request", handleNodeDelete);

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
    autoEnable: true,
    allowReconnectToOriginal: true, // 允许重连回原端口（边编辑时）
    validateConnection,
  });
  pluginManager.register(ctrlConnectPlugin);

  const autoLayoutPlugin = createAutoLayoutPlugin();
  pluginManager.register(autoLayoutPlugin);

  const deletePlugin = createDeletePlugin();
  pluginManager.register(deletePlugin);

  const autoReconnectPlugin = createAutoReconnectPlugin({
    debug: true, // 开启调试模式，可以在控制台看到日志
    validateConnection,
  });
  pluginManager.register(autoReconnectPlugin);

  const forLoopPlugin = createForLoopPlugin();
  pluginManager.register(forLoopPlugin);

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
  // 清理事件监听器
  eventBusUtils.off("node:delete-request", handleNodeDelete);

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

/* 容器内连接线的 z-index 层级管理 */
.edge-layer-container {
  z-index: 2001 !important;
}
</style>
