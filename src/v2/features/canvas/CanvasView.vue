<template>
  <n-layout has-sider class="h-full">
    <VerticalTabNav />

    <n-layout-content class="relative overflow-hidden">
      <FloatingPanel />

      <!-- VueFlow 画布 -->
      <div ref="canvasContainerRef" class="absolute inset-0">
        <VueFlowCanvas
          ref="vueFlowCanvasRef"
          :custom-node-component="CustomNode"
          :show-background="true"
          :show-controls="true"
          :show-mini-map="editorConfig.showMiniMap"
        />
      </div>

      <div
        class="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-10"
      >
        <div class="pointer-events-auto">
          <CanvasToolbar
            @undo="handleUndo"
            @redo="handleRedo"
            @fit-view="handleFitView"
            @auto-layout="handleAutoLayout"
            @toggle-mini-map="toggleMiniMap"
            @execute-workflow="handleExecute"
            @pause-execution="handlePause"
            @resume-execution="handleResume"
            @stop-execution="handleStop"
            @clear-cache="handleClearCache"
          />
        </div>
      </div>

      <div class="absolute bottom-2 right-10">
        <NodeInfoCard />
      </div>

      <QuickNodeMenu
        ref="quickMenuRef"
        @close="quickMenu.visible = false"
        @selectNode="handleQuickMenuSelectNode"
        :visible="quickMenu.visible"
        :position="quickMenu.position"
        :start-handle="quickMenu.startHandle"
      />
    </n-layout-content>

    <!-- Modals -->
    <InfoModal />
    <FullscreenEditorModal />
    <NodeConfigModal />
    <VariableEditorModal />
    <EditorPanelModal />
  </n-layout>
</template>
<script setup lang="ts">
import { reactive, ref, nextTick, watch, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useVueFlow } from "@vue-flow/core";
import { useMessage } from "naive-ui";
import { onKeyStroke, useMagicKeys } from "@vueuse/core";
import CustomNode from "../vueflow/components/nodes/CustomNode.vue";
import CanvasToolbar from "./components/CanvasToolbar.vue";
import QuickNodeMenu from "./components/QuickNodeMenu.vue";
import VerticalTabNav from "./components/VerticalTabNav.vue";
import FloatingPanel from "./components/FloatingPanel.vue";
import NodeInfoCard from "./components/NodeInfoCard.vue";
import InfoModal from "../../components/modals/InfoModal.vue";
import FullscreenEditorModal from "../../components/modals/FullscreenEditorModal.vue";
import NodeConfigModal from "./components/modals/NodeConfigModal.vue";
import VariableEditorModal from "../../components/variables-inputs/VariableEditorModal.vue";
import EditorPanelModal from "./components/modals/EditorPanelModal.vue";
import { useCanvasStore } from "../../stores/canvas";
import { useEditorConfigStore } from "../../stores/editorConfig";
import { useUiStore } from "../../stores/ui";
import { useWorkflowStore } from "../../stores/workflow";
import { VueFlowCanvas, useVueFlowEvents } from "../vueflow";
import type { Workflow } from "workflow-flow-nodes";

const canvasStore = useCanvasStore();
const editorConfigStore = useEditorConfigStore();
const uiStore = useUiStore();
const workflowStore = useWorkflowStore();
const { config: editorConfig } = storeToRefs(editorConfigStore);
const {
  infoModalVisible,
  editorModalVisible,
  nodeConfigModalVisible,
  variableEditorModalVisible,
  editorPanelModalVisible,
} = storeToRefs(uiStore);
const { fitView, getSelectedNodes, removeSelectedElements } = useVueFlow();
const message = useMessage();

// 事件系统
const events = useVueFlowEvents();

// 执行系统（使用 canvas store 中的实例）
const executionManager = canvasStore.vueFlowExecution;

// 快速菜单
const quickMenu = reactive({
  visible: false,
  position: { x: 320, y: 220 },
  startHandle: undefined as
    | undefined
    | {
        nodeId: string;
        handleId?: string | null;
        handleType?: "source" | "target";
      },
});

const quickMenuRef = ref<HTMLDivElement | null>(null);
const canvasContainerRef = ref<HTMLElement | null>(null);
const vueFlowCanvasRef = ref<InstanceType<typeof VueFlowCanvas> | null>(null);

uiStore.activeTab = "node-library";

/**
 * 检查并设置默认工作流
 */
