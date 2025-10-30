/**
 * 节点编辑器 Store
 */
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useDebounceFn } from "@vueuse/core";
import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@vue-flow/core";
import type {
  NodeData,
  NodeResult,
  Connection,
  NodeResultOutput,
} from "@/typings/nodeEditor";
import { getNodeByType, IfNode } from "@/core/nodes";
import { createMCPClient } from "@/core/mcp-client";
import {
  buildVariableContext,
  resolveConfigWithVariables,
} from "@/utils/variableResolver";
import type { VariableTreeNode } from "@/utils/variableResolver";
import { nodeEditorLayoutConfig, type ContainerPaddingConfig } from "@/config";
import type { IfConfig } from "@/core/nodes/flow/IfNode";

const { containerDefaults, childEstimate } = nodeEditorLayoutConfig;

const CONTAINER_DEFAULT_WIDTH = containerDefaults.width;
const CONTAINER_DEFAULT_HEIGHT = containerDefaults.height;
const CONTAINER_HEADER_HEIGHT = containerDefaults.headerHeight;
type PaddingValues = Record<keyof ContainerPaddingConfig, number>;

type DagreLayoutDirection = "TB" | "BT" | "LR" | "RL";

interface AutoLayoutOptions {
  /** 布局方向，默认自上而下 */
  direction?: DagreLayoutDirection;
  /** 节点水平间距 */
  nodesep?: number;
  /** 层级垂直间距 */
  ranksep?: number;
  /** 布局后整体额外边距 */
  padding?: number;
  /** For 容器与 For 节点的垂直间距 */
  loopContainerGap?: number;
}

const DEFAULT_CONTAINER_PADDING: PaddingValues = {
  top: containerDefaults.padding.top,
  right: containerDefaults.padding.right,
  bottom: containerDefaults.padding.bottom,
  left: containerDefaults.padding.left,
};
const CHILD_ESTIMATED_WIDTH = childEstimate.width;
const CHILD_ESTIMATED_HEIGHT = childEstimate.height;

function clonePadding(padding: PaddingValues): PaddingValues {
  return { ...padding };
}

function normalizePadding(padding?: unknown): PaddingValues {
  const base = clonePadding(DEFAULT_CONTAINER_PADDING);
  if (!padding) {
    return base;
  }

  if (typeof padding !== "object" || padding === null) {
    return base;
  }

  const source = padding as Record<string, unknown>;

  const isNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

  if (isNumber(source.x)) {
    if (!isNumber(source.left)) {
      base.left = source.x;
    }
    if (!isNumber(source.right)) {
      base.right = source.x;
    }
  }

  if (isNumber(source.y)) {
    if (!isNumber(source.top)) {
      base.top = source.y;
    }
    if (!isNumber(source.bottom)) {
      base.bottom = source.y;
    }
  }

  if (isNumber(source.top)) {
    base.top = source.top;
  }
  if (isNumber(source.right)) {
    base.right = source.right;
  }
  if (isNumber(source.bottom)) {
    base.bottom = source.bottom;
  }
  if (isNumber(source.left)) {
    base.left = source.left;
  }

  return base;
}

export interface NodeClipboardNode {
  sourceId: string;
  node: Node<NodeData>;
  absolutePosition: { x: number; y: number };
}

export interface NodeClipboardData {
  nodes: NodeClipboardNode[];
  edges: Edge[];
  anchor: { x: number; y: number };
}

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cleanupClonedNode(node: Node<NodeData>) {
  delete (node as any).selected;
  delete (node as any).dragging;
  delete (node as any).positionAbsolute;
  delete (node as any).extent;
}

function deriveNodeTypeKey(node: Node<NodeData>): string {
  if (node.type === "loopContainer") {
    return "loopContainer";
  }
  if (node.data?.variant) {
    return String(node.data.variant);
  }
  const prefix = node.id.split("_")[0];
  return prefix || "node";
}

