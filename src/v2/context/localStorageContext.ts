/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  GlobalContext,
  WorkflowContextApi,
  ConfigContextApi,
} from "./types";
import type { Workflow, WorkflowMetadata } from "@/v2/typings/workflow";

const NAMESPACE = "v2";
const WORKFLOW_PREFIX = "workflow:";
const CONFIG_PREFIX = "config:";

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`;
}

// Helper for localStorage access
const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(`${NAMESPACE}:${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error(`Error reading from localStorage [${key}]:`, error);
      return null;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(`${NAMESPACE}:${key}`, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage [${key}]:`, error);
    }
  },
  async remove(key: string): Promise<void> {
    localStorage.removeItem(`${NAMESPACE}:${key}`);
  },
};

// --- Workflow API Implementation ---
const createWorkflowApi = (): WorkflowContextApi => {
  /**
   * 获取所有工作流
   * 遍历 localStorage，过滤出所有 workflow: 前缀的 key
   */
  const getAllWorkflows = async (): Promise<Workflow[]> => {
    const workflows: Workflow[] = [];
    const prefix = `${NAMESPACE}:${WORKFLOW_PREFIX}`;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        const workflow = await storage.get<Workflow>(
          key.substring(NAMESPACE.length + 1)
        );
        if (workflow) {
          workflows.push(workflow);
        }
      }
    }

    return workflows;
  };

  return {
    async getList(): Promise<WorkflowMetadata[]> {
      const workflows = await getAllWorkflows();
      return workflows.map(({ nodes, edges, ...meta }) => meta);
    },

    async get(id: string): Promise<Workflow | null> {
      return storage.get<Workflow>(`${WORKFLOW_PREFIX}${id}`);
    },

    async create(data) {
      const now = Date.now();
      const newWorkflow: Workflow = {
        workflow_id: generateId("wf"),
        name: data.name || "新建工作流",
        path: data.path || "/",
        description: data.description || "",
        nodes: [],
        edges: [],
        createdAt: now,
        updatedAt: now,
      };
      await storage.set(
        `${WORKFLOW_PREFIX}${newWorkflow.workflow_id}`,
        newWorkflow
      );
      return newWorkflow;
    },

    async save(workflow) {
      const updatedWorkflow = { ...workflow, updatedAt: Date.now() };
      await storage.set(
        `${WORKFLOW_PREFIX}${workflow.workflow_id}`,
        updatedWorkflow
      );
      return updatedWorkflow;
    },

    async delete(id) {
      await storage.remove(`${WORKFLOW_PREFIX}${id}`);
    },
  };
};

// --- Config API Implementation ---
const createConfigApi = (): ConfigContextApi => ({
  get: <T>(key: string) => storage.get<T>(`${CONFIG_PREFIX}${key}`),
  set: <T>(key: string, value: T) =>
    storage.set(`${CONFIG_PREFIX}${key}`, value),
  delete: (key: string) => storage.remove(`${CONFIG_PREFIX}${key}`),
  async list() {
    const result: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${NAMESPACE}:${CONFIG_PREFIX}`)) {
        const value = await storage.get(key.substring(NAMESPACE.length + 1));
        const configKey = key.substring(`${NAMESPACE}:${CONFIG_PREFIX}`.length);
        result[configKey] = value;
      }
    }
    return result;
  },
});

/**
 * Creates a GlobalContext that operates on localStorage.
 */
export function createLocalStorageContext(): GlobalContext {
  return {
    workflow: createWorkflowApi(),
    config: createConfigApi(),
  };
}