function ensureCurrentWorkflow() {
  // 等待 store 数据加载完成（异步初始化）
  setTimeout(() => {
    const { currentWorkflow, workflows, setCurrentWorkflow } = workflowStore;

    // currentWorkflow 是 computed，如果为 null 说明：
    // 1. 没有设置当前工作流 ID，或
    // 2. 当前工作流 ID 对应的工作流不存在
    if (!currentWorkflow) {
      // 不存在当前工作流，默认显示第一个工作流
      const firstWorkflow = workflows[0];
      if (firstWorkflow) {
        console.log("[CanvasView] 没有当前工作流，默认显示第一个工作流");
        setCurrentWorkflow(firstWorkflow.workflow_id);
      } else {
        console.log("[CanvasView] 没有可用的工作流");
      }
    } else {
      // 当前工作流存在，无需操作
      console.log("[CanvasView] 当前工作流已存在:", currentWorkflow.name);
    }

    fitView({ padding: 0.2, duration: 0 });
  }, 10); // 等待 store 异步初始化完成
}

watch(
  () => workflowStore.currentWorkflowId,
  () => {
    ensureCurrentWorkflow();
  }
);

// 初始化节点列表和检查工作流
onMounted(() => {
  setTimeout(() => {
    canvasStore.loadNodeList();
  }, 400);

  // 检查并设置默认工作流
  ensureCurrentWorkflow();
});

/**
 * 将浏览器窗口坐标转换为相对于画布容器的坐标
 */
