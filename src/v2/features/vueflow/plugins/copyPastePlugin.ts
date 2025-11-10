/**
 * 复制粘贴插件
 * 支持节点的复制、剪切、粘贴操作
 */

import type { Edge, GraphNode, Node } from "@vue-flow/core";
import type { PluginContext, VueFlowPlugin } from "./types";
import { nextTick, computed } from "vue";
import { generateUniqueLabel } from "../utils/labelUtils";
import { onKeyStroke, useActiveElement } from "@vueuse/core";

/**
 * 剪贴板数据
 */
interface ClipboardData {
  nodes: Node[];
  edges: Edge[]; // 节点之间的连接线
  timestamp: number;
  /** 复制时节点的中心点 */
  center: { x: number; y: number };
}

/**
 * 创建复制粘贴插件
 */
export function createCopyPastePlugin(): VueFlowPlugin {
  let clipboard: ClipboardData | null = null;
  let pasteOffset = 0; // 粘贴偏移量，每次粘贴递增

  // 保存清理函数
  const cleanupFns: Array<() => void> = [];

  /**
   * 计算节点的中心点
   */
  function calculateCenter(nodes: Node[]): { x: number; y: number } {
    if (nodes.length === 0) return { x: 0, y: 0 };

    const sum = nodes.reduce(
      (acc, node) => ({
        x: acc.x + node.position.x,
        y: acc.y + node.position.y,
      }),
      { x: 0, y: 0 }
    );

    return {
      x: sum.x / nodes.length,
      y: sum.y / nodes.length,
    };
  }

  /**
   * 复制选中的节点
   */
  function copyNodes(context: PluginContext) {
    const selectedNodes = (context.vueflow.getSelectedNodes?.value ??
      []) as Node[];

    if (selectedNodes.length === 0) {
      console.log("[CopyPaste Plugin] 没有选中的节点");
      return;
    }

    // 获取选中节点的 ID 集合
    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));

    // 获取选中节点之间的连接线
    const allEdges = context.core.edges.value || [];
    const relatedEdges = allEdges.filter(
      (edge: any) =>
        selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
    );

    // 计算选中节点的中心点
    const center = calculateCenter(selectedNodes);

    clipboard = {
      nodes: JSON.parse(JSON.stringify(selectedNodes)),
      edges: JSON.parse(JSON.stringify(relatedEdges)),
      timestamp: Date.now(),
      center,
    };

    // 重置粘贴偏移量
    pasteOffset = 0;

    console.log(
      `[CopyPaste Plugin] 已复制 ${selectedNodes.length} 个节点和 ${relatedEdges.length} 条连接线`
    );
  }

  /**
   * 粘贴节点
   */
  function pasteNodes(context: PluginContext) {
    if (!clipboard || clipboard.nodes.length === 0) {
      console.log("[CopyPaste Plugin] 剪贴板为空");
      return;
    }

    // 每次粘贴增加偏移量，避免完全重叠
    pasteOffset += 30;
    const baseOffset = pasteOffset;

    const pastedNodeIds: string[] = [];
    const nodeIdMap = new Map<string, string>(); // 旧 ID -> 新 ID 映射

    // 1. 粘贴节点
    clipboard.nodes.forEach((node) => {
      const newId = `node-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      nodeIdMap.set(node.id, newId);

      // 生成唯一标签
      const baseLabel = node.data?.label || "节点";
      const uniqueLabel = generateUniqueLabel(
        baseLabel,
        context.core.nodes.value
      );

      const newNode: Node = {
        ...node,
        id: newId,
        position: {
          x: node.position.x + baseOffset,
          y: node.position.y + baseOffset,
        },
        data: {
          ...node.data,
          label: uniqueLabel,
        },
      } as Node;

      context.core.addNode(newNode);
      pastedNodeIds.push(newId);
    });

    // 2. 粘贴连接线（更新 source 和 target 为新的节点 ID）
    const pastedEdgeIds: string[] = [];
    clipboard.edges.forEach((edge: any) => {
      const newEdgeId = `edge-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const newEdge = {
        ...edge,
        id: newEdgeId,
        source: nodeIdMap.get(edge.source) || edge.source,
        target: nodeIdMap.get(edge.target) || edge.target,
      };

      context.core.addEdge(newEdge);
      pastedEdgeIds.push(newEdgeId);
    });

    // 使用 VueFlow API 选中新粘贴的节点（带蓝色背景）
    const { removeSelectedElements, addSelectedNodes, nodesSelectionActive } =
      context.vueflow;

    // 先清空所有选中
    removeSelectedElements?.();

    // 等待下一帧再选中
    nextTick(() => {
      const nodesToSelect = context.core.nodes.value.filter((node) =>
        pastedNodeIds.includes(node.id)
      ) as GraphNode[];

      if (nodesToSelect.length > 0) {
        addSelectedNodes?.(nodesToSelect);

        // 多个节点选中时启用蓝色背景
        if (nodesToSelect.length > 1 && nodesSelectionActive) {
          nodesSelectionActive.value = true;
        }
      }
    });

    console.log(
      `[CopyPaste Plugin] 已粘贴 ${pastedNodeIds.length} 个节点和 ${pastedEdgeIds.length} 条连接线 (偏移: ${baseOffset}px)`
    );
  }

  /**
   * 剪切选中的节点
   */
  function cutNodes(context: PluginContext) {
    const selectedNodes = (context.vueflow.getSelectedNodes?.value ??
      []) as Node[];

    if (selectedNodes.length === 0) {
      console.log("[CopyPaste Plugin] 没有选中的节点");
      return;
    }

    // 先复制
    copyNodes(context);

    // 再删除
    selectedNodes.forEach((node) => {
      context.core.deleteNode(node.id);
    });

    console.log("[CopyPaste Plugin] 已剪切节点");
  }

  return {
    config: {
      id: "copy-paste",
      name: "复制粘贴",
      description: "支持节点的复制、剪切、粘贴操作",
      enabled: true,
      version: "1.0.0",
    },

    shortcuts: [
      {
        key: "ctrl+c",
        description: "复制选中的节点",
        handler: (context) => copyNodes(context),
      },
      {
        key: "ctrl+v",
        description: "粘贴节点",
        handler: (context) => pasteNodes(context),
      },
      {
        key: "ctrl+x",
        description: "剪切选中的节点",
        handler: (context) => cutNodes(context),
      },
    ],

    setup(context: PluginContext) {
      // 获取当前活动元素（用于判断是否在输入框中）
      const activeElement = useActiveElement();
      const notUsingInput = computed(
        () =>
          activeElement.value?.tagName !== "INPUT" &&
          activeElement.value?.tagName !== "TEXTAREA" &&
          !activeElement.value?.isContentEditable
      );

      // 注册快捷键（自动清理）
      // Ctrl+C / Cmd+C - 复制
      cleanupFns.push(
        onKeyStroke(
          "c",
          (e) => {
            if (notUsingInput.value && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              copyNodes(context);
            }
          },
          { dedupe: true }
        )
      );

      // Ctrl+V / Cmd+V - 粘贴
      cleanupFns.push(
        onKeyStroke(
          "v",
          (e) => {
            if (notUsingInput.value && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              pasteNodes(context);
            }
          },
          { dedupe: true }
        )
      );

      // Ctrl+X / Cmd+X - 剪切
      cleanupFns.push(
        onKeyStroke(
          "x",
          (e) => {
            if (notUsingInput.value && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              cutNodes(context);
            }
          },
          { dedupe: true }
        )
      );

      console.log("[CopyPaste Plugin] 复制粘贴插件已启用");
      console.log(
        "[CopyPaste Plugin] 快捷键: Ctrl+C (复制), Ctrl+V (粘贴), Ctrl+X (剪切)"
      );
    },

    cleanup() {
      // 清理所有快捷键监听器（onKeyStroke 返回的清理函数）
      cleanupFns.forEach((cleanup) => cleanup());
      cleanupFns.length = 0;

      // 清理状态
      clipboard = null;
      pasteOffset = 0;

      console.log("[CopyPaste Plugin] 复制粘贴插件已清理");
    },
  };
}
