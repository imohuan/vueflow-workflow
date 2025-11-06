<template>
  <div class="h-full overflow-y-auto bg-white">
    <!-- 顶部工具栏 -->
    <div class="border-b border-slate-200 bg-white p-3">
      <!-- 搜索框和新建按钮 -->
      <div class="flex items-center gap-2">
        <n-input
          v-model:value="searchQuery"
          placeholder="搜索工作流..."
          size="small"
          clearable
          class="flex-1"
        >
          <template #prefix>
            <n-icon :component="IconSearch" />
          </template>
        </n-input>
        <n-tooltip placement="bottom" trigger="hover">
          <template #trigger>
            <n-button size="small" secondary circle @click="createWorkflow">
              <template #icon>
                <n-icon :component="IconAdd" />
              </template>
            </n-button>
          </template>
          新建工作流
        </n-tooltip>
        <n-tooltip placement="bottom" trigger="hover">
          <template #trigger>
            <n-button size="small" secondary circle @click="createFolder">
              <template #icon>
                <n-icon :component="IconFolder" />
              </template>
            </n-button>
          </template>
          新建文件夹
        </n-tooltip>
      </div>
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
import { ref, computed, h, watch } from "vue";
import type { TreeOption } from "naive-ui";
import {
  NIcon,
  NTime,
  NInput,
  NButton,
  NPopconfirm,
  NSpace,
  NSelect,
  NTooltip,
  useMessage,
  useDialog,
} from "naive-ui";
import IconSearch from "@/icons/IconSearch.vue";
import IconAdd from "@/icons/IconAdd.vue";
import IconNodeEditor from "@/icons/IconNodeEditor.vue";
import IconDelete from "@/icons/IconDelete.vue";
import IconFolder from "@/icons/IconFolder.vue";
import { useCanvasStore } from "@/newCode/stores/canvas";
import {
  useWorkflowStore,
  type WorkflowTreeMeta,
  type WorkflowFolder,
} from "@/newCode/stores/workflow";

const message = useMessage();
const dialog = useDialog();
const canvasStore = useCanvasStore();
const workflowStore = useWorkflowStore();

// 搜索关键词
const searchQuery = ref("");

// 展开的节点
const expandedKeys = ref<string[]>([]);

// 从 workflow store 获取树数据
const treeData = computed(() => workflowStore.treeData);

watch(
  () => treeData.value,
  (nodes) => {
    if (expandedKeys.value.length > 0) return;
    const firstFolder = nodes.find((node) => !node.isLeaf);
    if (firstFolder) {
      expandedKeys.value = [String(firstFolder.key)];
    }
  },
  { immediate: true }
);

const folderSelectOptions = computed(() => {
  const options = workflowStore.folderPathList.map((path) => ({
    label: path,
    value: path,
  }));
  return [{ label: "根目录", value: "" }, ...options];
});

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
  const meta = option.meta as WorkflowTreeMeta | undefined;
  const isWorkflow = meta?.type === "workflow";
  const isFolder = meta?.type === "folder";

  return h(
    "div",
    {
      class: "flex items-center justify-between w-full group",
    },
    [
      h("span", { class: "flex-1" }, String(option.label || "")),
      meta?.type === "workflow" &&
        meta.updatedAt &&
        h(
          "span",
          { class: "text-xs text-slate-400 ml-2" },
          h(NTime, { time: meta.updatedAt, type: "relative" })
        ),
      // 工作流删除按钮
      isWorkflow &&
        h(
          NPopconfirm,
          {
            onPositiveClick: () => {
              if (meta?.type === "workflow") {
                workflowStore.deleteWorkflow(meta.workflowId);
                message?.success(`工作流 "${option.label}" 已删除`);
              }
            },
            positiveText: "删除",
            negativeText: "取消",
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: "tiny",
                  text: true,
                  class:
                    "opacity-0 group-hover:opacity-100 transition-opacity ml-2",
                  onClick: (e: MouseEvent) => {
                    e.stopPropagation();
                  },
                },
                {
                  icon: () =>
                    h(NIcon, { component: IconDelete, class: "text-red-500" }),
                }
              ),
            default: () => `确定要删除工作流 "${option.label}" 吗？`,
          }
        ),
      // 文件夹删除按钮
      isFolder &&
        h(
          NPopconfirm,
          {
            onPositiveClick: () => {
              if (meta?.type === "folder") {
                handleDeleteFolder(
                  meta.folderId,
                  String(option.label || "未命名文件夹")
                );
              }
            },
            positiveText: "删除",
            negativeText: "取消",
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: "tiny",
                  text: true,
                  class:
                    "opacity-0 group-hover:opacity-100 transition-opacity ml-2",
                  onClick: (e: MouseEvent) => {
                    e.stopPropagation();
                  },
                },
                {
                  icon: () =>
                    h(NIcon, { component: IconDelete, class: "text-red-500" }),
                }
              ),
            default: () =>
              `确定要删除文件夹 "${option.label}" 吗？如果不为空将一并删除所有内容。`,
          }
        ),
    ]
  );
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

