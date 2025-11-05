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
  | "variables"
  | "execution-history"
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
  };
});
