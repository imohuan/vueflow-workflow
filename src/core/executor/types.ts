import type { NodeData, NodeResult } from "@/typings/nodeEditor";
import type { MCPClient } from "@/core/mcp-client";
import type { BaseNode } from "@/core/nodes";

export type WorkflowStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "aborted";

export type NodeExecutionStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "skipped";

export interface WorkflowNode {
  /** 节点唯一 ID */
  id: string;
  /** Vue Flow 节点类型，可选 */
  type?: string;
  /** 节点数据 */
  data: NodeData;
  /** 父节点 ID（容器节点使用） */
  parentNode?: string;
  /** 额外元数据 */
  meta?: Record<string, unknown>;
}

export interface WorkflowEdge {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface WorkflowExecutorOptions {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  startNodeId?: string;
  client?: MCPClient;
  nodeFactory?: (type: string) => BaseNode | undefined;
  signal?: AbortSignal;
  logId?: string;
}

export interface NodeExecutionLog {
  nodeId: string;
  nodeName: string;
  status: NodeExecutionStatus;
  startTime: number;
  endTime?: number;
  input: Record<string, unknown> | null;
  output?: NodeResult;
  error?: string;
}

export interface ExecutionLog {
  logId: string;
  startTime: number;
  endTime?: number;
  status: Exclude<WorkflowStatus, "pending">;
  nodes: NodeExecutionLog[];
  error?: string;
}

export interface WorkflowExecutionResult {
  status: WorkflowStatus;
  log: ExecutionLog;
  /** 节点执行结果 */
  nodeResults: Record<string, NodeResult>;
  /** 执行后节点数据（包含 result） */
  nodes: WorkflowNode[];
  /** 未执行的节点列表 */
  skippedNodeIds: string[];
}
