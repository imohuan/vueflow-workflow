/**
 * 复制粘贴插件
 * 支持节点的复制、剪切、粘贴操作
 */

import type { Edge, GraphNode, Node, XYPosition } from "@vue-flow/core";
import type { PluginContext, VueFlowPlugin } from "./types";
import type { ComputedRef } from "vue";
import { nextTick } from "vue";
import { generateUniqueLabel } from "../utils/labelUtils";
import { onKeyStroke } from "@vueuse/core";

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

interface CopyPastePluginOptions {
  enableShortcut: ComputedRef<boolean>;
}

/**
 * 创建复制粘贴插件
 */
export function createCopyPastePlugin(
  options: CopyPastePluginOptions
): VueFlowPlugin {
  let clipboard: ClipboardData | null = null;
  let pasteOffset = 0; // 粘贴偏移量，每次粘贴递增

  // 保存清理函数
  const cleanupFns: Array<() => void> = [];

  const CLIPBOARD_TEXT_PREFIX = "VUEFLOW_CLIPBOARD::";
  const LOCAL_STORAGE_KEY = "vueflow-clipboard";

  function writeLocalClipboard(data: ClipboardData) {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        CLIPBOARD_TEXT_PREFIX + JSON.stringify(data)
      );
    } catch {}
  }

  function readLocalClipboard(): ClipboardData | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw || !raw.startsWith(CLIPBOARD_TEXT_PREFIX)) return null;
      const json = raw.slice(CLIPBOARD_TEXT_PREFIX.length);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  async function writeSystemClipboard(data: ClipboardData) {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(
          CLIPBOARD_TEXT_PREFIX + JSON.stringify(data)
        );
      }
    } catch {}
  }

  async function readSystemClipboard(): Promise<ClipboardData | null> {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.startsWith(CLIPBOARD_TEXT_PREFIX)) {
          const json = text.slice(CLIPBOARD_TEXT_PREFIX.length);
          return JSON.parse(json);
        }
      }
    } catch {}
    return null;
  }

  /**
   * 获取节点的绝对坐标
   */
  function getAbsolutePosition(node: Partial<Node>): XYPosition {
    const computed = (node as any)?.computedPosition;
    if (
      computed &&
      typeof computed.x === "number" &&
      typeof computed.y === "number"
    ) {
      return { x: computed.x, y: computed.y };
    }

    const position = node.position;
    return {
      x: position?.x ?? 0,
      y: position?.y ?? 0,
    };
  }

  /**
   * 计算节点的中心点（基于绝对坐标）
   */
  function calculateCenter(nodes: Node[]): { x: number; y: number } {
    if (nodes.length === 0) return { x: 0, y: 0 };

    const sum = nodes.reduce(
      (acc, node) => {
        const abs = getAbsolutePosition(node);
        return {
          x: acc.x + abs.x,
          y: acc.y + abs.y,
        };
      },
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

    writeLocalClipboard(clipboard);
    writeSystemClipboard(clipboard).catch(() => {});

    console.log(
      `[CopyPaste Plugin] 已复制 ${selectedNodes.length} 个节点和 ${relatedEdges.length} 条连接线`
    );
  }

  /**
   * 粘贴节点
   */
  async function pasteNodes(context: PluginContext) {
    const proceed = (clip: ClipboardData) => {
      // 获取当前鼠标位置并转换为画布坐标
      let pastePosition = { x: 0, y: 0 };

      // 获取相对于画布容器的鼠标位置
      const getMousePosition = context.getMousePosition;
      if (getMousePosition && context.vueflow.project) {
        // 获取相对于容器的鼠标位置
        const relativeMousePos = getMousePosition();
        // 使用 vueflow 的 project 方法将容器坐标转换为画布坐标
        pastePosition = context.vueflow.project({
          x: relativeMousePos.x,
          y: relativeMousePos.y,
        });
      } else {
        // 如果无法获取鼠标位置，使用递增偏移作为备选方案
        pasteOffset += 30;
        pastePosition = { x: pasteOffset, y: pasteOffset };
      }

      // 计算粘贴节点相对于原始中心点的偏移
      const offsetX = pastePosition.x - clip.center.x;
      const offsetY = pastePosition.y - clip.center.y;

      const pastedNodeIds: string[] = [];
      const nodeIdMap = new Map<string, string>();
      const existingNodesMap = new Map(
        (context.core.nodes.value as Node[]).map((node) => [node.id, node])
      );

      const absolutePositions = new Map<string, XYPosition>();
      clip.nodes.forEach((node) => {
        absolutePositions.set(node.id, getAbsolutePosition(node));
        const newId = `node-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        nodeIdMap.set(node.id, newId);
      });

      const newAbsolutePositions = new Map<string, XYPosition>();
      clip.nodes.forEach((node) => {
        const originalAbs = absolutePositions.get(node.id) ?? { x: 0, y: 0 };
        newAbsolutePositions.set(node.id, {
          x: originalAbs.x + offsetX,
          y: originalAbs.y + offsetY,
        });
      });

      clip.nodes.forEach((node) => {
        const newId = nodeIdMap.get(node.id)!;
        const parentOldId = (node as any).parentNode as string | undefined;
        const parentNewId = parentOldId
          ? nodeIdMap.get(parentOldId)
          : undefined;
        let finalParentId = parentNewId ?? parentOldId;

        const newAbs = newAbsolutePositions.get(node.id) ?? { x: 0, y: 0 };
        let relativePosition = { ...newAbs };

        if (finalParentId) {
          let parentAbs: XYPosition | undefined;

          if (parentNewId && parentOldId) {
            parentAbs = newAbsolutePositions.get(parentOldId);
          } else if (parentOldId) {
            const parentNode = existingNodesMap.get(parentOldId);
            if (parentNode) {
              parentAbs = getAbsolutePosition(parentNode);
            }
          }

          if (parentAbs) {
            relativePosition = {
              x: newAbs.x - parentAbs.x,
              y: newAbs.y - parentAbs.y,
            };
          } else {
            finalParentId = undefined;
          }
        }

        const baseLabel = node.data?.label || "节点";
        const uniqueLabel = generateUniqueLabel(
          baseLabel,
          context.core.nodes.value
        );

        const newNode: Node = {
          ...node,
          id: newId,
          parentNode: finalParentId,
          position: {
            x: relativePosition.x,
            y: relativePosition.y,
          },
          data: {
            ...node.data,
            label: uniqueLabel,
          },
        } as Node;

        context.core.addNode(newNode);
        pastedNodeIds.push(newId);
      });

      const pastedEdgeIds: string[] = [];
      clip.edges.forEach((edge: any) => {
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

      const { removeSelectedElements, addSelectedNodes, nodesSelectionActive } =
        context.vueflow;

      removeSelectedElements?.();

      nextTick(() => {
        const nodesToSelect = context.core.nodes.value.filter((node) =>
          pastedNodeIds.includes(node.id)
        ) as GraphNode[];

        if (nodesToSelect.length > 0) {
          addSelectedNodes?.(nodesToSelect);

          if (nodesToSelect.length > 1 && nodesSelectionActive) {
            nodesSelectionActive.value = true;
          }
        }
      });

      console.log(
        `[CopyPaste Plugin] 已粘贴 ${pastedNodeIds.length} 个节点和 ${
          pastedEdgeIds.length
        } 条连接线 (位置: ${pastePosition.x.toFixed(
          0
        )}, ${pastePosition.y.toFixed(0)})`
      );
    };

    /**
     * 粘贴优先级：
     * 1. 系统剪贴板（navigator.clipboard）
     * 2. 本地存储（localStorage）
     * 3. 内存中的 clipboard 变量
     */

    let data: ClipboardData | null = null;

    // 1. 优先尝试读取系统剪贴板
    const fromSys = await readSystemClipboard();
    if (fromSys && fromSys.nodes && fromSys.nodes.length) {
      data = fromSys;
      clipboard = fromSys;
    }

    // 2. 如果系统剪贴板没有有效数据，再尝试本地存储
    if (!data || !data.nodes.length) {
      const fromLocal = readLocalClipboard();
      if (fromLocal && fromLocal.nodes && fromLocal.nodes.length) {
        data = fromLocal;
        clipboard = fromLocal;
      }
    }

    // 3. 最后使用内存中的 clipboard 变量
    if (!data || !data.nodes.length) {
      if (clipboard && clipboard.nodes && clipboard.nodes.length) {
        data = clipboard;
      }
    }

    if (!data || !data.nodes.length) {
      console.log("[CopyPaste Plugin] 剪贴板为空");
      return;
    }

    proceed(data);
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
      const { enableShortcut } = options;

      // 注册快捷键（自动清理）
      // Ctrl+C / Cmd+C - 复制
      cleanupFns.push(
        onKeyStroke(
          "c",
          (e) => {
            if (enableShortcut.value && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              copyNodes(context);
            }
          },
          { dedupe: false }
        )
      );

      // Ctrl+V / Cmd+V - 粘贴
      cleanupFns.push(
        onKeyStroke(
          "v",
          (e) => {
            if (enableShortcut.value && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              pasteNodes(context);
            }
          },
          { dedupe: false }
        )
      );

      // Ctrl+X / Cmd+X - 剪切
      cleanupFns.push(
        onKeyStroke(
          "x",
          (e) => {
            if (enableShortcut.value && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              cutNodes(context);
            }
          },
          { dedupe: false }
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
