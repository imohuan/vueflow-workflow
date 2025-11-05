<template>
  <div class="h-full overflow-y-auto bg-white">
    <!-- 顶部工具栏 -->
    <div class="border-b border-slate-200 bg-white p-3">
      <!-- 搜索框 -->
      <n-input
        v-model:value="searchQuery"
        placeholder="搜索工作流..."
        size="small"
        clearable
      >
        <template #prefix>
          <n-icon :component="IconSearch" />
        </template>
      </n-input>

      <!-- 操作按钮 -->
      <n-space class="mt-2" size="small">
        <n-button size="small" secondary @click="createWorkflow">
          <template #icon>
            <n-icon :component="IconAdd" />
          </template>
          新建工作流
        </n-button>
        <n-button size="small" secondary @click="createFolder">
          <template #icon>
            <n-icon :component="IconFolder" />
          </template>
          新建文件夹
        </n-button>
      </n-space>
    </div>

    <!-- 工作流树 -->
    <div class="p-3">
      <n-tree
        :data="filteredTreeData"
        :expanded-keys="expandedKeys"
        :node-props="nodeProps"
        :render-label="renderLabel"
        :render-prefix="renderPrefix"
        :allow-drop="allowDrop"
        block-line
        selectable
        draggable
        @update:expanded-keys="handleExpandedKeysChange"
        @update:selected-keys="handleSelect"
        @drop="handleDrop"
      />

      <!-- 空状态 -->
      <n-empty
        v-if="treeData.length === 0"
        description="暂无工作流"
        class="mt-8"
      >
        <template #extra>
          <n-button size="small" @click="createWorkflow">
            创建第一个工作流
          </n-button>
        </template>
      </n-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from "vue";
import type { TreeOption } from "naive-ui";
import { NIcon, NTime, useMessage, useDialog } from "naive-ui";
import IconSearch from "@/icons/IconSearch.vue";
import IconAdd from "@/icons/IconAdd.vue";
import IconFolder from "@/icons/IconFolder.vue";
import IconNodeEditor from "@/icons/IconNodeEditor.vue";
import { useCanvasStore } from "@/newCode/stores/canvas";

const message = useMessage();
const dialog = useDialog();
const canvasStore = useCanvasStore();

// 搜索关键词
const searchQuery = ref("");

// 展开的节点
const expandedKeys = ref<string[]>(["my-workflows"]);

// 工作流树数据（示例数据）
const treeData = ref<TreeOption[]>([
  {
    key: "my-workflows",
    label: "我的工作流",
    isLeaf: false,
    children: [
      {
        key: "workflow-1",
        label: "数据采集流程",
        isLeaf: true,
        meta: {
          type: "workflow",
          createdAt: Date.now() - 86400000 * 2,
          updatedAt: Date.now() - 3600000,
          nodeCount: 12,
        },
      },
      {
        key: "workflow-2",
        label: "表单自动填写",
        isLeaf: true,
        meta: {
          type: "workflow",
          createdAt: Date.now() - 86400000 * 5,
          updatedAt: Date.now() - 7200000,
          nodeCount: 8,
        },
      },
      {
        key: "folder-1",
        label: "测试工作流",
        isLeaf: false,
        children: [
          {
            key: "workflow-3",
            label: "登录测试",
            isLeaf: true,
            meta: {
              type: "workflow",
              createdAt: Date.now() - 86400000 * 10,
              updatedAt: Date.now() - 86400000,
              nodeCount: 5,
            },
          },
          {
            key: "workflow-4",
            label: "数据验证",
            isLeaf: true,
            meta: {
              type: "workflow",
              createdAt: Date.now() - 86400000 * 15,
              updatedAt: Date.now() - 86400000 * 2,
              nodeCount: 6,
            },
          },
        ],
      },
    ],
  },
  {
    key: "templates",
    label: "模板库",
    isLeaf: false,
    children: [
      {
        key: "template-1",
        label: "网页截图",
        isLeaf: true,
        meta: {
          type: "workflow",
          createdAt: Date.now() - 86400000 * 30,
          updatedAt: Date.now() - 86400000 * 30,
          nodeCount: 3,
        },
      },
      {
        key: "template-2",
        label: "数据抓取",
        isLeaf: true,
        meta: {
          type: "workflow",
          createdAt: Date.now() - 86400000 * 30,
          updatedAt: Date.now() - 86400000 * 30,
          nodeCount: 7,
        },
      },
      {
        key: "template-3",
        label: "自动化测试",
        isLeaf: true,
        meta: {
          type: "workflow",
          createdAt: Date.now() - 86400000 * 30,
          updatedAt: Date.now() - 86400000 * 30,
          nodeCount: 10,
        },
      },
    ],
  },
  {
    key: "recent",
    label: "最近使用",
    isLeaf: false,
    children: [
      {
        key: "recent-1",
        label: "数据采集流程",
        isLeaf: true,
        meta: {
          type: "workflow",
          createdAt: Date.now() - 86400000 * 2,
          updatedAt: Date.now() - 3600000 * 2,
          nodeCount: 12,
        },
      },
      {
        key: "recent-2",
        label: "表单自动填写",
        isLeaf: true,
        meta: {
          type: "workflow",
          createdAt: Date.now() - 86400000 * 5,
          updatedAt: Date.now() - 86400000,
          nodeCount: 8,
        },
      },
    ],
  },
]);

