/**
 * 节点选择和重命名 Hook
 * 负责管理节点选择状态、编辑器显示和节点重命名
 */
import { ref, computed, type Ref } from "vue";
import type { Node } from "@vue-flow/core";
import type { NodeData } from "@/typings/nodeEditor";

export function useNodeSelection(
  nodes: Ref<Node<NodeData>[]>,
  onRecordHistory: () => void,
  onSchedulePersist: () => void
) {
  const selectedNodeId = ref<string | null>(null);
  const renamingNodeId = ref<string | null>(null);
  const isNodeEditorVisible = ref(false);

  const selectedNode = computed(() =>
    nodes.value.find((n) => n.id === selectedNodeId.value)
  );

  /** 选中节点 */
  function selectNode(nodeId: string | null) {
    selectedNodeId.value = nodeId;
    if (nodeId === null) {
      isNodeEditorVisible.value = false;
    }
    if (renamingNodeId.value && renamingNodeId.value !== nodeId) {
      renamingNodeId.value = null;
    }
  }

  /** 打开节点编辑器 */
  function openNodeEditor(nodeId: string) {
    selectedNodeId.value = nodeId;
    isNodeEditorVisible.value = true;
  }

  /** 关闭节点编辑器 */
  function closeNodeEditor() {
    isNodeEditorVisible.value = false;
  }

  /** 开始重命名节点 */
  function startRenamingNode(nodeId: string) {
    if (!nodeId) return;
    if (!nodes.value.some((node) => node.id === nodeId)) {
      return;
    }

    selectedNodeId.value = nodeId;
    renamingNodeId.value = nodeId;
  }

  /** 停止重命名节点 */
  function stopRenamingNode() {
    if (renamingNodeId.value) {
      renamingNodeId.value = null;
    }
  }

  /** 重命名节点 */
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

    onRecordHistory();
    onSchedulePersist();
  }

  return {
    selectedNodeId,
    selectedNode,
    renamingNodeId,
    isNodeEditorVisible,
    selectNode,
    openNodeEditor,
    closeNodeEditor,
    startRenamingNode,
    stopRenamingNode,
    renameNode,
  };
}