function convertToCanvasCoordinates(clientX: number, clientY: number) {
  if (!canvasContainerRef.value) {
    return { x: clientX, y: clientY };
  }

  const rect = canvasContainerRef.value.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

/**
 * 撤销
 */
function handleUndo() {
  // 通过事件触发历史记录插件的撤销操作
  events.emit("history:undo", undefined as any);
}

/**
 * 重做
 */
function handleRedo() {
  // 通过事件触发历史记录插件的重做操作
  events.emit("history:redo", undefined as any);
}

/**
 * 适应视图
 */
function handleFitView() {
  fitView({ padding: 0.2, duration: 300 });
}

/**
 * 自动布局
 */
function handleAutoLayout() {
  // 通过事件触发自动布局插件，使用配置中的参数
  events.emit("canvas:request-auto-layout", {
    direction: editorConfig.value.autoLayoutDirection,
    nodesep: editorConfig.value.autoLayoutNodeSpacing,
    ranksep: editorConfig.value.autoLayoutRankSpacing,
    padding: editorConfig.value.autoLayoutPadding,
    fitView: editorConfig.value.autoLayoutFitView,
    fitViewPadding: editorConfig.value.autoLayoutFitViewPadding,
    fitViewDuration: editorConfig.value.autoLayoutFitViewDuration,
    forNodeSpacing: editorConfig.value.autoLayoutNodeSpacing,
  });
}

/**
 * 切换小地图显示
 */
function toggleMiniMap() {
  editorConfigStore.updateConfig({
    showMiniMap: !editorConfig.value.showMiniMap,
  });
}

/**
 * 暂停执行
 */
function handlePause() {
  console.log("[CanvasView] 暂停执行");
  executionManager.pause();
  message.info("已暂停执行");
}

/**
 * 恢复执行
 */
function handleResume() {
  console.log("[CanvasView] 恢复执行");
  executionManager.resume();
  message.info("继续执行");
}

/**
 * 停止执行
 */
function handleStop() {
  console.log("[CanvasView] 停止执行");
  executionManager.stop();
  message.warning("已停止执行");
  canvasStore.setExecuting(false);
}

/**
 * 清空缓存
 */
async function handleClearCache() {
  const currentWorkflow = workflowStore.currentWorkflow;
  if (!currentWorkflow) {
    message.warning("请先创建或选择一个工作流");
    return;
  }

  try {
    message.loading("正在清空缓存...", { duration: 0 });
    await executionManager.clearCache(currentWorkflow.workflow_id);
    message.destroyAll();
    message.success("缓存已清空");
    console.log("[CanvasView] 工作流缓存已清空:", currentWorkflow.workflow_id);
    // 清空缓存后，发送缓存状态变化事件（隐藏清空缓存按钮）
    events.emit("cache:status-changed", { hasCacheData: false });
  } catch (error) {
    message.destroyAll();
    message.error(
      `清空缓存失败: ${error instanceof Error ? error.message : String(error)}`
    );
    console.error("[CanvasView] 清空缓存异常:", error);
  }
}

/**
 * 执行工作流
 * @param selectedNodeIds 可选，指定要执行的节点 ID 列表。如果不传，则使用当前选中的节点
 */
async function handleExecute(selectedNodeIds?: string[]) {
  // 🔧 关键修复：执行前强制同步画布数据到 Store
  // 解决防抖延迟导致的数据不一致问题
  if (vueFlowCanvasRef.value?.syncToStore) {
    vueFlowCanvasRef.value.syncToStore();
    console.log("[CanvasView] 已强制同步画布数据到 Store");

    // 等待下一个 tick，确保 store 更新完成
    await nextTick();
  }

  // 检查是否有当前工作流
  const currentWorkflow = workflowStore.currentWorkflow;
  if (!currentWorkflow) {
    message.warning("请先创建或选择一个工作流");
    return;
  }

  // 检查工作流是否为空
  if (!currentWorkflow.nodes || currentWorkflow.nodes.length === 0) {
    message.warning("工作流中没有节点");
    return;
  }

  // 检查执行系统是否已初始化
  if (!executionManager.isInitialized.value) {
    executionManager.ensureChannel();

    message.loading("执行系统正在初始化...", { duration: 0 });
    // 等待初始化完成
    let retries = 0;
    while (!executionManager.isInitialized.value && retries < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }
    message.destroyAll();

    if (!executionManager.isInitialized.value) {
      message.error("执行系统初始化失败");
      return;
    }
  }

  // 设置执行状态
  canvasStore.setExecuting(true);

  try {
    // 获取要执行的节点 ID 列表
    // 如果传入了 selectedNodeIds，使用传入的；否则使用当前选中的节点
    let finalSelectedNodeIds: string[] = [];
    if (selectedNodeIds && selectedNodeIds.length > 0) {
      finalSelectedNodeIds = selectedNodeIds;
    } else {
      const selectedNodes = getSelectedNodes.value || [];
      if (selectedNodes.length > 1) {
        finalSelectedNodeIds = selectedNodes.map((node) => node.id);
      }
    }

    // 构建 Workflow 对象并移除 Vue 响应式代理
    // 使用 JSON 序列化来移除 Proxy 和不可序列化的对象
    const workflowData: Workflow = {
      workflow_id: currentWorkflow.workflow_id,
      name: currentWorkflow.name,
      description: currentWorkflow.description,
      selectedNodeIds: finalSelectedNodeIds,
      nodes: currentWorkflow.nodes.map((node: any) => ({
        id: node.id,
        type: node.type || "custom",
        label: node.data?.label || node.label,
        position: node.position
          ? { x: node.position.x, y: node.position.y }
          : undefined,
        parentNode: node.parentNode || node.parentId,
        data: node.data,
      })),
      edges: currentWorkflow.edges.map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        data: edge.data,
      })),
    };

    // 通过 JSON 序列化/反序列化移除响应式代理和不可克隆的对象
    const workflow: Workflow = JSON.parse(JSON.stringify(workflowData));

    console.log("[CanvasView] 开始执行工作流:", workflow);

    // 执行工作流（执行结果通过事件监听器处理）
    await executionManager.execute(workflow, {
      useCache: true,
      timeout: 60000,
      globalVariables: workflowStore.getGlobalVariableJson(),
    } as any);
  } catch (error) {
    // 执行错误已经通过 execution:error 事件处理，这里只记录日志
    // 所有执行错误（包括节点执行错误）都会触发 execution:error 事件，由事件监听器统一处理
    // 这里不显示错误消息，避免与 execution:error 事件处理重复
    console.error("[CanvasView] 工作流执行异常:", error);
  } finally {
    canvasStore.setExecuting(false);
  }
}

// ========== 节点交互事件 ==========

// 监听节点执行事件
events.on("node:execute", async ({ nodeId }) => {
  console.log("[CanvasView] 节点执行请求:", nodeId);
  await handleExecute([nodeId]);
});

