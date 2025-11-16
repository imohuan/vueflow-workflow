/**
 * 工作流 Store（重构版）
 * 基于 getContext().workflow 和 getContext().config 的新实现
 *
 * 数据结构：
 * - workflowList: WorkflowMetadata[] - 工作流元数据列表（从 context 获取）
 * - currentWorkflowId: string | null - 当前工作流 ID
 * - currentWorkflow: Workflow | null - 当前工作流完整数据
 * - folderPaths: string[] - 文件夹路径列表（从 config 获取，如 ["a", "a/b"]）
 * - globalVariables: GlobalVariable[] - 全局变量
 */

import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { getContext } from "../context";
import type { Workflow, WorkflowMetadata } from "../typings/workflow";
import { debounce } from "lodash-es";

// ============ 类型定义 ============

export interface GlobalVariable {
  key: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  value: any;
  description?: string;
}

export type GlobalVariableType = GlobalVariable["type"];

/** 树节点元数据 */
export type WorkflowTreeMeta =
  | { kind: "folder"; path: string; children?: WorkflowTreeMeta[] }
  | {
      kind: "workflow";
      workflow_id: string;
      name: string;
      path: string;
      description?: string;
      createdAt?: number;
      updatedAt?: number;
      order?: number;
    };

// ============ 常量 ============

const NAMESPACE = "v2";
const GLOBAL_VARIABLES_KEY = "workflow:globalVariables";
const FOLDER_PATHS_KEY = "workflow:folderPaths";
const CURRENT_WORKFLOW_ID_KEY = "workflow:currentWorkflowId";

// ============ 工具函数 ============

/**
 * 从 path 中提取文件夹路径（不包括最后一段）
 * 例如：
 * - "a/b/c" -> "a/b"
 * - "a" -> ""
 * - "" -> ""
 */
function getParentPath(path: string): string {
  if (!path) return "";
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}

/**
 * 从 path 中提取文件名（最后一段）
 * 例如：
 * - "a/b/c" -> "c"
 * - "a" -> "a"
 */