// 过滤后的树数据
const filteredTreeData = computed(() => {
  if (!searchQuery.value) return treeData.value;

  const filterTree = (nodes: TreeOption[]): TreeOption[] => {
    return nodes
      .map((node) => {
        const label = String(node.label || "");
        const matchesSearch = label
          .toLowerCase()
          .includes(searchQuery.value.toLowerCase());

        if (node.children) {
          const filteredChildren = filterTree(node.children);
          if (filteredChildren.length > 0 || matchesSearch) {
            return { ...node, children: filteredChildren };
          }
        } else if (matchesSearch) {
          return node;
        }

        return null;
      })
      .filter((node): node is TreeOption => node !== null);
  };

  return filterTree(treeData.value);
});

/**
 * 渲染树节点标签
 */
function renderLabel({ option }: { option: TreeOption }) {
  const meta = option.meta as { updatedAt?: number } | undefined;
  return h("div", { class: "flex items-center justify-between w-full" }, [
    h("span", { class: "flex-1" }, String(option.label || "")),
    meta?.updatedAt &&
      h(
        "span",
        { class: "text-xs text-slate-400 ml-2" },
        h(NTime, { time: meta.updatedAt, type: "relative" })
      ),
  ]);
}

/**
 * 渲染树节点前缀图标
 */
function renderPrefix({ option }: { option: TreeOption }) {
  const icon = option.isLeaf ? IconNodeEditor : IconFolder;
  const color = option.isLeaf ? "text-blue-500" : "text-amber-500";
  return h(NIcon, { component: icon, class: `${color} text-base` });
}

/**
 * 节点属性（右键菜单等）
 */
function nodeProps({ option }: { option: TreeOption }) {
  return {
    onClick() {
      // 如果是文件夹，点击时切换展开/折叠状态
      if (!option.isLeaf && option.key) {
        toggleExpanded(option.key);
      }
    },
    onContextmenu(e: MouseEvent) {
      e.preventDefault();
      showContextMenu(option, e);
    },
    onDblclick() {
      if (option.isLeaf) {
        loadWorkflow(option);
      }
    },
  };
}

/**
 * 处理展开节点变化
 */
function handleExpandedKeysChange(keys: string[]) {
  expandedKeys.value = keys;
}

/**
 * 切换节点展开状态
 */
function toggleExpanded(key: string | number) {
  const keyStr = String(key);
  const index = expandedKeys.value.indexOf(keyStr);
  if (index > -1) {
    // 已展开，则折叠
    expandedKeys.value.splice(index, 1);
  } else {
    // 未展开，则展开
    expandedKeys.value.push(keyStr);
  }
}

/**
 * 处理节点选择 - 加载工作流到画布
 */
function handleSelect(keys: string[]) {
  if (keys.length === 0) return;

  const selectedKey = keys[0];
  if (!selectedKey) return;

  const selectedNode = findNodeByKey(selectedKey, treeData.value);

  if (!selectedNode || !selectedNode.meta) return;

  // 只加载工作流类型的节点
  const meta = selectedNode.meta as { type?: string };
  if (meta.type === "workflow") {
    // 生成示例工作流数据
    const sampleWorkflow = generateSampleWorkflow();
    canvasStore.loadWorkflow(sampleWorkflow);
    message?.success(`已加载工作流：${selectedNode.label || "未命名"}`);
  }
}

/** 查找树节点 */
function findNodeByKey(key: string, nodes: TreeOption[]): TreeOption | null {
  for (const node of nodes) {
    if (node.key === key) return node;
    if (node.children) {
      const found = findNodeByKey(key, node.children);
      if (found) return found;
    }
  }
  return null;
}

