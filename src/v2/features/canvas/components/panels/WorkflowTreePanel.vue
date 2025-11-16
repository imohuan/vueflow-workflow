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
    <div class="p-3 workflow-tree">
      <n-tree
        v-if="treeData.length > 0"
        :data="filteredTreeData"
        :expanded-keys="expandedKeys"
        :selected-keys="selectedKeys"
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
      <n-empty v-else description="暂无工作流" class="mt-8">
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
import IconDelete from "@/icons/IconDel.vue";
import IconEdit from "@/icons/IconEdit.vue";
import IconFolder from "@/icons/IconFolder.vue";
import { useCanvasStore } from "../../../../stores/canvas";
import {
  useWorkflowStore,
  type WorkflowTreeMeta,
} from "../../../../stores/workflow";

const message = useMessage();
const dialog = useDialog();
const canvasStore = useCanvasStore();
const workflowStore = useWorkflowStore();

// 搜索关键词
const searchQuery = ref("");

// 展开的节点
const expandedKeys = ref<string[]>([]);

// 选中的节点
const selectedKeys = ref<string[]>([]);

// 将 WorkflowTreeMeta 转换为 TreeOption
function convertToTreeOption(meta: WorkflowTreeMeta): TreeOption {
  if (meta.kind === "folder") {
    // 文件夹节点
    const children = (meta.children || []).map(convertToTreeOption);
    return {
      key: meta.path,
      label: meta.path.split("/").pop() || meta.path,
      children: children.length > 0 ? children : undefined,
      meta: meta,
    };
  } else {
    // 工作流节点
    return {
      key: meta.workflow_id,
      label: meta.name,
      meta: meta,
    };
  }
}

// 从 workflow store 获取树数据并转换为 TreeOption
const treeData = computed(() =>
  workflowStore.treeData.map(convertToTreeOption)
);

watch(
  () => treeData.value,
  (nodes) => {
    if (expandedKeys.value.length > 0) return;
    // 自动展开第一个文件夹
    const firstFolder = nodes.find(
      (node) => node.children && node.children.length > 0
    );
    if (firstFolder && firstFolder.key) {
      expandedKeys.value = [String(firstFolder.key)];
    }
  },
  { immediate: true }
);

// 监听当前工作流变化，自动更新选中状态
watch(
  () => canvasStore.currentWorkflowId,
  (workflowId) => {
    if (workflowId) {
      selectedKeys.value = [workflowId];
    } else {
      selectedKeys.value = [];
    }
  },
  { immediate: true }
);

