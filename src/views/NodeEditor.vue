<!-- 节点编辑器主组件 -->
<template>
  <div
    class="flex w-screen h-screen bg-linear-to-br from-slate-50 to-slate-100"
  >
    <!-- 第一栏：纵向菜单栏 -->
    <VerticalTabMenu :active-tab="activeTab" @tab-change="handleTabChange" />

    <!-- 第三栏：画布区域（占据剩余空间） -->
    <div class="flex-1 flex relative overflow-hidden">
      <!-- 第二栏：悬浮面板（绝对定位，悬浮在画布上） -->
      <div v-if="activeTab !== null" class="absolute left-0 top-0 h-full z-30">
        <WorkflowFileTree
          v-if="activeTab === 'folders'"
          @close="handleClosePanel"
        />

        <NodeListPanel v-if="activeTab === 'nodes'" @close="handleClosePanel" />

        <ConfigPanel
          v-if="activeTab === 'settings'"
          @close="handleClosePanel"
        />
      </div>
      <!-- 左下角统计信息 -->
      <div class="absolute bottom-4 left-4 flex gap-3 z-5 px-3 py-2 rounded-lg">
        <div class="flex items-center gap-1 text-xs">
          <span class="text-slate-400 font-medium">节点:</span>
          <span class="text-slate-600 font-semibold">{{ nodes.length }}</span>
        </div>
        <div class="flex items-center gap-1 text-xs">
          <span class="text-slate-400 font-medium">连接:</span>
          <span class="text-slate-600 font-semibold">{{ edges.length }}</span>
        </div>
        <div class="flex items-center gap-1 text-xs">
          <span class="text-slate-400 font-medium">FPS:</span>
          <span class="text-slate-600 font-semibold">{{ fps }}</span>
        </div>
      </div>

      <VueFlow
        ref="vueFlowRef"
        v-model:nodes="nodes"
        v-model:edges="edges"
        :default-viewport="{ zoom: 1, x: 0, y: 0 }"
        :min-zoom="config.minZoom"
        :max-zoom="config.maxZoom"
        :snap-to-grid="config.snapToGrid"
        :snap-grid="[config.snapGrid[0], config.snapGrid[1]]"
        :connection-radius="0"
        :edges-updatable="true"
        :edge-updater-radius="20"
        :select-nodes-on-drag="true"
        :nodes-draggable="!isLocked"
        :elements-selectable="!isLocked"
        @nodes-change="onNodesChange"
        @edges-change="onEdgesChange"
        @connect="onConnect"
        @connect-start="onConnectStart"
        @connect-end="onConnectEnd"
        @edge-update-start="onEdgeUpdateStart"
        @edge-update="onEdgeUpdate"
        @edge-update-end="onEdgeUpdateEnd"
        @pane-click="onPaneClick"
        @drop="onDrop"
        @dragover="onDragOver"
      >
        <!-- 网格背景 -->
        <Background
          v-if="config.showBackground"
          :pattern-color="config.backgroundPatternColor"
          :gap="config.backgroundGap"
          :variant="
            config.backgroundPattern === 'cross'
              ? 'dots'
              : config.backgroundPattern
          "
        />

        <!-- 控制按钮 -->
        <Controls class="right-0" style="left: unset !important" />

        <!-- 小地图 -->
        <MiniMap
          v-if="config.showMiniMap"
          :node-color="getNodeColor"
          :mask-color="'rgba(0, 0, 0, 0.08)'"
          :pannable="true"
          :zoomable="true"
          class="modern-minimap"
        />

        <!-- 自定义节点 -->
        <template #node-custom="{ data, id }">
          <CustomNode :id="id" :data="data" />
        </template>

        <!-- 循环容器节点 -->
        <template #node-loopContainer="{ data, id }">
          <LoopContainerNode :id="id" :data="data" />
        </template>

        <!-- 自定义连接线（拖拽时的临时连接线） -->
        <template #connection-line="connectionLineProps">
          <CustomConnectionLine v-bind="connectionLineProps" />
        </template>

        <!-- 自定义连线，提供悬浮删除按钮 -->
        <template #edge-default="edgeProps">
          <InteractiveEdge v-bind="edgeProps" variant="default" />
        </template>
        <template #edge-simplebezier="edgeProps">
          <InteractiveEdge v-bind="edgeProps" variant="simplebezier" />
        </template>
        <template #edge-smoothstep="edgeProps">
          <InteractiveEdge v-bind="edgeProps" variant="smoothstep" />
        </template>
        <template #edge-step="edgeProps">
          <InteractiveEdge v-bind="edgeProps" variant="step" />
        </template>
        <template #edge-straight="edgeProps">
          <InteractiveEdge v-bind="edgeProps" variant="straight" />
        </template>
      </VueFlow>

      <!-- 底部中央控制按钮组 -->
      <div
        v-if="config.showControls"
        class="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-lg shadow-xl z-10"
      >
        <!-- 历史记录按钮 -->
        <Button
          variant="outlined"
          icon-only
          :disabled="!store.canUndo"
          @click="handleUndo"
          title="撤销 (Ctrl+Z)"
        >
          <IconUndo />
        </Button>
        <Button
          variant="outlined"
          icon-only
          :disabled="!store.canRedo"
          @click="handleRedo"
          title="重做 (Ctrl+Y)"
        >
          <IconRedo />
        </Button>

        <!-- 分隔线 -->
        <div class="w-px h-5 bg-slate-300/60"></div>

        <!-- <Button variant="outlined" icon-only @click="zoomIn" title="放大">
          <IconZoomIn />
        </Button>
        <Button variant="outlined" icon-only @click="zoomOut" title="缩小">
          <IconZoomOut />
        </Button>
        <Button variant="outlined" icon-only @click="fitView" title="适应视图">
          <IconFit />
        </Button>
        <Button
          :variant="isLocked ? undefined : 'outlined'"
          icon-only
          @click="toggleLock"
          title="锁定画布"
        >
          <IconUnlock v-if="!isLocked" />
          <IconLock v-else />
        </Button> -->

        <Button
          :variant="config.showMiniMap ? undefined : 'outlined'"
          icon-only
          @click="toggleMiniMap"
          title="小地图"
        >
          <IconMap />
        </Button>
        <Button
          variant="outlined"
          icon-only
          :disabled="nodes.length === 0"
          @click="handleFitView"
          title="自适应视图"
        >
          <IconFit />
        </Button>
        <Button
          variant="outlined"
          icon-only
          :disabled="nodes.length === 0"
          @click="handleAutoLayout"
          title="自动布局"
        >
          <IconLayout />
        </Button>
        <Button
          variant="filled"
          icon-only
          :disabled="nodes.length === 0 || isExecutingWorkflow"
          @click="handleExecuteWorkflow"
          title="执行流程"
        >
          <span
            v-if="isExecutingWorkflow"
            class="w-4 h-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin"
          />
          <IconPlayCircle v-else class="w-4 h-4" />
        </Button>
      </div>

      <!-- 节点配置面板（包含变量面板） -->
      <Transition name="slide-left">
        <NodeEditorPanel v-if="store.isNodeEditorVisible" />
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  onBeforeUnmount,
  nextTick,
  provide,
} from "vue";
import { storeToRefs } from "pinia";
import { useEventListener, useMagicKeys, whenever } from "@vueuse/core";
import { VueFlow, useVueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { MiniMap } from "@vue-flow/minimap";
import { Controls } from "@vue-flow/controls";

import type {
  Connection as FlowConnection,
  Node,
  Edge,
  GraphNode,
  NodeChange,
  NodeSelectionChange,
  EdgeChange,
  EdgeUpdateEvent,
  HandleElement,
} from "@vue-flow/core";
import CustomNode from "@/components/node-editor/CustomNode.vue";
import LoopContainerNode from "@/components/node-editor/nodes/LoopContainerNode.vue";
import ConfigPanel from "@/components/node-editor/ConfigPanel.vue";
import NodeEditorPanel from "@/components/node-editor/NodeEditorPanel.vue";
import NodeListPanel from "@/components/node-editor/NodeListPanel.vue";
import InteractiveEdge from "@/components/node-editor/edges/InteractiveEdge.vue";
import VerticalTabMenu from "@/components/node-editor/VerticalTabMenu.vue";
import WorkflowFileTree from "@/components/node-editor/WorkflowFileTree.vue";
import CustomConnectionLine from "@/components/node-editor/CustomConnectionLine.vue";
import { useNodeEditorStore } from "@/stores/nodeEditor";
import { useEditorConfigStore } from "@/stores/editorConfig";
import { useWorkflowStore } from "@/stores/workflow";
import type {
  NodeData,
  PortDefinition,
  Connection as EditorConnection,
} from "@/typings/nodeEditor";
import { nodeEditorLayoutConfig } from "@/config";
import Button from "@/components/common/Button.vue";
import IconMap from "@/icons/IconMap.vue";
import IconUndo from "@/icons/IconUndo.vue";
import IconRedo from "@/icons/IconRedo.vue";
import IconLayout from "@/icons/IconLayout.vue";
import IconFit from "@/icons/IconFit.vue";
import IconPlayCircle from "@/icons/IconPlayCircle.vue";

// 引入工作流执行状态管理
import { useWorkflowExecution } from "@/workflow/execution/useWorkflowExecution";
import {
  CTRL_CONNECT_CONTEXT_KEY,
  type CtrlConnectCandidateState,
} from "@/components/node-editor/contextKeys";
import {
  NODE_EDITOR_BRIDGE_KEY,
  registerNodeEditorBridge,
  unregisterNodeEditorBridge,
} from "@/components/node-editor/nodeEditorBridge";
import type { NodeEditorBridge } from "@/components/node-editor/nodeEditorBridge";

type DagreLayoutDirection = "TB" | "BT" | "LR" | "RL";

// 引入 VueFlow 样式
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/minimap/dist/style.css";
import "@vue-flow/controls/dist/style.css";

// 引入端口样式
import "@/components/node-editor/ports/portStyles.css";

const store = useNodeEditorStore();
const { nodes, edges, isExecutingWorkflow, selectedNodeId } =
  storeToRefs(store);

const configStore = useEditorConfigStore();
const { config } = storeToRefs(configStore);

const workflowStore = useWorkflowStore();
const { currentWorkflow } = storeToRefs(workflowStore);

// 初始化工作流执行状态管理器
// 使用当前工作流 ID（如果没有则使用默认 ID）
const workflowId = computed(
  () => currentWorkflow.value?.id || "default-workflow"
);
const workflowExecution = useWorkflowExecution(workflowId);

// 响应式更新节点和边的执行状态
// 使用定时器实时检查状态变化并更新
let executionStateUpdateInterval: number | null = null;

function updateNodesExecutionState() {
  const executionId = workflowExecution.activeExecutionId.value;
  if (!executionId) {
    // 没有活跃执行时，清除所有节点的执行状态
    nodes.value.forEach((node) => {
      if (node.data && node.data.executionStatus) {
        node.data.executionStatus = undefined;
      }
    });
    return;
  }

  const nodeStates = workflowExecution.getNodeStates(executionId);
  if (!nodeStates) return;

  // 实时更新所有节点的执行状态
  nodes.value.forEach((node) => {
    const state = nodeStates.get(node.id);
    if (state && node.data) {
      // 只在状态真正变化时更新
      if (node.data.executionStatus !== state.status) {
        node.data.executionStatus = state.status;
      }

      // 更新节点执行结果（成功时显示输出）
      if (state.status === "success" && state.output) {
        // 确保result对象包含必要的字段
        const duration =
          state.endTime && state.startTime
            ? state.endTime - state.startTime
            : 0;

        node.data.result = {
          status: "success",
          duration,
          timestamp: state.endTime || Date.now(),
          ...state.output,
        };

        // 首次显示时默认不展开
        if (node.data.resultExpanded === undefined) {
          node.data.resultExpanded = false;
        }
      }

      // 更新错误信息
      if (state.status === "error" && state.error) {
        node.data.executionError = state.error.message;
      }
    }
  });
}

function updateEdgesActivationState() {
  const executionId = workflowExecution.activeExecutionId.value;
  if (!executionId) {
    // 没有活跃执行时，清除所有边的激活状态
    edges.value.forEach((edge) => {
      if (edge.data && edge.data.isActive) {
        edge.data = { ...edge.data, isActive: false };
      }
    });
    return;
  }

  const activeEdges = workflowExecution.getActiveEdges(executionId);
  if (!activeEdges) return;

  // 更新所有边的激活状态
  edges.value.forEach((edge) => {
    const shouldBeActive = activeEdges.has(edge.id);
    const currentlyActive = edge.data?.isActive || false;

    if (shouldBeActive !== currentlyActive) {
      edge.data = {
        ...(edge.data || {}),
        isActive: shouldBeActive,
      };
    }
  });
}

function updateExecutionState() {
  updateNodesExecutionState();
  updateEdgesActivationState();
}

// 在组件挂载时启动定时检查（每100ms更新一次）
onMounted(() => {
  executionStateUpdateInterval = window.setInterval(updateExecutionState, 100);
});

const vueFlowApi = useVueFlow();
const {
  getIntersectingNodes,
  getSelectedNodes,
  addSelectedNodes,
  removeSelectedElements,
  nodesSelectionActive,
} = vueFlowApi;

// 多选状态
const multiSelectionActive = computed({
  get: () => vueFlowApi.multiSelectionActive?.value ?? false,
  set: (value: boolean) => {
    if (vueFlowApi.multiSelectionActive) {
      vueFlowApi.multiSelectionActive.value = value;
    }
  },
});

const isLocked = ref(false);
const fps = ref(0);
const showMiniMapToggle = ref(config.value.showMiniMap);
const vueFlowRef = ref();

// 纵向菜单栏状态
const activeTab = ref<"folders" | "nodes" | "settings" | null>(null);

// 当画布节点被选中时，如果当前面板仍是工作流列表，则自动切换到节点列表
watch(
  () => selectedNodeId.value,
  (nodeId) => {
    if (nodeId && activeTab.value === "folders") {
      activeTab.value = "nodes";
    }
  }
);

// 监听当前工作流变化，加载工作流数据到画布
watch(
  () => currentWorkflow.value,
  (workflow) => {
    if (workflow && workflow.data) {
      // 加载工作流数据到画布
      store.loadWorkflowData(workflow.data.nodes, workflow.data.edges);
    } else {
      // 清空画布
      store.clearCanvas();
    }
  },
  { immediate: true }
);

// 监听画布数据变化，自动保存到当前工作流
watch(
  () => [nodes.value, edges.value],
  () => {
    if (workflowStore.currentWorkflowId) {
      // 使用防抖，避免频繁保存
      if (saveWorkflowTimer.value) {
        clearTimeout(saveWorkflowTimer.value);
      }
      saveWorkflowTimer.value = setTimeout(() => {
        workflowStore.saveWorkflowData(workflowStore.currentWorkflowId!, {
          nodes: nodes.value,
          edges: edges.value,
        });
      }, 500);
    }
  },
  { deep: true }
);

const saveWorkflowTimer = ref<number | null>(null);

// 拖动到容器的状态
const dragTargetContainerId = ref<string | null>(null);
const ctrlDetachContext = ref<{
  nodeId: string;
  containerId: string;
  isIntersecting: boolean;
} | null>(null);
const isCtrlPressed = ref(false);
const connectingNodeId = ref<string | null>(null);
const connectingHandleId = ref<string | null>(null);
const connectingHandleType = ref<"source" | "target" | null>(null);
const ctrlConnectCandidate = ref<CtrlConnectCandidateState | null>(null);
const ctrlConnectActive = computed(
  () =>
    isCtrlPressed.value &&
    connectingNodeId.value !== null &&
    connectingHandleId.value !== null &&
    connectingHandleType.value !== null
);
provide(CTRL_CONNECT_CONTEXT_KEY, {
  active: ctrlConnectActive,
  candidate: ctrlConnectCandidate,
});

watch(ctrlConnectActive, (active) => {
  if (active) {
    updateCtrlConnectCandidate();
  } else {
    resetCtrlConnectCandidate();
  }
});

watch(isCtrlPressed, (pressed) => {
  if (!pressed) {
    resetCtrlConnectCandidate();
    return;
  }

  if (ctrlConnectActive.value) {
    updateCtrlConnectCandidate();
  }
});

const nodeEditorBridge: NodeEditorBridge = {
  checkPortValidity: (targetNodeId: string, targetHandleId: string) =>
    checkPortValidity(targetNodeId, targetHandleId),
  isConnecting: () =>
    connectingNodeId.value !== null && connectingHandleId.value !== null,
  updateNodeInternals: (id: string) => {
    if (!id) return;
    vueFlowRef.value?.updateNodeInternals(id);
  },
};

provide(NODE_EDITOR_BRIDGE_KEY, nodeEditorBridge);
registerNodeEditorBridge(nodeEditorBridge);

onBeforeUnmount(() => {
  unregisterNodeEditorBridge();
});

type HighlightVariant = "normal" | "warning";

const highlightedContainers = new Map<string, HighlightVariant>();
const lastDragPositions = new Map<string, { x: number; y: number }>();
const lastPointerPosition = ref<{ x: number; y: number } | null>(null);
const lastClientPointer = ref<{ x: number; y: number } | null>(null);
const managedSelectedNodeIds = ref<string[]>([]);

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  if (tagName === "INPUT" || tagName === "TEXTAREA") {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  const role = target.getAttribute("role");
  if (role === "textbox" || role === "combobox" || role === "searchbox") {
    return true;
  }

  return Boolean(target.closest('[contenteditable="true"]'));
}

function isShortcutAvailable(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) {
    return true;
  }
  return !isEditableElement(activeElement);
}

