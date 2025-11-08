/** 工作流管理 Store */
import { defineStore } from "pinia";
import { ref, computed } from "vue";

/** 工作流数据类型 */
export interface Workflow {
  id: string;
  title: string;
  /** 工作流数据（nodes 和 edges） */
  data: {
    nodes: any[];
    edges: any[];
  };
  createdAt: number;
  updatedAt: number;
}

/** 文件夹数据类型 */
export interface WorkflowFolder {
  id: string;
  name: string;
  workflows: Workflow[];
  subfolders?: WorkflowFolder[];
  expanded?: boolean;
}

const STORAGE_KEY = "workflow-folders";
const LAST_WORKFLOW_KEY = "workflow-last-edited";

/** 从本地存储加载数据 */
function loadFromStorage(): WorkflowFolder[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // 确保至少有一个文件夹
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("加载工作流数据失败:", error);
  }

  // 返回默认数据
  return [
    {
      id: "folder-default",
      name: "默认文件夹",
      expanded: true,
      workflows: [],
      subfolders: [],
    },
  ];
}

/** 保存上次编辑的工作流 ID */
function saveLastEditedWorkflow(workflowId: string) {
  try {
    localStorage.setItem(LAST_WORKFLOW_KEY, workflowId);
  } catch (error) {
    console.error("保存上次编辑的工作流失败:", error);
  }
}

/** 获取上次编辑的工作流 ID */
function getLastEditedWorkflow(): string | null {
  try {
    return localStorage.getItem(LAST_WORKFLOW_KEY);
  } catch (error) {
    console.error("获取上次编辑的工作流失败:", error);
    return null;
  }
}

/** 保存到本地存储 */
function saveToStorage(folders: WorkflowFolder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
  } catch (error) {
    console.error("保存工作流数据失败:", error);
  }
}

