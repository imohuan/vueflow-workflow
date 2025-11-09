/**
 * 节点编辑器类型定义
 */

export interface NodeConfigData {
  label: string;
  description?: string;
  color?: string;
  noInputs?: boolean;
  noOutputs?: boolean;
  params?: Record<string, any>;
}

export type TabType = "node" | "general";
