/**
 * 节点管理 Hook
 * 负责节点的创建、删除、更新和配置
 */
import type { Ref } from "vue";
import type { Node, Edge } from "@vue-flow/core";
import type { NodeData, NodeResult } from "@/typings/nodeEditor";
import { useNodeRegistry } from "@/composables/useNodeRegistry";
import { IfNode } from "workflow-node-executor";
import type { IfConfig } from "@/workflow/nodes";
import {
  CONTAINER_DEFAULT_WIDTH,
  CONTAINER_DEFAULT_HEIGHT,
  CONTAINER_HEADER_HEIGHT,
  clonePadding,
  notifyContainerInternals,
} from "./utils";
import { DEFAULT_CONTAINER_PADDING } from "./utils";

export function useNodeManagement(
  nodes: Ref<Node<NodeData>[]>,
  edges: Ref<Edge[]>,
  applyNodeLayerClass: (node: Node<NodeData>) => void,
  refreshEdgeLayerClasses: () => void,
  layoutContainerChildren: (containerId: string) => void,
  onBatchStart: () => void,
  onBatchEnd: () => void,
  onRecordHistoryDebounced: () => void,
  onSchedulePersist: (immediate?: boolean) => void,
  onSelectNode: (nodeId: string | null) => void,
  onStopRenaming: () => void
) {
  const nodeRegistry = useNodeRegistry();

  /** 生成唯一节点名称 */
  function generateUniqueName(baseName: string): string {
    const existingNames = new Set(
      nodes.value
        .map((n) => n.data?.label)
        .filter((label): label is string => Boolean(label))
    );

    if (!existingNames.has(baseName)) {
      return baseName;
    }

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

    return maxNumber === 0 ? `${baseName} 1` : `${baseName} ${maxNumber + 1}`;
  }

  /** 通过节点类型创建节点 */
  function createNodeByType(
    nodeType: string,
    position: { x: number; y: number },
    options: { parentNodeId?: string } = {}
  ): string | null {
    const metadata = nodeRegistry.getNodeMetadata(nodeType);

    if (!metadata) {
      console.error(
        `无法创建节点数据: ${nodeType}，请确保 Worker 已加载节点元数据`
      );
      return null;
    }

    const id = `${nodeType}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    let label = metadata.label;
    if (label) {
      label = generateUniqueName(label);
    }

    const node: Node<NodeData> = {
      id,
      type: "custom",
      position: { ...position },
      data: {
        config: { ...metadata.defaultConfig },
        inputs: metadata.inputs,
        outputs: metadata.outputs,
        label,
        category: metadata.category,
        variant: nodeType,
      },
    };

    if (options.parentNodeId) {
      node.parentNode = options.parentNodeId;
    }

    applyNodeLayerClass(node);

    onBatchStart();
    nodes.value.push(node);

    if (options.parentNodeId) {
      layoutContainerChildren(options.parentNodeId);
      refreshEdgeLayerClasses();
    }

    // For 节点特殊处理：创建循环容器
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
        updatable: false,
      });

      layoutContainerChildren(containerId);
    }

    onBatchEnd();
    return id;
  }

  /** 删除容器及其子节点 */
  function removeContainerWithChildren(containerId: string) {
    const childIds = nodes.value
      .filter((node) => node.parentNode === containerId)
      .map((node) => node.id);

    const idsToRemove = new Set<string>([containerId, ...childIds]);
    removeNodesAndEdges(idsToRemove);
  }

  /** 删除节点和边 */
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

    refreshEdgeLayerClasses();

    // 检查选中节点和重命名节点是否被删除
    // 这些由调用者处理

    affectedContainers.forEach((containerId) => {
      if (nodes.value.some((node) => node.id === containerId)) {
        layoutContainerChildren(containerId);
      }
    });
  }

  /** 删除节点 */
  function removeNode(
    nodeId: string,
    selectedNodeId: Ref<string | null>,
    renamingNodeId: Ref<string | null>
  ) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node) return;

    onBatchStart();

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

    // 清理选中状态
    if (selectedNodeId.value && selectedNodeId.value === nodeId) {
      onSelectNode(null);
    }

    // 清理重命名状态
    if (renamingNodeId.value && renamingNodeId.value === nodeId) {
      onStopRenaming();
    }

    onBatchEnd();
  }

  /** 更新节点数据 */
  function updateNodeData(nodeId: string, data: Partial<NodeData>) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node && node.data) {
      node.data = { ...node.data, ...data };
      onRecordHistoryDebounced();
    }
  }

  /** 更新节点配置 */
  function updateNodeConfig(nodeId: string, config: Record<string, any>) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node?.data) return;

    node.data.config = {
      ...node.data.config,
      ...config,
    };

    // 如果是 if 节点，同步端口
    const nodeType = node.id.split("_")[0];
    if (nodeType === "if") {
      syncIfNodePorts(nodeId, { recordHistory: false });
    }

    onRecordHistoryDebounced();
  }

  /** 同步 If 节点端口 */
  function syncIfNodePorts(
    nodeId: string,
    options: { recordHistory?: boolean } = {}
  ) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node?.data) return;

    // 创建 IfNode 实例用于获取端口配置（仅用于元数据生成）
    const ifNodeInstance = new IfNode();

    const rawConfig = (node.data.config || {}) as Partial<IfConfig>;
    const conditions = Array.isArray(rawConfig.conditions)
      ? rawConfig.conditions
      : [];

    const nextOutputs = ifNodeInstance.getOutputsForConfig({
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
      onRecordHistoryDebounced();
    }
  }

  /** 更新节点执行结果 */
  function updateNodeResult(nodeId: string, result: NodeResult) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node && node.data) {
      node.data.result = result;
      onSchedulePersist();
    }
  }

  /** 切换结果展开状态 */
  function toggleResultExpanded(nodeId: string) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node && node.data) {
      node.data.resultExpanded = !node.data.resultExpanded;
      onSchedulePersist();
    }
  }

  /** 更新节点尺寸 */
  function updateNodeDimensions(
    nodeId: string,
    dimensions: { width: number; height: number },
    skipDimensionUpdate: Set<string>
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
      // 用不到，这里的节点高度直接根据子节点的高自适应即可（NodeWrapper）这里的高度是设置到 NodeWraper的父节点的，是VueFlow的配置参数
      // width: `${width}px`,
      // height: `${height}px`,

      width: `${width}px`,
      height: "auto",
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

    onRecordHistoryDebounced();
  }

  return {
    createNodeByType,
    removeNode,
    removeNodesAndEdges,
    updateNodeData,
    updateNodeConfig,
    syncIfNodePorts,
    updateNodeResult,
    toggleResultExpanded,
    updateNodeDimensions,
    generateUniqueName,
  };
}
