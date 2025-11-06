import type {
  NodeDataType,
  PortConfig,
  NodeStyleConfig,
  NodeExecutionContext,
  NodeExecutionResult,
} from "./BaseFlowNode";
import { BaseFlowNode } from "./BaseFlowNode";

// 重新导出基础类型
export type {
  NodeDataType,
  PortConfig,
  NodeStyleConfig,
  NodeExecutionContext,
  NodeExecutionResult,
};

// 重新导出基类
export { BaseFlowNode };

// 节点类型定义
export type NodeType = string;

/**
 * 节点注册信息
 */
export interface NodeRegistration {
  /** 节点类型 */
  type: NodeType;
  /** 节点类 */
  nodeClass: new () => BaseFlowNode;
  /** 节点元信息 */
  metadata?: ReturnType<BaseFlowNode["getMetadata"]>;
}

/**
 * 节点工厂接口
 */
export interface INodeFactory {
  /**
   * 根据类型创建节点实例
   * @param type - 节点类型
   * @returns 节点实例或 undefined
   */
  create(type: NodeType): BaseFlowNode | undefined;

  /**
   * 注册节点类型
   * @param type - 节点类型
   * @param nodeClass - 节点类
   */
  register(type: NodeType, nodeClass: new () => BaseFlowNode): void;

  /**
   * 获取所有已注册的节点类型
   */
  getRegisteredTypes(): NodeType[];

  /**
   * 获取所有节点的元信息
   */
  getAllMetadata(): Array<ReturnType<BaseFlowNode["getMetadata"]>>;
}

/**
 * 节点执行器接口
 */
export interface INodeExecutor {
  /**
   * 执行节点
   * @param node - 节点实例
   * @param inputs - 输入数据
   * @param context - 执行上下文
   * @returns 执行结果
   */
  execute(
    node: BaseFlowNode,
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult>;

  /**
   * 批量执行节点
   * @param nodes - 节点数组
   * @param inputsArray - 输入数据数组
   * @param context - 执行上下文
   * @returns 执行结果数组
   */
  executeBatch(
    nodes: BaseFlowNode[],
    inputsArray: Array<Record<string, any>>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult[]>;

  /**
   * 取消执行
   */
  cancel(): void;
}

/**
 * 节点连接定义
 */
export interface NodeConnection {
  /** 源节点 ID */
  sourceNodeId: string;
  /** 源端口名称 */
  sourcePort: string;
  /** 目标节点 ID */
  targetNodeId: string;
  /** 目标端口名称 */
  targetPort: string;
}

/**
 * 节点实例配置
 */
export interface NodeInstanceConfig {
  /** 节点实例 ID */
  id: string;
  /** 节点类型 */
  type: NodeType;
  /** 节点标签（可选，用于覆盖默认标签） */
  label?: string;
  /** 节点位置 */
  position?: { x: number; y: number };
  /** 节点数据/配置 */
  data?: Record<string, any>;
}

/**
 * 工作流图定义
 */
export interface WorkflowGraph {
  /** 节点实例列表 */
  nodes: NodeInstanceConfig[];
  /** 连接列表 */
  connections: NodeConnection[];
  /** 工作流元信息 */
  metadata?: {
    name?: string;
    description?: string;
    version?: string;
    [key: string]: any;
  };
}

/**
 * 节点执行状态
 */
export type NodeExecutionStatus =
  | "idle" // 空闲
  | "pending" // 等待执行
  | "running" // 执行中
  | "success" // 成功
  | "error" // 错误
  | "cancelled"; // 已取消

/**
 * 节点执行记录
 */
export interface NodeExecutionRecord {
  /** 节点 ID */
  nodeId: string;
  /** 节点类型 */
  nodeType: NodeType;
  /** 执行状态 */
  status: NodeExecutionStatus;
  /** 输入数据 */
  inputs: Record<string, any>;
  /** 执行结果 */
  result?: NodeExecutionResult;
  /** 开始时间 */
  startTime?: number;
  /** 结束时间 */
  endTime?: number;
  /** 执行耗时（毫秒） */
  duration?: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 工作流执行日志
 */
export interface WorkflowExecutionLog {
  /** 执行 ID */
  executionId: string;
  /** 工作流 ID */
  workflowId?: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime?: number;
  /** 总耗时（毫秒） */
  duration?: number;
  /** 执行状态 */
  status: "running" | "success" | "error" | "cancelled";
  /** 节点执行记录 */
  nodeRecords: NodeExecutionRecord[];
  /** 错误信息 */
  error?: string;
}