const folderSelectOptions = computed(() => {
  const options = workflowStore.allFolderPaths.map((path) => ({
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
  const isWorkflow = meta?.kind === "workflow";
  const isFolder = meta?.kind === "folder";

  return h(
    "div",
    {
      class: "flex items-center justify-between w-full group",
    },
    [
      h("span", { class: "flex-1" }, String(option.label || "")),
      meta?.kind === "workflow" &&
        meta.updatedAt &&
        h(
          "span",
          { class: "text-xs text-slate-400 mr-2" },
          h(NTime, { time: meta.updatedAt, type: "relative" })
        ),
      // 工作流重命名按钮
      isWorkflow &&
        h(
          NTooltip,
          { placement: "bottom", trigger: "hover" },
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
                    if (meta?.kind === "workflow") {
                      renameWorkflow(
                        meta.workflow_id,
                        String(option.label || "")
                      );
                    }
                  },
                },
                {
                  icon: () =>
                    h(NIcon, { component: IconEdit, class: "text-blue-500" }),
                }
              ),
            default: () => "重命名工作流",
          }
        ),
      // 工作流删除按钮
      isWorkflow &&
        h(
          NPopconfirm,
          {
            onPositiveClick: () => {
              if (meta?.kind === "workflow") {
                workflowStore.deleteWorkflow(meta.workflow_id);
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
            onPositiveClick: async () => {
              if (meta?.kind === "folder") {
                await handleDeleteFolder(meta.path);
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
              `确定要删除文件夹 "${option.label}" 吗？文件夹下的所有工作流将被移动到根目录。`,
          }
        ),
    ]
  );
}

/**
 * 渲染树节点前缀图标
 */
function renderPrefix({ option }: { option: TreeOption }) {
  const meta = option.meta as WorkflowTreeMeta | undefined;
  const isWorkflow = meta?.kind === "workflow";
  const icon = isWorkflow ? IconNodeEditor : IconFolder;
  const color = isWorkflow ? "text-blue-500" : "text-amber-500";
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

// 已弃用：expandFolderPath 函数
// 新的树形结构不再需要此函数，因为 children 已经包含在节点中
// function expandFolderPath(folderId: string) { ... }

/**
 * 处理节点选择 - 加载工作流到画布
 */
function handleSelect(keys: string[]) {
  // 更新选中状态
  selectedKeys.value = keys;

  if (keys.length === 0) return;

  const selectedKey = keys[0];
  if (!selectedKey) return;

  const selectedNode = findNodeByKey(selectedKey, treeData.value);

  if (!selectedNode || !selectedNode.meta) return;

  // 只加载工作流类型的节点
  const meta = selectedNode.meta as WorkflowTreeMeta | undefined;
  if (meta?.kind === "workflow") {
    // 从 workflow store 加载工作流
    canvasStore.loadWorkflowById(meta.workflow_id);
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
async function handleDrop({
  node,
  dragNode,
  dropPosition,
  event: _event,
}: {
  node: TreeOption;
  dragNode: TreeOption;
  dropPosition: "before" | "after" | "inside";
  event: DragEvent;
}) {
  const dragMeta = dragNode.meta as WorkflowTreeMeta | undefined;
  const targetMeta = node.meta as WorkflowTreeMeta | undefined;

  if (!dragMeta || !targetMeta) return;

  // 不能拖到自己上
  if (dragMeta.kind === "folder" && targetMeta.kind === "folder") {
    if (dragMeta.path === targetMeta.path) return;
    // 不能将文件夹拖到自己的子文件夹中
    if (targetMeta.path.startsWith(dragMeta.path + "/")) {
      message?.warning("不能将文件夹移动到自己的子文件夹中");
      return;
    }
  }

  try {
    if (dragMeta.kind === "workflow") {
      // 拖拽工作流
      await handleWorkflowDrop(dragMeta, targetMeta, dropPosition);
    } else if (dragMeta.kind === "folder") {
      // 拖拽文件夹
      await handleFolderDrop(dragMeta, targetMeta, dropPosition);
    }
  } catch (error) {
    console.error("[WorkflowTreePanel] 拖拽失败:", error);
    message?.error("拖拽操作失败");
  }
}

/**
 * 处理工作流拖拽
 */
async function handleWorkflowDrop(
  dragMeta: Extract<WorkflowTreeMeta, { kind: "workflow" }>,
  targetMeta: WorkflowTreeMeta,
  dropPosition: "before" | "after" | "inside"
) {
  let targetFolderPath = "";

  if (targetMeta.kind === "folder") {
    // 拖到文件夹内
    if (dropPosition === "inside") {
      targetFolderPath = targetMeta.path;
    } else {
      // before/after：放到文件夹的父级
      const parts = targetMeta.path.split("/").filter(Boolean);
      if (parts.length > 0) {
        parts.pop();
      }
      targetFolderPath = parts.join("/");
    }
  } else if (targetMeta.kind === "workflow") {
    // 拖到工作流的前后：放到工作流的父级文件夹
    const parts = targetMeta.path.split("/").filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      targetFolderPath = parts.join("/");
    } else {
      targetFolderPath = ""; // 根目录
    }
  }

  // 如果目标路径和当前路径相同，不执行操作
  const currentParentPath = dragMeta.path.includes("/")
    ? dragMeta.path.substring(0, dragMeta.path.lastIndexOf("/"))
    : "";
  if (currentParentPath === targetFolderPath) {
    return;
  }

  const success = await workflowStore.moveWorkflow(
    dragMeta.workflow_id,
    targetFolderPath
  );

  if (success) {
    message?.success(`工作流已移动到 "${targetFolderPath || "根目录"}"`);
  } else {
    message?.error("移动工作流失败");
  }
}

/**
 * 处理文件夹拖拽
 */
async function handleFolderDrop(
  dragMeta: Extract<WorkflowTreeMeta, { kind: "folder" }>,
  targetMeta: WorkflowTreeMeta,
  dropPosition: "before" | "after" | "inside"
) {
  let targetParentPath = "";
  let newFolderName = dragMeta.path.split("/").pop() || "";

  if (targetMeta.kind === "folder") {
    if (dropPosition === "inside") {
      // 拖到文件夹内：成为其子文件夹
      targetParentPath = targetMeta.path;
    } else {
      // before/after：与目标文件夹同级
      const parts = targetMeta.path.split("/").filter(Boolean);
      if (parts.length > 0) {
        parts.pop();
      }
      targetParentPath = parts.join("/");
    }
  } else if (targetMeta.kind === "workflow") {
    // 拖到工作流的前后：放到工作流的父级文件夹
    const parts = targetMeta.path.split("/").filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      targetParentPath = parts.join("/");
    } else {
      targetParentPath = ""; // 根目录
    }
  }

  const newPath = targetParentPath
    ? `${targetParentPath}/${newFolderName}`
    : newFolderName;

  // 如果新路径和当前路径相同，不执行操作
  if (newPath === dragMeta.path) {
    return;
  }

  // 检查新路径是否已存在（包括显式和隐含的文件夹）
  const allFolders = new Set(workflowStore.allFolderPaths);
  if (allFolders.has(newPath)) {
    message?.warning("目标位置已存在同名文件夹");
    return;
  }

  // 移动文件夹：重命名文件夹路径，并更新所有相关工作流的路径
  const success = await workflowStore.moveFolder(dragMeta.path, newPath);

  if (success) {
    message?.success(`文件夹已移动到 "${newPath}"`);
  } else {
    message?.error("移动文件夹失败");
  }
}

/**
 * 显示右键菜单
 */
function showContextMenu(option: TreeOption, event: MouseEvent) {
  const meta = option.meta as WorkflowTreeMeta | undefined;
  if (!meta) return;

  // 阻止默认右键菜单
  event.preventDefault();

  // 这里可以后续使用 Naive UI 的 Dropdown 组件实现更完整的右键菜单
  // 目前先通过双击等方式操作，右键菜单功能可以在后续版本中完善
  if (meta.kind === "workflow") {
    // 右键工作流：可以快速打开
    loadWorkflow(option);
  } else if (meta.kind === "folder") {
    // 右键文件夹：切换展开/折叠
    if (option.key) {
      toggleExpanded(option.key);
    }
  }
}

/**
 * 加载工作流
 */
function loadWorkflow(option: TreeOption) {
  const meta = option.meta as WorkflowTreeMeta | undefined;
  if (meta?.kind === "workflow") {
    canvasStore.loadWorkflowById(meta.workflow_id);
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
    onPositiveClick: async () => {
      if (!nameRef.value.trim()) {
        message?.warning("工作流名称不能为空");
        return false;
      }

      const workflow = await workflowStore.createWorkflow(
        nameRef.value.trim(),
        folderRef.value
      );

      if (workflow) {
        canvasStore.loadWorkflowById(workflow.workflow_id);
        message?.success(`工作流 "${nameRef.value}" 创建成功`);
        selectedKeys.value = [workflow.workflow_id];
      } else {
        message?.error("创建工作流失败");
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
    onPositiveClick: async () => {
      if (!nameRef.value.trim()) {
        message?.warning("文件夹名称不能为空");
        return false;
      }

      const parentPath = parentRef.value.trim().replace(/\/$/, "");
      const normalizedName = nameRef.value.trim();
      const expectedPath = parentPath
        ? `${parentPath}/${normalizedName}`
        : normalizedName;
      const existedBefore = workflowStore.allFolderPaths.includes(expectedPath);

      const success = await workflowStore.createFolder(expectedPath);

      if (success && !existedBefore) {
        message?.success(`文件夹 "${expectedPath}" 创建成功`);
      } else if (existedBefore) {
        message?.info(`文件夹 "${expectedPath}" 已存在`);
      } else {
        message?.error(`文件夹 "${expectedPath}" 创建失败`);
      }
    },
  });
}

/**
 * 重命名工作流
 */
function renameWorkflow(workflowId: string, currentName: string) {
  const nameRef = ref(currentName);

  dialog?.create({
    title: "重命名工作流",
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
              onKeydown: (e: KeyboardEvent) => {
                if (e.key === "Enter") {
                  handleRenameConfirm();
                }
              },
            }),
          ],
        }
      ),
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: () => handleRenameConfirm(),
  });

  function handleRenameConfirm() {
    if (!nameRef.value.trim()) {
      message?.warning("工作流名称不能为空");
      return false;
    }

    const newName = nameRef.value.trim();
    if (newName === currentName) {
      return true; // 名称没有改变，直接关闭对话框
    }

    workflowStore.renameWorkflow(workflowId, newName);
    message?.success(`工作流 "${newName}" 重命名成功`);

    // 如果重命名的是当前选中的工作流，更新画布标题
    if (canvasStore.currentWorkflowId === workflowId) {
      // 可以在这里触发画布更新事件
    }

    return true;
  }
}

/**
 * 删除文件夹
 */
async function handleDeleteFolder(folderPath: string) {
  // 检查文件夹下是否有工作流
  const workflowsInFolder = workflowStore.workflowList.filter((w) =>
    w.path.startsWith(folderPath + "/")
  );

  if (workflowsInFolder.length > 0) {
    // 如果有工作流，需要先将它们移动到根目录
    const movedCount = workflowsInFolder.length;

    for (const workflow of workflowsInFolder) {
      await workflowStore.moveWorkflow(workflow.workflow_id, "");
    }

    // 删除文件夹
    const success = await workflowStore.deleteFolder(folderPath);

    if (success) {
      message?.success(`文件夹已删除，${movedCount} 个工作流已移动到根目录`);
    } else {
      message?.error("删除文件夹失败");
    }
  } else {
    // 文件夹为空，直接删除
    const success = await workflowStore.deleteFolder(folderPath);

    if (success) {
      message?.success(`文件夹 "${folderPath}" 已删除`);
    } else {
      message?.error("删除文件夹失败");
    }
  }
}
</script>

<style>
/* .workflow-tree .n-tree.n-tree--block-line .n-tree-node.n-tree-node--selected {
  background-color: rgba(22, 137, 245, 0.2);
} */
</style>