function expandFolderPath(folderId: string) {
  let current: string | null = folderId;
  const visited = new Set<string>();

  while (current) {
    const key = `folder-${current}`;
    if (!expandedKeys.value.includes(key)) {
      expandedKeys.value.push(key);
    }

    const folder = (workflowStore.folders as WorkflowFolder[]).find(
      (item) => item.id === current
    );
    if (!folder || !folder.parentId || visited.has(folder.parentId)) {
      break;
    }
    visited.add(current);
    current = folder.parentId;
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
  const meta = selectedNode.meta as WorkflowTreeMeta | undefined;
  if (meta?.type === "workflow") {
    // 从 workflow store 加载工作流
    canvasStore.loadWorkflowById(meta.workflowId);
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
  const dragMeta = dragNode.meta as WorkflowTreeMeta | undefined;
  const targetMeta = node.meta as WorkflowTreeMeta | undefined;

  if (!dragMeta || !targetMeta) return;

  workflowStore.handleTreeDrop({
    dragMeta,
    targetMeta,
    dropPosition,
  });

  if (dropPosition === "inside" && targetMeta.type === "folder") {
    expandFolderPath(targetMeta.folderId);
  }

  message?.success("排序已更新");
}

/**
 * 显示右键菜单
 */
function showContextMenu(option: TreeOption, event: MouseEvent) {
  // 这里可以使用 Naive UI 的 Dropdown 组件实现右键菜单
  console.log("右键菜单:", option, event);
  // message?.info(`右键菜单：${option.label}`);
}

/**
 * 加载工作流
 */
function loadWorkflow(option: TreeOption) {
  const meta = option.meta as WorkflowTreeMeta | undefined;
  if (meta?.type === "workflow") {
    canvasStore.loadWorkflowById(meta.workflowId);
  }
}

/**
 * 创建新工作流
 */
function createWorkflow() {
  const nameRef = ref("");
  const defaultFolderValue =
    folderSelectOptions.value.find((option) => option.value !== "")?.value ??
    folderSelectOptions.value[0]?.value ??
    "";
  const folderRef = ref(defaultFolderValue);

  dialog?.create({
    title: "创建工作流",
    content: () =>
      h(
        NSpace,
        { vertical: true, size: "large", style: { width: "100%" } },
        {
          default: () => [
            h("div", { class: "text-sm text-slate-600 mb-1" }, "工作流名称"),
            h(NInput, {
              value: nameRef.value,
              placeholder: "请输入工作流名称",
              onUpdateValue: (val: string) => {
                nameRef.value = val;
              },
            }),
            h(
              "div",
              { class: "text-sm text-slate-600 mb-1 mt-2" },
              "选择文件夹（可输入新文件夹名称）"
            ),
            h(NSelect, {
              value: folderRef.value,
              options: folderSelectOptions.value,
              placeholder: "选择或输入文件夹名称",
              tag: true,
              filterable: true,
              onUpdateValue: (val: string) => {
                folderRef.value = val;
              },
            }),
          ],
        }
      ),
    positiveText: "创建",
    negativeText: "取消",
    onPositiveClick: () => {
      if (!nameRef.value.trim()) {
        message?.warning("工作流名称不能为空");
        return false;
      }

      const workflow = workflowStore.createWorkflow(
        nameRef.value.trim(),
        folderRef.value
      );
      canvasStore.loadWorkflowById(workflow.workflow_id);
      message?.success(`工作流 "${nameRef.value}" 创建成功`);

      // 自动展开工作流所在的文件夹
      if (workflow.folderId) {
        expandFolderPath(workflow.folderId);
      }
    },
  });
}

/**
 * 创建新文件夹
 */
function createFolder() {
  const nameRef = ref("");
  const parentRef = ref(folderSelectOptions.value[0]?.value ?? "");

  dialog?.create({
    title: "创建文件夹",
    content: () =>
      h(
        NSpace,
        { vertical: true, size: "large", style: { width: "100%" } },
        {
          default: () => [
            h("div", { class: "text-sm text-slate-600 mb-1" }, "文件夹名称"),
            h(NInput, {
              value: nameRef.value,
              placeholder: "请输入文件夹名称",
              onUpdateValue: (val: string) => {
                nameRef.value = val;
              },
            }),
            h(
              "div",
              { class: "text-sm text-slate-600 mb-1 mt-2" },
              "父级路径（可选择或输入新路径）"
            ),
            h(NSelect, {
              value: parentRef.value,
              options: folderSelectOptions.value,
              placeholder: "选择或输入父级路径",
              tag: true,
              filterable: true,
              onUpdateValue: (val: string) => {
                parentRef.value = val;
              },
            }),
          ],
        }
      ),
    positiveText: "创建",
    negativeText: "取消",
    onPositiveClick: () => {
      if (!nameRef.value.trim()) {
        message?.warning("文件夹名称不能为空");
        return false;
      }

      const parentPath = parentRef.value.trim().replace(/\/$/, "");
      const normalizedName = nameRef.value.trim();
      const expectedPath = parentPath
        ? `${parentPath}/${normalizedName}`
        : normalizedName;
      const existedBefore = workflowStore.folderPathList.includes(expectedPath);

      const folder = workflowStore.createFolder(normalizedName, parentPath);

      expandFolderPath(folder.id);

      const folderPath =
        workflowStore.buildFolderPath(folder.id) || folder.name;
      if (existedBefore) {
        message?.info(`文件夹 "${folderPath}" 已存在`);
      } else {
        message?.success(`文件夹 "${folderPath}" 创建成功`);
      }
    },
  });
}

/**
 * 删除文件夹
 */
function handleDeleteFolder(folderId: string, folderName: string) {
  const result = workflowStore.deleteFolder(folderId, true);

  if (result.success) {
    const count = result.deletedCount;
    if (count && (count.folders > 1 || count.workflows > 0)) {
      message?.success(
        `已删除文件夹 "${folderName}" 及其内容：${count.folders} 个文件夹，${count.workflows} 个工作流`
      );
    } else {
      message?.success(`文件夹 "${folderName}" 已删除`);
    }
  } else {
    message?.error(result.message);
  }
}
</script>

<style scoped></style>
