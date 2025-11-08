/**
 * 节点持久化 Hook
 * 负责保存和加载节点数据到 localStorage
 */
import type { Ref } from "vue";
import type { Node, Edge } from "@vue-flow/core";
import type { NodeData } from "../../typings/nodeEditor";

const STORAGE_KEYS = {
  nodes: "nodeEditor:nodes",
  edges: "nodeEditor:edges",
} as const;

const PERSIST_DELAY = 250;

/** 从本地存储加载数组 */
function loadPersistedArray<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [] as T[];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [] as T[];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : ([] as T[]);
  } catch (error) {
    console.warn(`读取本地存储失败: ${key}`, error);
    return [] as T[];
  }
}

export function useNodePersistence(
  nodes: Ref<Node<NodeData>[]>,
  edges: Ref<Edge[]>
) {
  let persistTimer: number | null = null;
  let stateDirty = false;

  /** 刷新持久化状态 */
  function flushPersistentState() {
    if (typeof window === "undefined" || !stateDirty) {
      return;
    }

    stateDirty = false;

    try {
      window.localStorage.setItem(
        STORAGE_KEYS.nodes,
        JSON.stringify(nodes.value)
      );
      window.localStorage.setItem(
        STORAGE_KEYS.edges,
        JSON.stringify(edges.value)
      );
    } catch (error) {
      console.warn("保存节点编辑器状态失败", error);
    }
  }

  /** 调度持久化 */
  function schedulePersist(immediate = false) {
    if (typeof window === "undefined") {
      return;
    }

    stateDirty = true;

    if (immediate) {
      if (persistTimer !== null) {
        window.clearTimeout(persistTimer);
        persistTimer = null;
      }
      flushPersistentState();
      return;
    }

    if (persistTimer !== null) {
      return;
    }

    persistTimer = window.setTimeout(() => {
      persistTimer = null;
      flushPersistentState();
    }, PERSIST_DELAY);
  }

  /** 初始化：监听页面卸载事件 */
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      if (persistTimer !== null) {
        window.clearTimeout(persistTimer);
        persistTimer = null;
      }
      flushPersistentState();
    });
  }

  return {
    schedulePersist,
    flushPersistentState,
  };
}

/** 加载持久化的节点和边 */
export function loadPersistedData(): {
  nodes: Node<NodeData>[];
  edges: Edge[];
} {
  return {
    nodes: loadPersistedArray<Node<NodeData>>(STORAGE_KEYS.nodes),
    edges: loadPersistedArray<Edge>(STORAGE_KEYS.edges),
  };
}
