/**
 * 节点历史记录 Hook
 * 负责撤销/重做功能
 */
import { ref, computed, type Ref } from "vue";
import { useDebounceFn } from "@vueuse/core";
import type { Node, Edge } from "@vue-flow/core";
import type { NodeData } from "@/typings/nodeEditor";
import type { HistorySnapshot } from "./types";

export function useNodeHistory(
  nodes: Ref<Node<NodeData>[]>,
  edges: Ref<Edge[]>,
  onSchedulePersist: () => void
) {
  const historyStack = ref<HistorySnapshot[]>([]);
  const historyIndex = ref(-1);
  const maxHistorySize = 50;

  let isHistoryEnabled = false;
  let isApplyingHistory = false;

  /** 序列化状态用于比较 */
  function serializeState(nodes: Node<NodeData>[], edges: Edge[]): string {
    return JSON.stringify({
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        ...(n.parentNode ? { parentNode: n.parentNode } : {}),
        ...(n.expandParent ? { expandParent: n.expandParent } : {}),
        ...(n.width ? { width: n.width } : {}),
        ...(n.height ? { height: n.height } : {}),
        ...(n.style ? { style: n.style } : {}),
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
    });
  }

  /** 获取当前状态的序列化 */
  function getCurrentStateSerialized(): string {
    return serializeState(nodes.value, edges.value);
  }

  /** 获取最后一条历史记录的序列化 */
  function getLastHistorySerialized(): string | null {
    if (
      historyIndex.value < 0 ||
      historyIndex.value >= historyStack.value.length
    )
      return null;
    const lastState = historyStack.value[historyIndex.value];
    if (!lastState) return null;
    return serializeState(lastState.nodes, lastState.edges);
  }

  /** 记录当前状态到历史 */
  function recordHistory() {
    if (!isHistoryEnabled || isApplyingHistory) return;

    const currentSerialized = getCurrentStateSerialized();
    const lastSerialized = getLastHistorySerialized();

    if (currentSerialized === lastSerialized) {
      return;
    }

    const snapshot: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes.value)),
      edges: JSON.parse(JSON.stringify(edges.value)),
    };

    if (historyIndex.value < historyStack.value.length - 1) {
      historyStack.value = historyStack.value.slice(0, historyIndex.value + 1);
    }

    historyStack.value.push(snapshot);
    historyIndex.value++;

    if (historyStack.value.length > maxHistorySize) {
      historyStack.value.shift();
      historyIndex.value--;
    }

    onSchedulePersist();
  }

  /** 防抖记录历史 */
  const recordHistoryDebounced = useDebounceFn(() => {
    recordHistory();
  }, 500);

  /** 撤销 */
  function undo(
    onRestore: (snapshot: HistorySnapshot) => void,
    onRefresh: () => void
  ) {
    if (historyIndex.value <= 0) return;

    isApplyingHistory = true;
    historyIndex.value--;

    const state = historyStack.value[historyIndex.value];
    if (state) {
      nodes.value = JSON.parse(JSON.stringify(state.nodes));
      edges.value = JSON.parse(JSON.stringify(state.edges));
      onRestore(state);
      onRefresh();
    }

    isApplyingHistory = false;
    onSchedulePersist();
  }

  /** 重做 */
  function redo(
    onRestore: (snapshot: HistorySnapshot) => void,
    onRefresh: () => void
  ) {
    if (historyIndex.value >= historyStack.value.length - 1) return;

    isApplyingHistory = true;
    historyIndex.value++;

    const state = historyStack.value[historyIndex.value];
    if (state) {
      nodes.value = JSON.parse(JSON.stringify(state.nodes));
      edges.value = JSON.parse(JSON.stringify(state.edges));
      onRestore(state);
      onRefresh();
    }

    isApplyingHistory = false;
    onSchedulePersist();
  }

  /** 清空历史记录 */
  function clearHistory() {
    historyStack.value = [];
    historyIndex.value = -1;
  }

  /** 初始化历史记录系统 */
  function initializeHistory() {
    if (isHistoryEnabled) return;

    historyStack.value = [
      {
        nodes: JSON.parse(JSON.stringify(nodes.value)),
        edges: JSON.parse(JSON.stringify(edges.value)),
      },
    ];
    historyIndex.value = 0;
    isHistoryEnabled = true;

    console.log(
      "%c✅ 历史记录系统已启用 (记录数: 1)",
      "color: #10b981; font-weight: bold"
    );
  }

  /** 批量操作：暂停历史记录 */
  function batchStart() {
    isApplyingHistory = true;
  }

  /** 批量操作：恢复历史记录并记录最终状态 */
  function batchEnd() {
    isApplyingHistory = false;
    recordHistory();
  }

  /** 获取历史记录调试信息 */
  function getHistoryDebugInfo() {
    return {
      totalRecords: historyStack.value.length,
      currentIndex: historyIndex.value,
      canUndo: canUndo.value,
      canRedo: canRedo.value,
      records: historyStack.value.map((record, index) => ({
        index,
        nodesCount: record.nodes.length,
        edgesCount: record.edges.length,
        isCurrent: index === historyIndex.value,
      })),
    };
  }

  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(
    () => historyIndex.value < historyStack.value.length - 1
  );
  const historyRecords = computed(() => historyStack.value);

  return {
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
  };
}