/** 生成示例工作流 */
function generateSampleWorkflow() {
  return {
    nodes: [
      {
        id: "node-1",
        type: "custom",
        position: { x: 100, y: 100 },
        data: {
          label: "打开网页",
          type: "browser.open",
          description: "打开指定的网页",
          color: "#3b82f6",
        },
      },
      {
        id: "node-2",
        type: "custom",
        position: { x: 350, y: 100 },
        data: {
          label: "输入文本",
          type: "browser.input",
          description: "在输入框中输入文本",
          color: "#10b981",
        },
      },
      {
        id: "node-3",
        type: "custom",
        position: { x: 600, y: 100 },
        data: {
          label: "点击按钮",
          type: "browser.click",
          description: "点击页面元素",
          color: "#f59e0b",
        },
      },
    ],
    edges: [
      { id: "e1-2", source: "node-1", target: "node-2" },
      { id: "e2-3", source: "node-2", target: "node-3" },
    ],
  };
}

/**
 * 控制拖拽放置规则
 */
function allowDrop({
  dropPosition,
  node,
}: {
  dropPosition: string;
  node: TreeOption;
}) {
  // 不允许拖拽到叶子节点内部（只能拖到文件夹内）
  if (dropPosition === "inside" && node.isLeaf) {
    return false;
  }
  return true;
}

/**
 * 处理拖拽放置
 */
function handleDrop({
  node,
  dragNode,
  dropPosition,
}: {
  node: TreeOption;
  dragNode: TreeOption;
  dropPosition: "before" | "after" | "inside";
}) {
  console.log("拖拽操作:", { node, dragNode, dropPosition });

  // 类型守卫：确保 key 存在
  if (dragNode.key === undefined || node.key === undefined) {
    return;
  }

  // 找到并移除被拖拽的节点
  const removeNode = (
    nodes: TreeOption[],
    key: string | number
  ): TreeOption | undefined => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node) continue;

      if (node.key === key) {
        return nodes.splice(i, 1)[0];
      }
      const children = node.children;
      if (children && children.length > 0) {
        const removed = removeNode(children, key);
        if (removed) return removed;
      }
    }
    return undefined;
  };

  // 插入节点到目标位置
  const insertNode = (
    nodes: TreeOption[],
    targetKey: string | number,
    newNode: TreeOption,
    position: "before" | "after" | "inside"
  ): boolean => {
    for (let i = 0; i < nodes.length; i++) {
      const currentNode = nodes[i];
      if (!currentNode) continue;

      if (currentNode.key === targetKey) {
        if (position === "inside") {
          // 插入到目标节点的子节点中
          if (!currentNode.children) {
            currentNode.children = [];
          }
          currentNode.children.push(newNode);
        } else if (position === "before") {
          nodes.splice(i, 0, newNode);
        } else {
          nodes.splice(i + 1, 0, newNode);
        }
        return true;
      }
      const children = currentNode.children;
      if (children && children.length > 0) {
        if (insertNode(children, targetKey, newNode, position)) {
          return true;
        }
      }
    }
    return false;
  };

  // 执行拖拽操作
  const dragKey = dragNode.key;
  const nodeKey = node.key;
  if (typeof dragKey === "string" || typeof dragKey === "number") {
    const removed = removeNode(treeData.value, dragKey);
    if (
      removed &&
      (typeof nodeKey === "string" || typeof nodeKey === "number")
    ) {
      insertNode(treeData.value, nodeKey, removed, dropPosition);
      message?.success("排序已更新");
    }
  }
}

/**
 * 显示右键菜单
 */
function showContextMenu(option: TreeOption, event: MouseEvent) {
  // 这里可以使用 Naive UI 的 Dropdown 组件实现右键菜单
  console.log("右键菜单:", option, event);
  message?.info(`右键菜单：${option.label}`);
}

/**
 * 加载工作流
 */
function loadWorkflow(option: TreeOption) {
  console.log("加载工作流:", option);
  message?.success(`已加载工作流：${option.label}`);
}

/**
 * 创建新工作流
 */
function createWorkflow() {
  dialog?.create({
    title: "创建工作流",
    content: "请输入工作流名称",
    positiveText: "创建",
    negativeText: "取消",
    onPositiveClick: () => {
      message?.success("工作流创建成功");
    },
  });
}

/**
 * 创建新文件夹
 */
function createFolder() {
  dialog?.create({
    title: "创建文件夹",
    content: "请输入文件夹名称",
    positiveText: "创建",
    negativeText: "取消",
    onPositiveClick: () => {
      message?.success("文件夹创建成功");
    },
  });
}
</script>

<style scoped></style>