function setContainerHighlightState(
  containerId: string | null,
  highlight: boolean,
  type: HighlightVariant = "normal"
) {
  if (!containerId) {
    return;
  }

  const current = highlightedContainers.get(containerId);

  if (highlight) {
    if (current === type) {
      return;
    }
    highlightedContainers.set(containerId, type);
    store.setContainerHighlight(containerId, true, type);
    return;
  }

  if (current === undefined) {
    return;
  }

  highlightedContainers.delete(containerId);
  store.setContainerHighlight(containerId, false);
}

/**
 * 检查节点是否有连接线
 */
function nodeHasConnections(nodeId: string): boolean {
  return edges.value.some(
    (edge) => edge.source === nodeId || edge.target === nodeId
  );
}

function getGraphNodePosition(
  graphNode: GraphNode<NodeData> | null,
  fallbackNode: Node<NodeData> | null
): { x: number; y: number } {
  if (graphNode?.computedPosition) {
    return {
      x: graphNode.computedPosition.x,
      y: graphNode.computedPosition.y,
    };
  }

  const fallback = fallbackNode?.position;
  return {
    x: fallback?.x ?? 0,
    y: fallback?.y ?? 0,
  };
}

function getHandleCandidates(
  graphNode: GraphNode<NodeData> | null,
  fallbackNode: Node<NodeData> | null,
  handleType: "source" | "target"
): { handle: HandleElement; position: { x: number; y: number } }[] {
  if (!graphNode) {
    return [];
  }

  const handles = graphNode.handleBounds?.[handleType] ?? [];
  if (!handles || handles.length === 0) {
    return [];
  }

  const basePosition = getGraphNodePosition(graphNode, fallbackNode);

  return handles.map((handle) => {
    const centerX = basePosition.x + handle.x + (handle.width ?? 0) / 2;
    const centerY = basePosition.y + handle.y + (handle.height ?? 0) / 2;
    return {
      handle,
      position: {
        x: centerX,
        y: centerY,
      },
    };
  });
}

