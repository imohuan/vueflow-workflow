/**
 * 删除插件 (支持delete 键默认是 backspace键)
 * 支持删除选中的节点和边
 */

import type { Edge, Node } from "@vue-flow/core";
import type { VueFlowPlugin, PluginContext } from "./types";
import { computed } from "vue";
import { onKeyStroke, useActiveElement } from "@vueuse/core";

/**
 * 创建删除插件
 */
export function createDeletePlugin(): VueFlowPlugin {
  // 保存清理函数
  const cleanupFns: Array<() => void> = [];

  /**
   * 删除选中的节点和边
   */
  function deleteSelected(context: PluginContext) {
    const selectedNodes = (context.vueflow.getSelectedNodes?.value ??
      []) as Node[];
    const selectedEdges = (context.vueflow.getSelectedEdges?.value ??
      []) as Edge[];

    let deletedCount = 0;

    // 删除选中的节点
    if (selectedNodes.length > 0) {
      selectedNodes.forEach((node) => {
        context.core.deleteNode(node.id);
      });
      deletedCount += selectedNodes.length;
      console.log(`[Delete Plugin] 已删除 ${selectedNodes.length} 个节点`);
    }

    // 删除选中的边
    if (selectedEdges.length > 0) {
      selectedEdges.forEach((edge) => {
        context.core.deleteEdge(edge.id);
      });
      deletedCount += selectedEdges.length;
      console.log(`[Delete Plugin] 已删除 ${selectedEdges.length} 条边`);
    }

    if (deletedCount === 0) {
      console.log("[Delete Plugin] 没有选中的节点或边");
    }
  }

  return {
    config: {
      id: "delete",
      name: "删除",
      description: "支持删除选中的节点和边",
      enabled: true,
      version: "1.0.0",
    },

    shortcuts: [
      {
        key: "delete",
        description: "删除选中的节点和边",
        handler: (context) => deleteSelected(context),
      },
      {
        key: "backspace",
        description: "删除选中的节点和边",
        handler: (context) => deleteSelected(context),
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

      // Delete / Backspace - 删除选中的节点和边
      cleanupFns.push(
        onKeyStroke(
          ["Delete", "Backspace"],
          (e) => {
            if (notUsingInput.value) {
              const selectedNodes = (context.vueflow.getSelectedNodes?.value ??
                []) as Node[];
              const selectedEdges = (context.vueflow.getSelectedEdges?.value ??
                []) as Edge[];

              // 只有在有选中节点或边时才处理
              if (selectedNodes.length > 0 || selectedEdges.length > 0) {
                e.preventDefault();
                deleteSelected(context);
              }
            }
          },
          { dedupe: true }
        )
      );

      console.log("[Delete Plugin] 删除插件已启用");
      console.log(
        "[Delete Plugin] 快捷键: Delete / Backspace (删除选中的节点和边)"
      );
    },

    cleanup() {
      // 清理所有事件监听器
      cleanupFns.forEach((fn) => fn());
      cleanupFns.length = 0;
      console.log("[Delete Plugin] 删除插件已禁用");
    },
  };
}
