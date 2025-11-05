<template>
  <div class="h-full overflow-y-auto">
    <div class="space-y-4 p-4">
      <!-- 弹窗测试 -->
      <section>
        <h3 class="mb-2 text-sm font-semibold text-slate-700">📦 弹窗测试</h3>
        <n-space vertical :size="8">
          <n-button block secondary @click="showInfoModal">
            信息 Modal
          </n-button>
          <n-button block secondary @click="showFullscreenEditor">
            全屏编辑器
          </n-button>
          <n-button block secondary @click="showConfirmDialog">
            确认对话框
          </n-button>
          <n-button block secondary @click="showToast">提示消息</n-button>
        </n-space>
      </section>

      <!-- 面板测试 -->
      <section>
        <h3 class="mb-2 text-sm font-semibold text-slate-700">📐 面板测试</h3>
        <n-space vertical :size="8">
          <n-button block secondary @click="resizePanel('small')">
            Small 尺寸
          </n-button>
          <n-button block secondary @click="resizePanel('medium')">
            Medium 尺寸
          </n-button>
          <n-button block secondary @click="resizePanel('large')">
            Large 尺寸
          </n-button>
          <n-button block secondary @click="resetPanel">重置面板</n-button>
        </n-space>
      </section>

      <!-- 画布测试 -->
      <section>
        <h3 class="mb-2 text-sm font-semibold text-slate-700">🎨 画布测试</h3>
        <n-space vertical :size="8">
          <n-button block secondary @click="addTestNodes">
            添加测试节点
          </n-button>
          <n-button block secondary @click="simulateExecution">
            模拟执行
          </n-button>
          <n-button block secondary @click="testConnection">
            测试连线
          </n-button>
          <n-button block secondary @click="clearCanvas"> 清空画布 </n-button>
        </n-space>
      </section>

      <!-- 数据测试 -->
      <section>
        <h3 class="mb-2 text-sm font-semibold text-slate-700">💾 数据测试</h3>
        <n-space vertical :size="8">
          <n-button block secondary @click="loadSampleWorkflow">
            加载示例工作流
          </n-button>
          <n-button block secondary @click="exportCanvasData">
            导出画布数据
          </n-button>
          <n-button block secondary @click="resetAllState">
            重置所有状态
          </n-button>
        </n-space>
      </section>

      <!-- UI 状态测试 -->
      <section>
        <h3 class="mb-2 text-sm font-semibold text-slate-700">
          🎭 UI 状态测试
        </h3>
        <n-space vertical :size="8">
          <n-button block secondary @click="toggleTheme">切换主题</n-button>
          <n-button block secondary @click="showLoading">
            显示加载状态
          </n-button>
          <n-button block secondary @click="showError"> 显示错误状态 </n-button>
          <n-button block secondary @click="showEmpty"> 显示空状态 </n-button>
        </n-space>
      </section>

      <!-- 调试信息 -->
      <section>
        <h3 class="mb-2 text-sm font-semibold text-slate-700">🐛 调试信息</h3>
        <div class="rounded bg-slate-100 p-3 font-mono text-xs text-slate-600">
          <div>当前 Tab: {{ uiStore.activeTab }}</div>
          <div>面板可见: {{ uiStore.floatingPanelVisible }}</div>
          <div>面板宽度: {{ uiStore.panelWidth }}px</div>
          <div>面板尺寸: {{ uiStore.panelSize }}</div>
          <div>节点数量: {{ canvasStore.nodes.length }}</div>
          <div>连线数量: {{ canvasStore.edges.length }}</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from "vue";
import { useUiStore } from "@/newCode/stores/ui";
import { useCanvasStore } from "@/newCode/stores/canvas";
import type { MessageApi, DialogApi } from "naive-ui";
import type { PanelSize } from "@/newCode/stores/ui";

const uiStore = useUiStore();
const canvasStore = useCanvasStore();
const message = inject<MessageApi>("message");
const dialog = inject<DialogApi>("dialog");

// ==================== 弹窗测试 ====================

/** 显示信息 Modal */
function showInfoModal() {
  uiStore.showInfoModal(
    "信息提示",
    "这是一个信息展示 Modal 的示例内容。\n\n可以显示多行文本、格式化内容等。",
    "info"
  );
}

/** 显示全屏编辑器 */
function showFullscreenEditor() {
  const sampleCode = `// 示例代码
function helloWorld() {
  console.log("Hello, World!");
  return {
    message: "这是一个代码编辑器示例",
    timestamp: Date.now()
  };
}

helloWorld();`;

  uiStore.showEditorModal("代码编辑器", sampleCode, "javascript");
}

/** 显示确认对话框 */
function showConfirmDialog() {
  dialog?.warning({
    title: "确认操作",
    content: "你确定要执行此操作吗？此操作不可撤销。",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: () => {
      message?.success("操作已确认");
    },
    onNegativeClick: () => {
      message?.info("操作已取消");
    },
  });
}