function hasExistingEdge(connection: EditorConnection): boolean {
  return edges.value.some(
    (edge) =>
      edge.source === connection.source &&
      edge.sourceHandle === connection.sourceHandle &&
      edge.target === connection.target &&
      edge.targetHandle === connection.targetHandle
  );
}

function resetCtrlConnectCandidate() {
  if (!ctrlConnectCandidate.value) {
    return;
  }
  ctrlConnectCandidate.value = null;
}

function updateCtrlConnectCandidate() {
  if (
    !ctrlConnectActive.value ||
    !connectingNodeId.value ||
    !connectingHandleType.value
  ) {
    resetCtrlConnectCandidate();
    return;
  }

  const pointer = lastPointerPosition.value;
  const clientPointer = lastClientPointer.value;

  if (!pointer || !clientPointer) {
    resetCtrlConnectCandidate();
    return;
  }

  const element = document.elementFromPoint(clientPointer.x, clientPointer.y);
  if (!element) {
    resetCtrlConnectCandidate();
    return;
  }

  const nodeElement = element.closest(".vue-flow__node") as HTMLElement | null;

  if (!nodeElement) {
    resetCtrlConnectCandidate();
    return;
  }

  const nodeId =
    nodeElement.dataset.id ?? nodeElement.getAttribute("data-id") ?? null;

  if (!nodeId || nodeId === connectingNodeId.value) {
    resetCtrlConnectCandidate();
    return;
  }

  const desiredHandleType =
    connectingHandleType.value === "source" ? "target" : "source";

  if (!desiredHandleType) {
    resetCtrlConnectCandidate();
    return;
  }

  const handleElement = element.closest(
    ".vue-flow__handle"
  ) as HTMLElement | null;

  const handleTypeMatches = handleElement
    ? desiredHandleType === "source"
      ? handleElement.classList.contains("source")
      : handleElement.classList.contains("target")
    : false;

  const preferredHandleId = handleTypeMatches
    ? handleElement?.dataset.handleid ??
      handleElement?.getAttribute("data-handleid") ??
      null
    : null;

  const storeNode = nodes.value.find((n) => n.id === nodeId) ?? null;
  const graphNode = vueFlowApi.findNode?.(nodeId) ?? null;
  const candidates = getHandleCandidates(
    graphNode,
    storeNode,
    desiredHandleType
  );

  if (!candidates.length) {
    resetCtrlConnectCandidate();
    return;
  }

  let bestCandidate: {
    handleId: string | null;
    position: { x: number; y: number };
  } | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const handleId = candidate.handle.id ?? null;
    let score = Math.hypot(
      candidate.position.x - pointer.x,
      candidate.position.y - pointer.y
    );

    if (preferredHandleId && handleId === preferredHandleId) {
      score -= 1000;
    }

    if (!bestCandidate || score < bestScore) {
      bestCandidate = {
        handleId,
        position: candidate.position,
      };
      bestScore = score;
    }
  }

  if (!bestCandidate) {
    resetCtrlConnectCandidate();
    return;
  }

  const selectedHandleId =
    preferredHandleId && preferredHandleId === bestCandidate.handleId
      ? preferredHandleId
      : bestCandidate.handleId;

  if (!selectedHandleId) {
    resetCtrlConnectCandidate();
    return;
  }

  const connection: EditorConnection =
    desiredHandleType === "target"
      ? {
          source: connectingNodeId.value,
          sourceHandle: connectingHandleId.value,
          target: nodeId,
          targetHandle: selectedHandleId,
        }
      : {
          source: nodeId,
          sourceHandle: selectedHandleId,
          target: connectingNodeId.value,
          targetHandle: connectingHandleId.value,
        };

  const exists = hasExistingEdge(connection);

  const isValid = !exists
    ? store.validateConnection(connection, {
        ignoreExisting: true,
        silent: true,
      })
    : false;

  ctrlConnectCandidate.value = {
    nodeId,
    handleId: selectedHandleId,
    handleType: desiredHandleType,
    position: bestCandidate.position,
    isValid,
  };
}

