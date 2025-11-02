/**
 * 边管理 Hook
 * 负责连接线的添加、删除和验证
 */
import type { Ref } from "vue";
import type { Node, Edge } from "@vue-flow/core";
import type {
  NodeData,
  Connection,
  ConnectionValidationOptions,
} from "@/typings/nodeEditor";

export function useEdgeManagement(
  nodes: Ref<Node<NodeData>[]>,
  edges: Ref<Edge[]>,
  applyEdgeLayerClass: (edge: Edge) => void,
  refreshEdgeLayerClasses: () => void,
  onRecordHistory: () => void
) {
  /** 添加连接线 */
  function addEdge(edge: Edge) {
    edges.value.push(edge);
    applyEdgeLayerClass(edge);
    onRecordHistory();
  }

  /** 删除连接线 */
  function removeEdge(edgeId: string) {
    edges.value = edges.value.filter((e) => e.id !== edgeId);
    refreshEdgeLayerClasses();
    onRecordHistory();
  }

  /** 验证连接 */
  function validateConnection(
    connection: Connection,
    options: ConnectionValidationOptions = {}
  ): boolean {
    const { ignoreExisting = false, ignoreEdgeId = null } = options;

    // 1. 不能连接自己
    if (connection.source === connection.target) {
      console.warn("不能连接自己");
      return false;
    }

    // 2. 检查是否已存在连接
    if (!ignoreExisting) {
      const exists = edges.value.some((edge) => {
        if (ignoreEdgeId && edge.id === ignoreEdgeId) {
          return false;
        }
        return (
          edge.source === connection.source &&
          edge.sourceHandle === connection.sourceHandle &&
          edge.target === connection.target &&
          edge.targetHandle === connection.targetHandle
        );
      });

      if (exists) {
        console.warn("连接已存在");
        return false;
      }
    }

    // 3. 验证端口类型
    const sourceNode = nodes.value.find((n) => n.id === connection.source);
    const targetNode = nodes.value.find((n) => n.id === connection.target);

    if (!sourceNode || !targetNode) {
      console.warn("找不到节点");
      return false;
    }

    const sourceParent = sourceNode.parentNode || null;
    const targetParent = targetNode.parentNode || null;
    const isSourceContainer = sourceNode.type === "loopContainer";
    const isTargetContainer = targetNode.type === "loopContainer";
    const containerSideHandles = new Set(["loop-left", "loop-right"]);

    // 批处理循环端口专属规则
    const sourceIsLoopHandle = connection.sourceHandle === "loop";
    const targetIsLoopInHandle = connection.targetHandle === "loop-in";

    if (sourceIsLoopHandle) {
      const expectedContainerId = sourceNode.data?.config?.containerId as
        | string
        | undefined;
      if (expectedContainerId !== connection.target) {
        console.warn("批处理循环出口只能连接到对应的循环体节点");
        return false;
      }
      if (connection.targetHandle !== "loop-in") {
        console.warn("批处理循环出口只能连接到循环体入口端口");
        return false;
      }
    }

    if (targetIsLoopInHandle) {
      const expectedForNodeId = targetNode.data?.config?.forNodeId as
        | string
        | undefined;
      if (expectedForNodeId !== connection.source) {
        console.warn("循环体入口只能连接到对应的批处理节点");
        return false;
      }
      if (connection.sourceHandle !== "loop") {
        console.warn("循环体入口只能连接批处理节点的循环端口");
        return false;
      }
    }

    if (
      isSourceContainer &&
      containerSideHandles.has(connection.sourceHandle || "") &&
      targetParent !== sourceNode.id
    ) {
      console.warn("容器侧边端口只能连接到容器内部节点");
      return false;
    }

    if (
      isTargetContainer &&
      containerSideHandles.has(connection.targetHandle || "") &&
      sourceParent !== targetNode.id
    ) {
      console.warn("容器侧边端口只能连接到容器内部节点");
      return false;
    }

    // 检查源端口是输入还是输出
    const isSourceInput = sourceNode.data?.inputs?.some(
      (port) => port.id === connection.sourceHandle
    );
    const isSourceOutput = sourceNode.data?.outputs?.some(
      (port) => port.id === connection.sourceHandle
    );

    // 检查目标端口是输入还是输出
    const isTargetInput = targetNode.data?.inputs?.some(
      (port) => port.id === connection.targetHandle
    );
    const isTargetOutput = targetNode.data?.outputs?.some(
      (port) => port.id === connection.targetHandle
    );

    const isSourceLoopLeft =
      isSourceContainer && connection.sourceHandle === "loop-left";
    const isTargetLoopLeft =
      isTargetContainer && connection.targetHandle === "loop-left";
    const isSourceLoopRight =
      isSourceContainer && connection.sourceHandle === "loop-right";
    const isTargetLoopRight =
      isTargetContainer && connection.targetHandle === "loop-right";

    if (isSourceLoopLeft && !isTargetInput) {
      console.warn("批处理左侧端口只能连接到子节点的输入端口");
      return false;
    }

    if (isTargetLoopLeft) {
      console.warn("批处理左侧端口仅支持连接到子节点的输入端口");
      return false;
    }

    if (isTargetLoopRight && !isSourceOutput) {
      console.warn("批处理右侧端口只能连接到子节点的输出端口");
      return false;
    }

    if (isSourceLoopRight) {
      console.warn("批处理右侧端口仅支持作为子节点输出的目标端口");
      return false;
    }

    // 情况1: 输出端口 → 输入端口 (标准流向)
    const isOutputToInput = isSourceOutput && isTargetInput;

    // 情况2: 输入端口 → 输出端口 (反向流向)
    const isInputToOutput = isSourceInput && isTargetOutput;

    // 必须是其中一种有效情况
    if (!isOutputToInput && !isInputToOutput) {
      console.warn("只能连接输入端口和输出端口");
      return false;
    }

    if (
      sourceParent &&
      !isSourceContainer &&
      !isTargetContainer &&
      targetParent !== sourceParent
    ) {
      console.warn("容器内部节点只能连接同容器的节点");
      return false;
    }

    if (
      targetParent &&
      !isSourceContainer &&
      !isTargetContainer &&
      sourceParent !== targetParent
    ) {
      console.warn("容器内部节点只能连接同容器的节点");
      return false;
    }

    return true;
  }

  return {
    addEdge,
    removeEdge,
    validateConnection,
  };
}
