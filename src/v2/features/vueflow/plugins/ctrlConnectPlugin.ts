/**
 * Ctrl 连接吸附插件
 * 在拖拽连接线时，按住 Ctrl 键可自动吸附到鼠标下方节点的最佳端口
 * 参考 NodeEditor.vue 中的 Ctrl 连接实现
 */

import { ref, computed, watch, type Ref, type ComputedRef } from "vue";
import { useEventListener, useMagicKeys } from "@vueuse/core";
import type { VueFlowPlugin, PluginContext } from "./types";
import type { Node, Edge, HandleElement, GraphNode } from "@vue-flow/core";

/**
 * 连接候选状态
 */
export interface ConnectCandidateState {
  /** 目标节点 ID */
  nodeId: string;
  /** 目标端口 ID */
  handleId: string | null;
  /** 目标端口类型 */
  handleType: "source" | "target";
  /** 吸附位置（用于预览连接线终点） */
  position: { x: number; y: number } | null;
  /** 该连接是否有效 */
  isValid: boolean;
}

/**
 * 连接状态
 */
interface ConnectionState {
  /** 源节点 ID */
  nodeId: string | null;
  /** 源端口 ID */
  handleId: string | null;
  /** 源端口类型 */
  handleType: "source" | "target" | null;
}

/**
 * 插件配置选项
 */
export interface CtrlConnectPluginOptions {
  /** 是否在控制台输出调试信息 */
  debug?: boolean;
  /** 连接验证函数 */
  validateConnection?: (connection: {
    source: string;
    sourceHandle: string | null;
    target: string;
    targetHandle: string | null;
  }) => boolean;
  /**
   * 是否允许重连回原端口（边编辑时）
   * @default true
   */
  allowReconnectToOriginal?: boolean;
}

/**
 * 创建 Ctrl 连接吸附插件
 */