function finalizeCtrlConnection(): boolean {
  if (!ctrlConnectActive.value) {
    return false;
  }

  const candidate = ctrlConnectCandidate.value;

  if (
    !candidate ||
    !candidate.isValid ||
    !candidate.handleId ||
    !candidate.position ||
    !connectingNodeId.value ||
    !connectingHandleId.value ||
    !connectingHandleType.value
  ) {
    return false;
  }

  const connection: EditorConnection =
    connectingHandleType.value === "source"
      ? {
          source: connectingNodeId.value,
          sourceHandle: connectingHandleId.value,
          target: candidate.nodeId,
          targetHandle: candidate.handleId,
        }
      : {
          source: candidate.nodeId,
          sourceHandle: candidate.handleId,
          target: connectingNodeId.value,
          targetHandle: connectingHandleId.value,
        };

  if (hasExistingEdge(connection)) {
    return false;
  }

  if (!store.validateConnection(connection, { ignoreExisting: true })) {
    return false;
  }

  const newEdge: Edge = {
    id: `edge_${Date.now()}`,
    source: connection.source,
    sourceHandle: connection.sourceHandle ?? undefined,
    target: connection.target,
    targetHandle: connection.targetHandle ?? undefined,
    type: config.value.edgeType,
    animated: config.value.edgeAnimated,
    style: {
      stroke: config.value.edgeColor,
      strokeWidth: config.value.edgeStrokeWidth,
    },
  } as Edge;

  store.addEdge(newEdge);
  return true;
}

function isTouchEvent(event: MouseEvent | TouchEvent): event is TouchEvent {
  return typeof TouchEvent !== "undefined" && event instanceof TouchEvent;
}

function getClientPointerFromEvent(
  event: MouseEvent | TouchEvent | null
): { x: number; y: number } | null {
  if (!event) {
    return null;
  }

  if (!isTouchEvent(event)) {
    if (
      typeof event.clientX === "number" &&
      typeof event.clientY === "number"
    ) {
      return { x: event.clientX, y: event.clientY };
    }
    return null;
  }

  const touch =
    event.changedTouches.length > 0
      ? event.changedTouches.item(0)
      : event.touches.length > 0
      ? event.touches.item(0)
      : null;

  if (!touch) {
    return null;
  }

  return { x: touch.clientX, y: touch.clientY };
}

function getProjectedPositionFromEvent(
  event: MouseEvent | TouchEvent | null
): { x: number; y: number } | null {
  const instance = vueFlowRef.value as any;
  if (!instance?.project) {
    return null;
  }

  const clientPointer = getClientPointerFromEvent(event);

  if (!clientPointer) {
    return null;
  }

  lastClientPointer.value = clientPointer;

  return instance.project({ x: clientPointer.x, y: clientPointer.y });
}

function updateDragTargetHighlight(
  targetId: string | null,
  highlightType: HighlightVariant = "normal"
) {
  if (dragTargetContainerId.value === targetId) {
    return;
  }

  if (dragTargetContainerId.value) {
    setContainerHighlightState(dragTargetContainerId.value, false);
  }

  dragTargetContainerId.value = targetId;

  if (targetId) {
    setContainerHighlightState(targetId, true, highlightType);
  }
}

useEventListener(window, "keydown", (event: KeyboardEvent) => {
  if (event.key === "F2") {
    if (store.renamingNodeId) {
      event.preventDefault();
      return;
    }

    if (isEditableElement(event.target)) {
      return;
    }

    const targetId = store.selectedNodeId;
    if (targetId) {
      event.preventDefault();
      store.startRenamingNode(targetId);
    }
    return;
  }

  if (isCtrlPressed.value) {
    return;
  }
  if (event.key === "Control" || event.ctrlKey) {
    isCtrlPressed.value = true;
  }
});

useEventListener(window, "mousemove", (event: MouseEvent) => {
  const instance = vueFlowRef.value as any;
  if (!instance) {
    return;
  }

  const element = instance.$el as HTMLElement | undefined;
  if (!element) {
    return;
  }

  const target = event.target as HTMLElement | null;
  if (!target || !element.contains(target)) {
    return;
  }

  const projected = instance.project?.({ x: event.clientX, y: event.clientY });
  if (projected) {
    lastPointerPosition.value = projected;
    lastClientPointer.value = { x: event.clientX, y: event.clientY };
    updateCtrlConnectCandidate();
  }
});

