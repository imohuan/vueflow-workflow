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
  const lastNodeResults = ref<Array<{ id: string; timestamp: string; preview: string }>>([]);

  const nodeCount = computed(() => nodes.value.length);
  const edgeCount = computed(() => edges.value.length);

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
    lastNodeResults.value = [{ ...entry, timestamp }, ...lastNodeResults.value].slice(0, 10);
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

  return {
    nodes,
    edges,
    isExecuting,
    lastNodeResults,
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
  };
});

