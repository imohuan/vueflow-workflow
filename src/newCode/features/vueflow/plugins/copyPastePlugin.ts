/**
 * 复制粘贴插件
 * 支持节点的复制、剪切、粘贴操作
 */

import type { Node } from "@vue-flow/core";
import type { VueFlowPlugin, PluginContext } from "./types";
import { ref, watch, computed } from "vue";
import { onKeyStroke, useActiveElement } from "@vueuse/core";

/**
 * 剪贴板数据
 */
interface ClipboardData {
  nodes: Node[];
  timestamp: number;
  /** 复制时节点的中心点 */
  center: { x: number; y: number };
}

/**
 * 创建复制粘贴插件
 */
export function createCopyPastePlugin(): VueFlowPlugin {
  let clipboard: ClipboardData | null = null;
  const selectedNodes = ref<Node[]>([]);
  let pasteOffset = 0; // 粘贴偏移量，每次粘贴递增

  // 保存清理函数
  let stopWatcher: (() => void) | null = null;
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
  function copyNodes() {
    if (selectedNodes.value.length === 0) {
      console.log("[CopyPaste Plugin] 没有选中的节点");
      return;
    }

    // 计算选中节点的中心点
    const center = calculateCenter(selectedNodes.value);

    clipboard = {
      nodes: JSON.parse(JSON.stringify(selectedNodes.value)),
      timestamp: Date.now(),
      center,
    };

    // 重置粘贴偏移量
    pasteOffset = 0;

    console.log(
      `[CopyPaste Plugin] 已复制 ${selectedNodes.value.length} 个节点`
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

    const pastedNodes: Node[] = [];
    const nodeIdMap = new Map<string, string>(); // 旧 ID -> 新 ID 映射

    clipboard.nodes.forEach((node) => {
      const newId = `node-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      nodeIdMap.set(node.id, newId);

      const newNode: Node = {
        ...node,
        id: newId,
        position: {
          x: node.position.x + baseOffset,
          y: node.position.y + baseOffset,
        },
      } as Node;

      // 取消选中状态
      (newNode as any).selected = false;

      context.addNode(newNode);
      pastedNodes.push(newNode);
    });

    // 取消所有节点的选中状态
    context.nodes.forEach((node) => {
      (node as any).selected = false;
    });

    // 选中新粘贴的节点
    pastedNodes.forEach((node) => {
      (node as any).selected = true;
    });

    // 更新选中节点列表
    selectedNodes.value = pastedNodes;

    console.log(
      `[CopyPaste Plugin] 已粘贴 ${pastedNodes.length} 个节点 (偏移: ${baseOffset}px)`
    );
  }

  /**
   * 剪切选中的节点
   */
  function cutNodes(context: PluginContext) {
    if (selectedNodes.value.length === 0) {
      console.log("[CopyPaste Plugin] 没有选中的节点");
      return;
    }

    // 先复制
    copyNodes();

    // 再删除
    selectedNodes.value.forEach((node) => {
      context.deleteNode(node.id);
    });

    selectedNodes.value = [];
    console.log("[CopyPaste Plugin] 已剪切节点");
  }

  /**
   * 更新选中节点列表
   */
  function updateSelectedNodes(context: PluginContext) {
    selectedNodes.value = context.nodes.filter(
      (node) => (node as any).selected
    );
  }

  /**
   * 删除选中的节点
   */
  function deleteSelectedNodes(context: PluginContext) {
    if (selectedNodes.value.length > 0) {
      selectedNodes.value.forEach((node) => {
        context.deleteNode(node.id);
      });
      selectedNodes.value = [];
      console.log("[CopyPaste Plugin] 已删除选中的节点");
    }
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
              copyNodes();
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

      // Delete / Backspace - 删除
      cleanupFns.push(
        onKeyStroke(["Delete", "Backspace"], (e) => {
          if (notUsingInput.value && selectedNodes.value.length > 0) {
            e.preventDefault();
            deleteSelectedNodes(context);
          }
        })
      );

      // 监听 nodes 变化，更新选中节点
      stopWatcher = watch(
        () => context.nodes,
        () => {
          updateSelectedNodes(context);
        },
        { deep: true }
      );

      // 监听节点选中事件（如果事件系统可用）
      if (context.events) {
        context.events.on("node:clicked", () => {
          updateSelectedNodes(context);
        });

        context.events.on("canvas:clicked", () => {
          selectedNodes.value = [];
        });
      }

      console.log("[CopyPaste Plugin] 复制粘贴插件已启用");
      console.log(
        "[CopyPaste Plugin] 快捷键: Ctrl+C (复制), Ctrl+V (粘贴), Ctrl+X (剪切), Delete (删除)"
      );
    },

    cleanup() {
      // 清理所有快捷键监听器（onKeyStroke 返回的清理函数）
      cleanupFns.forEach((cleanup) => cleanup());
      cleanupFns.length = 0;

      // 停止 watcher
      if (stopWatcher) {
        stopWatcher();
        stopWatcher = null;
      }

      // 清理状态
      clipboard = null;
      selectedNodes.value = [];
      pasteOffset = 0;

      console.log("[CopyPaste Plugin] 复制粘贴插件已清理");
    },
  };
}
