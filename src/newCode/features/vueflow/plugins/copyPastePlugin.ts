/**
 * 复制粘贴插件
 * 支持节点的复制、剪切、粘贴操作
 */

import type { Node } from "@vue-flow/core";
import type { VueFlowPlugin, PluginContext } from "./types";

/**
 * 剪贴板数据
 */
interface ClipboardData {
  nodes: Node[];
  timestamp: number;
}

/**
 * 创建复制粘贴插件
 */
export function createCopyPastePlugin(): VueFlowPlugin {
  let clipboard: ClipboardData | null = null;
  let selectedNodes: Node[] = [];

  /**
   * 复制选中的节点
   */
  function copyNodes() {
    if (selectedNodes.length === 0) {
      console.log("[CopyPaste Plugin] 没有选中的节点");
      return;
    }

    clipboard = {
      nodes: JSON.parse(JSON.stringify(selectedNodes)),
      timestamp: Date.now(),
    };

    console.log(`[CopyPaste Plugin] 已复制 ${selectedNodes.length} 个节点`);
  }

  /**
   * 粘贴节点
   */
  function pasteNodes(context: PluginContext) {
    if (!clipboard || clipboard.nodes.length === 0) {
      console.log("[CopyPaste Plugin] 剪贴板为空");
      return;
    }

    const offset = 50; // 粘贴偏移量
    const pastedNodes: Node[] = [];

    clipboard.nodes.forEach((node) => {
      const newNode: Node = {
        ...node,
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        position: {
          x: node.position.x + offset,
          y: node.position.y + offset,
        },
      };

      context.addNode(newNode);
      pastedNodes.push(newNode);
    });

    console.log(`[CopyPaste Plugin] 已粘贴 ${pastedNodes.length} 个节点`);
  }

  /**
   * 剪切选中的节点
   */
  function cutNodes(context: PluginContext) {
    if (selectedNodes.length === 0) {
      console.log("[CopyPaste Plugin] 没有选中的节点");
      return;
    }

    // 先复制
    copyNodes();

    // 再删除
    selectedNodes.forEach((node) => {
      context.deleteNode(node.id);
    });

    selectedNodes = [];
    console.log("[CopyPaste Plugin] 已剪切节点");
  }

  /**
   * 监听节点选中状态
   */
  function updateSelectedNodes(context: PluginContext) {
    selectedNodes = context.nodes.filter((node) => (node as any).selected);
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
        handler: () => copyNodes(),
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
      // 监听节点选中事件
      if (context.events) {
        context.events.on("node:selected", () => {
          updateSelectedNodes(context);
        });

        context.events.on("node:deselected", () => {
          updateSelectedNodes(context);
        });
      }

      console.log("[CopyPaste Plugin] 复制粘贴插件已启用");
      console.log(
        "[CopyPaste Plugin] 快捷键: Ctrl+C (复制), Ctrl+V (粘贴), Ctrl+X (剪切)"
      );
    },

    cleanup() {
      clipboard = null;
      selectedNodes = [];
      console.log("[CopyPaste Plugin] 复制粘贴插件已清理");
    },
  };
}
