/**
 * 变量解析器适配器
 * 将 VueFlow 的节点和边转换为 executor 格式，并提取可用变量
 */

import type { Node, Edge } from "@vue-flow/core";
import {
  buildVariableContext,
  type VariableTreeNode,
  type VariableContextResult,
  type WorkflowNode,
  type WorkflowEdge,
} from "workflow-flow-nodes";
import type { GlobalVariable } from "@/v2/stores/workflow";

/**
 * 将 VueFlow Node 转换为 WorkflowNode
 */
function convertNode(node: Node): WorkflowNode {
  return {
    id: node.id,
    type: node.type || "custom",
    label: node.data?.label || node.label,
    position: node.position,
    data: node.data || {},
  };
}

/**
 * 将 VueFlow Edge 转换为 WorkflowEdge
 */
function convertEdge(edge: Edge): WorkflowEdge {
  return {
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle || undefined,
    target: edge.target,
    targetHandle: edge.targetHandle || undefined,
    data: edge.data || {},
  };
}

/**
 * 从 VueFlow 节点和边中提取可用变量
 *
 * @param targetNodeId - 目标节点 ID
 * @param nodes - VueFlow 节点列表
 * @param edges - VueFlow 边列表
 * @param globalVariables - 全局变量列表（可选）
 * @returns 变量上下文结果
 */
export function extractAvailableVariables(
  targetNodeId: string,
  nodes: Node[],
  edges: Edge[],
  globalVariables?: Record<string, any>
): VariableContextResult {
  // 转换为 executor 格式
  const workflowNodes: WorkflowNode[] = nodes.map(convertNode);
  const workflowEdges: WorkflowEdge[] = edges.map(convertEdge);

  // 使用 executor 的变量提取逻辑，全局变量在 buildVariableContext 内部处理
  return buildVariableContext(
    targetNodeId,
    workflowNodes,
    workflowEdges,
    undefined,
    globalVariables
  );
}

/**
 * 获取可用变量树（简化版本，只返回树）
 *
 * @param targetNodeId - 目标节点 ID
 * @param nodes - VueFlow 节点列表
 * @param edges - VueFlow 边列表
 * @param globalVariables - 全局变量列表（可选）
 * @returns 变量树节点数组
 */
export function getAvailableVariableTree(
  targetNodeId: string,
  nodes: Node[],
  edges: Edge[],
  globalVariables?: Record<string, any>
): VariableTreeNode[] {
  // extractAvailableVariables 已经在内部处理了全局变量
  const { tree } = extractAvailableVariables(
    targetNodeId,
    nodes,
    edges,
    globalVariables
  );
  return tree;
}

// 重新导出类型
export type {
  VariableTreeNode,
  VariableContextResult,
} from "workflow-flow-nodes";