// 监听节点执行起点切换事件
events.on("node:toggle-execution-start", ({ nodeId, isExecutionStart }) => {
  console.log("[CanvasView] 节点执行起点切换:", nodeId, isExecutionStart);

  // 如果设置为执行起点，清除其他节点的该标记
  if (isExecutionStart) {
    canvasStore.nodes.forEach((node: any) => {
      if (node.id !== nodeId && node.data?.isExecutionStart) {
        canvasStore.updateNode(node.id, {
          data: {
            ...node.data,
            isExecutionStart: false,
          },
        });
      }
    });
  }

  // 更新当前节点
  const node = canvasStore.nodes.find((n: any) => n.id === nodeId);
  if (node) {
    canvasStore.updateNode(nodeId, {
      data: {
        ...node.data,
        isExecutionStart,
      },
    });
  }
});

// 监听节点添加事件
events.on("node:added", ({ node }) => {
  console.log("[CanvasView] 节点已添加:", node);
});

// 监听节点点击事件
events.on("node:clicked", ({ node }) => {
  console.log("[CanvasView] 节点被点击:", node, node.data?.label);
  // 点击节点时关闭快捷菜单
  quickMenu.visible = false;
});

// 监听节点双击事件
events.on("node:double-clicked", ({ node }) => {
  console.log("[CanvasView] 节点被双击，打开配置面板:", node.data?.label);
  // TODO: 打开节点配置面板
  // 如果节点是连接节点，则不选中
  if (["connector", "note"].includes(node.type || "")) return;
  // 选中节点并打开配置面板
  uiStore.selectNode(node.id);
  removeSelectedElements();
});

// 监听节点右键菜单
events.on("node:context-menu", ({ node }) => {
  console.log("[CanvasView] 节点右键菜单:", node.data?.label);
  // TODO: 显示右键菜单
});

// 监听画布点击事件
events.on("canvas:clicked", () => {
  console.log("[CanvasView] 画布被点击");
  // 点击画布时关闭快捷菜单
  // quickMenu.visible = false;
  // 取消节点选中
  uiStore.clearNodeSelection();
  uiStore.clearNodePreview();
});

// 监听画布双击事件
events.on("canvas:double-clicked", ({ event }) => {
  console.log("[CanvasView] 画布被双击，打开快捷菜单");

  // 将浏览器窗口坐标转换为相对于画布容器的坐标
  const canvasPosition = convertToCanvasCoordinates(
    event.clientX,
    event.clientY
  );

  // 打开快捷菜单
  quickMenu.visible = true;
  quickMenu.position = canvasPosition;
  quickMenu.startHandle = undefined; // 双击打开时没有起始端口

  nextTick(() => {
    quickMenuRef.value?.focus();
  });
});

// 最近一次连接开始信息（由 edge:connect-start 提供）
let lastConnectStart:
  | {
      nodeId: string;
      handleId?: string | null;
      handleType?: "source" | "target";
    }
  | undefined = undefined;

// 监听连接开始，记录来源端口
events.on("edge:connect-start", (params: any) => {
  // 期望包含 { nodeId, handleId, handleType, event }
  if (
    params &&
    (params.handleType === "source" || params.handleType === "target")
  ) {
    lastConnectStart = {
      nodeId: params.nodeId,
      handleId: params.handleId,
      handleType: params.handleType,
    };
  } else {
    lastConnectStart = undefined;
  }
});

// 监听连接失败事件，显示快捷菜单
events.on("edge:connection-failed", ({ position }) => {
  console.log("[CanvasView] 连接失败，显示快捷菜单（原始坐标）", position);

  // 将浏览器窗口坐标转换为相对于画布容器的坐标
  const canvasPosition = convertToCanvasCoordinates(position.x, position.y);
  console.log("[CanvasView] 转换后的画布坐标", canvasPosition);

  quickMenu.visible = true;
  quickMenu.position = canvasPosition;
  // 记录此次失败对应的开始端口（用于后续选择节点后自动连线）
  quickMenu.startHandle = lastConnectStart || undefined;

  nextTick(() => {
    quickMenuRef.value?.focus();
  });
});

/**
 * 处理快捷菜单节点选择
 */