/** 显示提示消息 */
function showToast() {
  message?.info("这是一条提示消息");
}

// ==================== 面板测试 ====================

/** 调整面板尺寸 */
function resizePanel(size: PanelSize) {
  uiStore.setPanelSize(size);
  message?.success(`面板尺寸已调整为 ${size}`);
}

/** 重置面板 */
function resetPanel() {
  uiStore.resetPanel();
  message?.success("面板已重置");
}

// ==================== 画布测试 ====================

/** 添加测试节点 */
function addTestNodes() {
  // 创建 3 个测试节点
  const testNodes = [
    {
      id: `test-node-${Date.now()}-1`,
      type: "custom",
      position: { x: 100, y: 100 },
      data: { label: "测试节点 1", type: "browser.open" },
    },
    {
      id: `test-node-${Date.now()}-2`,
      type: "custom",
      position: { x: 300, y: 100 },
      data: { label: "测试节点 2", type: "browser.click" },
    },
    {
      id: `test-node-${Date.now()}-3`,
      type: "custom",
      position: { x: 500, y: 100 },
      data: { label: "测试节点 3", type: "browser.screenshot" },
    },
  ];

  testNodes.forEach((node) => canvasStore.addNode(node));
  message?.success("已添加 3 个测试节点");
}

/** 模拟执行 */
function simulateExecution() {
  canvasStore.setExecuting(true);
  message?.loading("正在执行工作流...", { duration: 1500 });

  setTimeout(() => {
    canvasStore.setExecuting(false);
    message?.success("执行完成");
  }, 1500);
}

/** 测试连线 */
function testConnection() {
  if (canvasStore.nodes.length < 2) {
    message?.warning("请先添加至少 2 个节点");
    return;
  }

  const firstNode = canvasStore.nodes[0];
  const secondNode = canvasStore.nodes[1];
  if (!firstNode || !secondNode) {
    message?.error("节点数据异常");
    return;
  }

  const edge = {
    id: `test-edge-${Date.now()}`,
    source: firstNode.id,
    target: secondNode.id,
  };

  canvasStore.addEdge(edge);
  message?.success("已添加测试连线");
}

/** 清空画布 */
function clearCanvas() {
  dialog?.warning({
    title: "清空画布",
    content: "确定要清空画布吗？此操作不可撤销。",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: () => {
      canvasStore.clearCanvas();
      message?.success("画布已清空");
    },
  });
}

// ==================== 数据测试 ====================

/** 加载示例工作流 */
function loadSampleWorkflow() {
  const sampleWorkflow = {
    nodes: [
      {
        id: "sample-1",
        type: "custom",
        position: { x: 100, y: 100 },
        data: { label: "打开网页", type: "browser.open" },
      },
      {
        id: "sample-2",
        type: "custom",
        position: { x: 300, y: 100 },
        data: { label: "输入文本", type: "browser.input" },
      },
      {
        id: "sample-3",
        type: "custom",
        position: { x: 500, y: 100 },
        data: { label: "点击按钮", type: "browser.click" },
      },
    ],
    edges: [
      { id: "e1-2", source: "sample-1", target: "sample-2" },
      { id: "e2-3", source: "sample-2", target: "sample-3" },
    ],
  };

  canvasStore.loadWorkflow(sampleWorkflow);
  message?.success("已加载示例工作流");
}

/** 导出画布数据 */
function exportCanvasData() {
  const data = {
    nodes: canvasStore.nodes,
    edges: canvasStore.edges,
  };

  const json = JSON.stringify(data, null, 2);
  console.log("画布数据：", json);

  // 复制到剪贴板
  navigator.clipboard.writeText(json).then(() => {
    message?.success("画布数据已复制到剪贴板");
  });
}

/** 重置所有状态 */
function resetAllState() {
  dialog?.error({
    title: "重置所有状态",
    content: "此操作将清空所有数据和状态，确定继续吗？",
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: () => {
      canvasStore.clearCanvas();
      uiStore.resetPanel();
      message?.success("所有状态已重置");
    },
  });
}

// ==================== UI 状态测试 ====================

/** 切换主题 */
function toggleTheme() {
  message?.info("主题切换功能待实现");
}

/** 显示加载状态 */
function showLoading() {
  if (!message) return;
  const loadingMsg = message.loading("加载中...", { duration: 0 });
  setTimeout(() => {
    loadingMsg.destroy();
    message.success("加载完成");
  }, 2000);
}

/** 显示错误状态 */
function showError() {
  message?.error("这是一个错误提示");
}

/** 显示空状态 */
function showEmpty() {
  message?.info("暂无数据");
}
</script>

<style scoped>
section {
  padding-bottom: 1rem;
}

section:not(:last-child) {
  border-bottom: 1px solid rgb(226 232 240);
}
</style>
