/**
 * 节点执行 Hook
 *
 * 职责：
 * - 准备工作流数据（nodes/edges）
 * - 调用 Worker 执行工作流
 * - 管理执行状态
 *
 * 注意：
 * - 所有节点执行逻辑都在 Worker 中
 * - 主线程只负责数据准备和状态管理
 * - 单节点执行功能已废弃（待通过 Worker 实现）
 */
import { ref, type Ref } from "vue";
import type { Node, Edge } from "@vue-flow/core";
import type {
  NodeData,
  NodeResult,
  NodeResultOutput,
} from "../../typings/nodeEditor";
import {
  buildVariableContext,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resolveConfigWithVariables, // 保留：其他组件（VariablePreview等）需要此导出
} from "../../workflow/variables/variableResolver";
import type { VariableTreeNode } from "../../workflow/variables/variableResolver";
import {
  type ExecutionLog,
  type WorkflowNode,
  type WorkflowEdge,
} from "workflow-node-executor";
import { getNodeTypeKey } from "./utils";
import { useWorkflowExecutionManager } from "../useWorkflowExecutionManager";
import { useNotifyStore } from "../../stores/notify";

export { resolveConfigWithVariables };

export function useNodeExecution(
  nodes: Ref<Node<NodeData>[]>,
  edges: Ref<Edge[]>,
  updateNodeResult: (nodeId: string, result: NodeResult) => void,
  _onSchedulePersist: () => void // 下划线前缀：表示参数保留但当前未使用
) {
  const isExecutingWorkflow = ref(false);
  const lastExecutionLog = ref<ExecutionLog | null>(null);
  const lastExecutionError = ref<string | null>(null);

  // 使用统一的执行管理器（支持 Worker 和 Server 模式）
  const executionManager = useWorkflowExecutionManager();
  const notify = useNotifyStore();
  let lastReadyErrorMessage = "";
  let lastReadyErrorTimestamp = 0;

  function notifyExecutorError(title: string, message: string) {
    const now = Date.now();
    if (
      message === lastReadyErrorMessage &&
      now - lastReadyErrorTimestamp < 2000
    ) {
      return;
    }
    lastReadyErrorMessage = message;
    lastReadyErrorTimestamp = now;
    notify.showError(title, message);
  }

  async function ensureExecutorReady(): Promise<boolean> {
    if (executionManager.mode.value === "server") {
      const status = executionManager.status.value;
      if (status === "error" || status === "disconnected") {
        notifyExecutorError(
          "执行服务器未连接",
          `请检查服务器地址：${executionManager.serverUrl.value}`
        );
        return false;
      }
    }

    if (executionManager.isReady.value) {
      return true;
    }

    let timeoutId: number | null = null;

    try {
      await Promise.race([
        executionManager.waitForReady(),
        new Promise((_, reject) => {
          timeoutId = window.setTimeout(() => {
            reject(new Error("执行器在 5 秒内未就绪"));
          }, 5000);
        }),
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error ?? "执行器未就绪");
      notifyExecutorError("执行器未就绪", message);
      return false;
    } finally {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    }

    if (!executionManager.isReady.value) {
      notifyExecutorError("执行器未就绪", "请稍后重试或检查连接状态");
      return false;
    }

    return true;
  }

  /** 收集节点输入数据 */
  function collectNodeInputs(nodeId: string): Record<string, any> {
    const inputs: Record<string, any> = {};

    const incomingEdges = edges.value.filter((edge) => edge.target === nodeId);

    for (const edge of incomingEdges) {
      const sourceNode = nodes.value.find((n) => n.id === edge.source);
      if (!sourceNode?.data?.result) continue;

      const handleId = edge.targetHandle || "default";
      const sourceHandleId = edge.sourceHandle || "result";

      const outputs = sourceNode.data.result.data.outputs || {};
      const outputKeys = Object.keys(outputs);
      const hasOutputs = outputKeys.length > 0;

      let entry: NodeResultOutput | undefined;

      if (sourceHandleId && sourceHandleId !== "result") {
        if (Object.prototype.hasOwnProperty.call(outputs, sourceHandleId)) {
          entry = outputs[sourceHandleId];
        }
      } else if (hasOutputs) {
        const key = outputKeys[0];
        if (key !== undefined) {
          entry = outputs[key];
        }
      }

      if (entry) {
        inputs[handleId] = entry.value;
      } else if (!hasOutputs) {
        inputs[handleId] = sourceNode.data.result.data.raw ?? null;
      } else {
        inputs[handleId] = undefined;
      }
    }

    return inputs;
  }

  /** 获取可用变量树 */
  function getAvailableVariables(nodeId: string): VariableTreeNode[] {
    const { tree } = buildVariableContext(nodeId, nodes.value, edges.value);
    return tree;
  }

  /**
   * 执行单个节点
   *
   * ⚠️ 已废弃：单节点执行功能已移除
   *
   * 原因：
   * - 所有节点执行已统一迁移到 Worker 中
   * - 主线程不再维护节点实例和执行逻辑
   *
   * TODO: 实现通过 Worker 执行单节点的功能
   * - 在 workflowWorker.ts 中添加 EXECUTE_SINGLE_NODE 消息类型
   * - 在 useWorkflowWorker.ts 中添加 executeSingleNode 方法
   * - 更新此函数调用 Worker 执行
   */
  async function executeNode(nodeId: string) {
    console.warn(
      "[useNodeExecution] ⚠️  单节点执行功能已废弃",
      `\n  节点 ID: ${nodeId}`,
      `\n  请使用完整工作流执行代替，或等待 Worker 单节点执行功能实现`
    );

    // 暂时显示错误提示
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node) {
      updateNodeResult(nodeId, {
        duration: 0,
        data: {
          outputs: {},
          raw: null,
          summary: "单节点执行功能暂不可用，请使用完整工作流执行",
        },
        status: "error",
        error: "单节点执行功能已迁移到 Worker，暂未实现",
        timestamp: Date.now(),
      });
    }
  }

  /** 执行工作流（使用 Worker） */
  async function executeWorkflow(
    workflowId: string,
    options: { clearPreviousResult?: boolean } = {}
  ) {
    if (isExecutingWorkflow.value) {
      notify.showWarning("正在执行工作流", "请等待当前执行完成");
      return;
    }

    const storeNodeMap = new Map<string, Node<NodeData>>(
      nodes.value.map((node) => [node.id, node])
    );

    const actionableNodes = Array.from(storeNodeMap.values()).filter(
      (node) => !node.data?.isContainer
    );

    if (actionableNodes.length === 0) {
      lastExecutionError.value = "画布中没有可执行的节点";
      notify.showError("无法执行工作流", "画布中没有可执行的节点");
      return;
    }

    const startNode = actionableNodes.find(
      (node) => getNodeTypeKey(node) === "start"
    );

    if (!startNode) {
      lastExecutionError.value = "请先添加开始节点";
      notify.showError("无法执行工作流", "请先添加开始节点");
      return;
    }

    const ready = await ensureExecutorReady();
    if (!ready) {
      lastExecutionError.value = "执行器未就绪";
      return;
    }

    isExecutingWorkflow.value = true;
    lastExecutionError.value = null;
    lastExecutionLog.value = null;

    const shouldClearResult = options.clearPreviousResult ?? true;

    // 清除之前的执行状态
    actionableNodes.forEach((node) => {
      if (!node.data) return;
      node.data.executionStatus = "pending";
      node.data.executionError = undefined;
      if (shouldClearResult && node.data.result) {
        delete node.data.result;
      }
      node.data.resultExpanded = false;
    });

    nodes.value.forEach((node) => {
      if (!node.data?.isContainer) {
        return;
      }
      node.data.executionStatus = undefined;
      node.data.executionError = undefined;
    });

    try {
      // 构建工作流节点和边数据
      const workflowNodes: WorkflowNode[] = actionableNodes.map((node) => ({
        id: node.id,
        type: node.type,
        parentNode: node.parentNode,
        data: JSON.parse(JSON.stringify(node.data ?? {})) as NodeData,
      }));

      const workflowEdges: WorkflowEdge[] = edges.value
        .filter((edge) => Boolean(edge.source) && Boolean(edge.target))
        .map((edge) => ({
          id: edge.id,
          source: edge.source as string,
          target: edge.target as string,
          sourceHandle: edge.sourceHandle ?? null,
          targetHandle: edge.targetHandle ?? null,
        }));

      // 使用执行管理器执行工作流（支持 Worker/Server 模式）
      // 注意：执行是异步的，状态更新通过事件系统（mitt）进行
      // useWorkflowExecution 会监听这些事件并更新节点状态
      console.log(
        `[useNodeExecution] 准备执行工作流 ID: ${workflowId}，节点数: ${workflowNodes.length}，边数: ${workflowEdges.length}`
      );
      console.log(
        `[useNodeExecution] 当前执行模式: ${executionManager.mode.value}`
      );

      const executionId = `exec_${Date.now()}`;
      executionManager.executeWorkflow(
        executionId,
        workflowId,
        workflowNodes,
        workflowEdges
      );

      console.log(
        `[useNodeExecution] 工作流执行已提交，执行 ID: ${executionId}，工作流 ID: ${workflowId}`
      );

      // 注意：与之前的同步执行不同，现在执行状态通过事件系统异步更新
      // isExecutingWorkflow 的状态将在工作流完成或错误时通过事件处理器重置
      return executionId;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? "执行失败");
      lastExecutionError.value = message;
      lastExecutionLog.value = null;

      notify.showError(
        "执行请求失败",
        message,
        error instanceof Error ? error.stack : undefined
      );

      actionableNodes.forEach((node) => {
        if (!node.data) return;
        if (node.data.executionStatus === "pending") {
          node.data.executionStatus = "error";
          node.data.executionError = message;
        }
      });

      isExecutingWorkflow.value = false;
      throw error;
    }
  }

  return {
    isExecutingWorkflow,
    lastExecutionLog,
    lastExecutionError,
    collectNodeInputs,
    getAvailableVariables,
    executeNode,
    executeWorkflow,
  };
}
