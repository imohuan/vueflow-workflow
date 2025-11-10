/**
 * 变量上下文 Composable
 * 统一管理和缓存变量上下文，避免重复计算
 */

import { computed, type ComputedRef } from "vue";
import { storeToRefs } from "pinia";
import { useUiStore } from "../stores/ui";
import { useCanvasStore } from "../stores/canvas";
import { useWorkflowStore } from "../stores/workflow";
import {
  extractAvailableVariables,
  type VariableTreeNode,
  type VariableContextResult,
} from "../features/canvas/utils/variableResolver";

interface UseVariableContextReturn {
  /** 当前选中节点的变量上下文（包含 tree 和 contextMap） */
  variableContext: ComputedRef<VariableContextResult | null>;
  /** 当前选中节点的变量树 */
  variableTree: ComputedRef<VariableTreeNode[]>;
  /** 当前选中节点的变量上下文映射 */
  contextMap: ComputedRef<Map<string, unknown>>;
}

/**
 * 使用变量上下文
 *
 * 这个 composable 会自动监听：
 * - 当前选中的节点 ID
 * - 工作流的节点和边
 * - 全局变量
 *
 * 并缓存计算结果，避免重复计算
 */
export function useVariableContext(): UseVariableContextReturn {
  const uiStore = useUiStore();
  const canvasStore = useCanvasStore();
  const workflowStore = useWorkflowStore();

  const { selectedNodeId } = storeToRefs(uiStore);

  // 统一的变量上下文计算
  const variableContext = computed<VariableContextResult | null>(() => {
    if (!selectedNodeId.value) {
      return null;
    }

    try {
      const nodes = (canvasStore.nodes || []) as any[];
      const edges = (canvasStore.edges || []) as any[];
      const globalVars = workflowStore.getGlobalVariableJson();

      console.log("[useVariableContext] 提取变量", nodes, edges);

      return extractAvailableVariables(
        selectedNodeId.value,
        nodes,
        edges,
        globalVars
      );
    } catch (error) {
      console.error("[useVariableContext] 提取变量上下文失败:", error);
      return null;
    }
  });

  // 变量树（从 variableContext 中提取）
  const variableTree = computed<VariableTreeNode[]>(() => {
    return variableContext.value?.tree || [];
  });

  // 上下文映射（从 variableContext 中提取）
  const contextMap = computed<Map<string, unknown>>(() => {
    return variableContext.value?.map || new Map();
  });

  return {
    variableContext,
    variableTree,
    contextMap,
  };
}
