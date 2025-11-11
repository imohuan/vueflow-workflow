import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useWorkflowStore } from "./workflow";

/**
 * Canvas Store
 *
 * 职责：管理画布的视图状态和执行状态
 * - 所有工作流数据（nodes、edges）都存储在 workflow store 中
 * - 本 store 只管理 UI 状态：执行状态、FPS、执行结果预览等
 */
export const useCanvasStore = defineStore("newCanvas", () => {
  const workflowStore = useWorkflowStore();

  // ===== 视图状态 =====
  /** 是否正在执行工作流 */
  const isExecuting = ref(false);

  /** 最近的节点执行结果（用于预览面板） */
  const lastNodeResults = ref<
    Array<{ id: string; timestamp: string; preview: string }>
  >([]);

  /** 画布 FPS（性能监控） */
  const fps = ref(0);

  // ===== 计算属性：从 workflow store 读取数据 =====
  /** 当前工作流的节点列表 */
  const nodes = computed(() => {
    return workflowStore.currentWorkflow?.nodes || [];
  });

  /** 当前工作流的边列表 */
  const edges = computed(() => {
    return workflowStore.currentWorkflow?.edges || [];
  });

  /** 节点数量 */
  const nodeCount = computed(() => nodes.value.length);

  /** 边数量 */
  const edgeCount = computed(() => edges.value.length);

  /** 当前工作流 ID */
  const currentWorkflowId = computed(() => workflowStore.currentWorkflowId);

  /** 当前工作流名称 */
  const currentWorkflowName = computed(
    () => workflowStore.currentWorkflow?.name || "未命名工作流"
  );

  // FPS 计算逻辑
  let frameCount = 0;
  let lastTime = performance.now();
  let animationFrameId: number | null = null;

  function calculateFPS() {
    frameCount++;
    const currentTime = performance.now();
    const delta = currentTime - lastTime;

    // 每秒更新一次 FPS
    if (delta >= 1000) {
      fps.value = Math.round((frameCount * 1000) / delta);
      frameCount = 0;
      lastTime = currentTime;
    }

    animationFrameId = requestAnimationFrame(calculateFPS);
  }

  // 启动 FPS 计算
  calculateFPS();

  // ===== 方法 =====

  /**
   * 设置执行状态
   */
  function setExecuting(value: boolean) {
    isExecuting.value = value;
  }

  /**
   * 添加节点执行结果到预览列表
   */
  function pushNodeResult(entry: { id: string; preview: string }) {
    const timestamp = new Date().toLocaleTimeString();
    lastNodeResults.value = [
      { ...entry, timestamp },
      ...lastNodeResults.value,
    ].slice(0, 10);
  }

  /**
   * 清空执行结果预览
   */
  function clearResults() {
    lastNodeResults.value = [];
  }

  // ===== 节点操作（直接操作 workflow store）=====

  /**
   * 根据 ID 获取节点
   */
  function getNodeById(nodeId: string) {
    return nodes.value.find((n: any) => n.id === nodeId);
  }

  /**
   * 添加节点到当前工作流
   */
  function addNode(node: any) {
    if (!workflowStore.currentWorkflow) {
      console.warn("没有活动的工作流，无法添加节点");
      return;
    }

    workflowStore.updateWorkflow(workflowStore.currentWorkflow.workflow_id, {
      nodes: [...nodes.value, node],
    });
  }

  /**
   * 删除节点
   */
  function removeNode(nodeId: string) {
    if (!workflowStore.currentWorkflow) return;

    workflowStore.updateWorkflow(workflowStore.currentWorkflow.workflow_id, {
      nodes: nodes.value.filter((n: any) => n.id !== nodeId),
      edges: edges.value.filter(
        (e: any) => e.source !== nodeId && e.target !== nodeId
      ),
    });
  }

  /**
   * 更新节点
   */
  function updateNode(nodeId: string, updates: any) {
    if (!workflowStore.currentWorkflow) return;

    const updatedNodes = nodes.value.map((n: any) =>
      n.id === nodeId ? { ...n, ...updates } : n
    );

    workflowStore.updateWorkflow(workflowStore.currentWorkflow.workflow_id, {
      nodes: updatedNodes,
    });
  }

  /**
   * 批量更新节点
   */
  function updateNodes(newNodes: any[]) {
    if (!workflowStore.currentWorkflow) return;

    workflowStore.updateWorkflow(workflowStore.currentWorkflow.workflow_id, {
      nodes: newNodes,
    });
  }

  // ===== 边操作（直接操作 workflow store）=====

  /**
   * 添加边到当前工作流
   */
  function addEdge(edge: any) {
    if (!workflowStore.currentWorkflow) {
      console.warn("没有活动的工作流，无法添加连线");
      return;
    }

    workflowStore.updateWorkflow(workflowStore.currentWorkflow.workflow_id, {
      edges: [...edges.value, edge],
    });
  }

  /**
   * 删除边
   */
  function removeEdge(edgeId: string) {
    if (!workflowStore.currentWorkflow) return;

    workflowStore.updateWorkflow(workflowStore.currentWorkflow.workflow_id, {
      edges: edges.value.filter((e: any) => e.id !== edgeId),
    });
  }

  /**
   * 批量更新边
   */
  function updateEdges(newEdges: any[]) {
    if (!workflowStore.currentWorkflow) return;

    workflowStore.updateWorkflow(workflowStore.currentWorkflow.workflow_id, {
      edges: newEdges,
    });
  }

  // ===== 工作流操作 =====

  /**
   * 切换到指定工作流
   */
  function loadWorkflowById(workflowId: string) {
    workflowStore.setCurrentWorkflow(workflowId);
    clearResults(); // 清空执行结果
  }

  /**
   * 清空当前工作流的所有节点和边
   */
  function clearCanvas() {
    if (!workflowStore.currentWorkflow) return;

    workflowStore.updateWorkflow(workflowStore.currentWorkflow.workflow_id, {
      nodes: [],
      edges: [],
    });
    clearResults();
  }

  /**
   * 停止 FPS 计算（组件卸载时调用）
   */
  function stopFPSCalculation() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  // ===== 迭代历史管理（用于循环节点）=====

  /**
   * 追加节点的迭代历史记录
   * @param nodeId 节点 ID
   * @param iterationData 迭代数据
   */
  function appendNodeIterationHistory(nodeId: string, iterationData: any) {
    const node = getNodeById(nodeId);
    if (!node) return;

    // 初始化或获取迭代历史
    const history = node.data?.iterationHistory || {
      iterations: [],
      totalIterations: 0,
      currentPage: 1,
    };

    // 追加新的迭代记录
    history.iterations.push(iterationData);
    history.totalIterations = history.iterations.length;

    // 更新节点
    updateNode(nodeId, {
      data: {
        ...node.data,
        iterationHistory: history,
      },
    });
  }

  /**
   * 设置节点当前查看的迭代页码
   * @param nodeId 节点 ID
   * @param page 页码（从 1 开始）
   */
  function setNodeIterationPage(nodeId: string, page: number) {
    const node = getNodeById(nodeId);
    if (!node?.data?.iterationHistory) return;

    const history = node.data.iterationHistory;
    history.currentPage = Math.max(1, Math.min(page, history.totalIterations));

    updateNode(nodeId, {
      data: {
        ...node.data,
        iterationHistory: history,
      },
    });
  }

  /**
   * 清空节点的迭代历史
   * @param nodeId 节点 ID
   */
  function clearNodeIterationHistory(nodeId: string) {
    const node = getNodeById(nodeId);
    if (!node) return;

    updateNode(nodeId, {
      data: {
        ...node.data,
        iterationHistory: undefined,
      },
    });
  }

  return {
    // ===== 计算属性（从 workflow store 读取）=====
    nodes,
    edges,
    nodeCount,
    edgeCount,
    currentWorkflowId,
    currentWorkflowName,

    // ===== 视图状态 =====
    isExecuting,
    lastNodeResults,
    fps,

    // ===== 执行状态方法 =====
    setExecuting,
    pushNodeResult,
    clearResults,

    // ===== 节点操作 =====
    getNodeById,
    addNode,
    removeNode,
    updateNode,
    updateNodes,

    // ===== 边操作 =====
    addEdge,
    removeEdge,
    updateEdges,

    // ===== 工作流操作 =====
    loadWorkflowById,
    clearCanvas,

    // ===== 迭代历史管理 =====
    appendNodeIterationHistory,
    setNodeIterationPage,
    clearNodeIterationHistory,

    // ===== 其他 =====
    stopFPSCalculation,
  };
});
