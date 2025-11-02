import type { BaseNode } from "./BaseNode.ts";

/**
 * 端口定义
 */
export interface PortDefinition {
  /** 端口ID */
  id: string;
  /** 端口名称 */
  name: string;
  /** 端口类型 */
  type: string;
  /** 端口说明 */
  description?: string;
  /** 是否必填 */
  required?: boolean;
  /** 是否为真正的端口（用于区分配置字段）默认为 false，表示配置字段 */
  isPort?: boolean;
}

/**
 * 节点执行结果输出
 */
export interface NodeResultOutput {
  /** 输出端口 ID */
  id: string;
  /** 输出名称 */
  label: string;
  /** 输出类型 */
  type: string;
  /** 输出值 */
  value: unknown;
  /** 输出描述 */
  description?: string;
}

/**
 * 节点执行结果数据
 */
export interface NodeResultData {
  /** 输出结果 */
  outputs: Record<string, NodeResultOutput>;
  /** 原始返回数据 */
  raw: unknown;
  /** 结果摘要 */
  summary?: string;
}

/**
 * 节点执行结果
 */
export interface NodeResult {
  /** 执行耗时（毫秒） */
  duration: number;
  /** 执行状态 */
  status: "success" | "error";
  /** 错误信息 */
  error?: string;
  /** 执行时间戳 */
  timestamp: number;
  /** 执行结果数据 */
  data: NodeResultData;
  /** For 循环节点的迭代执行结果 */
  iterations?: IterationResult[];
}

/**
 * For 循环迭代结果
 */
export interface IterationResult {
  /** 迭代索引（0-based） */
  index: number;
  /** 当前迭代变量 */
  variables: Record<string, any>;
  /** 容器内节点的执行结果 */
  nodeResults: Record<string, NodeResult>;
  /** 单次迭代耗时（毫秒） */
  duration: number;
  /** 迭代执行状态 */
  status: "success" | "error";
  /** 迭代错误信息 */
  error?: string;
}

/**
 * 节点数据
 */
export interface NodeData {
  /** 节点配置数据 */
  config: Record<string, any>;
  /** 输入端口定义 */
  inputs: PortDefinition[];
  /** 输出端口定义 */
  outputs: PortDefinition[];
  /** 执行结果 */
  result?: NodeResult;
  /** 结果是否展开 */
  resultExpanded?: boolean;
  /** 节点执行状态 */
  executionStatus?: "pending" | "running" | "success" | "error" | "skipped";
  /** 节点执行错误信息 */
  executionError?: string;
  /** 节点标签 */
  label?: string;
  /** 节点分类 */
  category?: string;
  /** 节点宽度（可选） */
  width?: number;
  /** 节点高度（可选） */
  height?: number;
  /**
   * 自定义节点变体标识，例如区分“开始”、“条件”、“终止”等节点类型
   * 案例：variant: "start" | "condition" | "end" | "custom"
   * 示例用法：
   * {
   *   id: "node_1",
   *   data: {
   *     variant: "start"
   *   }
   * }
   */
  variant?: "start" | "condition" | "end" | "custom";
  /** 是否为容器节点 */
  isContainer?: boolean;
  /** 容器是否处于高亮状态（拖拽交集提示） */
  isHighlighted?: boolean;
  /** 容器高亮类型 */
  highlightType?: "normal" | "warning";
  /** 节点样式配置 */
  style?: {
    /**
     * 标题栏颜色配置
     * - 字符串：单色（如 "#a855f7"）
     * - 对象：渐变配置
     *   - `{ from: string, to?: string }` - 渐变起始色和结束色（to 未提供时使用单色）
     *   - `{ color: string }` - 单色配置（等同于字符串）
     */
    headerColor?: string | { from: string; to?: string } | { color: string };
    /** 是否显示图标 */
    showIcon?: boolean;
    /**
     * 图标内容
     * - 字符串：emoji 或普通文本图标
     * - SVG 字符串：完整的 SVG HTML 代码（如 `<svg>...</svg>`）
     * - 组件名称：项目中已注册的图标组件名称（如 "IconPlay"）
     */
    icon?: string;
  };
}

/**
 * 工作流状态类型
 */
export type WorkflowStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "aborted";

/**
 * 节点执行状态类型
 */
export type NodeExecutionStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "skipped";

/**
 * 工作流执行上下文
 * 用于在工作流执行过程中共享状态和数据
 */
export interface WorkflowExecutionContext {
  /** MCP 客户端实例（由初始化节点设置） */
  mcpClient?: any;
  /** For 循环注入的当前迭代变量 */
  loopVariables?: Record<string, any>;
  /** 其他共享数据 */
  [key: string]: unknown;
}

