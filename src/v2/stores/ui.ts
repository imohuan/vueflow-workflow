import { defineStore } from "pinia";
import { ref, computed } from "vue";

/**
 * 面板尺寸预设
 */
export type PanelSize = "small" | "medium" | "large";

/**
 * Tab 项类型
 */
export type TabKey =
  | "workflows"
  | "node-library"
  | "node-config"
  | "node-result-preview"
  | "variables"
  | "execution-history"
  | "execution-result"
  | "test-menu"
  | "settings";

/**
 * UI Store
 * 管理全局 UI 状态，包括浮动面板的显示、尺寸、当前激活的 Tab 等
 */
export const useUiStore = defineStore("ui", () => {
  // ==================== 浮动面板状态 ====================

  /** 浮动面板是否显示 */
  const floatingPanelVisible = ref(false);

  /** 当前激活的 Tab */
  const activeTab = ref<TabKey | null>(null);

  /** 面板尺寸预设 */
  const panelSize = ref<PanelSize>("medium");

  /** 面板自定义宽度（px） */
  const customPanelWidth = ref<number | null>(null);

  /** 面板位置（用于拖拽，当前固定在左侧） */
  const panelPosition = ref({ x: 0, y: 0 });

  // ==================== 尺寸映射 ====================

  /** 尺寸预设映射表 */
  const sizePresets: Record<PanelSize, number> = {
    small: 280,
    medium: 360,
    large: 480,
  };

  /** 当前面板宽度 */
  const panelWidth = computed(() => {
    return customPanelWidth.value ?? sizePresets[panelSize.value];
  });

  // ==================== Modal 状态 ====================

  /** 信息 Modal 是否显示 */
  const infoModalVisible = ref(false);

  /** 信息 Modal 内容 */
  const infoModalContent = ref({
    title: "",
    content: "",
    type: "info" as "info" | "success" | "warning" | "error",
  });

  /** 全屏编辑器 Modal 是否显示 */
  const editorModalVisible = ref(false);

  /** 全屏编辑器内容 */
  const editorModalContent = ref({
    title: "",
    content: "",
    language: "javascript" as string,
  });

  /** 节点配置 Modal 是否显示 */
  const nodeConfigModalVisible = ref(false);

  /** 变量编辑器 Modal 是否显示 */
  const variableEditorModalVisible = ref(false);

  /** 变量编辑器内容 */
  const variableEditorModalContent = ref({
    value: "",
    onSave: null as ((value: string) => void) | null,
  });

  /** 编辑器面板 Modal 是否显示 */
  const editorPanelModalVisible = ref(false);

  /** 编辑器面板内容 */
  const editorPanelContent = ref({
    title: "",
    content: "",
    language: "javascript" as string,
    onSave: null as ((value: string) => void) | null,
  });

  // ==================== 节点选中状态 ====================

  /** 当前选中的节点 ID */
  const selectedNodeId = ref<string | null>(null);

  // ==================== 节点预览状态 ====================

  /** 当前预览的节点 ID */
  const previewNodeId = ref<string | null>(null);

  /** 当前预览的节点执行状态 */
  const previewNodeData = ref<any>(null);

  // ==================== Actions ====================

  /**
   * 设置当前激活的 Tab
   * 如果点击已激活的 Tab，则关闭面板
   */
  function setActiveTab(tab: TabKey) {
    if (activeTab.value === tab && floatingPanelVisible.value) {
      // 点击已激活的 Tab，关闭面板
      floatingPanelVisible.value = false;
    } else {
      // 切换到新 Tab，并显示面板
      activeTab.value = tab;
      floatingPanelVisible.value = true;
    }
  }

  /**
   * 关闭浮动面板
   */
  function closeFloatingPanel() {
    floatingPanelVisible.value = false;
  }

  /**
   * 打开浮动面板（使用上次激活的 Tab 或默认 Tab）
   */
  function openFloatingPanel() {
    if (!activeTab.value) {
      activeTab.value = "workflows";
    }
    floatingPanelVisible.value = true;
  }

  /**
   * 切换浮动面板显示/隐藏
   */
  function toggleFloatingPanel() {
    floatingPanelVisible.value = !floatingPanelVisible.value;
  }

  /**
   * 设置面板尺寸
   */
  function setPanelSize(size: PanelSize) {
    panelSize.value = size;
    customPanelWidth.value = null; // 清除自定义宽度
  }

  /**
   * 设置面板自定义宽度
   */
  function setCustomPanelWidth(width: number) {
    customPanelWidth.value = width;
  }

  /**
   * 重置面板状态
   */
  function resetPanel() {
    panelSize.value = "medium";
    customPanelWidth.value = null;
    panelPosition.value = { x: 0, y: 0 };
  }

  /**
   * 显示信息 Modal
   */
  function showInfoModal(
    title: string,
    content: string,
    type: "info" | "success" | "warning" | "error" = "info"
  ) {
    infoModalContent.value = { title, content, type };
    infoModalVisible.value = true;
  }

  /**
   * 关闭信息 Modal
   */
  function closeInfoModal() {
    infoModalVisible.value = false;
  }

  /**
   * 显示全屏编辑器 Modal
   */
  function showEditorModal(
    title: string,
    content: string,
    language: string = "javascript"
  ) {
    editorModalContent.value = { title, content, language };
    editorModalVisible.value = true;
  }

  /**
   * 关闭全屏编辑器 Modal
   */
  function closeEditorModal() {
    editorModalVisible.value = false;
  }

  /**
   * 设置选中的节点并打开节点配置面板
   */
  function selectNode(nodeId: string | null) {
    selectedNodeId.value = nodeId;
    if (nodeId) {
      // 自动切换到节点配置 tab 并打开面板
      // activeTab.value = "node-config";
      // floatingPanelVisible.value = true;
      // 改为打开节点配置模态框
      nodeConfigModalVisible.value = true;
    }
  }

  /**
   * 清除节点选中状态
   */
  function clearNodeSelection() {
    selectedNodeId.value = null;
    // 关闭节点配置模态框
    nodeConfigModalVisible.value = false;
    // 如果当前显示的是节点配置面板，则关闭面板
    if (activeTab.value === "node-config") {
      floatingPanelVisible.value = false;
    }
  }

  /**
   * 打开节点配置模态框
   */
  function openNodeConfigModal() {
    if (selectedNodeId.value) {
      nodeConfigModalVisible.value = true;
    }
  }

  /**
   * 关闭节点配置模态框
   */
  function closeNodeConfigModal() {
    nodeConfigModalVisible.value = false;
  }

  /**
   * 打开变量编辑器模态框
   */
  function openVariableEditorModal(
    value: string,
    onSave: (value: string) => void
  ) {
    variableEditorModalContent.value = { value, onSave };
    variableEditorModalVisible.value = true;
  }

  /**
   * 关闭变量编辑器模态框
   */
  function closeVariableEditorModal() {
    variableEditorModalVisible.value = false;
    // 延迟清理，确保模态框关闭动画完成
    setTimeout(() => {
      variableEditorModalContent.value = { value: "", onSave: null };
    }, 300);
  }

  /**
   * 显示节点执行结果预览
   */
  function showNodePreview(nodeId: string, nodeData: any) {
    previewNodeId.value = nodeId;
    previewNodeData.value = nodeData;
    // 自动切换到节点预览 tab 并打开面板
    activeTab.value = "node-result-preview";
    floatingPanelVisible.value = true;
  }

  /**
   * 清除节点预览状态
   */
  function clearNodePreview() {
    previewNodeId.value = null;
    previewNodeData.value = null;
    // 如果当前显示的是节点预览面板，则关闭面板
    if (activeTab.value === "node-result-preview") {
      floatingPanelVisible.value = false;
    }
  }

  /**
   * 打开编辑器面板模态框
   */
  function openEditorPanelModal(
    title: string,
    content: string,
    language: string = "javascript",
    onSave?: (value: string) => void
  ) {
    editorPanelContent.value = {
      title,
      content,
      language,
      onSave: onSave || null,
    };
    editorPanelModalVisible.value = true;
  }

  /**
   * 关闭编辑器面板模态框
   */
  function closeEditorPanelModal() {
    editorPanelModalVisible.value = false;
    // 延迟清理，确保模态框关闭动画完成
    setTimeout(() => {
      editorPanelContent.value = {
        title: "",
        content: "",
        language: "javascript",
        onSave: null,
      };
    }, 300);
  }

  return {
    // 状态
    floatingPanelVisible,
    activeTab,
    panelSize,
    customPanelWidth,
    panelPosition,
    panelWidth,
    infoModalVisible,
    infoModalContent,
    editorModalVisible,
    editorModalContent,
    nodeConfigModalVisible,
    variableEditorModalVisible,
    variableEditorModalContent,
    editorPanelModalVisible,
    editorPanelContent,
    selectedNodeId,
    previewNodeId,
    previewNodeData,

    // 方法
    setActiveTab,
    closeFloatingPanel,
    openFloatingPanel,
    toggleFloatingPanel,
    setPanelSize,
    setCustomPanelWidth,
    resetPanel,
    showInfoModal,
    closeInfoModal,
    showEditorModal,
    closeEditorModal,
    selectNode,
    clearNodeSelection,
    openNodeConfigModal,
    closeNodeConfigModal,
    openVariableEditorModal,
    closeVariableEditorModal,
    openEditorPanelModal,
    closeEditorPanelModal,
    showNodePreview,
    clearNodePreview,
  };
});
