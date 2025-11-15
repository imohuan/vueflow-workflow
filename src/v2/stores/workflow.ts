import { defineStore } from "pinia";
import { computed, ref, toRaw, watch } from "vue";
import type { TreeOption } from "naive-ui";
import type { Workflow } from "workflow-flow-nodes";
import { getContext } from "@/v2/context";

const STORAGE_KEY = "workflows";
const CURRENT_WORKFLOW_KEY = "current-workflow-id";
const GLOBAL_VARIABLES_KEY = "global-variables";
const STORAGE_VERSION = 2;
const NAMESPACE = "v2";

export interface WorkflowFolder {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowEntity extends Workflow {
  folderId: string | null;
  order: number;
  createdAt: number;
  updatedAt: number;
}

// 全局变量类型
export type GlobalVariableType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array";

// 全局变量定义
export interface GlobalVariable {
  key: string;
  type: GlobalVariableType;
  value: any;
  description?: string;
}

interface WorkflowStorageState {
  version: number;
  workflows: WorkflowEntity[];
  folders: WorkflowFolder[];
}

interface LegacyWorkflow extends Workflow {
  path: string;
}

type DropPosition = "before" | "after" | "inside";

export type WorkflowTreeMeta =
  | {
      type: "folder";
      folderId: string;
      parentFolderId: string | null;
      order: number;
      path: string;
    }
  | {
      type: "workflow";
      workflowId: string;
      parentFolderId: string | null;
      order: number;
      path: string;
      createdAt?: number;
      updatedAt?: number;
      nodeCount: number;
      description?: string;
    };

type TreeItem =
  | { kind: "folder"; data: WorkflowFolder }
  | { kind: "workflow"; data: WorkflowEntity };

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`;
}

async function loadCurrentWorkflowIdAsync(): Promise<string | null> {
  try {
    const ctx = getContext();
    const id = await ctx.cache.read<string>(CURRENT_WORKFLOW_KEY, {
      namespace: NAMESPACE,
    });
    return id ?? null;
  } catch (error) {
    console.error("加载当前工作流 ID 失败:", error);
    return null;
  }
}

async function saveCurrentWorkflowIdAsync(workflowId: string | null) {
  try {
    const ctx = getContext();
    if (workflowId) {
      await ctx.cache.save<string>(CURRENT_WORKFLOW_KEY, workflowId, {
        namespace: NAMESPACE,
      });
    } else {
      await ctx.cache.remove(CURRENT_WORKFLOW_KEY, { namespace: NAMESPACE });
    }
  } catch (error) {
    console.error("保存当前工作流 ID 失败:", error);
  }
}

async function loadGlobalVariablesAsync(): Promise<GlobalVariable[]> {
  try {
    const ctx = getContext();
    const list = await ctx.cache.read<GlobalVariable[]>(GLOBAL_VARIABLES_KEY, {
      namespace: NAMESPACE,
    });
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.error("加载全局变量失败:", error);
    return [];
  }
}

async function saveGlobalVariablesAsync(variables: GlobalVariable[]) {
  try {
    const ctx = getContext();
    await ctx.cache.save(GLOBAL_VARIABLES_KEY, variables, {
      namespace: NAMESPACE,
    });
  } catch (error) {
    console.error("保存全局变量失败:", error);
  }
}

function createDefaultState(): WorkflowStorageState {
  const now = Date.now();
  const rootFolder: WorkflowFolder = {
    id: generateId("folder"),
    name: "我的工作流",
    parentId: null,
    order: 0,
    createdAt: now,
    updatedAt: now,
  };
  const workflow: WorkflowEntity = {
    workflow_id: "workflow-1",
    name: "基础流程",
    description: "基础流程示例",
    folderId: rootFolder.id,
    order: 0,
    nodes: [],
    edges: [],
    createdAt: now,
    updatedAt: now,
  };
  return {
    version: STORAGE_VERSION,
    workflows: [workflow],
    folders: [rootFolder],
  };
}

function migrateLegacyWorkflows(
  workflows: LegacyWorkflow[]
): WorkflowStorageState {
  const now = Date.now();
  const folders: WorkflowFolder[] = [];
  const folderIdByPath = new Map<string, string>();
  const orderCounterByParent = new Map<string | null, number>();

  const getNextOrder = (parentId: string | null) => {
    const current = orderCounterByParent.get(parentId) ?? 0;
    orderCounterByParent.set(parentId, current + 1);
    return current;
  };

  const ensureFolder = (path: string): string | null => {
    if (!path) return null;
    if (folderIdByPath.has(path)) return folderIdByPath.get(path) || null;

    const parts = path.split("/").filter(Boolean);
    let parentId: string | null = null;
    let currentPath = "";
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (folderIdByPath.has(currentPath)) {
        parentId = folderIdByPath.get(currentPath) || null;
        continue;
      }
      const folder: WorkflowFolder = {
        id: generateId("folder"),
        name: part,
        parentId,
        order: getNextOrder(parentId),
        createdAt: now,
        updatedAt: now,
      };
      folders.push(folder);
      folderIdByPath.set(currentPath, folder.id);
      parentId = folder.id;
    }

    return folderIdByPath.get(path) ?? null;
  };

  const migratedWorkflows: WorkflowEntity[] = workflows.map(
    (workflow, index) => {
      const folderId = ensureFolder(workflow.path);
      return {
        ...workflow,
        folderId,
        order: index,
        createdAt: workflow.createdAt ?? now,
        updatedAt: workflow.updatedAt ?? now,
      };
    }
  );

  if (folders.length === 0) {
    const state = createDefaultState();
    return {
      version: STORAGE_VERSION,
      workflows: state.workflows,
      folders: state.folders,
    };
  }

  return {
    version: STORAGE_VERSION,
    workflows: migratedWorkflows,
    folders,
  };
}

async function loadWorkflowStateAsync(): Promise<WorkflowStorageState> {
  try {
    const ctx = getContext();
    const parsed = await ctx.cache.read<
      WorkflowStorageState | LegacyWorkflow[]
    >(STORAGE_KEY, { namespace: NAMESPACE });

    if (!parsed) {
      return createDefaultState();
    }

    if (Array.isArray(parsed)) {
      return migrateLegacyWorkflows(parsed);
    }

    if (!parsed.version || parsed.version < STORAGE_VERSION) {
      const legacy = (parsed as unknown as { workflows?: LegacyWorkflow[] })
        .workflows;
      if (legacy && Array.isArray(legacy)) {
        return migrateLegacyWorkflows(legacy);
      }
      return createDefaultState();
    }

    return parsed;
  } catch (error) {
    console.error("加载工作流失败:", error);
    return createDefaultState();
  }
}

async function saveWorkflowStateAsync(state: WorkflowStorageState) {
  try {
    const ctx = getContext();
    await ctx.cache.save(STORAGE_KEY, state, { namespace: NAMESPACE });
  } catch (error) {
    console.error("保存工作流失败:", error);
  }
}

function buildFolderPath(
  folders: WorkflowFolder[],
  folderId: string | null,
  cache: Map<string, string>
): string {
  if (!folderId) return "";
  if (cache.has(folderId)) return cache.get(folderId) || "";
  const folder = folders.find((item) => item.id === folderId);
  if (!folder) return "";
  const parentPath = buildFolderPath(folders, folder.parentId, cache);
  const fullPath = parentPath ? `${parentPath}/${folder.name}` : folder.name;
  cache.set(folderId, fullPath);
  return fullPath;
}

function computeFolderPathsList(folders: WorkflowFolder[]): string[] {
  const result: string[] = [];
  const cache = new Map<string, string>();

  const traverse = (parentId: string | null) => {
    const children = folders
      .filter((folder) => folder.parentId === parentId)
      .sort((a, b) => a.order - b.order);

    for (const child of children) {
      const path = buildFolderPath(folders, child.id, cache);
      if (path) {
        result.push(path);
      }
      traverse(child.id);
    }
  };

  traverse(null);
  return result;
}

function matchesMeta(item: TreeItem, meta: WorkflowTreeMeta): boolean {
  if (meta.type === "folder") {
    return item.kind === "folder" && item.data.id === meta.folderId;
  }
  return item.kind === "workflow" && item.data.workflow_id === meta.workflowId;
}

function buildTreeOptions(
  folders: WorkflowFolder[],
  workflows: WorkflowEntity[]
): TreeOption[] {
  const cache = new Map<string, string>();

  const getChildren = (parentId: string | null): TreeOption[] => {
    const folderChildren = folders
      .filter((folder) => folder.parentId === parentId)
      .map<TreeOption>((folder) => {
        const children = getChildren(folder.id);
        const meta: WorkflowTreeMeta = {
          type: "folder",
          folderId: folder.id,
          parentFolderId: folder.parentId,
          order: folder.order,
          path: buildFolderPath(folders, folder.id, cache),
        };
        return {
          key: `folder-${folder.id}`,
          label: folder.name,
          isLeaf: false,
          children,
          meta,
        };
      });

    const workflowChildren = workflows
      .filter((workflow) => workflow.folderId === parentId)
      .map<TreeOption>((workflow) => {
        const meta: WorkflowTreeMeta = {
          type: "workflow",
          workflowId: workflow.workflow_id,
          parentFolderId: workflow.folderId,
          order: workflow.order,
          path: buildFolderPath(folders, workflow.folderId, cache),
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt,
          nodeCount: workflow.nodes.length,
          description: workflow.description,
        };
        return {
          key: workflow.workflow_id,
          label: workflow.name || "未命名工作流",
          isLeaf: true,
          meta,
        };
      });

    const allChildren = [...folderChildren, ...workflowChildren];
    allChildren.sort((a, b) => {
      const metaA = a.meta as WorkflowTreeMeta | undefined;
      const metaB = b.meta as WorkflowTreeMeta | undefined;
      const orderA = metaA?.order ?? 0;
      const orderB = metaB?.order ?? 0;
      return orderA - orderB;
    });

    return allChildren;
  };

  return getChildren(null);
}

export const useWorkflowStore = defineStore("workflow", () => {
  // 初始使用默认值，随后异步从缓存水合
  const defaultState = createDefaultState();
  const workflows = ref<WorkflowEntity[]>(defaultState.workflows);
  const folders = ref<WorkflowFolder[]>(defaultState.folders);
  const currentWorkflowId = ref<string | null>(null);
  const globalVariables = ref<GlobalVariable[]>([]);

  (async () => {
    const state = await loadWorkflowStateAsync();
    workflows.value = state.workflows;
    folders.value = state.folders;
    currentWorkflowId.value = await loadCurrentWorkflowIdAsync();
    globalVariables.value = await loadGlobalVariablesAsync();
  })();

  // 防抖计时器
  let persistTimer: number | null = null;
  const PERSIST_DEBOUNCE_MS = 500; // 防抖延迟 500ms

  const currentWorkflow = computed<WorkflowEntity | null>(() => {
    if (!currentWorkflowId.value) return null;
    return (
      workflows.value.find(
        (workflow) => workflow.workflow_id === currentWorkflowId.value
      ) || null
    );
  });

  const workflowCount = computed(() => workflows.value.length);

  const treeData = computed<TreeOption[]>(() =>
    buildTreeOptions(folders.value, workflows.value)
  );

  const folderPathList = computed<string[]>(() =>
    computeFolderPathsList(folders.value)
  );

  async function persistState() {
    await saveWorkflowStateAsync({
      version: STORAGE_VERSION,
      workflows: workflows.value,
      folders: folders.value,
    });
  }

  // 使用防抖来减少 localStorage 写入频率
  watch(
    [workflows, folders],
    () => {
      if (persistTimer !== null) {
        clearTimeout(persistTimer);
      }
      persistTimer = window.setTimeout(() => {
        void persistState();
        persistTimer = null;
      }, PERSIST_DEBOUNCE_MS);
    },
    { deep: true, flush: "post" }
  );

  watch(currentWorkflowId, (newId) => {
    void saveCurrentWorkflowIdAsync(newId);
  });

  watch(
    globalVariables,
    () => {
      void saveGlobalVariablesAsync(globalVariables.value);
    },
    { deep: true }
  );

  function findFolderById(folderId: string | null): WorkflowFolder | undefined {
    if (!folderId) return undefined;
    return folders.value.find((folder) => folder.id === folderId);
  }

  function findWorkflowById(workflowId: string): WorkflowEntity | undefined {
    return workflows.value.find(
      (workflow) => workflow.workflow_id === workflowId
    );
  }

  function buildFolderPathCached(folderId: string | null): string {
    return buildFolderPath(folders.value, folderId, new Map());
  }

  function getChildrenItems(parentId: string | null): TreeItem[] {
    const folderChildren = folders.value
      .filter((folder) => folder.parentId === parentId)
      .map<TreeItem>((folder) => ({ kind: "folder", data: folder }));

    const workflowChildren = workflows.value
      .filter((workflow) => workflow.folderId === parentId)
      .map<TreeItem>((workflow) => ({ kind: "workflow", data: workflow }));

    const combined = [...folderChildren, ...workflowChildren];
    combined.sort((a, b) => {
      const orderA = a.kind === "folder" ? a.data.order : a.data.order;
      const orderB = b.kind === "folder" ? b.data.order : b.data.order;
      return orderA - orderB;
    });

    return combined;
  }

  function setChildrenOrder(items: TreeItem[]) {
    items.forEach((item, index) => {
      if (item.kind === "folder") {
        item.data.order = index;
        item.data.updatedAt = Date.now();
      } else {
        item.data.order = index;
        item.data.updatedAt = Date.now();
      }
    });
  }

  function ensureFolderPath(path: string): string | null {
    const segments = path
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (segments.length === 0) return null;

    let parentId: string | null = null;

    for (const segment of segments) {
      let folder = folders.value.find(
        (item) => item.parentId === parentId && item.name === segment
      );

      if (!folder) {
        const now = Date.now();
        const order: number = getChildrenItems(parentId).length;
        folder = {
          id: generateId("folder"),
          name: segment,
          parentId,
          order,
          createdAt: now,
          updatedAt: now,
        };
        folders.value.push(folder);
      }

      parentId = folder.id;
    }

    return parentId;
  }

  function createWorkflow(
    name: string,
    folderPath: string = "我的工作流",
    description?: string
  ): WorkflowEntity {
    const now = Date.now();
    const folderId = folderPath ? ensureFolderPath(folderPath) : null;
    const order = getChildrenItems(folderId).length;

    const workflow: WorkflowEntity = {
      workflow_id: generateId("workflow"),
      name,
      description,
      folderId,
      order,
      nodes: [],
      edges: [],
      createdAt: now,
      updatedAt: now,
    };

    workflows.value.push(workflow);
    return workflow;
  }

  function deleteWorkflow(workflowId: string) {
    const index = workflows.value.findIndex(
      (workflow) => workflow.workflow_id === workflowId
    );
    if (index === -1) return;

    const workflow = workflows.value[index]!;
    const siblings = getChildrenItems(workflow.folderId).filter(
      (item) =>
        !(item.kind === "workflow" && item.data.workflow_id === workflowId)
    );
    setChildrenOrder(siblings);
    workflows.value.splice(index, 1);

    if (currentWorkflowId.value === workflowId) {
      currentWorkflowId.value = null;
    }
  }

  function updateWorkflow(
    workflowId: string,
    updates: Partial<WorkflowEntity>
  ) {
    const workflow = findWorkflowById(workflowId);
    if (!workflow) return;

    Object.assign(workflow, updates, { updatedAt: Date.now() });
  }

  function setCurrentWorkflow(workflowId: string | null) {
    currentWorkflowId.value = workflowId;
  }

  function getWorkflowById(workflowId: string): WorkflowEntity | undefined {
    return findWorkflowById(workflowId);
  }

  function renameWorkflow(workflowId: string, newName: string) {
    updateWorkflow(workflowId, { name: newName });
  }

  function moveWorkflow(workflowId: string, newPath: string) {
    const workflow = findWorkflowById(workflowId);
    if (!workflow) return;

    const targetFolderId = newPath ? ensureFolderPath(newPath) : null;
    const siblings = getChildrenItems(targetFolderId).filter(
      (item) =>
        !(item.kind === "workflow" && item.data.workflow_id === workflowId)
    );

    if (workflow.folderId !== targetFolderId) {
      const originalSiblings = getChildrenItems(workflow.folderId).filter(
        (item) =>
          !(item.kind === "workflow" && item.data.workflow_id === workflowId)
      );
      setChildrenOrder(originalSiblings);
    }

    siblings.push({ kind: "workflow", data: workflow });
    setChildrenOrder(siblings);
    workflow.folderId = targetFolderId;
    workflow.updatedAt = Date.now();
  }

  function duplicateWorkflow(workflowId: string): WorkflowEntity | null {
    const original = findWorkflowById(workflowId);
    if (!original) return null;

    const now = Date.now();
    const order = getChildrenItems(original.folderId).length;
    const duplicate: WorkflowEntity = {
      ...JSON.parse(JSON.stringify(original)),
      workflow_id: generateId("workflow"),
      name: `${original.name} (副本)`,
      order,
      createdAt: now,
      updatedAt: now,
    };

    workflows.value.push(duplicate);
    return duplicate;
  }

  function clearAllWorkflows() {
    workflows.value = [];
    folders.value = [];
    currentWorkflowId.value = null;
  }

  function resetToDefaults() {
    const state = createDefaultState();
    workflows.value = state.workflows;
    folders.value = state.folders;
    currentWorkflowId.value = null;
  }

  function exportWorkflow(workflowId: string): string | null {
    const workflow = findWorkflowById(workflowId);
    if (!workflow) return null;
    return JSON.stringify(workflow, null, 2);
  }

  function importWorkflow(jsonString: string): WorkflowEntity | null {
    try {
      const parsed = JSON.parse(jsonString) as Workflow;
      const now = Date.now();
      const order = getChildrenItems(null).length;
      const workflow: WorkflowEntity = {
        ...parsed,
        workflow_id: generateId("workflow"),
        folderId: null,
        order,
        createdAt: now,
        updatedAt: now,
      };
      workflows.value.push(workflow);
      return workflow;
    } catch (error) {
      console.error("导入工作流失败:", error);
      return null;
    }
  }

  function createFolder(name: string, parentPath = ""): WorkflowFolder {
    const normalizedName = name.trim();
    const normalizedParent = parentPath.trim();
    const parentId = normalizedParent
      ? ensureFolderPath(normalizedParent)
      : null;

    const existing = folders.value.find(
      (folder) => folder.parentId === parentId && folder.name === normalizedName
    );
    if (existing) {
      return existing;
    }

    const now = Date.now();
    const order = getChildrenItems(parentId).length;
    const folder: WorkflowFolder = {
      id: generateId("folder"),
      name: normalizedName,
      parentId,
      order,
      createdAt: now,
      updatedAt: now,
    };

    folders.value.push(folder);
    return folder;
  }

  function deleteFolder(
    folderId: string,
    recursive = false
  ): {
    success: boolean;
    message: string;
    deletedCount?: { folders: number; workflows: number };
  } {
    const folder = findFolderById(folderId);
    if (!folder) {
      return { success: false, message: "文件夹不存在" };
    }

    const children = getChildrenItems(folderId);

    if (children.length > 0 && !recursive) {
      return {
        success: false,
        message: `文件夹不为空，包含 ${children.length} 个项目`,
      };
    }

    let deletedFolders = 0;
    let deletedWorkflows = 0;

    if (recursive) {
      const deleteRecursively = (id: string) => {
        const items = getChildrenItems(id);
        for (const item of items) {
          if (item.kind === "folder") {
            deleteRecursively(item.data.id);
            const index = folders.value.findIndex((f) => f.id === item.data.id);
            if (index > -1) {
              folders.value.splice(index, 1);
              deletedFolders++;
            }
          } else {
            const index = workflows.value.findIndex(
              (w) => w.workflow_id === item.data.workflow_id
            );
            if (index > -1) {
              workflows.value.splice(index, 1);
              deletedWorkflows++;
              if (currentWorkflowId.value === item.data.workflow_id) {
                currentWorkflowId.value = null;
              }
            }
          }
        }
      };

      deleteRecursively(folderId);
    }

    const index = folders.value.findIndex((f) => f.id === folderId);
    if (index > -1) {
      folders.value.splice(index, 1);
      deletedFolders++;
    }

    const siblings = getChildrenItems(folder.parentId).filter(
      (item) => !(item.kind === "folder" && item.data.id === folderId)
    );
    setChildrenOrder(siblings);

    return {
      success: true,
      message: recursive ? `已删除文件夹及其内容` : "文件夹已删除",
      deletedCount: { folders: deletedFolders, workflows: deletedWorkflows },
    };
  }

  function isDescendant(
    targetFolderId: string | null,
    ancestorId: string
  ): boolean {
    let current = targetFolderId;
    while (current) {
      if (current === ancestorId) return true;
      const folder = findFolderById(current);
      current = folder?.parentId ?? null;
    }
    return false;
  }

  function computeTargetParentId(
    targetMeta: WorkflowTreeMeta,
    dropPosition: DropPosition
  ): string | null {
    if (dropPosition === "inside") {
      if (targetMeta.type === "folder") {
        return targetMeta.folderId;
      }
      return targetMeta.parentFolderId;
    }

    if (targetMeta.type === "folder") {
      return targetMeta.parentFolderId;
    }

    return targetMeta.parentFolderId;
  }

  function computeInsertIndex(
    siblings: TreeItem[],
    targetMeta: WorkflowTreeMeta,
    dropPosition: DropPosition
  ): number {
    if (dropPosition === "inside") {
      return siblings.length;
    }

    const targetIndex = siblings.findIndex((item) =>
      matchesMeta(item, targetMeta)
    );
    if (targetIndex === -1) {
      return siblings.length;
    }

    return dropPosition === "before" ? targetIndex : targetIndex + 1;
  }

  function handleTreeDrop(params: {
    dragMeta: WorkflowTreeMeta;
    targetMeta: WorkflowTreeMeta;
    dropPosition: DropPosition;
  }) {
    const { dragMeta, targetMeta, dropPosition } = params;

    if (dragMeta.type === "workflow" && targetMeta.type === "workflow") {
      if (dragMeta.workflowId === targetMeta.workflowId) return;
    }

    if (dragMeta.type === "folder" && targetMeta.type === "folder") {
      if (dragMeta.folderId === targetMeta.folderId) return;
    }

    const targetParentId = computeTargetParentId(targetMeta, dropPosition);

    if (dragMeta.type === "workflow") {
      const workflow = findWorkflowById(dragMeta.workflowId);
      if (!workflow) return;

      const sourceParentId = workflow.folderId;

      const siblings = getChildrenItems(targetParentId).filter(
        (item) =>
          !(
            item.kind === "workflow" &&
            item.data.workflow_id === workflow.workflow_id
          )
      );

      if (sourceParentId !== targetParentId) {
        const sourceSiblings = getChildrenItems(sourceParentId).filter(
          (item) =>
            !(
              item.kind === "workflow" &&
              item.data.workflow_id === workflow.workflow_id
            )
        );
        setChildrenOrder(sourceSiblings);
        workflow.folderId = targetParentId;
      }

      const insertIndex = computeInsertIndex(
        siblings,
        targetMeta,
        dropPosition
      );
      siblings.splice(insertIndex, 0, { kind: "workflow", data: workflow });
      setChildrenOrder(siblings);
      workflow.updatedAt = Date.now();
      return;
    }

    const folder = findFolderById(
      dragMeta.type === "folder" ? dragMeta.folderId : null
    );
    if (!folder) return;

    if (targetParentId === folder.id) return;
    if (isDescendant(targetParentId, folder.id)) return;

    const sourceParentId = folder.parentId;

    const siblings = getChildrenItems(targetParentId).filter(
      (item) => !(item.kind === "folder" && item.data.id === folder.id)
    );

    if (sourceParentId !== targetParentId) {
      const sourceSiblings = getChildrenItems(sourceParentId).filter(
        (item) => !(item.kind === "folder" && item.data.id === folder.id)
      );
      setChildrenOrder(sourceSiblings);
      folder.parentId = targetParentId;
    }

    const insertIndex = computeInsertIndex(siblings, targetMeta, dropPosition);
    siblings.splice(insertIndex, 0, { kind: "folder", data: folder });
    setChildrenOrder(siblings);
    folder.updatedAt = Date.now();
  }

  // ===== 全局变量操作 =====

  /**
   * 添加全局变量
   */
  function addGlobalVariable(variable: GlobalVariable) {
    globalVariables.value.push(variable);
  }

  /**
   * 更新全局变量
   */
  function updateGlobalVariable(key: string, updates: Partial<GlobalVariable>) {
    const variable = globalVariables.value.find((v) => v.key === key);
    if (variable) {
      Object.assign(variable, updates);
    }
  }

  /**
   * 删除全局变量
   */
  function deleteGlobalVariable(key: string) {
    const index = globalVariables.value.findIndex((v) => v.key === key);
    if (index > -1) {
      globalVariables.value.splice(index, 1);
    }
  }

  /**
   * 获取全局变量
   */
  function getGlobalVariable(key: string): GlobalVariable | undefined {
    return globalVariables.value.find((v) => v.key === key);
  }

  /**
   * 设置全局变量列表
   */
  function setGlobalVariables(variables: GlobalVariable[]) {
    globalVariables.value = variables;
  }

  function getGlobalVariableJson(): Record<string, any> {
    return globalVariables.value.reduce((acc, variable) => {
      acc[variable.key] = toRaw(variable.value);
      return acc;
    }, {} as Record<string, any>);
  }

  return {
    workflows,
    folders,
    currentWorkflowId,
    currentWorkflow,
    workflowCount,
    treeData,
    folderPathList,
    createWorkflow,
    deleteWorkflow,
    updateWorkflow,
    setCurrentWorkflow,
    getWorkflowById,
    renameWorkflow,
    moveWorkflow,
    duplicateWorkflow,
    clearAllWorkflows,
    resetToDefaults,
    exportWorkflow,
    importWorkflow,
    createFolder,
    deleteFolder,
    ensureFolderPath,
    handleTreeDrop,
    buildFolderPath: buildFolderPathCached,
    // 全局变量
    globalVariables,
    addGlobalVariable,
    updateGlobalVariable,
    deleteGlobalVariable,
    getGlobalVariable,
    setGlobalVariables,
    getGlobalVariableJson,
  };
});
