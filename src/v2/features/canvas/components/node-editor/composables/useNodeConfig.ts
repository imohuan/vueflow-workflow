/**
 * 节点配置管理 Composable
 */
import { ref, computed, watch } from "vue";
import type { Node } from "@vue-flow/core";
import { useVueFlow } from "@vue-flow/core";
import { useMessage } from "naive-ui";
import { useUiStore } from "@/v2/stores/ui";
import type { NodeConfigData } from "../types";

export function useNodeConfig() {
  const uiStore = useUiStore();
  const message = useMessage();
  const { findNode, updateNode, removeNodes } = useVueFlow();

  /** 当前选中的节点 */
  const selectedNode = computed<Node | undefined>(() => {
    if (!uiStore.selectedNodeId) return undefined;
    return findNode(uiStore.selectedNodeId);
  });

  /** 节点颜色 */
  const nodeColor = computed(() => {
    return selectedNode.value?.data?.color || "#3b82f6";
  });

  /** 节点配置表单数据 */
  const nodeConfig = ref<NodeConfigData>({
    label: "",
    description: "",
    color: "#3b82f6",
    noInputs: false,
    noOutputs: false,
    params: {},
  });

  /**
   * 监听选中节点变化，更新配置表单
   */
  watch(
    selectedNode,
    (node) => {
      if (node) {
        nodeConfig.value = {
          label: node.data.label || "",
          description: node.data.description || "",
          color: node.data.color || "#3b82f6",
          noInputs: node.data.noInputs || false,
          noOutputs: node.data.noOutputs || false,
          params: node.data.params || {},
        };
      }
    },
    { immediate: true }
  );

  /**
   * 处理配置变更
   */
  function handleConfigChange() {
    if (selectedNode.value) {
      updateNode(selectedNode.value.id, {
        data: {
          ...selectedNode.value.data,
          ...nodeConfig.value,
        },
      });
    }
  }

  /**
   * 处理参数变更
   */
  function handleParamChange(key: string, value: any) {
    if (!nodeConfig.value.params) {
      nodeConfig.value.params = {};
    }
    nodeConfig.value.params[key] = value;
    handleConfigChange();
  }

  /**
   * 重置配置
   */
  function handleReset() {
    if (selectedNode.value) {
      nodeConfig.value = {
        label: selectedNode.value.data.label || "",
        description: selectedNode.value.data.description || "",
        color: selectedNode.value.data.color || "#3b82f6",
        noInputs: selectedNode.value.data.noInputs || false,
        noOutputs: selectedNode.value.data.noOutputs || false,
        params: selectedNode.value.data.params || {},
      };
    }
    message.info("已重置为当前保存的配置");
  }

  /**
   * 删除节点
   */
  function handleDeleteNode() {
    if (!selectedNode.value) return;

    removeNodes([selectedNode.value.id]);
    uiStore.clearNodeSelection();
    message.success("节点已删除");
  }

  return {
    selectedNode,
    nodeColor,
    nodeConfig,
    handleConfigChange,
    handleParamChange,
    handleReset,
    handleDeleteNode,
  };
}
