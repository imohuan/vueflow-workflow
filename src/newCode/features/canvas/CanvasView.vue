<template>
  <n-layout has-sider class="h-full">
    <VerticalTabNav />

    <n-layout-content>
      <div ref="canvasContentRef" class="relative h-full overflow-hidden">
        <FloatingPanel />

        <!-- VueFlow 画布 -->
        <div class="absolute inset-0">
          <VueFlowCanvas
            :custom-node-component="CustomNode"
            :show-background="true"
            :show-controls="true"
            :show-mini-map="editorConfig.showMiniMap"
          />
        </div>

        <div
          class="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2"
        >
          <div class="pointer-events-auto">
            <CanvasToolbar
              @undo="handleUndo"
              @redo="handleRedo"
              @fit-view="handleFitView"
              @auto-layout="handleAutoLayout"
              @toggle-mini-map="toggleMiniMap"
              @execute-workflow="handleExecute"
            />
          </div>
        </div>

        <div class="absolute bottom-2 right-10">
          <NodeInfoCard />
        </div>

        <QuickNodeMenu
          :visible="quickMenu.visible"
          :position="quickMenu.position"
        />
      </div>
    </n-layout-content>

    <!-- Modals -->
    <InfoModal />
    <FullscreenEditorModal />
  </n-layout>
</template>
<script setup lang="ts">
import { reactive, ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useVueFlow } from "@vue-flow/core";
import CustomNode from "@/newCode/features/vueflow/components/nodes/CustomNode.vue";
import CanvasToolbar from "./components/CanvasToolbar.vue";
import QuickNodeMenu from "./components/QuickNodeMenu.vue";
import VerticalTabNav from "./components/VerticalTabNav.vue";
import FloatingPanel from "./components/FloatingPanel.vue";
import NodeInfoCard from "./components/NodeInfoCard.vue";
import InfoModal from "@/newCode/components/modals/InfoModal.vue";
import FullscreenEditorModal from "@/newCode/components/modals/FullscreenEditorModal.vue";
import { useCanvasStore } from "@/newCode/stores/canvas";
import { useEditorConfigStore } from "@/newCode/stores/editorConfig";
import { VueFlowCanvas, useVueFlowEvents } from "@/newCode/features/vueflow";

const canvasStore = useCanvasStore();
const editorConfigStore = useEditorConfigStore();
const { config: editorConfig } = storeToRefs(editorConfigStore);
const { fitView } = useVueFlow();

// 事件系统
const events = useVueFlowEvents();

// 画布容器引用
const canvasContentRef = ref<HTMLElement | null>(null);

// 快速菜单
const quickMenu = reactive({
  visible: false,
  position: { x: 320, y: 220 },
  connection: undefined as
    | { source: string; sourceHandle?: string | null }
    | undefined,
});

function toCanvasPosition(position: { x: number; y: number }) {
  const container = canvasContentRef.value;
  if (!container) {
    return position;
  }
  const rect = container.getBoundingClientRect();
  return {
    x: position.x - rect.left,
    y: position.y - rect.top,
  };
}

/**
 * 撤销
 */
function handleUndo() {
  // 通过事件触发历史记录插件的撤销操作
  events.emit("history:undo", undefined as any);
}

/**
 * 重做
 */
function handleRedo() {
  // 通过事件触发历史记录插件的重做操作
  events.emit("history:redo", undefined as any);
}

/**
 * 适应视图
 */
function handleFitView() {
  fitView({ padding: 0.2, duration: 300 });
}

/**
 * 自动布局
 */
function handleAutoLayout() {
  // 通过事件触发自动布局插件，使用配置中的参数
  events.emit("canvas:request-auto-layout", {
    direction: editorConfig.value.autoLayoutDirection,
    nodesep: editorConfig.value.autoLayoutNodeSpacing,
    ranksep: editorConfig.value.autoLayoutRankSpacing,
    padding: editorConfig.value.autoLayoutPadding,
    fitView: editorConfig.value.autoLayoutFitView,
    fitViewPadding: editorConfig.value.autoLayoutFitViewPadding,
    fitViewDuration: editorConfig.value.autoLayoutFitViewDuration,
  });
}

/**
 * 切换小地图显示
 */
function toggleMiniMap() {
  editorConfigStore.updateConfig({
    showMiniMap: !editorConfig.value.showMiniMap,
  });
}

/**
 * 执行工作流
 */
function handleExecute() {
  canvasStore.setExecuting(true);
  setTimeout(() => canvasStore.setExecuting(false), 1500);
}

// 监听节点添加事件
events.on("node:added", ({ node }) => {
  console.log("[CanvasView] 节点已添加:", node);
});

// 监听节点点击事件
events.on("node:clicked", ({ node }) => {
  console.log("[CanvasView] 节点被点击:", node.data?.label);
});

// 监听节点双击事件
events.on("node:double-clicked", ({ node }) => {
  console.log("[CanvasView] 节点被双击，打开配置面板:", node.data?.label);
  // TODO: 打开节点配置面板
});

// 监听节点右键菜单
events.on("node:context-menu", ({ node }) => {
  console.log("[CanvasView] 节点右键菜单:", node.data?.label);
  // TODO: 显示右键菜单
});

// 监听画布点击事件
events.on("canvas:clicked", () => {
  console.log("[CanvasView] 画布被点击");
  // 点击画布时隐藏快捷菜单
  if (quickMenu.visible) {
    quickMenu.visible = false;
  }
});

// 监听快捷节点菜单事件
events.on("ui:show-quick-node-menu", ({ position, connection }) => {
  console.log("[CanvasView] 显示快捷节点菜单:", { position, connection });
  quickMenu.position = toCanvasPosition(position);
  quickMenu.connection = connection;
  quickMenu.visible = true;
});

events.on("ui:hide-quick-node-menu", () => {
  console.log("[CanvasView] 隐藏快捷节点菜单");
  quickMenu.visible = false;
  quickMenu.connection = undefined;
});

onMounted(() => {
  console.log("[CanvasView] 组件已挂载");
  console.log("[CanvasView] 事件系统已初始化");
});
</script>

<style scoped></style>