function restoreCtrlDragContext(recordHistory = false) {
  if (!ctrlDetachContext.value) {
    return;
  }

  const context = ctrlDetachContext.value;
  ctrlDetachContext.value = null;
  setContainerHighlightState(context.containerId, false);
  if (dragTargetContainerId.value === context.containerId) {
    dragTargetContainerId.value = null;
  }
  store.finalizeNodeDetachFromContainer(context.nodeId, {
    keepInContainer: true,
    recordHistory,
  });
}

useEventListener(window, "keyup", (event: KeyboardEvent) => {
  if (!isCtrlPressed.value) {
    return;
  }
  if (!event.ctrlKey) {
    restoreCtrlDragContext(false);
    isCtrlPressed.value = false;
    resetCtrlConnectCandidate();
  }
});

useEventListener(window, "blur", () => {
  restoreCtrlDragContext(false);
  isCtrlPressed.value = false;
  resetCtrlConnectCandidate();
});

// 节点拖拽监听器清理函数
let disposeNodeDrag: { off: () => void } | null = null;
let disposeNodeDragStop: { off: () => void } | null = null;

watch(
  () => store.isNodeEditorVisible,
  (visible) => {
    if (visible) {
      // 关闭设置面板
      if (activeTab.value === "settings") {
        activeTab.value = null;
      }
    }
  }
);

// FPS 计算
let frameCount = 0;
let lastTime = performance.now();
let fpsInterval: number;

onMounted(() => {
  // 初始化工作流：如果没有选中工作流，则自动选择上次编辑的，如果没有则创建新的
  workflowStore.initializeWorkflow();

  // 等待 Vue Flow 完全渲染后再启用历史记录
  nextTick(() => {
    // 延迟 100ms 确保所有组件渲染完成
    setTimeout(() => {
      store.initializeHistory();
    }, 100);
  });

  fpsInterval = window.setInterval(() => {
    const now = performance.now();
    const delta = now - lastTime;
    fps.value = Math.round((frameCount * 1000) / delta);
    frameCount = 0;
    lastTime = now;
  }, 1000);

  // 帧计数
  const countFrame = () => {
    frameCount++;
    requestAnimationFrame(countFrame);
  };
  requestAnimationFrame(countFrame);

  // 注册节点拖拽监听器
  disposeNodeDrag = vueFlowApi.onNodeDrag(({ node }) => {
    if (!node || !node.id) return;

    const position = node.position ?? { x: 0, y: 0 };
    const lastPosition = lastDragPositions.get(node.id);
    if (
      lastPosition &&
      lastPosition.x === position.x &&
      lastPosition.y === position.y
    ) {
      return;
    }
    lastDragPositions.set(node.id, { x: position.x, y: position.y });

    store.handleNodeDrag(node.id, position);

    const storeNode = store.nodes.find((n) => n.id === node.id);
    const intersections = getIntersectingNodes(node);
    let loopContainers = intersections.filter(
      (n) => n.type === "loopContainer"
    );

    const activeCtrlContext =
      ctrlDetachContext.value && ctrlDetachContext.value.nodeId === node.id
        ? ctrlDetachContext.value
        : null;

    if (!activeCtrlContext && isCtrlPressed.value && storeNode?.parentNode) {
      const containerId = store.beginNodeDetachFromContainer(node.id);
      if (containerId) {
        ctrlDetachContext.value = {
          nodeId: node.id,
          containerId,
          isIntersecting: true,
        };

        updateDragTargetHighlight(null);
        setContainerHighlightState(containerId, true, "normal");

        loopContainers = loopContainers.filter((n) => n.id !== containerId);
      }
    }

    const ctrlContext =
      ctrlDetachContext.value && ctrlDetachContext.value.nodeId === node.id
        ? ctrlDetachContext.value
        : null;

    if (ctrlContext) {
      const stillIntersect = intersections.some(
        (n) => n.id === ctrlContext.containerId
      );
      ctrlContext.isIntersecting = stillIntersect;

      const highlightType: HighlightVariant = stillIntersect
        ? "normal"
        : "warning";
      setContainerHighlightState(ctrlContext.containerId, true, highlightType);

      loopContainers = loopContainers.filter(
        (n) => n.id !== ctrlContext.containerId
      );
      updateDragTargetHighlight(null);
    } else if (storeNode?.parentNode) {
      updateDragTargetHighlight(null);
      return;
    }

    const nextContainerId =
      loopContainers.length > 0 ? loopContainers[0]?.id ?? null : null;

    // 检查节点是否有连接线
    const hasConnections = nodeHasConnections(node.id);

    // 如果有连接线，显示红色边框（警告状态）
    const highlightType: HighlightVariant = hasConnections
      ? "warning"
      : "normal";

    updateDragTargetHighlight(nextContainerId ?? null, highlightType);
  });

  disposeNodeDragStop = vueFlowApi.onNodeDragStop(({ node }) => {
    if (!node || !node.id) return;

    lastDragPositions.delete(node.id);

    const position = node.position ?? { x: 0, y: 0 };
    store.handleNodeDragStop(node.id, position);

    const ctrlContext =
      ctrlDetachContext.value && ctrlDetachContext.value.nodeId === node.id
        ? ctrlDetachContext.value
        : null;

    if (ctrlContext) {
      setContainerHighlightState(ctrlContext.containerId, false);

      const intersections = getIntersectingNodes(node);
      const stillIntersect = intersections.some(
        (n) => n.id === ctrlContext.containerId
      );

      store.finalizeNodeDetachFromContainer(node.id, {
        keepInContainer: stillIntersect,
      });

      ctrlDetachContext.value = null;

      if (stillIntersect) {
        updateDragTargetHighlight(null);
        return;
      }
    }

    const targetId = dragTargetContainerId.value;
    if (targetId) {
      updateDragTargetHighlight(null);

      // 只有当节点没有连接线时才允许添加到容器中
      const hasConnections = nodeHasConnections(node.id);
      if (!hasConnections) {
        store.moveNodeIntoContainer(node.id, targetId);
      }
    }
  });
});

onUnmounted(() => {
  if (fpsInterval) {
    clearInterval(fpsInterval);
  }

  // 清理执行状态更新定时器
  if (executionStateUpdateInterval) {
    clearInterval(executionStateUpdateInterval);
  }

  // 清理节点拖拽监听器
  disposeNodeDrag?.off();
  disposeNodeDragStop?.off();

  highlightedContainers.forEach((_, containerId) => {
    store.setContainerHighlight(containerId, false);
  });
  highlightedContainers.clear();
  updateDragTargetHighlight(null);
  ctrlDetachContext.value = null;
  lastDragPositions.clear();
});

// 键盘快捷键
const keys = useMagicKeys();
const ctrlZ = keys["Ctrl+Z"] as any;
const ctrlY = keys["Ctrl+Y"] as any;
const ctrlShiftZ = keys["Ctrl+Shift+Z"] as any;
const ctrlC = keys["Ctrl+C"] as any;
const ctrlV = keys["Ctrl+V"] as any;
const deleteKey = keys["Delete"] as any;
const escapeKey = keys["Escape"] as any;
const shiftKey = keys.Shift as any;