function handleQuickMenuSelectNode(payload: {
  nodeId: string;
  startHandle?: {
    nodeId: string;
    handleId?: string | null;
    handleType?: "source" | "target";
  };
}) {
  const { nodeId, startHandle } = payload || ({} as any);
  console.log(
    "[CanvasView] 快捷菜单选择节点:",
    nodeId,
    "startHandle:",
    startHandle
  );

  // 将容器坐标转换为屏幕坐标
  if (!canvasContainerRef.value) {
    console.warn("[CanvasView] 画布容器引用不存在");
    message.warning("画布容器未就绪");
    return;
  }

  const containerRect = canvasContainerRef.value.getBoundingClientRect();
  const screenX = containerRect.left + quickMenu.position.x;
  const screenY = containerRect.top + quickMenu.position.y;

  // 通过事件系统通知 VueFlowCanvas 添加节点
  events.emit("quick-menu:select-node", {
    nodeId,
    screenPosition: { x: screenX, y: screenY },
    startHandle: startHandle ?? quickMenu.startHandle ?? undefined,
  });
}

// ========== 执行事件监听 ==========

// 监听执行开始事件
events.on("execution:start", (payload) => {
  console.log("[CanvasView] 工作流执行开始:", payload);
  message.loading(`执行工作流中...`, { duration: 0 });
});

// 监听执行完成事件
events.on("execution:complete", (result) => {
  console.log("[CanvasView] 工作流执行完成:", result);
  message.destroyAll();
  if (result.success) {
    message.success(`执行成功！耗时 ${Math.round(result.duration / 1000)}s`);
  }
  // 执行完成后，发送缓存状态变化事件（表示有缓存数据可以清空）
  events.emit("cache:status-changed", { hasCacheData: true });
});

// 监听执行错误事件
events.on("execution:error", (payload) => {
  console.error("[CanvasView] 工作流执行错误:", payload);
  message.destroyAll();
  // 显示错误消息（这是执行错误的唯一显示位置）
  message.error(`执行失败: ${payload.error}`);
});

// 监听节点开始执行事件
events.on("execution:node:start", ({ nodeId }) => {
  console.log("[CanvasView] 节点开始执行:", nodeId);
  // 更新节点状态为执行中
  canvasStore.updateNode(nodeId, {
    data: {
      ...canvasStore.nodes.find((n: any) => n.id === nodeId)?.data,
      executionStatus: "running",
    },
  });
});

// 监听节点执行完成事件
events.on("execution:node:complete", ({ nodeId, result }) => {
  console.log("[CanvasView] 节点执行完成:", nodeId, result);
  // 更新节点状态为成功
  const node = canvasStore.nodes.find((n: any) => n.id === nodeId);
  canvasStore.updateNode(nodeId, {
    data: {
      ...node?.data,
      executionStatus: "success",
      executionResult: result,
    },
  });

  // 添加到执行结果预览
  canvasStore.pushNodeResult({
    id: nodeId,
    preview: JSON.stringify(result, null, 2).slice(0, 200),
  });

  // 如果当前预览的节点就是执行完成的节点，更新预览数据
  if (uiStore.previewNodeId === nodeId) {
    const now = Date.now();
    // 构建预览数据对象（格式与 NodeExecutionStatus 一致）
    const previewData = {
      status: "success" as const,
      result: result,
      timestamp: now,
      // 如果有执行时长信息，可以从节点数据中获取
      duration: node?.data?.executionDuration,
    };
    // 更新预览数据
    uiStore.showNodePreview(nodeId, previewData);
  }
});

// 监听节点执行错误事件
events.on("execution:node:error", ({ nodeId, error }) => {
  console.error("[CanvasView] 节点执行错误:", nodeId, error);
  // 更新节点状态为错误
  const node = canvasStore.nodes.find((n: any) => n.id === nodeId);
  canvasStore.updateNode(nodeId, {
    data: {
      ...node?.data,
      executionStatus: "error",
      executionError: error,
    },
  });

  // 如果当前预览的节点就是执行错误的节点，更新预览数据
  if (uiStore.previewNodeId === nodeId) {
    const now = Date.now();
    // 构建预览数据对象（格式与 NodeExecutionStatus 一致）
    const previewData = {
      status: "error" as const,
      error: error,
      timestamp: now,
      // 如果有执行时长信息，可以从节点数据中获取
      duration: node?.data?.executionDuration,
    };
    // 更新预览数据
    uiStore.showNodePreview(nodeId, previewData);
  }
});

// 监听执行进度事件
events.on("execution:progress", ({ progress }) => {
  console.log("[CanvasView] 执行进度:", Math.round(progress * 100) + "%");
});