export const useWorkflowStore = defineStore("workflow", () => {
  // 状态
  const folders = ref<WorkflowFolder[]>(loadFromStorage());
  const currentWorkflowId = ref<string | null>(null);

  // 初始化：确保至少有一个文件夹
  if (folders.value.length === 0) {
    folders.value.push({
      id: "folder-default",
      name: "默认文件夹",
      expanded: true,
      workflows: [],
      subfolders: [],
    });
    saveToStorage(folders.value);
  }

  // 计算属性
  const currentWorkflow = computed(() => {
    if (!currentWorkflowId.value) return null;
    return findWorkflow(currentWorkflowId.value);
  });

  /**
   * 递归查找工作流
   */
  function findWorkflow(workflowId: string): Workflow | null {
    function search(folder: WorkflowFolder): Workflow | null {
      // 在当前文件夹中查找
      const workflow = folder.workflows.find((w) => w.id === workflowId);
      if (workflow) return workflow;

      // 在子文件夹中递归查找
      if (folder.subfolders) {
        for (const subfolder of folder.subfolders) {
          const found = search(subfolder);
          if (found) return found;
        }
      }

      return null;
    }

    for (const folder of folders.value) {
      const found = search(folder);
      if (found) return found;
    }

    return null;
  }

  /**
   * 递归查找文件夹
   */
  function findFolder(folderId: string): WorkflowFolder | null {
    function search(folder: WorkflowFolder): WorkflowFolder | null {
      if (folder.id === folderId) return folder;

      if (folder.subfolders) {
        for (const subfolder of folder.subfolders) {
          const found = search(subfolder);
          if (found) return found;
        }
      }

      return null;
    }

    for (const folder of folders.value) {
      const found = search(folder);
      if (found) return found;
    }

    return null;
  }

  /**
   * 生成唯一 ID
   */
  function generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 创建工作流
   */
  function createWorkflow(folderId?: string): string {
    // 如果指定了文件夹 ID，尝试查找该文件夹；否则使用第一个文件夹
    const targetFolder = folderId ? findFolder(folderId) : folders.value[0];

    // 如果找不到目标文件夹，返回空字符串表示失败
    if (!targetFolder) {
      console.warn(`无法创建工作流：找不到文件夹 ${folderId || "(默认)"}`);
      return "";
    }

    const newWorkflow: Workflow = {
      id: generateId("workflow"),
      title: `工作流 ${targetFolder.workflows.length + 1}`,
      data: {
        nodes: [],
        edges: [],
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    targetFolder.workflows.push(newWorkflow);
    saveToStorage(folders.value);

    return newWorkflow.id;
  }

  /**
   * 删除工作流
   */
  function deleteWorkflow(workflowId: string): boolean {
    function deleteFromFolder(folder: WorkflowFolder): boolean {
      const index = folder.workflows.findIndex((w) => w.id === workflowId);
      if (index !== -1) {
        folder.workflows.splice(index, 1);
        return true;
      }

      if (folder.subfolders) {
        for (const subfolder of folder.subfolders) {
          if (deleteFromFolder(subfolder)) return true;
        }
      }

      return false;
    }

    for (const folder of folders.value) {
      if (deleteFromFolder(folder)) {
        // 如果删除的是当前工作流，清空选择
        if (currentWorkflowId.value === workflowId) {
          currentWorkflowId.value = null;
        }
        saveToStorage(folders.value);
        return true;
      }
    }

    return false;
  }

  /**
   * 重命名工作流
   */
  function renameWorkflow(workflowId: string, newTitle: string): boolean {
    const workflow = findWorkflow(workflowId);
    if (workflow) {
      workflow.title = newTitle;
      workflow.updatedAt = Date.now();
      saveToStorage(folders.value);
      return true;
    }
    return false;
  }

  /**
   * 保存工作流数据（nodes 和 edges）
   */
  function saveWorkflowData(
    workflowId: string,
    data: { nodes: any[]; edges: any[] }
  ): boolean {
    const workflow = findWorkflow(workflowId);
    if (workflow) {
      workflow.data = data;
      workflow.updatedAt = Date.now();
      saveToStorage(folders.value);
      return true;
    }
    return false;
  }

  /**
   * 选择工作流
   */
  function selectWorkflow(workflowId: string): Workflow | null {
    const workflow = findWorkflow(workflowId);
    if (workflow) {
      currentWorkflowId.value = workflowId;
      saveLastEditedWorkflow(workflowId);
      return workflow;
    }
    return null;
  }

  /**
   * 获取所有工作流（扁平化列表）
   */
  function getAllWorkflows(): Workflow[] {
    const allWorkflows: Workflow[] = [];

    function collect(folder: WorkflowFolder) {
      allWorkflows.push(...folder.workflows);
      if (folder.subfolders) {
        folder.subfolders.forEach(collect);
      }
    }

    folders.value.forEach(collect);
    return allWorkflows;
  }

  /**
   * 初始化工作流
   * 自动选择上次编辑的工作流，如果没有则选择第一个，如果没有任何工作流则创建一个新的
   */
  function initializeWorkflow(): string | null {
    // 如果已经有选中的工作流，不需要初始化
    if (currentWorkflowId.value) {
      return currentWorkflowId.value;
    }

    // 1. 尝试加载上次编辑的工作流
    const lastWorkflowId = getLastEditedWorkflow();
    if (lastWorkflowId) {
      const workflow = findWorkflow(lastWorkflowId);
      if (workflow) {
        currentWorkflowId.value = lastWorkflowId;
        return lastWorkflowId;
      }
    }

    // 2. 尝试选择第一个工作流
    const allWorkflows = getAllWorkflows();
    if (allWorkflows.length > 0) {
      const firstWorkflow = allWorkflows[0];
      if (firstWorkflow) {
        currentWorkflowId.value = firstWorkflow.id;
        saveLastEditedWorkflow(firstWorkflow.id);
        return firstWorkflow.id;
      }
    }

    // 3. 没有任何工作流，创建一个新的
    const newWorkflowId = createWorkflow();
    if (newWorkflowId) {
      currentWorkflowId.value = newWorkflowId;
      saveLastEditedWorkflow(newWorkflowId);
      return newWorkflowId;
    }

    return null;
  }

  /**
   * 创建文件夹（总是创建到根节点）
   */
  function createFolder(): string {
    const newFolder: WorkflowFolder = {
      id: generateId("folder"),
      name: `新文件夹 ${folders.value.length + 1}`,
      expanded: true,
      workflows: [],
      subfolders: [],
    };

    // 总是添加到根节点
    folders.value.push(newFolder);

    saveToStorage(folders.value);
    return newFolder.id;
  }

  /**
   * 删除文件夹
   */
  function deleteFolder(folderId: string): boolean {
    // 不允许删除最后一个根文件夹
    if (folders.value.length === 1 && folders.value[0]?.id === folderId) {
      console.warn("不能删除最后一个文件夹");
      return false;
    }

    function deleteFromParent(
      parent: WorkflowFolder[] | undefined,
      targetId: string
    ): boolean {
      if (!parent) return false;

      const index = parent.findIndex((f) => f.id === targetId);
      if (index !== -1) {
        parent.splice(index, 1);
        return true;
      }

      for (const folder of parent) {
        if (
          folder.subfolders &&
          deleteFromParent(folder.subfolders, targetId)
        ) {
          return true;
        }
      }

      return false;
    }

    if (deleteFromParent(folders.value, folderId)) {
      saveToStorage(folders.value);
      return true;
    }

    return false;
  }

  /**
   * 重命名文件夹
   */
  function renameFolder(folderId: string, newName: string): boolean {
    const folder = findFolder(folderId);
    if (folder) {
      folder.name = newName;
      saveToStorage(folders.value);
      return true;
    }
    return false;
  }

  /**
   * 切换文件夹展开状态
   */
  function toggleFolder(folder: WorkflowFolder): void {
    folder.expanded = !folder.expanded;
    saveToStorage(folders.value);
  }

  /**
   * 移动工作流
   */
  function moveWorkflow(
    workflowId: string,
    targetId: string,
    targetType: "folder" | "workflow",
    position: "before" | "after" | "inside"
  ): boolean {
    // 找到源工作流
    const sourceWorkflow = findWorkflow(workflowId);
    if (!sourceWorkflow) return false;

    // 创建工作流的副本（避免引用问题）
    const workflowCopy = { ...sourceWorkflow };

    // 从原位置删除
    function removeWorkflow(folderList: WorkflowFolder[]): boolean {
      for (const folder of folderList) {
        const index = folder.workflows.findIndex((w) => w.id === workflowId);
        if (index !== -1) {
          folder.workflows.splice(index, 1);
          return true;
        }
        if (folder.subfolders && removeWorkflow(folder.subfolders)) {
          return true;
        }
      }
      return false;
    }

    if (!removeWorkflow(folders.value)) {
      return false;
    }

    // 根据目标类型和位置插入
    if (targetType === "folder") {
      const targetFolder = findFolder(targetId);
      if (!targetFolder) {
        // 恢复工作流
        folders.value[0]?.workflows.push(workflowCopy);
        return false;
      }

      if (position === "inside") {
        // 移入文件夹内部
        targetFolder.workflows.unshift(workflowCopy);
      } else {
        // before 或 after - 需要找到目标文件夹的父级
        // 保存 targetFolder 引用避免 TypeScript 类型检查问题
        const safetargetFolder = targetFolder;

        function insertRelativeToFolder(folderList: WorkflowFolder[]): boolean {
          const index = folderList.findIndex((f) => f.id === targetId);
          if (index !== -1) {
            // 在根节点上，不能插入工作流到根级别，只能移入文件夹内部
            safetargetFolder.workflows.unshift(workflowCopy);
            return true;
          }

          for (const folder of folderList) {
            if (folder.subfolders) {
              const subIndex = folder.subfolders.findIndex(
                (f) => f.id === targetId
              );
              if (subIndex !== -1) {
                // 找到了，插入到父文件夹的 workflows 中
                const insertIndex =
                  position === "before" ? 0 : folder.workflows.length;
                folder.workflows.splice(insertIndex, 0, workflowCopy);
                return true;
              }
              if (insertRelativeToFolder(folder.subfolders)) {
                return true;
              }
            }
          }
          return false;
        }

        if (!insertRelativeToFolder(folders.value)) {
          // 恢复工作流
          safetargetFolder.workflows.push(workflowCopy);
        }
      }
    } else {
      // 目标是工作流
      function insertRelativeToWorkflow(folderList: WorkflowFolder[]): boolean {
        for (const folder of folderList) {
          const index = folder.workflows.findIndex((w) => w.id === targetId);
          if (index !== -1) {
            const insertIndex = position === "before" ? index : index + 1;
            folder.workflows.splice(insertIndex, 0, workflowCopy);
            return true;
          }
          if (
            folder.subfolders &&
            insertRelativeToWorkflow(folder.subfolders)
          ) {
            return true;
          }
        }
        return false;
      }

      if (!insertRelativeToWorkflow(folders.value)) {
        // 恢复工作流
        folders.value[0]?.workflows.push(workflowCopy);
        return false;
      }
    }

    saveToStorage(folders.value);
    return true;
  }

  /**
   * 移动文件夹
   */
  function moveFolder(
    folderId: string,
    targetId: string,
    targetType: "folder" | "workflow",
    position: "before" | "after" | "inside"
  ): boolean {
    // 找到源文件夹
    const sourceFolder = findFolder(folderId);
    if (!sourceFolder) return false;

    // 不能移动到自己或自己的子文件夹
    function isDescendant(parent: WorkflowFolder, childId: string): boolean {
      if (parent.id === childId) return true;
      if (!parent.subfolders) return false;
      for (const sub of parent.subfolders) {
        if (isDescendant(sub, childId)) return true;
      }
      return false;
    }

    if (isDescendant(sourceFolder, targetId)) {
      console.warn("不能移动到自己或子文件夹");
      return false;
    }

    // 从原位置删除
    function removeFolder(
      folderList: WorkflowFolder[]
    ): WorkflowFolder | undefined {
      const index = folderList.findIndex((f) => f.id === folderId);
      if (index !== -1) {
        return folderList.splice(index, 1)[0];
      }

      for (const folder of folderList) {
        if (folder.subfolders) {
          const removed = removeFolder(folder.subfolders);
          if (removed) return removed;
        }
      }
      return undefined;
    }

    const removed = removeFolder(folders.value);
    if (!removed) return false;

    // 根据目标类型和位置插入
    if (targetType === "folder") {
      const targetFolder = findFolder(targetId);
      if (!targetFolder) {
        // 恢复
        folders.value.push(removed);
        return false;
      }

      if (position === "inside") {
        // 移入文件夹内部
        if (!targetFolder.subfolders) {
          targetFolder.subfolders = [];
        }
        targetFolder.subfolders.unshift(removed);
      } else {
        // before 或 after - 需要找到目标文件夹的父级
        // 保存 removed 引用避免 TypeScript 类型检查问题
        const safeRemoved = removed;

        function insertRelativeToFolder(folderList: WorkflowFolder[]): boolean {
          const index = folderList.findIndex((f) => f.id === targetId);
          if (index !== -1) {
            const insertIndex = position === "before" ? index : index + 1;
            folderList.splice(insertIndex, 0, safeRemoved);
            return true;
          }

          for (const folder of folderList) {
            if (
              folder.subfolders &&
              insertRelativeToFolder(folder.subfolders)
            ) {
              return true;
            }
          }
          return false;
        }

        if (!insertRelativeToFolder(folders.value)) {
          // 恢复
          folders.value.push(safeRemoved);
          return false;
        }
      }
    } else {
      // 目标是工作流 - 插入到工作流所在文件夹的同级
      // 保存 removed 引用避免 TypeScript 类型检查问题
      const safeRemoved = removed;

      function insertRelativeToWorkflow(folderList: WorkflowFolder[]): boolean {
        for (const folder of folderList) {
          const workflowIndex = folder.workflows.findIndex(
            (w) => w.id === targetId
          );
          if (workflowIndex !== -1) {
            // 找到了工作流，插入文件夹到同一级别
            if (!folder.subfolders) {
              folder.subfolders = [];
            }
            folder.subfolders.unshift(safeRemoved);
            return true;
          }
          if (
            folder.subfolders &&
            insertRelativeToWorkflow(folder.subfolders)
          ) {
            return true;
          }
        }
        return false;
      }

      if (!insertRelativeToWorkflow(folders.value)) {
        // 恢复
        folders.value.push(safeRemoved);
        return false;
      }
    }

    saveToStorage(folders.value);
    return true;
  }

  return {
    // 状态
    folders,
    currentWorkflowId,
    currentWorkflow,

    // 方法
    createWorkflow,
    deleteWorkflow,
    renameWorkflow,
    saveWorkflowData,
    selectWorkflow,
    initializeWorkflow,
    getAllWorkflows,
    createFolder,
    deleteFolder,
    renameFolder,
    toggleFolder,
    moveWorkflow,
    moveFolder,
    findWorkflow,
    findFolder,
  };
});