export function createCtrlConnectPlugin(
  options: CtrlConnectPluginOptions = {}
): VueFlowPlugin {
  const {
    debug = false,
    validateConnection,
    allowReconnectToOriginal = true,
  } = options;

  // 插件状态
  let isCtrlPressed: Ref<boolean>;
  let connectionState: Ref<ConnectionState>;
  let candidate: Ref<ConnectCandidateState | null>;
  let isActive: ComputedRef<boolean>;
  let lastPointerPosition: Ref<{ x: number; y: number } | null>;
  let lastClientPointer: Ref<{ x: number; y: number } | null>;

  // 边编辑状态（通过事件系统获取）
  let isEditingEdge: Ref<boolean>;
  let editingEdgeId: Ref<string | null>;
  let originalEdgeInfo: Ref<Edge | null>;

  // 清理函数
  let stopWatchers: Array<() => void> = [];
  let eventCleanups: Array<() => void> = [];

  /**
   * 获取节点的绝对位置
   */
  function getGraphNodePosition(
    graphNode: GraphNode | null,
    fallbackNode: Node | null
  ): { x: number; y: number } {
    if (graphNode?.computedPosition) {
      return {
        x: graphNode.computedPosition.x,
        y: graphNode.computedPosition.y,
      };
    }

    const fallback = fallbackNode?.position;
    return {
      x: fallback?.x ?? 0,
      y: fallback?.y ?? 0,
    };
  }

  /**
   * 获取节点的所有端口候选
   */
  function getHandleCandidates(
    graphNode: GraphNode | null,
    fallbackNode: Node | null,
    handleType: "source" | "target"
  ): { handle: HandleElement; position: { x: number; y: number } }[] {
    if (!graphNode) {
      return [];
    }

    const handles = graphNode.handleBounds?.[handleType] ?? [];
    if (!handles || handles.length === 0) {
      return [];
    }

    const basePosition = getGraphNodePosition(graphNode, fallbackNode);

    return handles.map((handle) => {
      const centerX = basePosition.x + handle.x + (handle.width ?? 0) / 2;
      const centerY = basePosition.y + handle.y + (handle.height ?? 0) / 2;
      return {
        handle,
        position: {
          x: centerX,
          y: centerY,
        },
      };
    });
  }

  /**
   * 重置候选状态
   */
  function resetCandidate() {
    if (!candidate.value) {
      return;
    }
    candidate.value = null;

    if (debug) {
      console.log("[CtrlConnect Plugin] 候选重置");
    }
  }

  /**
   * 更新连接候选
   */
  function updateCandidate(context: PluginContext) {
    // 检查是否处于激活状态
    if (
      !isActive.value ||
      !connectionState.value.nodeId ||
      !connectionState.value.handleType
    ) {
      resetCandidate();
      return;
    }

    const pointer = lastPointerPosition.value;
    const clientPointer = lastClientPointer.value;

    if (!pointer || !clientPointer) {
      resetCandidate();
      return;
    }

    // 获取鼠标下方的元素
    const element = document.elementFromPoint(clientPointer.x, clientPointer.y);
    if (!element) {
      resetCandidate();
      return;
    }

    // 查找节点元素
    const nodeElement = element.closest(
      ".vue-flow__node"
    ) as HTMLElement | null;
    if (!nodeElement) {
      resetCandidate();
      return;
    }

    // 获取节点 ID
    const nodeId =
      nodeElement.dataset.id ?? nodeElement.getAttribute("data-id") ?? null;

    // 不能连接到自身
    if (!nodeId || nodeId === connectionState.value.nodeId) {
      resetCandidate();
      return;
    }

    // 计算期望的端口类型（source -> target, target -> source）
    const desiredHandleType =
      connectionState.value.handleType === "source" ? "target" : "source";

    // 检查鼠标是否在端口上
    const handleElement = element.closest(
      ".vue-flow__handle"
    ) as HTMLElement | null;
    const handleTypeMatches = handleElement
      ? desiredHandleType === "source"
        ? handleElement.classList.contains("source")
        : handleElement.classList.contains("target")
      : false;

    // 如果鼠标在匹配的端口上，优先使用该端口
    const preferredHandleId = handleTypeMatches
      ? handleElement?.dataset.handleid ??
        handleElement?.getAttribute("data-handleid") ??
        null
      : null;

    // 获取节点数据
    const nodes = context.vueflow.nodes.value;
    const storeNode = nodes.find((n: Node) => n.id === nodeId) ?? null;
    const graphNode = context.vueflow.findNode?.(nodeId) ?? null;

    // 获取所有可用的端口候选
    const candidates = getHandleCandidates(
      graphNode,
      storeNode,
      desiredHandleType
    );

    if (!candidates.length) {
      resetCandidate();
      return;
    }

    // 找到距离鼠标最近的端口
    let bestCandidate: {
      handleId: string | null;
      position: { x: number; y: number };
    } | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidateItem of candidates) {
      const handleId = candidateItem.handle.id ?? null;
      let score = Math.hypot(
        candidateItem.position.x - pointer.x,
        candidateItem.position.y - pointer.y
      );

      // 如果鼠标在端口上，大幅降低该端口的分数（优先选择）
      if (preferredHandleId && handleId === preferredHandleId) {
        score -= 1000;
      }

      if (!bestCandidate || score < bestScore) {
        bestCandidate = {
          handleId,
          position: candidateItem.position,
        };
        bestScore = score;
      }
    }

    if (!bestCandidate || !bestCandidate.handleId) {
      resetCandidate();
      return;
    }

    // 构建连接对象
    const connection =
      desiredHandleType === "target"
        ? {
            source: connectionState.value.nodeId,
            sourceHandle: connectionState.value.handleId,
            target: nodeId,
            targetHandle: bestCandidate.handleId,
          }
        : {
            source: nodeId,
            sourceHandle: bestCandidate.handleId,
            target: connectionState.value.nodeId,
            targetHandle: connectionState.value.handleId,
          };

    // 检查连接是否已存在（边编辑模式下排除正在编辑的边）
    const edges = context.vueflow.edges.value;
    const filteredEdges =
      isEditingEdge.value && editingEdgeId.value
        ? edges.filter((e: Edge) => e.id !== editingEdgeId.value)
        : edges;

    const exists = filteredEdges.some(
      (edge: Edge) =>
        edge.source === connection.source &&
        edge.sourceHandle === connection.sourceHandle &&
        edge.target === connection.target &&
        edge.targetHandle === connection.targetHandle
    );

    // 特殊情况：边编辑模式下，检查是否重连回原端口
    let isReconnectToOriginal = false;
    if (isEditingEdge.value && originalEdgeInfo.value) {
      isReconnectToOriginal =
        connection.source === originalEdgeInfo.value.source &&
        connection.target === originalEdgeInfo.value.target &&
        connection.sourceHandle === originalEdgeInfo.value.sourceHandle &&
        connection.targetHandle === originalEdgeInfo.value.targetHandle;
    }

    // 验证连接是否有效
    let isValid = false;
    if (isReconnectToOriginal) {
      // 重连回原端口：根据配置决定是否有效
      isValid = allowReconnectToOriginal;
      if (debug) {
        console.log(
          "[CtrlConnect Plugin] 检测到重连回原端口（候选验证）:",
          isValid
        );
      }
    } else if (!exists) {
      if (validateConnection) {
        isValid = validateConnection(connection);
      } else {
        // 默认验证：不能是同一个节点，端口类型必须匹配
        isValid = connection.source !== connection.target;
      }
    }

    // 更新候选状态
    candidate.value = {
      nodeId,
      handleId: bestCandidate.handleId,
      handleType: desiredHandleType,
      position: bestCandidate.position,
      isValid,
    };

    if (debug) {
      console.log("[CtrlConnect Plugin] 候选更新:", candidate.value);
    }
  }

  /**
   * 完成 Ctrl 连接
   */
  function finalizeConnection(context: PluginContext): boolean {
    if (!isActive.value) {
      return false;
    }

    const currentCandidate = candidate.value;

    if (
      !currentCandidate ||
      !currentCandidate.isValid ||
      !currentCandidate.handleId ||
      !connectionState.value.nodeId ||
      !connectionState.value.handleId ||
      !connectionState.value.handleType
    ) {
      return false;
    }

    // 构建连接对象
    const connection =
      connectionState.value.handleType === "source"
        ? {
            source: connectionState.value.nodeId,
            sourceHandle: connectionState.value.handleId,
            target: currentCandidate.nodeId,
            targetHandle: currentCandidate.handleId,
          }
        : {
            source: currentCandidate.nodeId,
            sourceHandle: currentCandidate.handleId,
            target: connectionState.value.nodeId,
            targetHandle: connectionState.value.handleId,
          };

    if (debug && isEditingEdge.value) {
      console.log("[CtrlConnect Plugin] 检测到边编辑模式:", {
        editingEdgeId: editingEdgeId.value,
        originalEdge: originalEdgeInfo.value,
        newConnection: connection,
      });
    }

    // 如果是边编辑，检查是否重连回原端口
    if (isEditingEdge.value && originalEdgeInfo.value) {
      const isReconnectToOriginal =
        connection.source === originalEdgeInfo.value.source &&
        connection.target === originalEdgeInfo.value.target &&
        connection.sourceHandle === originalEdgeInfo.value.sourceHandle &&
        connection.targetHandle === originalEdgeInfo.value.targetHandle;

      if (isReconnectToOriginal) {
        if (debug) {
          console.log(
            "[CtrlConnect Plugin] 检测到重连回原端口:",
            allowReconnectToOriginal
          );
        }

        if (!allowReconnectToOriginal) {
          if (debug) {
            console.log("[CtrlConnect Plugin] 不允许重连回原端口，连接失败");
          }
          return false;
        }

        // 允许重连回原端口，标记更新成功
        const edgeEditState = context.shared["edge-edit"];
        edgeEditState?.markUpdateSuccessful?.();

        if (debug) {
          console.log(
            "[CtrlConnect Plugin] 重连回原端口成功，已标记边编辑完成"
          );
        }

        return true; // 不需要创建新边，原边会被保留
      }
    }

    // 检查连接是否已存在（排除正在编辑的边）
    const edges = context.vueflow.edges.value.filter(
      (e: Edge) => !editingEdgeId.value || e.id !== editingEdgeId.value
    );

    if (
      edges.some(
        (edge: Edge) =>
          edge.source === connection.source &&
          edge.sourceHandle === connection.sourceHandle &&
          edge.target === connection.target &&
          edge.targetHandle === connection.targetHandle
      )
    ) {
      if (debug) {
        console.log("[CtrlConnect Plugin] 连接已存在");
      }
      return false;
    }

    // 验证连接
    if (validateConnection && !validateConnection(connection)) {
      if (debug) {
        console.log("[CtrlConnect Plugin] 连接验证失败");
      }
      return false;
    }

    // 边编辑模式：更新现有边
    if (isEditingEdge.value && editingEdgeId.value) {
      // 更新边的连接信息
      const allEdges = context.core.edges.value;
      context.core.edges.value = allEdges.map((e: Edge) =>
        e.id === editingEdgeId.value
          ? {
              ...e,
              source: connection.source,
              target: connection.target,
              sourceHandle: connection.sourceHandle ?? undefined,
              targetHandle: connection.targetHandle ?? undefined,
            }
          : e
      );

      // 标记更新成功
      const edgeEditState = context.shared["edge-edit"];
      edgeEditState?.markUpdateSuccessful?.();

      if (debug) {
        console.log(
          "[CtrlConnect Plugin] 边编辑模式：边已更新",
          editingEdgeId,
          connection
        );
      }

      return true;
    }

    // 普通模式：创建新边
    const newEdge: Edge = {
      id: `edge_${Date.now()}`,
      source: connection.source,
      sourceHandle: connection.sourceHandle ?? undefined,
      target: connection.target,
      targetHandle: connection.targetHandle ?? undefined,
    };

    // 添加边到画布
    context.vueflow.addEdges([newEdge]);

    if (debug) {
      console.log("[CtrlConnect Plugin] 新连接已创建:", newEdge);
    }

    return true;
  }

  return {
    config: {
      id: "ctrl-connect",
      name: "Ctrl 连接吸附",
      description: "拖拽连接线时按住 Ctrl 键自动吸附到鼠标下方节点的最佳端口",
      enabled: true,
      version: "1.0.0",
    },

    shortcuts: [
      {
        key: "ctrl+drag",
        description: "按住 Ctrl 键拖拽连接线时自动吸附到最近的端口",
        handler: () => {
          // 这个是描述性的，实际逻辑在 setup 中
        },
      },
    ],

    setup(context: PluginContext) {
      // 初始化状态
      isCtrlPressed = ref(false);
      connectionState = ref<ConnectionState>({
        nodeId: null,
        handleId: null,
        handleType: null,
      });
      candidate = ref<ConnectCandidateState | null>(null);
      lastPointerPosition = ref<{ x: number; y: number } | null>(null);
      lastClientPointer = ref<{ x: number; y: number } | null>(null);

      // 初始化边编辑状态
      isEditingEdge = ref(false);
      editingEdgeId = ref<string | null>(null);
      originalEdgeInfo = ref<Edge | null>(null);

      // 监听边编辑事件（通过事件系统）
      if (context.core.events) {
        context.core.events.on("edge:update-start", (event: any) => {
          isEditingEdge.value = true;
          editingEdgeId.value = event.edge?.id ?? null;
          originalEdgeInfo.value = event.edge ?? null;
          if (debug) {
            console.log("[CtrlConnect Plugin] 边编辑开始:", event.edge);
          }
        });

        context.core.events.on("edge:update-end", (event: any) => {
          isEditingEdge.value = false;
          editingEdgeId.value = null;
          originalEdgeInfo.value = null;
          if (debug) {
            console.log("[CtrlConnect Plugin] 边编辑结束:", event.edge);
          }
        });
      }

      // 计算激活状态
      isActive = computed(
        () =>
          isCtrlPressed.value &&
          connectionState.value.nodeId !== null &&
          connectionState.value.handleId !== null &&
          connectionState.value.handleType !== null
      );

      // 监听激活状态变化
      stopWatchers.push(
        watch(isActive, (active) => {
          if (active) {
            updateCandidate(context);
          } else {
            resetCandidate();
          }
        })
      );

      // 监听 Ctrl 键状态变化
      stopWatchers.push(
        watch(isCtrlPressed, (pressed) => {
          if (!pressed) {
            resetCandidate();
            return;
          }

          if (isActive.value) {
            updateCandidate(context);
          }
        })
      );

      // 监听 Ctrl 键
      const keys = useMagicKeys();
      const ctrlKey = keys["Control"] as any;

      stopWatchers.push(
        watch(ctrlKey, (pressed) => {
          isCtrlPressed.value = Boolean(pressed);
        })
      );

      // 监听键盘事件（备用方案）
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Control" || event.ctrlKey) {
          isCtrlPressed.value = true;
        }
      };

      const onKeyUp = (event: KeyboardEvent) => {
        if (!event.ctrlKey) {
          isCtrlPressed.value = false;
          resetCandidate();
        }
      };

      const onBlur = () => {
        isCtrlPressed.value = false;
        resetCandidate();
      };

      // 监听鼠标移动
      const onMouseMove = (event: MouseEvent) => {
        // 更新客户端坐标
        lastClientPointer.value = { x: event.clientX, y: event.clientY };

        // 将客户端坐标转换为画布坐标
        const projected = context.vueflow.project?.({
          x: event.clientX,
          y: event.clientY,
        });

        if (projected) {
          lastPointerPosition.value = projected;
          if (isActive.value) {
            updateCandidate(context);
          }
        }
      };

      // 注册事件监听器
      eventCleanups.push(useEventListener(window, "keydown", onKeyDown));
      eventCleanups.push(useEventListener(window, "keyup", onKeyUp));
      eventCleanups.push(useEventListener(window, "blur", onBlur));
      eventCleanups.push(useEventListener(window, "mousemove", onMouseMove));

      // 监听连接开始事件
      const vueflowInstance = context.vueflow;
      const disposeConnectStart = vueflowInstance.onConnectStart?.(
        (params: any) => {
          connectionState.value = {
            nodeId: params.nodeId ?? null,
            handleId: params.handleId ?? null,
            handleType: (params.handleType ?? null) as
              | "source"
              | "target"
              | null,
          };

          if (isActive.value) {
            updateCandidate(context);
          }

          if (debug) {
            console.log(
              "[CtrlConnect Plugin] 连接开始:",
              connectionState.value
            );
          }
        }
      );

      // 监听连接结束事件
      const disposeConnectEnd = vueflowInstance.onConnectEnd?.(() => {
        // 尝试完成 Ctrl 连接
        const connected = finalizeConnection(context);

        // 重置状态
        connectionState.value = {
          nodeId: null,
          handleId: null,
          handleType: null,
        };
        resetCandidate();

        if (debug && connected) {
          console.log("[CtrlConnect Plugin] Ctrl 连接已完成");
        }
      });

      // 保存清理函数
      if (disposeConnectStart) {
        eventCleanups.push(disposeConnectStart.off);
      }
      if (disposeConnectEnd) {
        eventCleanups.push(disposeConnectEnd.off);
      }

      // 暴露状态到插件共享状态，供 CustomConnectionLine 等组件访问
      context.shared["ctrl-connect"] = {
        isActive,
        candidate,
        connectionState,
      };

      console.log("[CtrlConnect Plugin] Ctrl 连接吸附插件已启用");
      console.log(
        "[CtrlConnect Plugin] 使用方式: 拖拽连接线时按住 Ctrl 键，将自动吸附到鼠标下方节点的最佳端口"
      );
      console.log(
        `[CtrlConnect Plugin] 允许重连回原端口: ${allowReconnectToOriginal}`
      );
      console.log(`[CtrlConnect Plugin] 调试模式: ${debug}`);
    },

    cleanup(context: PluginContext) {
      // 清理所有监听器
      stopWatchers.forEach((stop) => stop());
      eventCleanups.forEach((cleanup) => cleanup());

      stopWatchers = [];
      eventCleanups = [];

      // 清理共享状态
      delete context.shared["ctrl-connect"];

      console.log("[CtrlConnect Plugin] Ctrl 连接吸附插件已清理");
    },
  };
}