function generateCopiedNodeId(node: Node<NodeData>): string {
  return `${deriveNodeTypeKey(node)}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function getClipboardNodeDepth(
  node: Node<NodeData>,
  selectionMap: Map<string, Node<NodeData>>
): number {
  let depth = 0;
  let currentParentId = node.parentNode;
  while (currentParentId) {
    const parentNode = selectionMap.get(currentParentId);
    if (!parentNode) {
      break;
    }
    depth += 1;
    currentParentId = parentNode.parentNode;
  }
  return depth;
}

function getNodeAbsolutePosition(
  node: Node<NodeData>,
  nodeMap: Map<string, Node<NodeData>>,
  cache: Map<string, { x: number; y: number }>
): { x: number; y: number } {
  const cached = cache.get(node.id);
  if (cached) {
    return cached;
  }

  const baseX = node.position?.x ?? 0;
  const baseY = node.position?.y ?? 0;
  const result = { x: baseX, y: baseY };

  if (node.parentNode) {
    const parent = nodeMap.get(node.parentNode);
    if (parent) {
      const parentPosition = getNodeAbsolutePosition(parent, nodeMap, cache);
      result.x += parentPosition.x;
      result.y += parentPosition.y;
    }
  }

  cache.set(node.id, result);
  return result;
}

const NODE_LAYER_CLASS_CONTAINER = "node-layer-container";
const NODE_LAYER_CLASS_CHILD = "node-layer-child";
const EDGE_LAYER_CLASS_CONTAINER = "edge-layer-container";

const skipDimensionUpdate = new Set<string>();

function notifyContainerInternals(id: string) {
  if (!id) return;
  const updater = (window as any)?.__updateNodeInternals;
  if (typeof updater === "function") {
    requestAnimationFrame(() => updater(id));
  }
}

const STORAGE_KEYS = {
  nodes: "nodeEditor:nodes",
  edges: "nodeEditor:edges",
} as const;

const PERSIST_DELAY = 250;

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

// 创建全局 MCP 客户端实例
const mcpClient = createMCPClient({
  apiUrl: "/api/mcp",
  enableLog: true,
});

export const useNodeEditorStore = defineStore("nodeEditor", () => {
  const nodes = ref<Node<NodeData>[]>(
    loadPersistedArray<Node<NodeData>>(STORAGE_KEYS.nodes)
  );
  const edges = ref<Edge[]>(loadPersistedArray<Edge>(STORAGE_KEYS.edges));
  const selectedNodeId = ref<string | null>(null);
  const renamingNodeId = ref<string | null>(null);
  const isNodeEditorVisible = ref(false);
  const clipboard = ref<NodeClipboardData | null>(null);

  let persistTimer: number | null = null;
  let stateDirty = false;

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

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
      if (persistTimer !== null) {
        window.clearTimeout(persistTimer);
        persistTimer = null;
      }
      flushPersistentState();
    });
  }

  const ctrlDetachState = new Map<
    string,
    {
      containerId: string;
    }
  >();

  function applyNodeLayerClass(node: Node<NodeData>) {
    if (!node) return;
    const existing =
      typeof node.class === "string"
        ? node.class
            .split(/\s+/)
            .filter(
              (cls) =>
                cls &&
                cls !== NODE_LAYER_CLASS_CONTAINER &&
                cls !== NODE_LAYER_CLASS_CHILD
            )
        : [];

    if (node.type === "loopContainer" || node.data?.isContainer) {
      existing.push(NODE_LAYER_CLASS_CONTAINER);
    }

    if (node.parentNode) {
      existing.push(NODE_LAYER_CLASS_CHILD);
    }

    node.class = existing.join(" ");
  }

  function refreshNodeLayerClasses() {
    // TODO： 暂时不需要这个功能，因为节点层级管理已经通过 edge-layer-container 来管理了
    // nodes.value.forEach((node) => applyNodeLayerClass(node));
  }

  function extractClassNames(value: Edge["class"]): string[] {
    if (!value) return [];
    if (typeof value === "string") {
      return value.split(/\s+/).filter(Boolean);
    }
    if (Array.isArray(value)) {
      return value
        .flatMap((item) =>
          typeof item === "string" ? item.split(/\s+/).filter(Boolean) : []
        )
        .filter(Boolean);
    }
    if (typeof value === "object") {
      return Object.entries(value)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([name]) => name)
        .filter(Boolean);
    }
    return [];
  }

  function applyEdgeLayerClass(edge: Edge) {
    if (!edge) return;
    const classNames = extractClassNames(edge.class).filter(
      (cls) => cls !== EDGE_LAYER_CLASS_CONTAINER
    );

    const sourceNode = nodes.value.find((n) => n.id === edge.source);
    const targetNode = nodes.value.find((n) => n.id === edge.target);

    const sourceParent = sourceNode?.parentNode ?? null;
    const targetParent = targetNode?.parentNode ?? null;

    const isContainerEdge = Boolean(
      (sourceParent && sourceParent === targetParent) ||
        (sourceNode?.type === "loopContainer" &&
          targetParent === sourceNode.id) ||
        (targetNode?.type === "loopContainer" && sourceParent === targetNode.id)
    );

    if (isContainerEdge) {
      classNames.push(EDGE_LAYER_CLASS_CONTAINER);
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => {
          const edgeElement = document.querySelector<SVGGElement>(
            `[data-id="${edge.id}"]`
          );
          const parentSvg = edgeElement?.parentElement;
          if (!parentSvg) return;

          if (isContainerEdge) {
            parentSvg.classList.add(EDGE_LAYER_CLASS_CONTAINER);
          } else {
            parentSvg.classList.remove(EDGE_LAYER_CLASS_CONTAINER);
          }
        });
      }
    }
    // edge.class = classNames.join(" ");
  }

  function refreshEdgeLayerClasses() {
    edges.value.forEach((edge) => applyEdgeLayerClass(edge));
  }

  nodes.value.forEach((node) => applyNodeLayerClass(node));
  refreshEdgeLayerClasses();

  // ========== 历史记录系统 ==========

  // 历史记录栈
  const historyStack = ref<{ nodes: Node<NodeData>[]; edges: Edge[] }[]>([]);
  const historyIndex = ref(-1);
  const maxHistorySize = 50;

  // 标记历史记录是否已启用
  let isHistoryEnabled = false;
  let isApplyingHistory = false; // 防止应用历史时触发新记录

  /**
   * 序列化状态用于比较
   */
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

  /**
   * 获取当前状态的序列化
   */
  function getCurrentStateSerialized(): string {
    return serializeState(nodes.value, edges.value);
  }

  /**
   * 获取最后一条历史记录的序列化
   */
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

  /**
   * 记录当前状态到历史
   */
  function recordHistory() {
    if (!isHistoryEnabled || isApplyingHistory) return;

    // 比较当前状态和最后一条历史记录
    const currentSerialized = getCurrentStateSerialized();
    const lastSerialized = getLastHistorySerialized();

    // 如果状态没有变化，不记录
    if (currentSerialized === lastSerialized) {
      return;
    }

    // 深拷贝当前状态
    const snapshot = {
      nodes: JSON.parse(JSON.stringify(nodes.value)),
      edges: JSON.parse(JSON.stringify(edges.value)),
    };

    // 如果当前不在历史栈顶部，删除后面的记录
    if (historyIndex.value < historyStack.value.length - 1) {
      historyStack.value = historyStack.value.slice(0, historyIndex.value + 1);
    }

    // 添加新记录
    historyStack.value.push(snapshot);
    historyIndex.value++;

    // 限制历史记录数量
    if (historyStack.value.length > maxHistorySize) {
      historyStack.value.shift();
      historyIndex.value--;
    }

    schedulePersist();
  }

  /**
   * 防抖记录历史（用于频繁操作如拖拽）
   */
  const recordHistoryDebounced = useDebounceFn(() => {
    recordHistory();
  }, 500);

  /**
   * 撤销
   */
  function undo() {
    if (historyIndex.value <= 0) return;

    isApplyingHistory = true;
    historyIndex.value--;

    const state = historyStack.value[historyIndex.value];
    if (state) {
      nodes.value = JSON.parse(JSON.stringify(state.nodes));
      edges.value = JSON.parse(JSON.stringify(state.edges));
      refreshNodeLayerClasses();
      refreshEdgeLayerClasses();
    }

    isApplyingHistory = false;
    schedulePersist(true);
  }

  /**
   * 重做
   */
  function redo() {
    if (historyIndex.value >= historyStack.value.length - 1) return;

    isApplyingHistory = true;
    historyIndex.value++;

    const state = historyStack.value[historyIndex.value];
    if (state) {
      nodes.value = JSON.parse(JSON.stringify(state.nodes));
      edges.value = JSON.parse(JSON.stringify(state.edges));
      refreshNodeLayerClasses();
      refreshEdgeLayerClasses();
    }

    isApplyingHistory = false;
    schedulePersist(true);
  }

  /**
   * 清空历史记录
   */
  function clearHistory() {
    historyStack.value = [];
    historyIndex.value = -1;
  }

  /**
   * 初始化历史记录系统
   */
  function initializeHistory() {
    if (isHistoryEnabled) return;

    // 记录初始状态
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

  // 计算属性
  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(
    () => historyIndex.value < historyStack.value.length - 1
  );
  const historyRecords = computed(() => historyStack.value); // 用于调试

  // 计算属性
  const selectedNode = computed(() =>
    nodes.value.find((n) => n.id === selectedNodeId.value)
  );

  /**
   * 生成唯一节点名称
   * @param baseName - 基础名称（如"截图"）
   * @returns 唯一名称（如"截图"、"截图 1"、"截图 2"）
   */
  function generateUniqueName(baseName: string): string {
    // 获取所有已存在的节点名称
    const existingNames = new Set(
      nodes.value
        .map((n) => n.data?.label)
        .filter((label): label is string => Boolean(label))
    );

    // 如果基础名称不存在，直接返回
    if (!existingNames.has(baseName)) {
      return baseName;
    }

    // 查找最大的数字后缀
    let maxNumber = 0;
    const baseNamePattern = new RegExp(
      `^${baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(\\d+)$`
    );

    existingNames.forEach((name) => {
      if (name === baseName) {
        maxNumber = Math.max(maxNumber, 0);
      } else {
        const match = name.match(baseNamePattern);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          maxNumber = Math.max(maxNumber, num);
        }
      }
    });

    // 返回下一个可用名称
    return maxNumber === 0 ? `${baseName} 1` : `${baseName} ${maxNumber + 1}`;
  }

  /**
   * 通过节点类型创建节点
   * @param nodeType - 节点类型
   * @param position - 节点位置
   * @returns 创建的节点 ID
   */
  function createNodeByType(
    nodeType: string,
    position: { x: number; y: number },
    options: { parentNodeId?: string } = {}
  ): string | null {
    const nodeClass = getNodeByType(nodeType);
    if (!nodeClass) {
      console.error(`未找到节点类型: ${nodeType}`);
      return null;
    }

    // 生成唯一 ID
    const id = `${nodeType}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // 创建节点数据
    const nodeData = nodeClass.createNodeData();

    // 生成唯一名称
    if (nodeData.label) {
      nodeData.label = generateUniqueName(nodeData.label);
    }

    const node: Node<NodeData> = {
      id,
      type: "custom",
      position: { ...position },
      data: nodeData,
    };

    if (node.data) {
      node.data.variant = nodeType;
    }

    if (options.parentNodeId) {
      node.parentNode = options.parentNodeId;
    }

    applyNodeLayerClass(node);

    batchStart();
    nodes.value.push(node);

    if (options.parentNodeId) {
      layoutContainerChildren(options.parentNodeId);
      refreshEdgeLayerClasses();
    }

    if (nodeType === "for" && node.data) {
      const containerId = `${id}_body`;
      node.data.config = {
        ...node.data.config,
        containerId,
        headerHeight: CONTAINER_HEADER_HEIGHT,
        padding: clonePadding(DEFAULT_CONTAINER_PADDING),
      };

      const containerNode: Node<NodeData> = {
        id: containerId,
        type: "loopContainer",
        position: {
          x: node.position.x,
          y: node.position.y + 220,
        },
        data: {
          label: "批处理体",
          variant: "loop-container",
          isContainer: true,
          config: {
            forNodeId: id,
            headerHeight: CONTAINER_HEADER_HEIGHT,
            padding: clonePadding(DEFAULT_CONTAINER_PADDING),
          },
          width: CONTAINER_DEFAULT_WIDTH,
          height: CONTAINER_DEFAULT_HEIGHT,
          inputs: [
            {
              id: "loop-in",
              name: "循环入口",
              type: "any",
            },
            {
              id: "loop-right",
              name: "循环体出口",
              type: "any",
            },
          ],
          outputs: [
            {
              id: "loop-left",
              name: "循环体入口",
              type: "any",
            },
          ],
          category: "流程控制",
        },
        draggable: true,
        selectable: true,
        style: {
          width: `${CONTAINER_DEFAULT_WIDTH}px`,
          height: `${CONTAINER_DEFAULT_HEIGHT}px`,
        },
      };

      nodes.value.push(containerNode);
      applyNodeLayerClass(containerNode);
      refreshEdgeLayerClasses();

      const edgeId = `${id}_to_${containerId}`;
      edges.value.push({
        id: edgeId,
        source: id,
        sourceHandle: "loop",
        target: containerId,
        targetHandle: "loop-in",
        updatable: false, // 禁止编辑 For 节点和 loopContainer 之间的连接线
      });

      layoutContainerChildren(containerId);
    }

    batchEnd();
    return id;
  }

  /**
   * 删除容器及其子节点
   */
  function removeContainerWithChildren(containerId: string) {
    const childIds = nodes.value
      .filter((node) => node.parentNode === containerId)
      .map((node) => node.id);

    const idsToRemove = new Set<string>([containerId, ...childIds]);
    removeNodesAndEdges(idsToRemove);
  }

  /**
   * 删除节点和边
   */
  function removeNodesAndEdges(ids: Set<string>) {
    if (ids.size === 0) return;
    const affectedContainers = new Set<string>();

    nodes.value.forEach((node) => {
      if (ids.has(node.id) && node.parentNode) {
        affectedContainers.add(node.parentNode);
      }
    });

    nodes.value = nodes.value.filter((node) => !ids.has(node.id));
    edges.value = edges.value.filter(
      (edge) => !ids.has(edge.source) && !ids.has(edge.target)
    );
    refreshNodeLayerClasses();
    refreshEdgeLayerClasses();

    if (selectedNodeId.value && ids.has(selectedNodeId.value)) {
      selectNode(null);
    }

    if (renamingNodeId.value && ids.has(renamingNodeId.value)) {
      renamingNodeId.value = null;
    }

    affectedContainers.forEach((containerId) => {
      if (nodes.value.some((node) => node.id === containerId)) {
        layoutContainerChildren(containerId);
      }
    });
  }

  function getContainerVisualConfig(node: Node<NodeData>) {
    const data: any = node.data || {};
    const config: any = data.config || {};
    const style: any = node.style || {};

    const parseNumeric = (value: any): number | undefined => {
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    };

    const styleWidth = parseNumeric(style?.width);
    const styleHeight = parseNumeric(style?.height);
    const nodeWidth = parseNumeric((node as any).width);
    const nodeHeight = parseNumeric((node as any).height);
    const dimensionWidth = parseNumeric((node as any).dimensions?.width);
    const dimensionHeight = parseNumeric((node as any).dimensions?.height);

    return {
      width:
        data.width ??
        styleWidth ??
        nodeWidth ??
        dimensionWidth ??
        CONTAINER_DEFAULT_WIDTH,
      height:
        data.height ??
        styleHeight ??
        nodeHeight ??
        dimensionHeight ??
        CONTAINER_DEFAULT_HEIGHT,
      headerHeight: config.headerHeight ?? CONTAINER_HEADER_HEIGHT,
      padding: normalizePadding(config.padding),
    };
  }

  function normalizeContainerPorts(container: Node<NodeData>) {
    const data = container.data || {};

    const normalizedInputs = [
      {
        id: "loop-in",
        name: "循环入口",
        type: "any",
      },
      {
        id: "loop-right",
        name: "循环体出口",
        type: "any",
      },
    ];

    const normalizedOutputs = [
      {
        id: "loop-left",
        name: "循环体入口",
        type: "any",
      },
    ];

    container.data = {
      config: {},
      ...data,
      inputs: normalizedInputs,
      outputs: normalizedOutputs,
    };
  }

  function getNodeApproxWidth(node: Node<NodeData>) {
    const anyNode: any = node;
    return (
      anyNode.dimensions?.width ?? anyNode.data?.width ?? CHILD_ESTIMATED_WIDTH
    );
  }

  function getNodeApproxHeight(node: Node<NodeData>) {
    const anyNode: any = node;
    return (
      anyNode.dimensions?.height ??
      anyNode.data?.height ??
      CHILD_ESTIMATED_HEIGHT
    );
  }

  function clampChildPosition(
    position: { x: number; y: number },
    config: ReturnType<typeof getContainerVisualConfig>,
    _child: Node<NodeData>
  ) {
    const minX = config.padding.left;
    const minY = config.headerHeight + config.padding.top;

    const x = Math.max(position.x, minX);
    const y = Math.max(position.y, minY);

    return { x, y };
  }

  function ensureContainerCapacity(
    container: Node<NodeData>,
    child: Node<NodeData>,
    desiredPosition: { x: number; y: number }
  ) {
    let config = getContainerVisualConfig(container);
    const childWidth = getNodeApproxWidth(child);
    const childHeight = getNodeApproxHeight(child);

    let newWidth = config.width;
    let newHeight = config.height;

    const requiredRight = desiredPosition.x + childWidth + config.padding.right;
    const requiredBottom =
      desiredPosition.y + childHeight + config.padding.bottom;

    if (requiredRight > newWidth) {
      newWidth = requiredRight;
    }

    if (requiredBottom > newHeight) {
      newHeight = requiredBottom;
    }

    newWidth = Math.max(newWidth, CONTAINER_DEFAULT_WIDTH);
    newHeight = Math.max(newHeight, CONTAINER_DEFAULT_HEIGHT);

    const widthChanged = Math.abs(newWidth - config.width) > 0.5;
    const heightChanged = Math.abs(newHeight - config.height) > 0.5;

    if (widthChanged || heightChanged) {
      skipDimensionUpdate.add(container.id);

      container.data = {
        ...container.data,
        config: container.data?.config || {},
        inputs: container.data?.inputs || [],
        outputs: container.data?.outputs || [],
        width: newWidth,
        height: newHeight,
      };
      container.width = newWidth;
      container.height = newHeight;
      container.style = {
        ...(container.style || {}),
        width: `${newWidth}px`,
        height: `${newHeight}px`,
      };

      notifyContainerInternals(container.id);

      config = getContainerVisualConfig(container);
    }

    return config;
  }

  function centerChildInContainer(
    child: Node<NodeData>,
    container: Node<NodeData>
  ) {
    const estimatedWidth = getNodeApproxWidth(child);
    const configBefore = getContainerVisualConfig(container);
    const initialDesired = {
      x: Math.max(
        configBefore.padding.left,
        (configBefore.width - estimatedWidth) / 2
      ),
      y: configBefore.headerHeight + configBefore.padding.top,
    };
    const config = ensureContainerCapacity(container, child, initialDesired);
    const width = getNodeApproxWidth(child);

    const x = Math.max(config.padding.left, (config.width - width) / 2);
    const y = config.headerHeight + config.padding.top;

    child.position = {
      x,
      y,
    };
    updateContainerBounds(container);
  }

  function layoutContainerChildren(containerId: string) {
    const container = nodes.value.find((n) => n.id === containerId);
    if (!container) return;

    normalizeContainerPorts(container);

    const config = getContainerVisualConfig(container);
    const children = nodes.value.filter((n) => n.parentNode === containerId);

    if (children.length === 0) {
      const resetWidth = CONTAINER_DEFAULT_WIDTH;
      const resetHeight = CONTAINER_DEFAULT_HEIGHT;

      const widthChanged =
        Math.abs((container.width ?? config.width) - resetWidth) > 0.5;
      const heightChanged =
        Math.abs((container.height ?? config.height) - resetHeight) > 0.5;
      if (widthChanged || heightChanged) {
        skipDimensionUpdate.add(container.id);
      }

      container.data = {
        ...container.data,
        config: container.data?.config || {},
        inputs: container.data?.inputs || [],
        outputs: container.data?.outputs || [],
        width: resetWidth,
        height: resetHeight,
      };
      container.width = resetWidth;
      container.height = resetHeight;
      container.style = {
        ...(container.style || {}),
        width: `${resetWidth}px`,
        height: `${resetHeight}px`,
      };
      return;
    }

    if (children.length === 1 && children[0]) {
      centerChildInContainer(children[0], container);
      return;
    }

    const baseTop = config.headerHeight + config.padding.top;

    let maxRight = config.padding.left;
    let maxBottom = baseTop;
    let minLeft = Number.POSITIVE_INFINITY;
    let minTop = Number.POSITIVE_INFINITY;

    const childBounds: Array<{
      node: Node<NodeData>;
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];

    children.forEach((child) => {
      const clamped = clampChildPosition(child.position, config, child);
      child.position = clamped;

      const childWidth = getNodeApproxWidth(child);
      const childHeight = getNodeApproxHeight(child);

      minLeft = Math.min(minLeft, clamped.x);
      minTop = Math.min(minTop, clamped.y);
      maxRight = Math.max(maxRight, clamped.x + childWidth);
      maxBottom = Math.max(maxBottom, clamped.y + childHeight);

      childBounds.push({
        node: child,
        x: clamped.x,
        y: clamped.y,
        width: childWidth,
        height: childHeight,
      });
    });

    if (minLeft === Number.POSITIVE_INFINITY) {
      minLeft = config.padding.left;
    }
    if (minTop === Number.POSITIVE_INFINITY) {
      minTop = baseTop;
    }

    // 移除自动推回逻辑，允许子节点在容器内自由移动
    // const shiftX = Math.max(0, minLeft - config.padding.left);
    // const shiftY = Math.max(0, minTop - baseTop);
    //
    // if (shiftX > 0 || shiftY > 0) {
    //   childBounds.forEach(({ node, x, y }) => {
    //     node.position = {
    //       x: x - shiftX,
    //       y: y - shiftY,
    //     };
    //   });
    //   maxRight -= shiftX;
    //   maxBottom -= shiftY;
    // }

    const newWidth = Math.max(
      CONTAINER_DEFAULT_WIDTH,
      maxRight + config.padding.right
    );
    const newHeight = Math.max(
      CONTAINER_DEFAULT_HEIGHT,
      maxBottom + config.padding.bottom
    );

    const widthChanged =
      Math.abs((container.width ?? config.width) - newWidth) > 0.5;
    const heightChanged =
      Math.abs((container.height ?? config.height) - newHeight) > 0.5;
    if (widthChanged || heightChanged) {
      skipDimensionUpdate.add(container.id);
    }

    container.data = {
      ...container.data,
      config: container.data?.config || {},
      inputs: container.data?.inputs || [],
      outputs: container.data?.outputs || [],
      width: newWidth,
      height: newHeight,
    };
    container.width = newWidth;
    container.height = newHeight;
    container.style = {
      ...(container.style || {}),
      width: `${newWidth}px`,
      height: `${newHeight}px`,
    };
  }

  function updateContainerBounds(container: Node<NodeData>) {
    const config = getContainerVisualConfig(container);
    const children = nodes.value.filter((n) => n.parentNode === container.id);

    if (children.length === 0) {
      const resetWidth = CONTAINER_DEFAULT_WIDTH;
      const resetHeight = CONTAINER_DEFAULT_HEIGHT;

      const widthChanged =
        Math.abs((container.width ?? config.width) - resetWidth) > 0.5;
      const heightChanged =
        Math.abs((container.height ?? config.height) - resetHeight) > 0.5;

      if (widthChanged || heightChanged) {
        skipDimensionUpdate.add(container.id);
      }

      container.data = {
        ...container.data,
        config: container.data?.config || {},
        inputs: container.data?.inputs || [],
        outputs: container.data?.outputs || [],
        width: resetWidth,
        height: resetHeight,
      };
      container.width = resetWidth;
      container.height = resetHeight;
      container.style = {
        ...(container.style || {}),
        width: `${resetWidth}px`,
        height: `${resetHeight}px`,
      };
      return;
    }

    let maxRight = config.padding.left;
    let maxBottom = config.headerHeight + config.padding.top;

    children.forEach((child) => {
      const childWidth = getNodeApproxWidth(child);
      const childHeight = getNodeApproxHeight(child);
      const left = child.position.x;
      const top = child.position.y;

      maxRight = Math.max(maxRight, left + childWidth);
      maxBottom = Math.max(maxBottom, top + childHeight);
    });

    const newWidth = Math.max(
      CONTAINER_DEFAULT_WIDTH,
      maxRight + config.padding.right
    );
    const newHeight = Math.max(
      CONTAINER_DEFAULT_HEIGHT,
      maxBottom + config.padding.bottom
    );

    const widthChanged =
      Math.abs((container.width ?? config.width) - newWidth) > 0.5;
    const heightChanged =
      Math.abs((container.height ?? config.height) - newHeight) > 0.5;

    if (widthChanged || heightChanged) {
      skipDimensionUpdate.add(container.id);

      container.data = {
        ...container.data,
        config: container.data?.config || {},
        inputs: container.data?.inputs || [],
        outputs: container.data?.outputs || [],
        width: newWidth,
        height: newHeight,
      };
      container.width = newWidth;
      container.height = newHeight;
      container.style = {
        ...(container.style || {}),
        width: `${newWidth}px`,
        height: `${newHeight}px`,
      };

      notifyContainerInternals(container.id);
    }
  }

  /**
   * 删除节点
   */
  function removeNode(nodeId: string) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node) return;

    batchStart();

    if (node.type === "custom" && node.data?.variant === "for") {
      const containerId = node.data?.config?.containerId;
      if (typeof containerId === "string") {
        removeContainerWithChildren(containerId);
      }
    }

    if (node.type === "loopContainer") {
      removeContainerWithChildren(nodeId);
    }

    removeNodesAndEdges(new Set([nodeId]));

    batchEnd();
  }

  function moveNodeInternal(
    nodeId: string,
    position: { x: number; y: number },
    options: { isDragging: boolean; recordHistory: boolean }
  ) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node) return;
    const { isDragging, recordHistory } = options;

    if (node.parentNode) {
      const container = nodes.value.find((n) => n.id === node.parentNode);
      if (container && container.type === "loopContainer") {
        if (ctrlDetachState.has(nodeId)) {
          node.position = position;
          if (recordHistory) {
            recordHistoryDebounced();
          }
          return;
        }

        const configForExpansion = ensureContainerCapacity(
          container,
          node,
          position
        );
        const clamped = clampChildPosition(position, configForExpansion, node);
        node.position = clamped;
        notifyContainerInternals(node.id);
        updateContainerBounds(container);
        if (!isDragging) {
          layoutContainerChildren(container.id);
        }
        if (recordHistory) {
          recordHistoryDebounced();
        }
        return;
      }
    }

    node.position = position;
    notifyContainerInternals(node.id);
    if (recordHistory) {
      recordHistoryDebounced();
    }
  }

  /**
   * 更新节点位置
   */
  function updateNodePosition(
    nodeId: string,
    position: { x: number; y: number },
    isDragging = false
  ) {
    moveNodeInternal(nodeId, position, {
      isDragging,
      recordHistory: true,
    });
  }

  function handleNodeDrag(nodeId: string, position: { x: number; y: number }) {
    moveNodeInternal(nodeId, position, {
      isDragging: true,
      recordHistory: false,
    });
  }

  function handleNodeDragStop(
    nodeId: string,
    position: { x: number; y: number }
  ) {
    moveNodeInternal(nodeId, position, {
      isDragging: false,
      recordHistory: false,
    });
  }

  function autoLayout(options: AutoLayoutOptions = {}) {
    const topLevelNodes = nodes.value.filter((node) => !node.parentNode);

    if (topLevelNodes.length === 0) {
      return;
    }

    const direction = options.direction ?? "LR";
    const nodesep = options.nodesep ?? 160;
    const ranksep = options.ranksep ?? 240;
    const padding = options.padding ?? 120;
    const loopContainerGap = options.loopContainerGap ?? nodesep;

    const layoutCandidates = topLevelNodes.filter(
      (node) => node.type !== "loopContainer"
    );

    if (layoutCandidates.length === 0) {
      return;
    }

    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({
      rankdir: direction,
      nodesep,
      ranksep,
      marginx: 0,
      marginy: 0,
    });

    const layoutCandidateIds = new Set(layoutCandidates.map((node) => node.id));

    layoutCandidates.forEach((node) => {
      const width = getNodeApproxWidth(node);
      const height = getNodeApproxHeight(node);
      graph.setNode(node.id, { width, height });
    });

    edges.value.forEach((edge) => {
      if (
        !layoutCandidateIds.has(edge.source) ||
        !layoutCandidateIds.has(edge.target)
      ) {
        return;
      }

      graph.setEdge(edge.source, edge.target);
    });

    dagre.layout(graph);

    type PositionedNode = {
      node: Node<NodeData>;
      x: number;
      y: number;
      width: number;
      height: number;
    };

    const positionedNodes: PositionedNode[] = [];
    const forNodeLayout = new Map<string, PositionedNode>();

    layoutCandidates.forEach((node) => {
      const metadata = graph.node(node.id) as
        | { x: number; y: number }
        | undefined;

      if (!metadata) {
        return;
      }

      const width = getNodeApproxWidth(node);
      const height = getNodeApproxHeight(node);

      const rawX = metadata.x - width / 2;
      const rawY = metadata.y - height / 2;

      const entry: PositionedNode = {
        node,
        x: rawX,
        y: rawY,
        width,
        height,
      };

      positionedNodes.push(entry);

      if (node.data?.variant === "for") {
        forNodeLayout.set(node.id, entry);
      }
    });

    const loopContainers = topLevelNodes.filter(
      (node) => node.type === "loopContainer"
    );

    loopContainers.forEach((container) => {
      const width = getNodeApproxWidth(container);
      const height = getNodeApproxHeight(container);

      let rawX = container.position?.x ?? 0;
      let rawY = container.position?.y ?? 0;

      const forNodeId = (container.data?.config as any)?.forNodeId as
        | string
        | undefined;
      const forEntry = forNodeLayout.get(forNodeId ?? "");

      if (forEntry) {
        rawX = forEntry.x + (forEntry.width - width) / 2;
        rawY = forEntry.y + forEntry.height + loopContainerGap;
      }

      positionedNodes.push({
        node: container,
        x: rawX,
        y: rawY,
        width,
        height,
      });
    });

    if (positionedNodes.length === 0) {
      return;
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;

    positionedNodes.forEach(({ x, y }) => {
      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
    });

    const baseX = Number.isFinite(minX) ? minX : 0;
    const baseY = Number.isFinite(minY) ? minY : 0;

    batchStart();

    positionedNodes.forEach(({ node, x, y }) => {
      const nextPosition = {
        x: x - baseX + padding,
        y: y - baseY + padding,
      };

      moveNodeInternal(node.id, nextPosition, {
        isDragging: false,
        recordHistory: false,
      });
    });

    batchEnd();
  }

  function updateNodeDimensions(
    nodeId: string,
    dimensions: { width: number; height: number }
  ) {
    if (skipDimensionUpdate.has(nodeId)) {
      skipDimensionUpdate.delete(nodeId);
      return;
    }

    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node) return;

    const width = Math.max(dimensions.width, 0);
    const height = Math.max(dimensions.height, 0);

    node.width = width;
    node.height = height;
    node.style = {
      ...(node.style || {}),
      width: `${width}px`,
      height: `${height}px`,
    };

    if (node.type === "loopContainer") {
      node.data = {
        ...node.data,
        config: node.data?.config || {},
        inputs: node.data?.inputs || [],
        outputs: node.data?.outputs || [],
        width,
        height,
      };

      layoutContainerChildren(nodeId);
    }

    recordHistoryDebounced();
  }

  /**
   * 添加连接线
   */
  function addEdge(edge: Edge) {
    edges.value.push(edge);
    applyEdgeLayerClass(edge);
    // 添加连接线立即记录
    recordHistory();
  }

  /**
   * 删除连接线
   */
  function removeEdge(edgeId: string) {
    edges.value = edges.value.filter((e) => e.id !== edgeId);
    refreshEdgeLayerClasses();
    // 删除连接线立即记录
    recordHistory();
  }

  /**
   * 更新节点数据
   */
  function updateNodeData(nodeId: string, data: Partial<NodeData>) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node && node.data) {
      node.data = { ...node.data, ...data };
      // 使用防抖记录历史：频繁配置更新只记录最终状态
      recordHistoryDebounced();
    }
  }

  /**
   * 更新节点配置
   */
  function updateNodeConfig(nodeId: string, config: Record<string, any>) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node?.data) return;

    // 更新配置
    node.data.config = {
      ...node.data.config,
      ...config,
    };

    // 如果是 if 节点，同步端口
    const nodeType = node.id.split("_")[0];
    if (nodeType === "if") {
      syncIfNodePorts(nodeId, { recordHistory: false });
    }

    // 使用防抖记录历史
    recordHistoryDebounced();
  }

  function syncIfNodePorts(
    nodeId: string,
    options: { recordHistory?: boolean } = {}
  ) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node?.data) return;

    const nodeClass = getNodeByType("if");
    if (!nodeClass || !(nodeClass instanceof IfNode)) {
      return;
    }

    const rawConfig = (node.data.config || {}) as Partial<IfConfig>;
    const conditions = Array.isArray(rawConfig.conditions)
      ? rawConfig.conditions
      : [];

    const nextOutputs = nodeClass.getOutputsForConfig({
      conditions,
    });

    const previousOutputs = node.data.outputs || [];
    const removedHandleIds = previousOutputs
      .map((output) => output.id)
      .filter((id) => !nextOutputs.some((output) => output.id === id));

    node.data = {
      ...node.data,
      outputs: nextOutputs,
    };

    if (removedHandleIds.length > 0) {
      const beforeCount = edges.value.length;
      edges.value = edges.value.filter((edge) => {
        if (edge.source !== nodeId) {
          return true;
        }
        const handleId = edge.sourceHandle ?? "";
        return !removedHandleIds.includes(handleId);
      });

      if (edges.value.length !== beforeCount) {
        refreshEdgeLayerClasses();
      }
    }

    notifyContainerInternals(nodeId);

    if (options.recordHistory !== false) {
      recordHistoryDebounced();
    }
  }

  /**
   * 更新节点执行结果
   */
  function updateNodeResult(nodeId: string, result: NodeResult) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node && node.data) {
      node.data.result = normalizeNodeResult(result);
      schedulePersist();
    }
  }

  /**
   * 切换结果展开状态
   */
  function toggleResultExpanded(nodeId: string) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node && node.data) {
      node.data.resultExpanded = !node.data.resultExpanded;
      schedulePersist();
    }
  }

  /**
   * 设置容器高亮状态
   */
  function setContainerHighlight(
    containerId: string,
    highlight: boolean,
    type: "normal" | "warning" = "normal"
  ) {
    const container = nodes.value.find((n) => n.id === containerId);
    if (container && container.data) {
      (container.data as any).isHighlighted = highlight;
      (container.data as any).highlightType = highlight ? type : undefined;
    }
  }

  /**
   * 开始 Ctrl 拖拽时暂时从容器中分离节点
   */
  function beginNodeDetachFromContainer(nodeId: string): string | null {
    if (ctrlDetachState.has(nodeId)) {
      return ctrlDetachState.get(nodeId)!.containerId;
    }

    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node || !node.parentNode) {
      return null;
    }

    const containerId = node.parentNode;
    ctrlDetachState.set(nodeId, {
      containerId,
    });

    return containerId;
  }

  /**
   * 结束 Ctrl 拖拽后恢复或脱离容器
   */
  function finalizeNodeDetachFromContainer(
    nodeId: string,
    options: { keepInContainer: boolean; recordHistory?: boolean }
  ) {
    const state = ctrlDetachState.get(nodeId);
    if (!state) {
      return;
    }
    ctrlDetachState.delete(nodeId);

    const node = nodes.value.find((n) => n.id === nodeId);
    const container = nodes.value.find((n) => n.id === state.containerId);

    if (!node) {
      return;
    }

    if (options.keepInContainer && container) {
      node.parentNode = container.id;

      const desiredPosition = {
        x: node.position.x,
        y: node.position.y,
      };

      const config = ensureContainerCapacity(container, node, desiredPosition);
      const clamped = clampChildPosition(desiredPosition, config, node);
      node.position = clamped;
      notifyContainerInternals(node.id);

      updateContainerBounds(container);
      layoutContainerChildren(container.id);
      notifyContainerInternals(container.id);
    } else {
      if (container) {
        const absolutePosition = {
          x: container.position.x + node.position.x,
          y: container.position.y + node.position.y,
        };

        node.parentNode = undefined;
        node.position = absolutePosition;
        notifyContainerInternals(node.id);

        updateContainerBounds(container);
        layoutContainerChildren(container.id);
        notifyContainerInternals(container.id);
      } else {
        node.parentNode = undefined;
        notifyContainerInternals(node.id);
      }
    }

    refreshNodeLayerClasses();
    refreshEdgeLayerClasses();
    if (options.recordHistory !== false) {
      recordHistory();
    }
  }

  /**
   * 将节点移入容器
   */
  function moveNodeIntoContainer(nodeId: string, containerId: string) {
    const node = nodes.value.find((n) => n.id === nodeId);
    const container = nodes.value.find((n) => n.id === containerId);

    if (!node || !container) return;

    // 计算节点在容器内的相对位置
    const relativeX = node.position.x - container.position.x;
    const relativeY = node.position.y - container.position.y;

    // 设置节点的父容器和相对位置
    node.parentNode = containerId;
    node.position = {
      x: relativeX,
      y: relativeY,
    };

    const adjustedConfig = ensureContainerCapacity(
      container,
      node,
      node.position
    );
    node.position = clampChildPosition(node.position, adjustedConfig, node);
    notifyContainerInternals(nodeId);

    updateContainerBounds(container);
    layoutContainerChildren(containerId);

    // 刷新节点层级类
    refreshNodeLayerClasses();
    refreshEdgeLayerClasses();

    // 记录历史
    recordHistory();

    // 通知容器内部更新
    notifyContainerInternals(containerId);
  }

  function clearClipboard() {
    clipboard.value = null;
  }

  function copyNodesToClipboard(nodeIds: string[]) {
    if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
      clearClipboard();
      return;
    }

    const idSet = new Set(nodeIds.filter(Boolean));
    if (idSet.size === 0) {
      clearClipboard();
      return;
    }

    const selectedNodes = nodes.value.filter((node) => idSet.has(node.id));
    if (selectedNodes.length === 0) {
      clearClipboard();
      return;
    }

    const nodeMap = new Map(nodes.value.map((node) => [node.id, node]));
    const cache = new Map<string, { x: number; y: number }>();

    const clipboardNodes: NodeClipboardNode[] = selectedNodes.map((node) => {
      const absolutePosition = getNodeAbsolutePosition(node, nodeMap, cache);
      const clonedNode = cloneDeep(node);
      cleanupClonedNode(clonedNode);
      return {
        sourceId: node.id,
        node: clonedNode,
        absolutePosition,
      };
    });

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;

    clipboardNodes.forEach(({ absolutePosition }) => {
      minX = Math.min(minX, absolutePosition.x);
      minY = Math.min(minY, absolutePosition.y);
    });

    const anchor = {
      x: Number.isFinite(minX) ? minX : 0,
      y: Number.isFinite(minY) ? minY : 0,
    };

    const clipboardEdges = edges.value
      .filter((edge) => idSet.has(edge.source) && idSet.has(edge.target))
      .map((edge) => cloneDeep(edge));

    clipboard.value = {
      nodes: clipboardNodes,
      edges: clipboardEdges,
      anchor,
    };
  }

  function hasClipboardData(): boolean {
    return Boolean(clipboard.value && clipboard.value.nodes.length > 0);
  }

  function pasteClipboardNodes(targetPosition: {
    x: number;
    y: number;
  }): string[] {
    const data = clipboard.value;
    if (!data || data.nodes.length === 0) {
      return [];
    }

    const offset = {
      x: targetPosition.x - data.anchor.x,
      y: targetPosition.y - data.anchor.y,
    };

    const idMap = new Map<string, string>();
    const absolutePositionMap = new Map<string, { x: number; y: number }>();
    const selectionMap = new Map<string, Node<NodeData>>();

    data.nodes.forEach((item) => {
      const newId = generateCopiedNodeId(item.node);
      idMap.set(item.sourceId, newId);
      absolutePositionMap.set(item.sourceId, {
        x: item.absolutePosition.x + offset.x,
        y: item.absolutePosition.y + offset.y,
      });
      selectionMap.set(item.sourceId, item.node);
    });

    const sortedNodes = [...data.nodes].sort(
      (a, b) =>
        getClipboardNodeDepth(a.node, selectionMap) -
        getClipboardNodeDepth(b.node, selectionMap)
    );

    const affectedContainers = new Set<string>();
    const newNodeIds: string[] = [];

    batchStart();
    try {
      nodes.value.forEach((node) => {
        const selectableNode = node as Node<NodeData> & { selected?: boolean };
        if (selectableNode.selected) {
          selectableNode.selected = false;
        }
      });

      sortedNodes.forEach((item) => {
        const originalNode = item.node;
        const newNode = cloneDeep(originalNode);
        cleanupClonedNode(newNode);

        const newId = idMap.get(item.sourceId);
        if (!newId) {
          return;
        }
        newNode.id = newId;

        const absolutePosition = absolutePositionMap.get(item.sourceId);
        if (!absolutePosition) {
          return;
        }

        const parentOldId = originalNode.parentNode;
        if (parentOldId && idMap.has(parentOldId)) {
          const parentNewId = idMap.get(parentOldId)!;
          newNode.parentNode = parentNewId;
          const parentAbs = absolutePositionMap.get(parentOldId);
          if (parentAbs) {
            newNode.position = {
              x: absolutePosition.x - parentAbs.x,
              y: absolutePosition.y - parentAbs.y,
            };
          } else {
            newNode.position = { ...absolutePosition };
          }
          affectedContainers.add(parentNewId);
        } else {
          if (newNode.parentNode) {
            delete newNode.parentNode;
          }
          newNode.position = { ...absolutePosition };
        }

        if (newNode.data) {
          newNode.data = { ...newNode.data };

          if (newNode.data.config) {
            newNode.data.config = cloneDeep(newNode.data.config);
            const configObj = newNode.data.config as Record<string, any>;
            ["containerId", "forNodeId"].forEach((key) => {
              const value = configObj[key];
              if (typeof value === "string") {
                if (idMap.has(value)) {
                  configObj[key] = idMap.get(value);
                } else {
                  delete configObj[key];
                }
              }
            });
          }

          if (newNode.data.inputs) {
            newNode.data.inputs = cloneDeep(newNode.data.inputs);
          }

          if (newNode.data.outputs) {
            newNode.data.outputs = cloneDeep(newNode.data.outputs);
          }

          if ("result" in newNode.data) {
            delete (newNode.data as any).result;
          }
          if ("resultExpanded" in newNode.data) {
            delete (newNode.data as any).resultExpanded;
          }

          if (typeof newNode.data.label === "string" && newNode.data.label) {
            newNode.data.label = generateUniqueName(newNode.data.label);
          }
        }

        (newNode as Node<NodeData> & { selected?: boolean }).selected = true;
        applyNodeLayerClass(newNode);
        nodes.value.push(newNode);
        newNodeIds.push(newNode.id);

        if (newNode.type === "loopContainer") {
          affectedContainers.add(newNode.id);
        }

        notifyContainerInternals(newNode.id);
      });

      const edgeTimestamp = Date.now();
      data.edges.forEach((edge, index) => {
        const newSource = idMap.get(edge.source);
        const newTarget = idMap.get(edge.target);
        if (!newSource || !newTarget) {
          return;
        }

        const newEdge = cloneDeep(edge);
        newEdge.id = `edge_${edgeTimestamp + index}_${Math.random()
          .toString(36)
          .slice(2, 9)}`;
        newEdge.source = newSource;
        newEdge.target = newTarget;
        (newEdge as Edge & { selected?: boolean }).selected = false;

        edges.value.push(newEdge);
        applyEdgeLayerClass(newEdge);
      });

      affectedContainers.forEach((containerId) => {
        const containerNode = nodes.value.find(
          (node) => node.id === containerId
        );
        if (containerNode) {
          updateContainerBounds(containerNode);
          notifyContainerInternals(containerNode.id);
        }
      });

      if (newNodeIds.length > 0) {
        const lastNodeId = newNodeIds[newNodeIds.length - 1];
        if (lastNodeId) {
          selectedNodeId.value = lastNodeId;
        }
      }
    } finally {
      batchEnd();
      refreshEdgeLayerClasses();
    }

    return newNodeIds;
  }

  /**
   * 选中节点
   */
  function selectNode(nodeId: string | null) {
    selectedNodeId.value = nodeId;
    if (nodeId === null) {
      isNodeEditorVisible.value = false;
    }
    if (renamingNodeId.value && renamingNodeId.value !== nodeId) {
      renamingNodeId.value = null;
    }
  }

  function openNodeEditor(nodeId: string) {
    selectedNodeId.value = nodeId;
    isNodeEditorVisible.value = true;
  }

  function closeNodeEditor() {
    isNodeEditorVisible.value = false;
  }

  function startRenamingNode(nodeId: string) {
    if (!nodeId) return;
    if (!nodes.value.some((node) => node.id === nodeId)) {
      return;
    }

    selectedNodeId.value = nodeId;
    renamingNodeId.value = nodeId;
  }

  function stopRenamingNode() {
    if (renamingNodeId.value) {
      renamingNodeId.value = null;
    }
  }

  function renameNode(nodeId: string, label: string) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node?.data) return;

    const trimmed = typeof label === "string" ? label.trim() : "";
    const fallback = node.data.label || "节点";
    const nextLabel = trimmed.length > 0 ? trimmed : fallback;

    if (node.data.label === nextLabel) {
      return;
    }

    node.data = {
      ...node.data,
      label: nextLabel,
    };

    recordHistory();
    schedulePersist();
  }

  /**
   * 验证连接
   */
  function validateConnection(connection: Connection): boolean {
    // 1. 不能连接自己
    if (connection.source === connection.target) {
      console.warn("不能连接自己");
      return false;
    }

    // 2. 检查是否已存在连接
    const exists = edges.value.some(
      (edge) =>
        edge.source === connection.source &&
        edge.sourceHandle === connection.sourceHandle &&
        edge.target === connection.target &&
        edge.targetHandle === connection.targetHandle
    );

    if (exists) {
      console.warn("连接已存在");
      return false;
    }

    // 3. 验证端口类型：必须是输入端口和输出端口互连
    const sourceNode = nodes.value.find((n) => n.id === connection.source);
    const targetNode = nodes.value.find((n) => n.id === connection.target);

    if (!sourceNode || !targetNode) {
      console.warn("找不到节点");
      return false;
    }

    const sourceParent = sourceNode.parentNode || null;
    const targetParent = targetNode.parentNode || null;
    const isSourceContainer = sourceNode.type === "loopContainer";
    const isTargetContainer = targetNode.type === "loopContainer";
    const containerSideHandles = new Set(["loop-left", "loop-right"]);

    // 批处理循环端口专属规则
    const sourceIsLoopHandle = connection.sourceHandle === "loop";
    const targetIsLoopInHandle = connection.targetHandle === "loop-in";

    if (sourceIsLoopHandle) {
      const expectedContainerId = sourceNode.data?.config?.containerId as
        | string
        | undefined;
      if (expectedContainerId !== connection.target) {
        console.warn("批处理循环出口只能连接到对应的循环体节点");
        return false;
      }
      if (connection.targetHandle !== "loop-in") {
        console.warn("批处理循环出口只能连接到循环体入口端口");
        return false;
      }
    }

    if (targetIsLoopInHandle) {
      const expectedForNodeId = targetNode.data?.config?.forNodeId as
        | string
        | undefined;
      if (expectedForNodeId !== connection.source) {
        console.warn("循环体入口只能连接到对应的批处理节点");
        return false;
      }
      if (connection.sourceHandle !== "loop") {
        console.warn("循环体入口只能连接批处理节点的循环端口");
        return false;
      }
    }

    if (
      isSourceContainer &&
      containerSideHandles.has(connection.sourceHandle || "") &&
      targetParent !== sourceNode.id
    ) {
      console.warn("容器侧边端口只能连接到容器内部节点");
      return false;
    }

    if (
      isTargetContainer &&
      containerSideHandles.has(connection.targetHandle || "") &&
      sourceParent !== targetNode.id
    ) {
      console.warn("容器侧边端口只能连接到容器内部节点");
      return false;
    }

    // 检查源端口是输入还是输出
    const isSourceInput = sourceNode.data?.inputs?.some(
      (port) => port.id === connection.sourceHandle
    );
    const isSourceOutput = sourceNode.data?.outputs?.some(
      (port) => port.id === connection.sourceHandle
    );

    // 检查目标端口是输入还是输出
    const isTargetInput = targetNode.data?.inputs?.some(
      (port) => port.id === connection.targetHandle
    );
    const isTargetOutput = targetNode.data?.outputs?.some(
      (port) => port.id === connection.targetHandle
    );

    const isSourceLoopLeft =
      isSourceContainer && connection.sourceHandle === "loop-left";
    const isTargetLoopLeft =
      isTargetContainer && connection.targetHandle === "loop-left";
    const isSourceLoopRight =
      isSourceContainer && connection.sourceHandle === "loop-right";
    const isTargetLoopRight =
      isTargetContainer && connection.targetHandle === "loop-right";

    if (isSourceLoopLeft && !isTargetInput) {
      console.warn("批处理左侧端口只能连接到子节点的输入端口");
      return false;
    }

    if (isTargetLoopLeft) {
      console.warn("批处理左侧端口仅支持连接到子节点的输入端口");
      return false;
    }

    if (isTargetLoopRight && !isSourceOutput) {
      console.warn("批处理右侧端口只能连接到子节点的输出端口");
      return false;
    }

    if (isSourceLoopRight) {
      console.warn("批处理右侧端口仅支持作为子节点输出的目标端口");
      return false;
    }

    // 情况1: 输出端口 → 输入端口 (标准流向)
    const isOutputToInput = isSourceOutput && isTargetInput;

    // 情况2: 输入端口 → 输出端口 (反向流向)
    const isInputToOutput = isSourceInput && isTargetOutput;

    // 必须是其中一种有效情况
    if (!isOutputToInput && !isInputToOutput) {
      console.warn("只能连接输入端口和输出端口");
      return false;
    }

    if (
      sourceParent &&
      !isSourceContainer &&
      !isTargetContainer &&
      targetParent !== sourceParent
    ) {
      console.warn("容器内部节点只能连接同容器的节点");
      return false;
    }

    if (
      targetParent &&
      !isSourceContainer &&
      !isTargetContainer &&
      sourceParent !== targetParent
    ) {
      console.warn("容器内部节点只能连接同容器的节点");
      return false;
    }

    return true;
  }

  // 初始化时校准现有循环容器的端口定义和布局

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

  nodes.value
    .filter((node) => node.type === "loopContainer")
    .forEach((container) => {
      layoutContainerChildren(container.id);
    });

  refreshNodeLayerClasses();
  refreshEdgeLayerClasses();

  edges.value.forEach((edge) => {
    if (edge.sourceHandle === "loop-out") {
      edge.sourceHandle = "loop-right";
    }
    if (edge.targetHandle === "loop-out") {
      edge.targetHandle = "loop-right";
    }
  });

  /**
   * 收集节点输入数据
   */
  function collectNodeInputs(nodeId: string): Record<string, any> {
    const inputs: Record<string, any> = {};

    // 查找所有连接到该节点的边
    const incomingEdges = edges.value.filter((edge) => edge.target === nodeId);

    for (const edge of incomingEdges) {
      const sourceNode = nodes.value.find((n) => n.id === edge.source);
      if (!sourceNode?.data?.result) continue;

      const handleId = edge.targetHandle || "default";
      const sourceHandleId = edge.sourceHandle || "result";

      const outputs = sourceNode.data.result.data.outputs || {};
      const outputKeys = Object.keys(outputs);
      const hasOutputs = outputKeys.length > 0;

      let entry: NodeResultOutput | undefined;

      if (sourceHandleId && sourceHandleId !== "result") {
        if (Object.prototype.hasOwnProperty.call(outputs, sourceHandleId)) {
          entry = outputs[sourceHandleId];
        }
      } else if (hasOutputs) {
        const key = outputKeys[0];
        if (key !== undefined) {
          entry = outputs[key];
        }
      }

      if (entry) {
        inputs[handleId] = entry.value;
      } else if (!hasOutputs) {
        inputs[handleId] = sourceNode.data.result.data.raw ?? null;
      } else {
        inputs[handleId] = undefined;
      }
    }

    return inputs;
  }

  function normalizeResultValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => normalizeResultValue(item));
    }

    if (value && typeof value === "object") {
      const record = value as Record<string, any>;

      if (Array.isArray(record.content) && record.content.length > 0) {
        const firstTextItem = record.content.find(
          (item: any) => item && typeof item.text === "string"
        );

        const firstItem = firstTextItem ?? record.content[0];

        let data: unknown =
          typeof firstItem?.text === "string" ? firstItem.text : firstItem;

        if (typeof data === "string") {
          const trimmed = data.trim();
          if (
            (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
            (trimmed.startsWith("[") && trimmed.endsWith("]"))
          ) {
            try {
              data = JSON.parse(trimmed);
            } catch (error) {
              // 保持原始字符串
            }
          }
        } else {
          data = normalizeResultValue(data);
        }

        const normalized: Record<string, unknown> = {
          isError: Boolean(record.isError),
          data,
        };

        if (record.type || firstItem?.type) {
          normalized.type = record.type || firstItem?.type;
        }

        if (record.message) {
          normalized.message = record.message;
        }

        return normalized;
      }

      const cloned: Record<string, unknown> = {};
      Object.entries(record).forEach(([key, val]) => {
        cloned[key] = normalizeResultValue(val);
      });
      return cloned;
    }

    return value;
  }

  function cloneDeepValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => cloneDeepValue(item));
    }

    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      const cloned: Record<string, unknown> = {};
      Object.entries(record).forEach(([key, val]) => {
        cloned[key] = cloneDeepValue(val);
      });
      return cloned;
    }

    return value;
  }

  function normalizeNodeResult(result: NodeResult): NodeResult {
    if (!result || !result.data) {
      return result;
    }

    const normalizedOutputs: Record<string, NodeResultOutput> = {};
    const outputs = result.data.outputs || {};

    Object.entries(outputs).forEach(([key, output]) => {
      normalizedOutputs[key] = {
        ...output,
        value: normalizeResultValue(output?.value),
      };
    });

    return {
      ...result,
      data: {
        ...result.data,
        outputs: normalizedOutputs,
        raw: cloneDeepValue(result.data.raw ?? null),
      },
    };
  }

  /**
   * 获取可用变量树
   */
  function getAvailableVariables(nodeId: string): VariableTreeNode[] {
    const { tree } = buildVariableContext(nodeId, nodes.value, edges.value);
    return tree;
  }

  /**
   * 执行节点
   */
  async function executeNode(nodeId: string) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node) return;

    // 1. 收集输入数据
    const inputs = collectNodeInputs(nodeId);

    // 2. 获取节点类型
    const nodeType = node.id.split("_")[0] || ""; // 从节点 ID 中提取类型
    const nodeClass = getNodeByType(nodeType);

    if (!nodeClass) {
      console.error(`未找到节点类型: ${nodeType}`);
      updateNodeResult(nodeId, {
        duration: 0,
        data: {
          outputs: {},
          raw: null,
          summary: `未找到节点类型: ${nodeType}`,
        },
        status: "error",
        error: `未找到节点类型: ${nodeType}`,
        timestamp: Date.now(),
      });
      return;
    }

    // 3. 执行节点逻辑
    try {
      const rawConfig = node.data?.config || {};
      const inputDefs = node.data?.inputs || [];

      const variableContext = buildVariableContext(
        nodeId,
        nodes.value,
        edges.value
      );

      const resolvedConfig = resolveConfigWithVariables(
        rawConfig,
        inputDefs,
        variableContext.map
      );

      const result = await nodeClass.run(resolvedConfig, inputs, mcpClient);

      // 4. 保存结果
      updateNodeResult(nodeId, result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      updateNodeResult(nodeId, {
        duration: 0,
        data: {
          outputs: {},
          raw: null,
          summary: errorMessage,
        },
        status: "error",
        error: errorMessage,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 清空画布
   */
  function clearCanvas() {
    nodes.value = [];
    edges.value = [];
    refreshNodeLayerClasses();
    refreshEdgeLayerClasses();
    selectNode(null);
    // 清空画布后清空历史记录
    clearHistory();
    schedulePersist(true);
  }

  /**
   * 批量操作：暂停历史记录
   * 用于批量操作，避免记录中间状态
   */
  function batchStart() {
    isApplyingHistory = true;
  }

  /**
   * 批量操作：恢复历史记录并记录最终状态
   */
  function batchEnd() {
    isApplyingHistory = false;
    recordHistory();
  }

  /**
   * 获取历史记录详情（用于调试）
   */
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

  return {
    // 状态
    nodes,
    edges,
    selectedNodeId,
    selectedNode,
    isNodeEditorVisible,
    renamingNodeId,

    // 历史记录
    initializeHistory,
    canUndo,
    canRedo,
    undo,
    redo,
    batchStart,
    batchEnd,
    historyRecords, // 暴露历史记录供调试
    getHistoryDebugInfo,

    // 操作
    createNodeByType,
    removeNode,
    handleNodeDrag,
    handleNodeDragStop,
    updateNodePosition,
    autoLayout,
    updateNodeDimensions,
    addEdge,
    removeEdge,
    updateNodeData,
    updateNodeConfig,
    syncIfNodePorts,
    updateNodeResult,
    toggleResultExpanded,
    setContainerHighlight,
    beginNodeDetachFromContainer,
    finalizeNodeDetachFromContainer,
    moveNodeIntoContainer,
    clearClipboard,
    copyNodesToClipboard,
    hasClipboardData,
    pasteClipboardNodes,
    selectNode,
    openNodeEditor,
    closeNodeEditor,
    startRenamingNode,
    stopRenamingNode,
    renameNode,
    validateConnection,
    collectNodeInputs,
    getAvailableVariables,
    executeNode,
    clearCanvas,
  };
});
