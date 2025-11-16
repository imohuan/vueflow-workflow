import type { Workflow, WorkflowMetadata } from "@/v2/typings/workflow";

/**
 * 工作流模块接口
 */
export interface WorkflowContextApi {
  getList: () => Promise<WorkflowMetadata[]>;
  get: (id: string) => Promise<Workflow | null>;
  create: (
    data: Partial<
      Omit<WorkflowMetadata, "workflow_id" | "createdAt" | "updatedAt">
    >
  ) => Promise<Workflow>;
  save: (workflow: Workflow) => Promise<Workflow>;
  delete: (id: string) => Promise<void>;
}

/**
 * 配置模块接口
 */
export interface ConfigContextApi {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T) => Promise<void>;
  delete: (key: string) => Promise<void>;
  list: () => Promise<Record<string, any>>;
}

/**
 * 全局上下文接口定义
 */
export interface GlobalContext {
  workflow: WorkflowContextApi;
  config: ConfigContextApi;
}
