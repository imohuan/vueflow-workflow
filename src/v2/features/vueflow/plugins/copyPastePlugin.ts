/**
 * 复制粘贴插件
 * 支持节点的复制、剪切、粘贴操作
 */

import type { Edge, GraphNode, Node } from "@vue-flow/core";
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

    writeLocalClipboard(clipboard);
    writeSystemClipboard(clipboard).catch(() => {});

    console.log(
      `[CopyPaste Plugin] 已复制 ${selectedNodes.length} 个节点和 ${relatedEdges.length} 条连接线`
    );
  }

  /**
   * 粘贴节点
   */
  function pasteNodes(context: PluginContext) {
    const proceed = (clip: ClipboardData) => {
      pasteOffset += 30;
      const baseOffset = pasteOffset;

      const pastedNodeIds: string[] = [];
      const nodeIdMap = new Map<string, string>();

      clip.nodes.forEach((node) => {
        const newId = `node-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        nodeIdMap.set(node.id, newId);

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
        `[CopyPaste Plugin] 已粘贴 ${pastedNodeIds.length} 个节点和 ${pastedEdgeIds.length} 条连接线 (偏移: ${baseOffset}px)`
      );
    };

    let data = clipboard;
    if (!data || data.nodes.length === 0) {
      const fromLocal = readLocalClipboard();
      if (fromLocal && fromLocal.nodes && fromLocal.nodes.length) {
        data = fromLocal;
      }
    }

    if (!data || data.nodes.length === 0) {
      readSystemClipboard()
        .then((fromSys) => {
          if (fromSys && fromSys.nodes && fromSys.nodes.length) {
            clipboard = fromSys;
            proceed(fromSys);
          } else {
            console.log("[CopyPaste Plugin] 剪贴板为空");
          }
        })
        .catch(() => {
          console.log("[CopyPaste Plugin] 剪贴板为空");
        });
      return;
    }

    clipboard = data;
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