function getBaseName(path: string): string {
  if (!path) return "";
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

/**
 * 根据 workflow 列表和文件夹列表生成完整的目录树
 */
function buildTreeData(
  workflowList: WorkflowMetadata[],
  folderPaths: string[]
): WorkflowTreeMeta[] {
  // 收集所有文件夹（显式 + 隐含）
  const allFolders = new Set<string>(folderPaths);
  for (const workflow of workflowList) {
    const parentPath = getParentPath(workflow.path);
    if (parentPath) {
      allFolders.add(parentPath);
    }
  }

  // 创建文件夹映射：path -> 文件夹节点
  const folderMap = new Map<string, WorkflowTreeMeta>();
  for (const folderPath of allFolders) {
    folderMap.set(folderPath, {
      kind: "folder",
      path: folderPath,
      children: [],
    });
  }

  // 将工作流分配到对应的文件夹
  for (const workflow of workflowList) {
    const parentPath = getParentPath(workflow.path);
    const workflowNode: WorkflowTreeMeta = {
      kind: "workflow",
      workflow_id: workflow.workflow_id,
      name: workflow.name,
      path: workflow.path,
      description: workflow.description,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };

    if (parentPath) {
      // 工作流在某个文件夹下
      const folder = folderMap.get(parentPath);
      if (folder && folder.kind === "folder") {
        if (!folder.children) folder.children = [];
        folder.children.push(workflowNode);
      }
    } else {
      // 根级工作流，稍后添加到结果中
      folderMap.set(`__root__${workflow.workflow_id}`, workflowNode);
    }
  }

  // 建立文件夹的父子关系
  const result: WorkflowTreeMeta[] = [];
  const addedFolders = new Set<string>();

  // 递归添加文件夹及其子文件夹
  function addFolderAndChildren(folderPath: string) {
    if (addedFolders.has(folderPath)) return;
    addedFolders.add(folderPath);

    const folder = folderMap.get(folderPath);
    if (!folder || folder.kind !== "folder") return;

    // 找出这个文件夹的所有直接子文件夹
    const childFolders: string[] = [];
    for (const otherPath of allFolders) {
      if (getParentPath(otherPath) === folderPath) {
        childFolders.push(otherPath);
      }
    }

    // 添加子文件夹到 children
    for (const childPath of childFolders) {
      const childFolder = folderMap.get(childPath);
      if (childFolder && childFolder.kind === "folder") {
        if (!folder.children) folder.children = [];
        folder.children.push(childFolder);
        addFolderAndChildren(childPath);
      }
    }
  }

  // 添加根级文件夹（parentPath === ""）
  for (const folderPath of allFolders) {
    if (getParentPath(folderPath) === "") {
      addFolderAndChildren(folderPath);
      const folder = folderMap.get(folderPath);
      if (folder) {
        result.push(folder);
      }
    }
  }

  // 添加根级工作流
  for (const [key, node] of folderMap) {
    if (key.startsWith("__root__")) {
      result.push(node);
    }
  }

  return result;
}

/**
 * 将执行器 Workflow 类型转换为 v2 Workflow 类型
 */
function toV2Workflow(workflow: any): Workflow {
  return {
    workflow_id: workflow.workflow_id,
    name: workflow.name || "未命名工作流",
    path: workflow.path || "/",
    description: workflow.description || "",
    nodes: workflow.nodes || [],
    edges: workflow.edges || [],
    createdAt: workflow.createdAt || Date.now(),
    updatedAt: workflow.updatedAt || Date.now(),
  };
}

/**
 * 将 v2 Workflow 转换为执行器 Workflow 类型
 */
function toExecutorWorkflow(workflow: Workflow): any {
  return {
    workflow_id: workflow.workflow_id,
    name: workflow.name,
    path: workflow.path,
    description: workflow.description,
    nodes: workflow.nodes,
    edges: workflow.edges,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
  };
}

// ============ Store 定义 ============

export const useWorkflowStore = defineStore("workflow", () => {
  // ===== 状态 =====
  const workflowList = ref<WorkflowMetadata[]>([]);
  const currentWorkflowId = ref<string | null>(null);
  const currentWorkflow = ref<Workflow | null>(null);
  const folderPaths = ref<string[]>([]);
  const globalVariables = ref<GlobalVariable[]>([]);
  const initialized = ref(false);

  // ===== 计算属性 =====

  /**
   * 工作流数量
   */
  const workflowCount = computed(() => workflowList.value.length);

  /**
   * 目录树数据
   */
  const treeData = computed<WorkflowTreeMeta[]>(() =>
    buildTreeData(workflowList.value, folderPaths.value)
  );

  /**
   * 所有文件夹路径列表（包括显式和隐含的）
   */
  const allFolderPaths = computed<string[]>(() => {
    const folders = new Set(folderPaths.value);
    for (const workflow of workflowList.value) {
      const parentPath = getParentPath(workflow.path);
      if (parentPath) folders.add(parentPath);
    }
    return Array.from(folders).sort();
  });

  // ===== 初始化 =====

  /**
   * 异步初始化 store
   */
  async function initialize() {
    if (initialized.value) return;

    try {
      const ctx = getContext();

      // 1. 加载全局变量
      const savedVars = await ctx.config.get<GlobalVariable[]>(
        `${NAMESPACE}:${GLOBAL_VARIABLES_KEY}`
      );
      if (savedVars) {
        globalVariables.value = savedVars;
      }

      // 2. 加载文件夹列表
      const savedFolders = await ctx.config.get<string[]>(
        `${NAMESPACE}:${FOLDER_PATHS_KEY}`
      );
      if (savedFolders) {
        folderPaths.value = savedFolders;
      }

      // 3. 加载工作流列表
      const list = await ctx.workflow.getList();
      workflowList.value = list;

      // 4. 恢复当前工作流 ID
      const savedCurrentId = await ctx.config.get<string | null>(
        `${NAMESPACE}:${CURRENT_WORKFLOW_ID_KEY}`
      );

      if (
        savedCurrentId &&
        workflowList.value.some((w) => w.workflow_id === savedCurrentId)
      ) {
        currentWorkflowId.value = savedCurrentId;
      } else if (workflowList.value.length > 0) {
        currentWorkflowId.value = workflowList.value[0]!.workflow_id;
      }

      // 5. 加载当前工作流
      if (currentWorkflowId.value) {
        const workflow = await ctx.workflow.get(currentWorkflowId.value);
        if (workflow) {
          currentWorkflow.value = toV2Workflow(workflow);
        }
      }

      initialized.value = true;
      console.log("[WorkflowStore] 初始化完成");
    } catch (error) {
      console.error("[WorkflowStore] 初始化失败:", error);
      initialized.value = true;
    }
  }

  /**
   * 等待初始化完成
   */
  async function ready(): Promise<void> {
    if (initialized.value) return;
    // 等待初始化
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (initialized.value) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
      // 最多等待 10 秒
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 10000);
    });
  }

  // ===== 工作流 CRUD =====

  /**
   * 刷新工作流列表
   */
  async function refreshWorkflowList() {
    try {
      const ctx = getContext();
      const list = await ctx.workflow.getList();
      workflowList.value = list;
    } catch (error) {
      console.error("[WorkflowStore] 刷新工作流列表失败:", error);
    }
  }

  /**
   * 创建工作流
   */
  async function createWorkflow(
    name: string,
    folderPath: string = "",
    description?: string,
    forceRecreate: boolean = false
  ): Promise<Workflow | null> {
    try {
      const ctx = getContext();

      // 生成 path
      const path = folderPath ? `${folderPath}/${name}` : name;

      // 检查工作流是否已存在
      const existingWorkflow = workflowList.value.find((w) => w.path === path);

      if (existingWorkflow) {
        if (forceRecreate) {
          // 删除已存在的工作流
          await deleteWorkflow(existingWorkflow.workflow_id);
        } else {
          // 如果不强制重建，返回已存在的工作流
          currentWorkflowId.value = existingWorkflow.workflow_id;
          const fullWorkflow = await ctx.workflow.get(
            existingWorkflow.workflow_id
          );
          if (fullWorkflow) {
            currentWorkflow.value = toV2Workflow(fullWorkflow);
          }
          return currentWorkflow.value;
        }
      }

      // 通过 context 创建
      const created = await ctx.workflow.create({
        name,
        path,
        description,
      });

      if (!created) return null;

      const v2Workflow = toV2Workflow(created);

      // 更新本地列表
      workflowList.value.push({
        workflow_id: v2Workflow.workflow_id,
        name: v2Workflow.name,
        path: v2Workflow.path,
        description: v2Workflow.description,
        createdAt: v2Workflow.createdAt,
        updatedAt: v2Workflow.updatedAt,
      });

      // 设置为当前工作流
      currentWorkflowId.value = v2Workflow.workflow_id;
      currentWorkflow.value = v2Workflow;

      return v2Workflow;
    } catch (error) {
      console.error("[WorkflowStore] 创建工作流失败:", error);
      return null;
    }
  }

  /**
   * 删除工作流
   */
  async function deleteWorkflow(workflowId: string): Promise<boolean> {
    try {
      const ctx = getContext();
      await ctx.workflow.delete(workflowId);

      // 更新本地列表
      workflowList.value = workflowList.value.filter(
        (w) => w.workflow_id !== workflowId
      );

      // 如果删除的是当前工作流，清空
      if (currentWorkflowId.value === workflowId) {
        currentWorkflowId.value = null;
        currentWorkflow.value = null;

        // 如果还有其他工作流，选择第一个
        if (workflowList.value.length > 0) {
          await setCurrentWorkflow(workflowList.value[0]!.workflow_id);
        }
      }

      return true;
    } catch (error) {
      console.error("[WorkflowStore] 删除工作流失败:", error);
      return false;
    }
  }

  /**
   * 设置当前工作流
   */
  async function setCurrentWorkflow(workflowId: string): Promise<boolean> {
    try {
      const ctx = getContext();

      // 获取完整工作流数据
      const workflow = await ctx.workflow.get(workflowId);
      if (!workflow) {
        console.warn("[WorkflowStore] 工作流不存在:", workflowId);
        return false;
      }

      currentWorkflowId.value = workflowId;
      currentWorkflow.value = toV2Workflow(workflow);

      // 保存当前工作流 ID
      await ctx.config.set(
        `${NAMESPACE}:${CURRENT_WORKFLOW_ID_KEY}`,
        workflowId
      );

      return true;
    } catch (error) {
      console.error("[WorkflowStore] 设置当前工作流失败:", error);
      return false;
    }
  }

  /**
   * 更新当前工作流（高频操作，使用防抖）
   */
  const debouncedSaveWorkflow = debounce(async () => {
    if (!currentWorkflow.value) return;

    try {
      const ctx = getContext();
      const toSave = toExecutorWorkflow(currentWorkflow.value!);
      await ctx.workflow.save(toSave);

      // 更新列表中的元数据
      const idx = workflowList.value.findIndex(
        (w) => w.workflow_id === currentWorkflow.value!.workflow_id
      );
      if (idx >= 0) {
        const wf = currentWorkflow.value!;
        workflowList.value[idx] = {
          workflow_id: wf.workflow_id,
          name: wf.name,
          path: wf.path,
          description: wf.description,
          createdAt: wf.createdAt,
          updatedAt: wf.updatedAt,
        };
      }
    } catch (error) {
      console.error("[WorkflowStore] 保存工作流失败:", error);
    }
  }, 500);

  function updateWorkflow(
    workflowId: string,
    updates: Partial<Workflow>
  ): void {
    // 只允许更新当前工作流
    if (workflowId !== currentWorkflowId.value || !currentWorkflow.value) {
      console.warn("[WorkflowStore] 只能更新当前工作流");
      return;
    }

    Object.assign(currentWorkflow.value, updates, {
      updatedAt: Date.now(),
    });

    debouncedSaveWorkflow();
  }

  /**
   * 重命名工作流
   */
  async function renameWorkflow(
    workflowId: string,
    newName: string
  ): Promise<boolean> {
    try {
      const ctx = getContext();

      // 获取工作流
      const workflow = await ctx.workflow.get(workflowId);
      if (!workflow) return false;

      const v2Wf = toV2Workflow(workflow);

      // 生成新 path：保留文件夹，只改名字
      const parentPath = getParentPath(v2Wf.path);
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;

      // 保存
      v2Wf.name = newName;
      v2Wf.path = newPath;
      const toSave = toExecutorWorkflow(v2Wf);
      await ctx.workflow.save(toSave);

      // 更新本地
      const idx = workflowList.value.findIndex(
        (w) => w.workflow_id === workflowId
      );
      if (idx >= 0) {
        workflowList.value[idx]!.name = newName;
        workflowList.value[idx]!.path = newPath;
      }

      if (currentWorkflowId.value === workflowId && currentWorkflow.value) {
        currentWorkflow.value!.name = newName;
        currentWorkflow.value!.path = newPath;
      }

      return true;
    } catch (error) {
      console.error("[WorkflowStore] 重命名工作流失败:", error);
      return false;
    }
  }

  /**
   * 移动工作流到新文件夹
   */
  async function moveWorkflow(
    workflowId: string,
    targetFolderPath: string
  ): Promise<boolean> {
    try {
      const ctx = getContext();

      // 获取工作流
      const workflow = await ctx.workflow.get(workflowId);
      if (!workflow) return false;

      const v2Wf = toV2Workflow(workflow);
      const fileName = getBaseName(v2Wf.path);

      // 生成新 path
      const newPath = targetFolderPath
        ? `${targetFolderPath}/${fileName}`
        : fileName;

      // 保存
      v2Wf.path = newPath;
      const toSave = toExecutorWorkflow(v2Wf);
      await ctx.workflow.save(toSave);

      // 更新本地
      const idx = workflowList.value.findIndex(
        (w) => w.workflow_id === workflowId
      );
      if (idx >= 0) {
        workflowList.value[idx]!.path = newPath;
      }

      if (currentWorkflowId.value === workflowId && currentWorkflow.value) {
        currentWorkflow.value!.path = newPath;
      }

      return true;
    } catch (error) {
      console.error("[WorkflowStore] 移动工作流失败:", error);
      return false;
    }
  }

  /**
   * 复制工作流
   */
  async function duplicateWorkflow(
    workflowId: string
  ): Promise<Workflow | null> {
    try {
      const ctx = getContext();

      // 获取原工作流
      const original = await ctx.workflow.get(workflowId);
      if (!original) return null;

      const v2Original = toV2Workflow(original);

      // 生成新名字和 path
      const newName = `${v2Original.name} (副本)`;
      const parentPath = getParentPath(v2Original.path);
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;

      // 创建副本
      const created = await ctx.workflow.create({
        name: newName,
        path: newPath,
        description: v2Original.description,
      });

      if (!created) return null;

      const v2Created = toV2Workflow(created);

      // 复制节点和边
      v2Created.nodes = JSON.parse(JSON.stringify(v2Original.nodes));
      v2Created.edges = JSON.parse(JSON.stringify(v2Original.edges));

      // 保存
      const toSave = toExecutorWorkflow(v2Created);
      await ctx.workflow.save(toSave);

      // 更新本地列表
      workflowList.value.push({
        workflow_id: v2Created.workflow_id,
        name: v2Created.name,
        path: v2Created.path,
        description: v2Created.description,
        createdAt: v2Created.createdAt,
        updatedAt: v2Created.updatedAt,
      });

      return v2Created;
    } catch (error) {
      console.error("[WorkflowStore] 复制工作流失败:", error);
      return null;
    }
  }

  /**
   * 导出工作流为 JSON
   */
  function exportWorkflow(workflowId: string): string | null {
    const workflow = workflowList.value.find(
      (w) => w.workflow_id === workflowId
    );
    if (!workflow) return null;

    // 如果是当前工作流，导出完整数据；否则需要先获取
    if (currentWorkflowId.value === workflowId && currentWorkflow.value) {
      return JSON.stringify(currentWorkflow.value, null, 2);
    }

    // 对于非当前工作流，这里只返回元数据（完整数据需要异步获取）
    return JSON.stringify(workflow, null, 2);
  }

  /**
   * 导入工作流
   */
  async function importWorkflow(jsonString: string): Promise<Workflow | null> {
    try {
      const parsed = JSON.parse(jsonString);
      const v2Wf = toV2Workflow(parsed);

      const ctx = getContext();
      const created = await ctx.workflow.create({
        name: v2Wf.name,
        path: v2Wf.path,
        description: v2Wf.description,
      });

      if (!created) return null;

      const v2Created = toV2Workflow(created);
      v2Created.nodes = v2Wf.nodes;
      v2Created.edges = v2Wf.edges;

      const toSave = toExecutorWorkflow(v2Created);
      await ctx.workflow.save(toSave);

      workflowList.value.push({
        workflow_id: v2Created.workflow_id,
        name: v2Created.name,
        path: v2Created.path,
        description: v2Created.description,
        createdAt: v2Created.createdAt,
        updatedAt: v2Created.updatedAt,
      });

      return v2Created;
    } catch (error) {
      console.error("[WorkflowStore] 导入工作流失败:", error);
      return null;
    }
  }

  // ===== 文件夹操作 =====

  /**
   * 创建文件夹
   */
  async function createFolder(folderPath: string): Promise<boolean> {
    try {
      if (folderPaths.value.includes(folderPath)) {
        console.warn("[WorkflowStore] 文件夹已存在:", folderPath);
        return false;
      }

      folderPaths.value.push(folderPath);
      folderPaths.value.sort();

      // 保存到 config
      const ctx = getContext();
      await ctx.config.set(
        `${NAMESPACE}:${FOLDER_PATHS_KEY}`,
        folderPaths.value
      );

      return true;
    } catch (error) {
      console.error("[WorkflowStore] 创建文件夹失败:", error);
      return false;
    }
  }

  /**
   * 删除文件夹
   */
  async function deleteFolder(folderPath: string): Promise<boolean> {
    try {
      // 检查文件夹下是否有工作流
      const hasWorkflows = workflowList.value.some((w) =>
        w.path.startsWith(folderPath + "/")
      );

      if (hasWorkflows) {
        console.warn("[WorkflowStore] 文件夹下有工作流，无法删除");
        return false;
      }

      folderPaths.value = folderPaths.value.filter((p) => p !== folderPath);

      // 保存到 config
      const ctx = getContext();
      await ctx.config.set(
        `${NAMESPACE}:${FOLDER_PATHS_KEY}`,
        folderPaths.value
      );

      return true;
    } catch (error) {
      console.error("[WorkflowStore] 删除文件夹失败:", error);
      return false;
    }
  }

  /**
   * 重命名文件夹
   */
  async function renameFolder(
    oldPath: string,
    newName: string
  ): Promise<boolean> {
    try {
      const parentPath = getParentPath(oldPath);
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;

      return await moveFolder(oldPath, newPath);
    } catch (error) {
      console.error("[WorkflowStore] 重命名文件夹失败:", error);
      return false;
    }
  }

  /**
   * 移动文件夹（更改路径）
   */
  async function moveFolder(
    oldPath: string,
    newPath: string
  ): Promise<boolean> {
    try {
      if (oldPath === newPath) {
        return true; // 路径相同，无需移动
      }

      // 检查目标路径是否已存在（包括显式和隐含的文件夹）
      const allFolders = new Set(folderPaths.value);
      for (const workflow of workflowList.value) {
        const parentPath = getParentPath(workflow.path);
        if (parentPath) allFolders.add(parentPath);
      }
      if (allFolders.has(newPath)) {
        console.warn("[WorkflowStore] 目标文件夹路径已存在");
        return false;
      }

      // 检查不能将文件夹移动到自己的子文件夹中
      if (newPath.startsWith(oldPath + "/")) {
        console.warn("[WorkflowStore] 不能将文件夹移动到自己的子文件夹中");
        return false;
      }

      const ctx = getContext();
      const oldPrefix = oldPath + "/";
      const newPrefix = newPath + "/";

      // 收集所有需要更新的子文件夹路径（按长度排序，先更新长的）
      const subFoldersToUpdate: Array<{ old: string; new: string }> = [];
      for (const folderPath of folderPaths.value) {
        if (folderPath.startsWith(oldPrefix)) {
          const relativePath = folderPath.substring(oldPrefix.length);
          subFoldersToUpdate.push({
            old: folderPath,
            new: newPrefix + relativePath,
          });
        }
      }
      // 按路径长度降序排序，确保先更新深层文件夹
      subFoldersToUpdate.sort((a, b) => b.old.length - a.old.length);

      // 更新主文件夹路径
      const idx = folderPaths.value.indexOf(oldPath);
      if (idx >= 0) {
        folderPaths.value[idx] = newPath;
      } else {
        // 如果文件夹不在列表中（可能是隐含的），添加到新路径
        folderPaths.value.push(newPath);
      }

      // 更新所有子文件夹路径
      for (const { old, new: newFolderPath } of subFoldersToUpdate) {
        const subIdx = folderPaths.value.indexOf(old);
        if (subIdx >= 0) {
          folderPaths.value[subIdx] = newFolderPath;
        }
      }
      folderPaths.value.sort();

      // 更新所有在该文件夹下及其子文件夹的工作流 path
      // 按路径长度降序排序，确保先更新深层路径
      const workflowsToUpdate = workflowList.value
        .filter((w) => w.path.startsWith(oldPrefix))
        .sort((a, b) => b.path.length - a.path.length);

      for (const workflow of workflowsToUpdate) {
        const newWorkflowPath = workflow.path.replace(oldPrefix, newPrefix);

        // 更新工作流的 path
        const fullWorkflow = await ctx.workflow.get(workflow.workflow_id);
        if (fullWorkflow) {
          const v2Wf = toV2Workflow(fullWorkflow);
          v2Wf.path = newWorkflowPath;
          const toSave = toExecutorWorkflow(v2Wf);
          await ctx.workflow.save(toSave);

          // 更新本地列表
          workflow.path = newWorkflowPath;

          // 如果是当前工作流，也要更新
          if (
            currentWorkflowId.value === workflow.workflow_id &&
            currentWorkflow.value
          ) {
            currentWorkflow.value!.path = newWorkflowPath;
          }
        }
      }

      // 保存到 config
      await ctx.config.set(
        `${NAMESPACE}:${FOLDER_PATHS_KEY}`,
        folderPaths.value
      );

      return true;
    } catch (error) {
      console.error("[WorkflowStore] 移动文件夹失败:", error);
      return false;
    }
  }

  // ===== 全局变量 =====

  /**
   * 添加全局变量
   */
  function addGlobalVariable(variable: GlobalVariable): void {
    if (globalVariables.value.some((v) => v.key === variable.key)) {
      console.warn("[WorkflowStore] 变量已存在:", variable.key);
      return;
    }

    globalVariables.value.push(variable);
    saveGlobalVariables();
  }

  /**
   * 更新全局变量
   */
  function updateGlobalVariable(
    oldKey: string,
    variable: GlobalVariable
  ): void {
    const idx = globalVariables.value.findIndex((v) => v.key === oldKey);
    if (idx >= 0) {
      globalVariables.value[idx] = variable;
      saveGlobalVariables();
    }
  }

  /**
   * 删除全局变量
   */
  function deleteGlobalVariable(key: string): void {
    globalVariables.value = globalVariables.value.filter((v) => v.key !== key);
    saveGlobalVariables();
  }

  /**
   * 设置全局变量列表
   */
  function setGlobalVariables(variables: GlobalVariable[]): void {
    globalVariables.value = variables;
    saveGlobalVariables();
  }

  /**
   * 获取全局变量 JSON
   */
  function getGlobalVariableJson(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const variable of globalVariables.value) {
      result[variable.key] = variable.value;
    }
    return result;
  }

  /**
   * 保存全局变量到 config
   */
  async function saveGlobalVariables(): Promise<void> {
    try {
      const ctx = getContext();
      await ctx.config.set(
        `${NAMESPACE}:${GLOBAL_VARIABLES_KEY}`,
        globalVariables.value
      );
    } catch (error) {
      console.error("[WorkflowStore] 保存全局变量失败:", error);
    }
  }

  // ===== 其他方法 =====

  /**
   * 获取工作流元数据（用于只读场景）
   */
  function getWorkflowById(workflowId: string): WorkflowMetadata | undefined {
    return workflowList.value.find((w) => w.workflow_id === workflowId);
  }

  /**
   * 清空所有工作流
   */
  async function clearAllWorkflows(): Promise<void> {
    try {
      const ctx = getContext();

      // 删除所有工作流
      for (const workflow of workflowList.value) {
        await ctx.workflow.delete(workflow.workflow_id);
      }

      workflowList.value = [];
      currentWorkflowId.value = null;
      currentWorkflow.value = null;
    } catch (error) {
      console.error("[WorkflowStore] 清空工作流失败:", error);
    }
  }

  /**
   * 重置为默认状态
   */
  async function resetToDefaults(): Promise<void> {
    try {
      await clearAllWorkflows();

      // 创建一个默认工作流
      await createWorkflow("默认工作流", "", "默认工作流示例");
    } catch (error) {
      console.error("[WorkflowStore] 重置为默认状态失败:", error);
    }
  }

  // ===== 初始化 =====

  // 自动初始化
  (async () => {
    await initialize();
  })();

  // ===== 导出 =====

  return {
    // 状态
    workflowList,
    currentWorkflowId,
    currentWorkflow,
    folderPaths,
    globalVariables,
    initialized,

    // 计算属性
    workflowCount,
    treeData,
    allFolderPaths,

    // 初始化
    ready,

    // 工作流 CRUD
    refreshWorkflowList,
    createWorkflow,
    deleteWorkflow,
    setCurrentWorkflow,
    updateWorkflow,
    renameWorkflow,
    moveWorkflow,
    duplicateWorkflow,
    exportWorkflow,
    importWorkflow,
    getWorkflowById,
    clearAllWorkflows,
    resetToDefaults,

    // 文件夹操作
    createFolder,
    deleteFolder,
    renameFolder,
    moveFolder,

    // 全局变量
    addGlobalVariable,
    updateGlobalVariable,
    deleteGlobalVariable,
    setGlobalVariables,
    getGlobalVariableJson,
  };
});
