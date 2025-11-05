import { defineStore } from "pinia";
import { computed, ref } from "vue";

export interface CanvasNodeSummary {
  id: string;
  label: string;
  status: "idle" | "running" | "success" | "error";
  outputPreview?: string;
}

export interface CanvasStateSnapshot {
  nodes: CanvasNodeSummary[];
  edges: Array<{ id: string; source: string; target: string }>;
}

export const useCanvasStore = defineStore("newCanvas", () => {
  const nodes = ref<CanvasNodeSummary[]>([]);
  const edges = ref<CanvasStateSnapshot["edges"]>([]);
  const isExecuting = ref(false);
  const lastNodeResults = ref<
    Array<{ id: string; timestamp: string; preview: string }>
  >([]);
  const fps = ref(0);

  const nodeCount = computed(() => nodes.value.length);
  const edgeCount = computed(() => edges.value.length);

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

  function setExecuting(value: boolean) {
    isExecuting.value = value;
  }

  function resetCanvas() {
    nodes.value = [];
    edges.value = [];
    lastNodeResults.value = [];
    isExecuting.value = false;
  }

  function loadSnapshot(snapshot: CanvasStateSnapshot) {
    nodes.value = snapshot.nodes;
    edges.value = snapshot.edges;
  }

  function pushNodeResult(entry: { id: string; preview: string }) {
    const timestamp = new Date().toLocaleTimeString();
    lastNodeResults.value = [
      { ...entry, timestamp },
      ...lastNodeResults.value,
    ].slice(0, 10);
  }

  /** 添加节点 */
  function addNode(node: any) {
    nodes.value.push(node);
  }

  /** 添加连线 */
  function addEdge(edge: any) {
    edges.value.push(edge);
  }

  /** 清空画布 */
  function clearCanvas() {
    nodes.value = [];
    edges.value = [];
    lastNodeResults.value = [];
  }

  /** 加载工作流 */
  function loadWorkflow(workflow: { nodes: any[]; edges: any[] }) {
    nodes.value = workflow.nodes;
    edges.value = workflow.edges;
  }

  function stopFPSCalculation() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  return {
    nodes,
    edges,
    isExecuting,
    lastNodeResults,
    fps,
    nodeCount,
    edgeCount,
    setExecuting,
    resetCanvas,
    loadSnapshot,
    pushNodeResult,
    addNode,
    addEdge,
    clearCanvas,
    loadWorkflow,
    stopFPSCalculation,
  };
});