/**
 * 执行栈帧
 */
export interface ExecutionFrame {
  /** 帧类型 */
  type: "normal" | "loop";
  /** 帧内待执行节点队列 */
  queue: string[];
  /** 已访问节点集合 */
  visited: Set<string>;
  /** 帧级上下文数据 */
  context: WorkflowExecutionContext;
  /** 循环执行上下文 */
  loopContext?: LoopExecutionContext;
}

/**
 * 循环执行上下文
 */
export interface LoopExecutionContext {
  /** For 节点 ID */
  forNodeId: string;
  /** 容器节点 ID */
  containerId: string;
  /** 迭代列表 */
  iterations: Record<string, any>[];
  /** 总迭代次数 */
  totalIterations: number;
  /** 当前迭代索引 */
  currentIteration: number;
  /** 当前迭代变量 */
  iterationVariables?: Record<string, any>;
  /** 每次迭代的执行结果 */
  iterationResults: IterationResult[];
  /** 是否在错误后继续执行 */
  continueOnError: boolean;
}

/**
 * 工作流节点
 */
export interface WorkflowNode {
  /** 节点唯一 ID */
  id: string;
  /**
   * Vue Flow 节点类型，可选
   * 常见类型有：
   * - 'default'   // 普通流程节点
   * - 'input'     // 输入节点
   * - 'output'    // 输出节点
   * - 'group'     // 分组容器节点
   * - 'custom'    // 自定义节点类型
   */
  type?: string;
  /** 节点数据 */
  data: NodeData;
  /** 父节点 ID（容器节点使用） */
  parentNode?: string;
  /** 额外元数据 */
  meta?: Record<string, unknown>;
}

/**
 * 工作流边
 */
export interface WorkflowEdge {
  /** 边的唯一 ID */
  id?: string;
  /** 源节点 ID */
  source: string;
  /** 目标节点 ID */
  target: string;
  /** 源端口句柄 */
  sourceHandle?: string | null;
  /** 目标端口句柄 */
  targetHandle?: string | null;
}

/**
 * 工作流事件发射器接口
 * 兼容 mitt 和其他事件发射器
 */
export interface WorkflowEventEmitter<T = any> {
  emit(event: string, payload: T): void;
}

/**
 * 工作流执行器选项
 */
export interface WorkflowExecutorOptions<TNode extends BaseNode = BaseNode> {
  /** 工作流节点数组 */
  nodes: WorkflowNode[];
  /** 工作流边数组 */
  edges: WorkflowEdge[];
  /** 开始节点 ID（可选，如果不指定则自动查找） */
  startNodeId?: string;
  /** 节点工厂函数，根据节点类型创建节点实例 类型相关于另类的名称了， 如if, for 都算是类型 */
  nodeFactory?: (type: string) => TNode | undefined;
  /** 中止信号（用于取消执行） */
  signal?: AbortSignal;
  /** 日志 ID */
  logId?: string;
  /** 工作流事件发射器（用于实时预览） */
  emitter?: WorkflowEventEmitter<any>;
  /** 执行任务 ID（用于实时预览） */
  executionId?: string;
  /** 工作流 ID（用于实时预览） */
  workflowId?: string;
}

/**
 * 节点执行日志
 */
export interface NodeExecutionLog {
  /** 节点 ID */
  nodeId: string;
  /** 节点名称 */
  nodeName: string;
  /** 执行状态 */
  status: NodeExecutionStatus;
  /** 开始时间（时间戳） */
  startTime: number;
  /** 结束时间（时间戳） */
  endTime?: number;
  /** 输入数据 */
  input: Record<string, unknown> | null;
  /** 输出结果 */
  output?: NodeResult;
  /** 错误信息 */
  error?: string;
}

/**
 * 执行日志
 */
export interface ExecutionLog {
  /** 日志 ID */
  logId: string;
  /** 开始时间（时间戳） */
  startTime: number;
  /** 结束时间（时间戳） */
  endTime?: number;
  /** 执行状态 */
  status: Exclude<WorkflowStatus, "pending">;
  /** 节点执行日志数组 */
  nodes: NodeExecutionLog[];
  /** 错误信息 */
  error?: string;
}

/**
 * 工作流执行结果
 */
export interface WorkflowExecutionResult {
  /** 工作流执行状态 */
  status: WorkflowStatus;
  /** 执行日志 */
  log: ExecutionLog;
  /** 节点执行结果 */
  nodeResults: Record<string, NodeResult>;
  /** 执行后节点数据（包含 result） */
  nodes: WorkflowNode[];
  /** 未执行的节点列表 */
  skippedNodeIds: string[];
}