// 同步 Shift 键状态到 VueFlow 的 multiSelectionActive
// Shift 用于多选（可以切换选择状态）
watch(shiftKey, (pressed) => {
  multiSelectionActive.value = Boolean(pressed);
});

// 撤销
whenever(ctrlZ, () => {
  if (store.canUndo) {
    handleUndo();
  }
});

// 重做
whenever(ctrlY, () => {
  if (store.canRedo) {
    handleRedo();
  }
});

// 重做（备用快捷键）
whenever(ctrlShiftZ, () => {
  if (store.canRedo) {
    handleRedo();
  }
});

function getFallbackPastePosition(): { x: number; y: number } {
  const instance = vueFlowRef.value as any;
  if (!instance) {
    return { x: 0, y: 0 };
  }

  const element = instance.$el as HTMLElement | undefined;
  if (element) {
    const rect = element.getBoundingClientRect();
    return instance.project({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }

  return instance.project({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
}

whenever(ctrlC, () => {
  if (!isShortcutAvailable()) {
    return;
  }

  const selectedNodes = (getSelectedNodes.value ?? []) as Node<NodeData>[];
  if (!selectedNodes.length) {
    return;
  }

  store.copyNodesToClipboard(selectedNodes.map((node) => node.id));
});

whenever(ctrlV, () => {
  if (!isShortcutAvailable()) {
    return;
  }

  if (!store.hasClipboardData()) {
    return;
  }

  const position = lastPointerPosition.value ?? getFallbackPastePosition();
  const newNodeIds = store.pasteClipboardNodes(position);

  if (newNodeIds.length === 0) {
    return;
  }

  // 首先取消所有选中
  removeSelectedElements();

  // 等待节点完全渲染并被 Vue Flow 测量尺寸后再选中
  // 使用 nextTick + setTimeout 确保节点的 dimensions 和 computedPosition 已计算完成
  nextTick(() => {
    setTimeout(() => {
      const newNodes = nodes.value.filter((node) =>
        newNodeIds.includes(node.id)
      );

      if (newNodes.length > 0) {
        // 使用 vue-flow API 选中节点
        addSelectedNodes(newNodes as any);
        managedSelectedNodeIds.value = [...newNodeIds];

        // 关键：启用多选视图状态
        if (newNodes.length > 1) {
          nodesSelectionActive.value = true;
        }

        newNodes.forEach((node) => {
          vueFlowRef.value?.updateNodeInternals?.(node.id);
        });

        // 同步更新 store 的 selectedNodeId
        const lastNodeId = newNodeIds[newNodeIds.length - 1];
        if (lastNodeId) {
          store.selectNode(lastNodeId);
        }
      }
    }, 200);
  });
});

// Delete 键删除选中节点
whenever(deleteKey, () => {
  if (!isShortcutAvailable()) {
    return;
  }

  const selectedNodes = (getSelectedNodes.value ?? []) as Node<NodeData>[];
  if (!selectedNodes.length) {
    return;
  }

  // 删除所有选中的节点
  selectedNodes.forEach((node) => {
    store.removeNode(node.id);
  });
});

// ESC 键清空选中状态
whenever(escapeKey, () => {
  if (!isShortcutAvailable()) {
    return;
  }

  const selectedNodes = (getSelectedNodes.value ?? []) as Node<NodeData>[];
  if (!selectedNodes.length) {
    return;
  }

  // 清空所有选中的节点
  removeSelectedElements();

  // 更新状态
  managedSelectedNodeIds.value = [];
  nodesSelectionActive.value = false;
  store.selectNode(null);
});

/**
 * 处理撤销
 */
function handleUndo() {
  store.undo();
}

/**
 * 处理重做
 */
function handleRedo() {
  store.redo();
}

/**
 * 应用边的配置样式
 */
function applyEdgeStyles() {
  edges.value.forEach((edge: Edge) => {
    edge.type = config.value.edgeType;
    edge.animated = config.value.edgeAnimated;
    edge.style = {
      ...edge.style,
      stroke: config.value.edgeColor,
      strokeWidth: config.value.edgeStrokeWidth,
    };
  });
}

// 监听配置变化，实时更新所有边的样式
watch(
  () => [
    config.value.edgeType,
    config.value.edgeColor,
    config.value.edgeStrokeWidth,
    config.value.edgeAnimated,
    config.value.edgeSelectedColor,
  ],
  () => {
    applyEdgeStyles();
  },
  { immediate: true }
);

// 监听边数组变化，为新增的边应用样式
watch(
  () => edges.value.length,
  () => {
    applyEdgeStyles();
  }
);

/**
 * 处理 Tab 切换
 */
function handleTabChange(tab: "folders" | "nodes" | "settings") {
  // 如果点击的是当前激活的 tab，则关闭面板
  if (activeTab.value === tab) {
    activeTab.value = null;
  } else {
    activeTab.value = tab;
  }
}

/**
 * 关闭侧边面板
 */
function handleClosePanel() {
  activeTab.value = null;
}

/**
 * 处理拖拽放置
 */
function onDrop(event: DragEvent) {
  event.preventDefault();

  if (!event.dataTransfer) return;

  try {
    const data = JSON.parse(event.dataTransfer.getData("application/vueflow"));

    if (!data.type) return;

    // 获取 VueFlow 实例
    const vueFlowInstance = vueFlowRef.value;
    if (!vueFlowInstance) return;

    // 将屏幕坐标转换为流程图坐标
    const absolutePosition = vueFlowInstance.project({
      x: event.clientX,
      y: event.clientY,
    });

    const containerNode = getContainerAtPosition(absolutePosition);

    let position = absolutePosition;
    const options: { parentNodeId?: string } = {};

    if (containerNode) {
      const containerAny = containerNode as any;
      const parentX =
        containerAny.positionAbsolute?.x ?? containerNode.position.x;
      const parentY =
        containerAny.positionAbsolute?.y ?? containerNode.position.y;

      position = {
        x: absolutePosition.x - parentX,
        y: absolutePosition.y - parentY,
      };

      options.parentNodeId = containerNode.id;
    }

    // 创建节点
    store.createNodeByType(data.type, position, options);
  } catch (error) {
    console.error("拖拽放置失败:", error);
  }
}

/**
 * 根据坐标查找容器节点
 */
function getContainerAtPosition(position: { x: number; y: number }) {
  const nodesList = (nodes.value as Node<NodeData>[]) ?? [];

  for (const node of nodesList) {
    if (node.type !== "loopContainer") continue;

    const nodeAny = node as any;
    const headerHeight =
      nodeAny.data?.config?.headerHeight ??
      nodeEditorLayoutConfig.containerDefaults.headerHeight;
    const padding = nodeAny.data?.config?.padding ?? {
      x: nodeEditorLayoutConfig.containerDefaults.padding.left,
      y: nodeEditorLayoutConfig.containerDefaults.padding.top,
    };
    const width =
      nodeAny.dimensions?.width ?? nodeAny.width ?? nodeAny.data?.width ?? 0;
    const height =
      nodeAny.dimensions?.height ?? nodeAny.height ?? nodeAny.data?.height ?? 0;

    const x = nodeAny.positionAbsolute?.x ?? node.position.x;
    const y = nodeAny.positionAbsolute?.y ?? node.position.y;

    const paddingX =
      padding.x ?? nodeEditorLayoutConfig.containerDefaults.padding.left;
    const paddingY =
      padding.y ?? nodeEditorLayoutConfig.containerDefaults.padding.top;

    const innerLeft = x + paddingX;
    const innerRight = x + width - paddingX;
    const innerTop = y + headerHeight + paddingY;
    const innerBottom = y + height - paddingY;

    if (
      position.x >= innerLeft &&
      position.x <= innerRight &&
      position.y >= innerTop &&
      position.y <= innerBottom
    ) {
      return node;
    }
  }

  return null;
}

/**
 * 处理拖拽经过
 */
function onDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }
}

/**
 * 节点变化处理
 */
function onNodesChange(changes: NodeChange[]) {
  if (isLocked.value) return;

  const selectionChanges: NodeSelectionChange[] = [];

  changes.forEach((change) => {
    if (change.type === "select") {
      selectionChanges.push(change);
      return;
    }

    if (change.type === "dimensions" && "id" in change && change.dimensions) {
      store.updateNodeDimensions(change.id, change.dimensions);
    } else if (
      change.type === "position" &&
      "id" in change &&
      change.position
    ) {
      // 使用防抖机制，300ms 内的多次更新只记录最后一次
      store.updateNodePosition(
        change.id,
        change.position,
        change.dragging === true
      );
    } else if (change.type === "remove" && "id" in change) {
      store.removeNode(change.id);
    }
  });

  if (selectionChanges.length === 0) {
    return;
  }

  // 完全交给 VueFlow 处理选择逻辑，我们只同步状态
  nextTick(() => {
    // 1. 从 VueFlow 获取当前选中的节点
    const selectedNodes = (getSelectedNodes.value ??
      []) as GraphNode<NodeData>[];
    managedSelectedNodeIds.value = selectedNodes.map((node) => node.id);

    // 2. 获取最后一个被点击的节点 ID
    const lastChangeId =
      selectionChanges[selectionChanges.length - 1]?.id ?? null;

    // 3. 关键：当有多个节点选中时，启用 nodesSelectionActive（用于显示蓝色背景）
    if (selectedNodes.length > 1) {
      nodesSelectionActive.value = true;
    } else {
      nodesSelectionActive.value = false;
    }

    // 4. 同步更新 store 的 selectedNodeId（用于显示配置面板）
    if (selectedNodes.length > 0) {
      // 优先使用最后点击的节点，否则使用选中列表中的最后一个
      const preferred =
        (lastChangeId
          ? selectedNodes.find((node) => node.id === lastChangeId)
          : undefined) ?? selectedNodes[selectedNodes.length - 1];
      store.selectNode(preferred?.id ?? null);
    } else if (store.selectedNodeId) {
      // 没有选中节点时，清空 store
      store.selectNode(null);
    }
  });
}

/**
 * 连接线变化处理
 */
function onEdgesChange(changes: EdgeChange[]) {
  changes.forEach((change) => {
    if (change.type === "remove") {
      store.removeEdge(change.id);
    }
  });
}

// 记录边更新状态
const updatingEdgeId = ref<string | null>(null);
const edgeUpdateSuccessful = ref<boolean>(false);

/**
 * 连接开始
 */
function onConnectStart(params: any) {
  connectingNodeId.value = params.nodeId;
  connectingHandleId.value = params.handleId;
  connectingHandleType.value = params.handleType;

  if (ctrlConnectActive.value) {
    updateCtrlConnectCandidate();
  }
}

/**
 * 连接结束
 */
function onConnectEnd(event?: MouseEvent | TouchEvent | null) {
  const projected = getProjectedPositionFromEvent(event ?? null);

  if (projected) {
    lastPointerPosition.value = projected;
    updateCtrlConnectCandidate();
  }

  finalizeCtrlConnection();

  connectingNodeId.value = null;
  connectingHandleId.value = null;
  connectingHandleType.value = null;
  resetCtrlConnectCandidate();
}

/**
 * 检查端口是否可以连接
 */
function checkPortValidity(
  targetNodeId: string,
  targetHandleId: string
): boolean {
  if (!connectingNodeId.value || !connectingHandleId.value) return true;

  const sourceNode = nodes.value.find(
    (n: Node<NodeData>) => n.id === connectingNodeId.value
  );
  const targetNode = nodes.value.find(
    (n: Node<NodeData>) => n.id === targetNodeId
  );

  if (!sourceNode || !targetNode) return false;

  // 判断起始端口是输入还是输出
  const isSourceInput = sourceNode.data?.inputs?.some(
    (port: PortDefinition) => port.id === connectingHandleId.value
  );
  const isSourceOutput = sourceNode.data?.outputs?.some(
    (port: PortDefinition) => port.id === connectingHandleId.value
  );

  // 判断目标端口是输入还是输出
  const isTargetInput =
    targetNode.data?.inputs?.some(
      (port: PortDefinition) => port.id === targetHandleId
    ) ?? false;
  const isTargetOutput =
    targetNode.data?.outputs?.some(
      (port: PortDefinition) => port.id === targetHandleId
    ) ?? false;

  // 输出→输入 或 输入→输出 是有效的
  const result = Boolean(
    (isSourceOutput && isTargetInput) || (isSourceInput && isTargetOutput)
  );
  console.log("checkPortValidity", result);
  return result;
}

/**
 * 连接处理
 * 当连接成功建立时调用
 */
function onConnect(connection: FlowConnection) {
  const conn: EditorConnection = {
    source: connection.source,
    sourceHandle: connection.sourceHandle || null,
    target: connection.target,
    targetHandle: connection.targetHandle || null,
  };

  if (!store.validateConnection(conn)) {
    return;
  }

  const newEdge: Edge = {
    id: `edge_${Date.now()}`,
    source: connection.source,
    sourceHandle: connection.sourceHandle,
    target: connection.target,
    targetHandle: connection.targetHandle,
    type: config.value.edgeType,
    animated: config.value.edgeAnimated,
    style: {
      stroke: config.value.edgeColor,
      strokeWidth: config.value.edgeStrokeWidth,
    },
  };

  store.addEdge(newEdge);
  resetCtrlConnectCandidate();
}

/**
 * 边更新开始处理
 * 当开始拖拽边的端点时调用
 */
function onEdgeUpdateStart(event: any) {
  const edge = event.edge;
  updatingEdgeId.value = edge.id;
  edgeUpdateSuccessful.value = false;
}

/**
 * 边更新处理
 * 当拖拽边的端点重新连接时调用
 */
function onEdgeUpdate({ edge, connection }: EdgeUpdateEvent) {
  console.log("onEdgeUpdate");
  // 禁止编辑 loopContainer 相关的连接线
  const sourceNode = store.nodes.find((node) => node.id === edge.source);
  const targetNode = store.nodes.find((node) => node.id === edge.target);
  if (
    sourceNode?.type === "loopContainer" ||
    targetNode?.type === "loopContainer"
  ) {
    edgeUpdateSuccessful.value = false;
    return;
  }

  // 检查新连接是否已存在（防止重复连接）
  const exists = edges.value.some(
    (e) =>
      e.id !== edge.id &&
      e.source === connection.source &&
      e.target === connection.target &&
      e.sourceHandle === connection.sourceHandle &&
      e.targetHandle === connection.targetHandle
  );

  if (exists) {
    edgeUpdateSuccessful.value = false;
    return;
  }

  // 验证新连接是否有效
  const conn: EditorConnection = {
    source: connection.source,
    sourceHandle: connection.sourceHandle || null,
    target: connection.target,
    targetHandle: connection.targetHandle || null,
  };

  // BUG: 如果恢复链接 则会导致报错, 已存在连接线
  if (
    !store.validateConnection(conn, {
      ignoreEdgeId: edge.id,
    })
  ) {
    edgeUpdateSuccessful.value = false;
    return;
  }

  // 更新边的连接信息
  edges.value = edges.value.map((e) =>
    e.id === edge.id
      ? {
          ...e,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
        }
      : e
  );

  // 标记更新成功
  edgeUpdateSuccessful.value = true;
}

/**
 * 边更新结束处理
 * 当拖拽边的端点结束时调用（无论是否成功连接）
 */
function onEdgeUpdateEnd(event: any) {
  console.log("onEdgeUpdateEnd");

  const edge = event.edge;

  // 如果边更新未成功（即没有连接到有效端口），则删除该边
  if (!edgeUpdateSuccessful.value) {
    store.removeEdge(edge.id);
    updatingEdgeId.value = null;
  } else {
    // 连接成功
    updatingEdgeId.value = null;
  }

  // 重置状态
  edgeUpdateSuccessful.value = false;
}

/**
 * 画布点击处理（取消选中）
 */
function onPaneClick() {
  store.selectNode(null);
  managedSelectedNodeIds.value = [];
}

/**
 * 获取节点颜色（用于小地图）
 */
function getNodeColor(node: Node<NodeData>): string {
  if (node.id === store.selectedNodeId) {
    return "#667eea";
  }
  return "#94a3b8";
}

/**
 * 切换小地图显示
 */
function toggleMiniMap() {
  config.value.showMiniMap = !config.value.showMiniMap;
  showMiniMapToggle.value = config.value.showMiniMap;
}

function handleFitView() {
  if (nodes.value.length === 0) {
    return;
  }

  if (typeof vueFlowApi.fitView === "function") {
    vueFlowApi.fitView({
      padding: 0.2,
      duration: 400,
    });
  }
}

async function handleAutoLayout() {
  if (nodes.value.length === 0) {
    return;
  }

  const toNumber = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const direction =
    (config.value.autoLayoutDirection as DagreLayoutDirection | undefined) ??
    "LR";
  const nodesep = toNumber(config.value.autoLayoutNodeSpacing, 160);
  const ranksep = toNumber(config.value.autoLayoutRankSpacing, 240);
  const padding = toNumber(config.value.autoLayoutPadding, 120);

  store.autoLayout({
    direction,
    nodesep,
    ranksep,
    padding,
    loopContainerGap: nodesep,
  });

  await nextTick();

  if (typeof vueFlowApi.fitView === "function") {
    vueFlowApi.fitView({
      padding: 0.2,
      duration: 400,
    });
  }
}

async function handleExecuteWorkflow() {
  if (isExecutingWorkflow.value || nodes.value.length === 0) {
    return;
  }

  try {
    // 使用 computed 的 workflowId，确保和监听器一致
    await store.executeWorkflow(workflowId.value);
    console.log(`[NodeEditor] 执行工作流 ID: ${workflowId.value}`);
  } catch (error) {
    console.error("执行工作流失败", error);
  }
}

// useEventListener(window, "mousemove", (event) => {
//   const edge = event.target?.closest(".vue-flow__edges g");
//   if (edge) {
//     deleteButtonClass.value = `g[data-id="${edge.dataset.id}"]`;
//   } else {
//     deleteButtonClass.value = "";
//   }
// });
</script>

<style scoped>
@import "@/style.css";

/* VueFlow 样式 */
:deep(.vue-flow) {
  @apply flex-1;
}

/* 连接预览线样式 - 拖拽创建新连接时的临时线 */
/* 注意：这个样式现在由 CustomConnectionLine 组件控制，此处保留作为备用 */
:deep(.vue-flow__connectionline .vue-flow__connection-path) {
  stroke: v-bind("config.edgeDragColor");
  stroke-width: v-bind("config.edgeStrokeWidth + 'px'");
}

:deep(.vue-flow__background) {
  background-color: v-bind("config.backgroundColor");
}

:deep(.vue-flow__edge-path) {
  stroke: v-bind("config.edgeColor");
  stroke-width: v-bind("config.edgeStrokeWidth + 'px'");
}

:deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: v-bind("config.edgeSelectedColor");
  stroke-width: v-bind("(config.edgeStrokeWidth + 1) + 'px'");
}

:deep(.vue-flow__edge:hover .vue-flow__edge-path) {
  stroke-width: v-bind("(config.edgeStrokeWidth + 0.5) + 'px'");
}

:deep(.vue-flow__edge) {
  @apply pointer-events-auto;
}

:deep(.vue-flow__edge-path) {
  @apply cursor-pointer;
}

:deep(.vue-flow__node.selected .node-wrapper) {
  position: relative;
  box-shadow: 0 14px 38px -22px rgba(37, 99, 235, 0.5);
}

:deep(.vue-flow__node.selected .node-wrapper::before) {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 0.375rem;
  background: linear-gradient(
    135deg,
    rgba(147, 197, 253, 0.45) 0%,
    rgba(191, 219, 254, 0.35) 100%
  );
  pointer-events: none;
  z-index: -1;
}

/* 动画连接线 */
:deep(.vue-flow__edge.animated .vue-flow__edge-path) {
  stroke-dasharray: 5;
  animation: dashdraw 0.5s linear infinite;
}

@keyframes dashdraw {
  0% {
    stroke-dashoffset: 10;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

/* z-index 层级管理 */
/* :deep(.vue-flow__edge) {
  z-index: 35 !important;
}

:deep(.vue-flow__node) {
  z-index: 20 !important;
}

:deep(.vue-flow__node.node-layer-container) {
  z-index: 30 !important;
}

:deep(.vue-flow__node.node-layer-child) {
  z-index: 40 !important;
}*/

:deep(.edge-layer-container) {
  z-index: 2001 !important;
}

/* 小地图样式 */
:deep(.modern-minimap) {
  @apply bottom-6 right-6 border-2 border-white rounded-md shadow-2xl overflow-hidden backdrop-blur-xl;
}

/* 面板滑入动画 */
.slide-left-enter-active,
.slide-left-leave-active {
  @apply transition-all duration-300;
}

.slide-left-enter-from,
.slide-left-leave-to {
  @apply translate-x-full opacity-0;
}
</style>
