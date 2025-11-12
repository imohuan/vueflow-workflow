/**
 * 多选插件
 * 支持按住 Shift 键进行多选节点
 * 参考 NodeEditor.vue 的实现方式
 */

import type { VueFlowPlugin, PluginContext } from "./types";
import { watch } from "vue";
import { useMagicKeys } from "@vueuse/core";

/**
 * 创建多选插件
 */
export function createMultiSelectPlugin(): VueFlowPlugin {
  // 存储清理函数
  let stopWatch: (() => void) | null = null;
  let stopNodesWatch: (() => void) | null = null;
  let stopCtrlAWatch: (() => void) | null = null;

  return {
    config: {
      id: "multi-select",
      name: "多选",
      description: "支持按住 Shift 键进行多选节点",
      enabled: true,
      version: "1.0.0",
    },

    shortcuts: [
      {
        key: "shift+click",
        description: "按住 Shift 键点击节点进行多选",
        handler: () => {
          // 这个是描述性的，实际逻辑在 setup 中
        },
      },
      {
        key: "ctrl+a",
        description: "全选所有节点",
        handler: () => {
          // 这个是描述性的，实际逻辑在 setup 中
        },
      },
    ],

    setup(context: PluginContext) {
      // 使用 useMagicKeys 监听 Shift 键（与 NodeEditor.vue 一致）
      const keys = useMagicKeys();
      const shiftKey = keys.Shift as any;
      const ctrlAKey = keys['ctrl+a'] as any;

      // 获取 VueFlow 的 multiSelectionActive 状态
      const { multiSelectionActive, nodesSelectionActive, getSelectedNodes, getNodes, setNodes } =
        context.vueflow;

      // 同步 Shift 键状态到 VueFlow 的 multiSelectionActive
      // Shift 用于多选（可以切换选择状态）
      stopWatch = watch(shiftKey, (pressed) => {
        if (multiSelectionActive) {
          multiSelectionActive.value = Boolean(pressed);
          console.log(
            `[MultiSelect Plugin] Shift ${pressed ? "按下" : "释放"}，多选模式${
              pressed ? "激活" : "关闭"
            }`
          );
        }
      });

      // 监听 Ctrl+A 组合键，实现全选功能
      stopCtrlAWatch = watch(ctrlAKey, (pressed) => {
        if (pressed) {
          // 获取所有节点并设置为选中状态
          const allNodes = getNodes?.value ?? [];
          if (allNodes.length > 0) {
            const updatedNodes = allNodes.map(node => ({
              ...node,
              selected: true
            }));
            setNodes?.(updatedNodes);
            
            // 启用多选模式和节点选择激活状态
            if (multiSelectionActive) {
              multiSelectionActive.value = true;
            }
            if (nodesSelectionActive) {
              nodesSelectionActive.value = allNodes.length > 1;
            }
            
            console.log(`[MultiSelect Plugin] Ctrl+A 按下，已选中所有 ${allNodes.length} 个节点`);
          }
        }
      });

      // 监听选中节点变化，自动启用 nodesSelectionActive（显示蓝色背景）
      // 只监听长度变化，避免 deep watch
      stopNodesWatch = watch(
        () => (getSelectedNodes?.value ?? []).length,
        (selectedCount) => {
          if (nodesSelectionActive) {
            // 当有多个节点选中时，启用 nodesSelectionActive（用于显示蓝色背景）
            nodesSelectionActive.value = selectedCount > 1;
          }
        }
      );

      console.log("[MultiSelect Plugin] 多选插件已启用");
      console.log(
        "[MultiSelect Plugin] 使用方式: 按住 Shift 键点击节点进行多选/取消选中，按 Ctrl+A 全选所有节点"
      );
    },

    cleanup() {
      // 清理所有监听器
      stopWatch?.();
      stopNodesWatch?.();
      stopCtrlAWatch?.();

      stopWatch = null;
      stopNodesWatch = null;
      stopCtrlAWatch = null;

      console.log("[MultiSelect Plugin] 多选插件已清理");
    },
  };
}
