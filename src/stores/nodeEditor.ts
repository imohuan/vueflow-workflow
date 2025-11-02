/**
 * 节点编辑器 Store（重构版本）
 * 组合所有独立的 hooks，提供统一的接口
 */
import { defineStore } from "pinia";
import { ref } from "vue";
import type { Node, Edge } from "@vue-flow/core";
import type { NodeData } from "@/typings/nodeEditor";
import { workflowEmitter } from "@/main";
import { WorkflowEventType } from "@/typings/workflowExecution";
import {
  // 类型
  type AutoLayoutOptions,
  // 工具函数
  normalizePadding,
  // Hooks
  loadPersistedData,
  useNodePersistence,
  useNodeLayers,
  useNodeHistory,
  useNodeSelection,
  useEdgeManagement,
  useContainerManagement,
  useNodeLayout,
  useNodeManagement,
  useNodeClipboard,
  useNodeExecution,
} from "@/composables/nodeEditor";

export const useNodeEditorStore = defineStore("nodeEditor", () => {
  // ========== 初始化数据 ==========
  const persistedData = loadPersistedData();
  const nodes = ref<Node<NodeData>[]>(persistedData.nodes);
  const edges = ref<Edge[]>(persistedData.edges);

  // ========== 持久化 ==========
  const { schedulePersist, flushPersistentState } = useNodePersistence(
    nodes,
    edges
  );

  // ========== 层级管理 ==========
  const {
    applyNodeLayerClass,
    refreshNodeLayerClasses,
    applyEdgeLayerClass,
    refreshEdgeLayerClasses,
  } = useNodeLayers(nodes, edges);

  // 初始化时应用层级类
  nodes.value.forEach((node) => applyNodeLayerClass(node));
  refreshEdgeLayerClasses();

  // 初始化时修复数据
  nodes.value.forEach((node) => {
    if ("extent" in node && node.extent) {
      delete node.extent;
    }
    if (node.data && node.data.config) {
      (node.data.config as any).padding = normalizePadding(
        (node.data.config as any).padding
      );
    }
  });

  // 修复旧版本的 edge handle
  edges.value.forEach((edge) => {
    if (edge.sourceHandle === "loop-out") {
      edge.sourceHandle = "loop-right";
    }
    if (edge.targetHandle === "loop-out") {
      edge.targetHandle = "loop-right";
    }
  });

  // ========== 历史记录 ==========
  const {
    canUndo,
    canRedo,
    historyRecords,
    recordHistory,
    recordHistoryDebounced,
    undo,
    redo,
    clearHistory,
    initializeHistory,
    batchStart,
    batchEnd,
    getHistoryDebugInfo,
  } = useNodeHistory(nodes, edges, () => schedulePersist());

  // 历史记录的恢复回调
  const onHistoryRestore = () => {
    refreshNodeLayerClasses();
    refreshEdgeLayerClasses();
  };

  // 包装 undo/redo 以传入回调
  const undoWrapper = () => undo(onHistoryRestore, onHistoryRestore);
  const redoWrapper = () => redo(onHistoryRestore, onHistoryRestore);

  // ========== 容器管理 ==========
  const {
    getContainerVisualConfig,
    layoutContainerChildren,
    updateContainerBounds,
    ensureContainerCapacity,
    clampChildPosition,
    setContainerHighlight,
    skipDimensionUpdate,
  } = useContainerManagement(nodes);

  // 初始化容器布局
  nodes.value
    .filter((node) => node.type === "loopContainer")
    .forEach((container) => {
      layoutContainerChildren(container.id);
    });

  // ========== 选择和重命名 ==========
  const {
    selectedNodeId,
    selectedNode,
    renamingNodeId,
    isNodeEditorVisible,
    selectNode,
    openNodeEditor,
    closeNodeEditor,
    startRenamingNode,
    stopRenamingNode,
    renameNode,
  } = useNodeSelection(nodes, recordHistory, schedulePersist);

  // ========== 边管理 ==========
  const { addEdge, removeEdge, validateConnection } = useEdgeManagement(
    nodes,
    edges,
    applyEdgeLayerClass,
    refreshEdgeLayerClasses,
    recordHistory
  );

  // ========== 节点管理 ==========
  const {
    createNodeByType,
    removeNode: removeNodeBase,
    updateNodeData,
    updateNodeConfig,
    syncIfNodePorts,
    updateNodeResult,
    toggleResultExpanded,
    updateNodeDimensions,
    generateUniqueName,
  } = useNodeManagement(
    nodes,
    edges,
    applyNodeLayerClass,
    refreshEdgeLayerClasses,
    layoutContainerChildren,
    batchStart,
    batchEnd,
    recordHistory,
    recordHistoryDebounced,
    schedulePersist,
    selectNode,
    stopRenamingNode
  );

  // 包装 removeNode 以传入额外的依赖
  const removeNode = (nodeId: string) => {
    removeNodeBase(nodeId, selectedNodeId, renamingNodeId);
  };

  // ========== 布局管理 ==========
  const {
    updateNodePosition,
    handleNodeDrag,
    handleNodeDragStop,
    autoLayout,
    beginNodeDetachFromContainer,
    finalizeNodeDetachFromContainer,
    moveNodeIntoContainer,
  } = useNodeLayout(
    nodes,
    edges,
    getContainerVisualConfig,
    ensureContainerCapacity,
    clampChildPosition,
    updateContainerBounds,
    layoutContainerChildren,
    refreshNodeLayerClasses,
    refreshEdgeLayerClasses,
    recordHistory,
    recordHistoryDebounced,
    batchStart,
    batchEnd
  );

  // ========== 剪贴板 ==========
  const {
    clipboard,
    clearClipboard,
    copyNodesToClipboard,
    hasClipboardData,
    pasteClipboardNodes,
  } = useNodeClipboard(
    nodes,
    edges,
    applyNodeLayerClass,
    applyEdgeLayerClass,
    refreshEdgeLayerClasses,
    updateContainerBounds,
    generateUniqueName,
    batchStart,
    batchEnd,
    schedulePersist
  );

  // ========== 节点执行 ==========
  const {
    isExecutingWorkflow,
    lastExecutionLog,
    lastExecutionError,
    collectNodeInputs,
    getAvailableVariables,
    executeNode,
    executeWorkflow: executeWorkflowBase,
  } = useNodeExecution(nodes, edges, updateNodeResult, schedulePersist);

  // 包装 executeWorkflow 以传入 workflowId
  const executeWorkflow = (
    workflowId: string = "default-workflow",
    options?: { clearPreviousResult?: boolean }
  ) => {
    return executeWorkflowBase(workflowId, options);
  };

  // 监听工作流完成和错误事件，重置执行状态
  workflowEmitter.on(WorkflowEventType.COMPLETED, () => {
    isExecutingWorkflow.value = false;
  });

  workflowEmitter.on(WorkflowEventType.ERROR, () => {
    isExecutingWorkflow.value = false;
  });

  // ========== 画布操作 ==========

  /** 清空画布 */
  function clearCanvas() {
    nodes.value = [];
    edges.value = [];
    refreshNodeLayerClasses();
    refreshEdgeLayerClasses();
    selectNode(null);
    clearHistory();
    schedulePersist(true);
  }

  /** 加载工作流数据 */
  function loadWorkflowData(
    loadedNodes: Node<NodeData>[],
    loadedEdges: Edge[]
  ) {
    batchStart();

    nodes.value = [];
    edges.value = [];

    nodes.value = loadedNodes.map((node) => ({ ...node }));
    edges.value = loadedEdges.map((edge) => ({ ...edge }));

    refreshNodeLayerClasses();
    refreshEdgeLayerClasses();

    batchEnd();

    selectNode(null);
  }

  /** 包装 updateNodeDimensions 以传入 skipDimensionUpdate */
  const updateNodeDimensionsWrapper = (
    nodeId: string,
    dimensions: { width: number; height: number }
  ) => {
    updateNodeDimensions(nodeId, dimensions, skipDimensionUpdate);
  };

  // ========== 返回 Store API ==========
  return {
    // 状态
    nodes,
    edges,
    selectedNodeId,
    selectedNode,
    isNodeEditorVisible,
    renamingNodeId,
    isExecutingWorkflow,
    lastExecutionLog,
    lastExecutionError,
    clipboard,

    // 历史记录
    initializeHistory,
    canUndo,
    canRedo,
    undo: undoWrapper,
    redo: redoWrapper,
    batchStart,
    batchEnd,
    historyRecords,
    getHistoryDebugInfo,

    // 节点操作
    createNodeByType,
    removeNode,
    updateNodeData,
    updateNodeConfig,
    syncIfNodePorts,
    updateNodeResult,
    toggleResultExpanded,
    updateNodeDimensions: updateNodeDimensionsWrapper,

    // 布局操作
    handleNodeDrag,
    handleNodeDragStop,
    updateNodePosition,
    autoLayout,
    beginNodeDetachFromContainer,
    finalizeNodeDetachFromContainer,
    moveNodeIntoContainer,

    // 边操作
    addEdge,
    removeEdge,
    validateConnection,

    // 容器操作
    setContainerHighlight,
    layoutContainerChildren,

    // 剪贴板操作
    clearClipboard,
    copyNodesToClipboard,
    hasClipboardData,
    pasteClipboardNodes,

    // 选择操作
    selectNode,
    openNodeEditor,
    closeNodeEditor,
    startRenamingNode,
    stopRenamingNode,
    renameNode,

    // 执行操作
    collectNodeInputs,
    getAvailableVariables,
    executeNode,
    executeWorkflow,

    // 画布操作
    clearCanvas,
    loadWorkflowData,
  };
});
