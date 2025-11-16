import type { Edge, Node } from "@vue-flow/core";

/**
 * 工作流元数据，用于在列表中显示，不包含 nodes 和 edges
 */
export interface WorkflowMetadata {
  workflow_id: string;
  name: string;
  path: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  order?: number; // 排序顺序，数字越小越靠前，默认为 0
}

/**
 * 完整的工作流数据结构
 */
export interface Workflow extends WorkflowMetadata {
  nodes: Node[];
  edges: Edge[];
}