// 监听缓存命中事件
events.on("execution:cache-hit", ({ nodeId, cachedResult }) => {
  console.log("[CanvasView] 节点使用缓存:", nodeId);
  const node = canvasStore.nodes.find((n: any) => n.id === nodeId);
  canvasStore.updateNode(nodeId, {
    data: {
      ...node?.data,
      executionStatus: "cached",
    },
  });

  // 如果当前预览的节点就是缓存命中的节点，更新预览数据
  if (uiStore.previewNodeId === nodeId) {
    const now = Date.now();
    // 构建预览数据对象（格式与 NodeExecutionStatus 一致）
    const previewData = {
      status: "cached" as const,
      result: cachedResult.outputs,
      timestamp: now,
      duration: cachedResult.duration,
    };
    // 更新预览数据
    uiStore.showNodePreview(nodeId, previewData);
  }
});

// 监听迭代更新事件（用于循环节点内的子节点）
events.on("execution:iteration:update", ({ nodeId, iterationData }: any) => {
  console.log(
    `[CanvasView] 节点 ${nodeId} 迭代 ${
      iterationData.iterationIndex + 1
    } 更新:`,
    iterationData
  );

  // 如果是第一次迭代，先清空旧的迭代历史
  if (iterationData.iterationIndex === 0) {
    console.log(`[CanvasView] 清空节点 ${nodeId} 的旧迭代历史`);
    canvasStore.clearNodeIterationHistory(nodeId);
  }

  // 将迭代数据追加到节点的迭代历史
  canvasStore.appendNodeIterationHistory(nodeId, iterationData);
});

// 监听节点执行结果预览事件
events.on("execution:result:preview", (payload: any) => {
  console.log("[CanvasView] 显示节点执行结果预览:", payload);

  // 通过 UI Store 显示节点预览
  uiStore.showNodePreview(payload.nodeId, payload.result);
});

// ========== 键盘快捷键处理 ==========

// 全局快捷键可用性（来自 UI Store）
const { enableShortcut, hasFoucsInput } = storeToRefs(uiStore);

// Tab 键切换左侧浮动面板
onKeyStroke(
  "Tab",
  (e) => {
    if (enableShortcut.value && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      uiStore.toggleFloatingPanel();
      console.log(
        "[CanvasView] Tab 键切换左侧面板:",
        uiStore.floatingPanelVisible ? "显示" : "隐藏"
      );
    }
  },
  { dedupe: true }
);

// Escape 键关闭模态框或左侧浮动面板
onKeyStroke(
  "Escape",
  (e) => {
    if (hasFoucsInput.value && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();

      if (variableEditorModalVisible.value) {
        uiStore.closeVariableEditorModal();
        console.log("[CanvasView] Escape 键关闭变量编辑器模态框");
        return;
      }

      if (editorPanelModalVisible.value) {
        uiStore.closeEditorPanelModal();
        console.log("[CanvasView] Escape 键关闭编辑器面板模态框");
        return;
      }

      // 先检查并关闭模态框（优先级更高）
      if (nodeConfigModalVisible.value) {
        uiStore.closeNodeConfigModal();
        console.log("[CanvasView] Escape 键关闭节点配置模态框");
        return;
      }

      if (editorModalVisible.value) {
        uiStore.closeEditorModal();
        console.log("[CanvasView] Escape 键关闭全屏编辑器模态框");
        return;
      }

      if (infoModalVisible.value) {
        uiStore.closeInfoModal();
        console.log("[CanvasView] Escape 键关闭信息模态框");
        return;
      }

      // 如果模态框都已关闭，再关闭左侧浮动面板
      uiStore.closeFloatingPanel();
      console.log("[CanvasView] Escape 键关闭左侧面板");
    }
  },
  { dedupe: true }
);

// Ctrl + Shift + F 执行自动布局（使用 useMagicKeys 更可靠）
const keys = useMagicKeys({
  passive: false, // 允许 preventDefault
  onEventFired(e) {
    // 如果是 Ctrl+Shift+F，阻止默认行为
    if (e.altKey && e.shiftKey && e.key === "f" && e.type === "keydown") {
      e.preventDefault();
    }
  },
});
const ctrlShiftF = keys["Alt+Shift+F"] as any;

watch(ctrlShiftF, (pressed) => {
  if (pressed && enableShortcut.value) {
    console.log("[CanvasView] Ctrl+Shift+F 执行自动布局");
    handleAutoLayout();
  }
});
</script>

<style scoped></style>
