/**
 * 自动重连插件
 * 当删除节点时，如果该节点左右两侧端口都有连接线，则自动将左右两侧的端口进行连接
 */

import type { VueFlowPlugin, PluginContext } from "./types";
import type { Edge, Node } from "@vue-flow/core";

/**
 * 插件配置选项
 */
export interface AutoReconnectPluginOptions {
  /** 是否在控制台输出调试信息 */
  debug?: boolean;
  /** 连接验证函数 */
  validateConnection?: (connection: {
    source: string;
    sourceHandle: string | null;
    target: string;
    targetHandle: string | null;
  }) => boolean;
}

/**
 * 创建自动重连插件
 */
export function createAutoReconnectPlugin(
  options: AutoReconnectPluginOptions = {}
): VueFlowPlugin {
  const { debug = false, validateConnection } = options;

  /**
   * 获取节点的所有输入边（连接到该节点的边）
   */
  function getIncomingEdges(nodeId: string, edges: Edge[]): Edge[] {
    return edges.filter((edge) => edge.target === nodeId);
  }

  /**
   * 获取节点的所有输出边（从该节点出发的边）
   */
  function getOutgoingEdges(nodeId: string, edges: Edge[]): Edge[] {
    return edges.filter((edge) => edge.source === nodeId);
  }

  /**
   * 检查连接是否已存在
   */
  function connectionExists(
    source: string,
    sourceHandle: string | null,
    target: string,
    targetHandle: string | null,
    edges: Edge[]
  ): boolean {
    return edges.some(
      (edge) =>
        edge.source === source &&
        edge.sourceHandle === sourceHandle &&
        edge.target === target &&
        edge.targetHandle === targetHandle
    );
  }

  /**
   * 检查节点是否形成一串（无分支）
   * 返回排序后的节点链，如果形成一串则返回节点数组，否则返回 null
   */
  function checkNodeChain(nodeIds: string[], edges: Edge[]): string[] | null {
    if (nodeIds.length <= 1) {
      return nodeIds.length === 1 ? nodeIds : null;
    }

    const nodeIdSet = new Set(nodeIds);
    const nodeMap = new Map<string, { incoming: Edge[]; outgoing: Edge[] }>();

    // 初始化每个节点的连接信息
    for (const nodeId of nodeIds) {
      nodeMap.set(nodeId, {
        incoming: getIncomingEdges(nodeId, edges).filter((e) =>
          nodeIdSet.has(e.source)
        ),
        outgoing: getOutgoingEdges(nodeId, edges).filter((e) =>
          nodeIdSet.has(e.target)
        ),
      });
    }

    // 找到第一个节点（没有来自其他选中节点的输入，或只有一个来自选中节点的输入）
    let firstNode: string | null = null;
    for (const nodeId of nodeIds) {
      const nodeInfo = nodeMap.get(nodeId)!;
      // 第一个节点：没有来自其他选中节点的输入，或者只有一个来自选中节点的输入
      if (nodeInfo.incoming.length === 0) {
        // 检查是否有来自外部节点的输入
        const externalIncoming = getIncomingEdges(nodeId, edges).filter(
          (e) => !nodeIdSet.has(e.source)
        );
        if (externalIncoming.length > 0) {
          firstNode = nodeId;
          break;
        }
      } else if (nodeInfo.incoming.length === 1) {
        // 只有一个来自选中节点的输入，可能是第一个节点
        if (!firstNode) {
          firstNode = nodeId;
        }
      }
    }

    // 如果找不到第一个节点，尝试找只有一个输入的节点
    if (!firstNode) {
      for (const nodeId of nodeIds) {
        const nodeInfo = nodeMap.get(nodeId)!;
        if (nodeInfo.incoming.length <= 1) {
          firstNode = nodeId;
          break;
        }
      }
    }

    if (!firstNode) {
      if (debug) {
        console.log(
          `[AutoReconnect Plugin] 无法找到链的第一个节点: ${nodeIds.join(", ")}`
        );
      }
      return null;
    }

    // 从第一个节点开始构建链
    const chain: string[] = [firstNode];
    const visited = new Set<string>([firstNode]);

    let current = firstNode;
    while (chain.length < nodeIds.length) {
      const nodeInfo = nodeMap.get(current)!;

      // 检查是否有分支（多个输出指向选中节点）
      const outgoingToSelected = nodeInfo.outgoing.filter((e) =>
        nodeIdSet.has(e.target)
      );

      if (outgoingToSelected.length === 0) {
        // 没有输出到选中节点，这是最后一个节点
        break;
      }

      if (outgoingToSelected.length > 1) {
        // 有分支，不是一串
        if (debug) {
          console.log(
            `[AutoReconnect Plugin] 节点链存在分支: ${current} 有 ${outgoingToSelected.length} 个输出`
          );
        }
        return null;
      }

      const nextEdge = outgoingToSelected[0];
      if (!nextEdge) {
        break;
      }
      const nextNode = nextEdge.target;
      if (visited.has(nextNode)) {
        // 形成循环，不是一串
        if (debug) {
          console.log(
            `[AutoReconnect Plugin] 节点链形成循环: ${current} -> ${nextNode}`
          );
        }
        return null;
      }

      chain.push(nextNode);
      visited.add(nextNode);
      current = nextNode;
    }

    // 检查是否所有节点都在链中
    if (chain.length !== nodeIds.length) {
      if (debug) {
        console.log(
          `[AutoReconnect Plugin] 节点链不完整: 期望 ${nodeIds.length} 个节点，实际 ${chain.length} 个`
        );
      }
      return null;
    }

    // 验证链的完整性：每个节点（除了最后一个）应该只有一个输出到下一个节点
    for (let i = 0; i < chain.length - 1; i++) {
      const currentNodeId = chain[i];
      const nextNodeId = chain[i + 1];
      if (!currentNodeId || !nextNodeId) {
        return null;
      }
      const nodeInfo = nodeMap.get(currentNodeId);
      if (!nodeInfo) {
        return null;
      }
      const outgoingToNext = nodeInfo.outgoing.filter(
        (e) => e.target === nextNodeId
      );

      if (outgoingToNext.length !== 1) {
        if (debug) {
          console.log(
            `[AutoReconnect Plugin] 节点链验证失败: ${currentNodeId} -> ${nextNodeId} 的连接不正确`
          );
        }
        return null;
      }
    }

    return chain;
  }

  /**
   * 处理单个节点删除的自动重连
   */
  function handleSingleNodeDelete(
    context: PluginContext,
    nodeId: string,
    edges: Edge[]
  ) {
    // 获取该节点的所有输入边和输出边
    const incomingEdges = getIncomingEdges(nodeId, edges);
    const outgoingEdges = getOutgoingEdges(nodeId, edges);

    if (debug) {
      console.log(
        `[AutoReconnect Plugin] 节点 ${nodeId} 删除前检查:`,
        `输入边: ${incomingEdges.length} 条, 输出边: ${outgoingEdges.length} 条`
      );
    }

    // 如果左右两侧都有连接，则进行自动重连
    if (incomingEdges.length > 0 && outgoingEdges.length > 0) {
      const newEdges: Edge[] = [];

      // 遍历所有输入边和输出边的组合
      for (const incomingEdge of incomingEdges) {
        for (const outgoingEdge of outgoingEdges) {
          const source = incomingEdge.source;
          const sourceHandle = incomingEdge.sourceHandle ?? null;
          const target = outgoingEdge.target;
          const targetHandle = outgoingEdge.targetHandle ?? null;

          // 跳过自连接
          if (source === target) {
            if (debug) {
              console.log(
                `[AutoReconnect Plugin] 跳过自连接: ${source} -> ${target}`
              );
            }
            continue;
          }

          // 检查连接是否已存在
          if (
            connectionExists(source, sourceHandle, target, targetHandle, edges)
          ) {
            if (debug) {
              console.log(
                `[AutoReconnect Plugin] 连接已存在: ${source}(${sourceHandle}) -> ${target}(${targetHandle})`
              );
            }
            continue;
          }

          // 验证连接（如果提供了验证函数）
          if (validateConnection) {
            const isValid = validateConnection({
              source,
              sourceHandle,
              target,
              targetHandle,
            });
            if (!isValid) {
              if (debug) {
                console.log(
                  `[AutoReconnect Plugin] 连接验证失败: ${source}(${sourceHandle}) -> ${target}(${targetHandle})`
                );
              }
              continue;
            }
          }

          // 创建新的边
          const newEdge: Edge = {
            id: `edge-${source}-${target}-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            source,
            target,
            sourceHandle: sourceHandle ?? null,
            targetHandle: targetHandle ?? null,
            // 继承输出边的样式（因为输出边通常包含更多样式信息）
            type: outgoingEdge.type,
            animated: outgoingEdge.animated,
            style: outgoingEdge.style,
            label: outgoingEdge.label,
            labelStyle: outgoingEdge.labelStyle,
            labelShowBg: outgoingEdge.labelShowBg,
            labelBgStyle: outgoingEdge.labelBgStyle,
          };

          newEdges.push(newEdge);

          if (debug) {
            console.log(
              `[AutoReconnect Plugin] 创建新连接: ${source}(${sourceHandle}) -> ${target}(${targetHandle})`
            );
          }
        }
      }

      // 添加所有新创建的边
      if (newEdges.length > 0) {
        newEdges.forEach((edge) => {
          context.core.addEdge(edge);
        });

        console.log(
          `[AutoReconnect Plugin] 节点 ${nodeId} 删除时自动重连: 创建了 ${newEdges.length} 条新连接`
        );
      } else {
        if (debug) {
          console.log(
            `[AutoReconnect Plugin] 节点 ${nodeId} 删除时无需重连（所有连接都已存在或无效）`
          );
        }
      }
    } else {
      if (debug) {
        console.log(
          `[AutoReconnect Plugin] 节点 ${nodeId} 删除时无需重连（左右两侧没有同时存在连接）`
        );
      }
    }
  }

  /**
   * 处理多个节点删除的自动重连（节点链）
   */
  function handleNodeChainDelete(
    context: PluginContext,
    nodeChain: string[],
    edges: Edge[]
  ) {
    if (nodeChain.length < 2) {
      return;
    }

    const firstNodeId = nodeChain[0];
    const lastNodeId = nodeChain[nodeChain.length - 1];

    if (!firstNodeId || !lastNodeId) {
      if (debug) {
        console.warn(
          `[AutoReconnect Plugin] 节点链无效: 第一个或最后一个节点为空`
        );
      }
      return;
    }

    const nodeIdSet = new Set(nodeChain);

    // 获取第一个节点的输入边（来自外部节点的）
    const firstIncomingEdges = getIncomingEdges(firstNodeId, edges).filter(
      (e) => !nodeIdSet.has(e.source)
    );

    // 获取最后一个节点的输出边（指向外部节点的）
    const lastOutgoingEdges = getOutgoingEdges(lastNodeId, edges).filter(
      (e) => !nodeIdSet.has(e.target)
    );

    if (debug) {
      console.log(
        `[AutoReconnect Plugin] 节点链删除前检查:`,
        `第一个节点 ${firstNodeId} 的外部输入: ${firstIncomingEdges.length} 条`,
        `最后一个节点 ${lastNodeId} 的外部输出: ${lastOutgoingEdges.length} 条`
      );
    }

    // 如果第一个节点有外部输入，最后一个节点有外部输出，则进行重连
    if (firstIncomingEdges.length > 0 && lastOutgoingEdges.length > 0) {
      const newEdges: Edge[] = [];

      // 遍历所有输入边和输出边的组合
      for (const incomingEdge of firstIncomingEdges) {
        for (const outgoingEdge of lastOutgoingEdges) {
          const source = incomingEdge.source;
          const sourceHandle = incomingEdge.sourceHandle ?? null;
          const target = outgoingEdge.target;
          const targetHandle = outgoingEdge.targetHandle ?? null;

          // 跳过自连接
          if (source === target) {
            if (debug) {
              console.log(
                `[AutoReconnect Plugin] 跳过自连接: ${source} -> ${target}`
              );
            }
            continue;
          }

          // 检查连接是否已存在
          if (
            connectionExists(source, sourceHandle, target, targetHandle, edges)
          ) {
            if (debug) {
              console.log(
                `[AutoReconnect Plugin] 连接已存在: ${source}(${sourceHandle}) -> ${target}(${targetHandle})`
              );
            }
            continue;
          }

          // 验证连接（如果提供了验证函数）
          if (validateConnection) {
            const isValid = validateConnection({
              source,
              sourceHandle,
              target,
              targetHandle,
            });
            if (!isValid) {
              if (debug) {
                console.log(
                  `[AutoReconnect Plugin] 连接验证失败: ${source}(${sourceHandle}) -> ${target}(${targetHandle})`
                );
              }
              continue;
            }
          }

          // 创建新的边
          const newEdge: Edge = {
            id: `edge-${source}-${target}-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            source,
            target,
            sourceHandle: sourceHandle ?? null,
            targetHandle: targetHandle ?? null,
            // 继承输出边的样式
            type: outgoingEdge.type,
            animated: outgoingEdge.animated,
            style: outgoingEdge.style,
            label: outgoingEdge.label,
            labelStyle: outgoingEdge.labelStyle,
            labelShowBg: outgoingEdge.labelShowBg,
            labelBgStyle: outgoingEdge.labelBgStyle,
          };

          newEdges.push(newEdge);

          if (debug) {
            console.log(
              `[AutoReconnect Plugin] 创建新连接: ${source}(${sourceHandle}) -> ${target}(${targetHandle})`
            );
          }
        }
      }

      // 添加所有新创建的边
      if (newEdges.length > 0) {
        newEdges.forEach((edge) => {
          context.core.addEdge(edge);
        });

        console.log(
          `[AutoReconnect Plugin] 节点链 [${nodeChain.join(
            " -> "
          )}] 删除时自动重连: 创建了 ${newEdges.length} 条新连接`
        );
      } else {
        if (debug) {
          console.log(
            `[AutoReconnect Plugin] 节点链删除时无需重连（所有连接都已存在或无效）`
          );
        }
      }
    } else {
      if (debug) {
        console.log(
          `[AutoReconnect Plugin] 节点链删除时无需重连（第一个节点没有外部输入或最后一个节点没有外部输出）`
        );
      }
    }
  }

  /**
   * 处理节点删除前的自动重连
   */
  function handleNodeDelete(context: PluginContext, nodeId: string) {
    const edges = context.core.edges.value;
    const nodes = context.core.nodes.value;

    // 获取要删除的节点
    const nodeToDelete = nodes.find((n: Node) => n.id === nodeId);
    if (!nodeToDelete) {
      if (debug) {
        console.warn(`[AutoReconnect Plugin] 节点不存在: ${nodeId}`);
      }
      return;
    }

    // 获取当前选中的节点（可能正在删除多个节点）
    const selectedNodes = (context.vueflow.getSelectedNodes?.value ??
      []) as Node[];
    const selectedNodeIds = selectedNodes.map((n) => n.id);

    // 如果当前删除的节点在选中列表中，且选中了多个节点，检查是否形成节点链
    if (selectedNodeIds.includes(nodeId) && selectedNodeIds.length > 1) {
      // 检查是否形成节点链（无分支）
      const nodeChain = checkNodeChain(selectedNodeIds, edges);

      if (nodeChain) {
        // 形成节点链，使用第一个和最后一个节点进行重连
        if (debug) {
          console.log(
            `[AutoReconnect Plugin] 检测到节点链: ${nodeChain.join(" -> ")}`
          );
        }

        // 只在删除第一个节点时处理重连（避免重复处理）
        if (nodeChain[0] === nodeId) {
          handleNodeChainDelete(context, nodeChain, edges);
        } else {
          if (debug) {
            console.log(
              `[AutoReconnect Plugin] 跳过节点 ${nodeId} 的重连处理（将在第一个节点 ${nodeChain[0]} 删除时处理）`
            );
          }
        }
        return;
      } else {
        if (debug) {
          console.log(
            `[AutoReconnect Plugin] 选中的节点不形成链，按单个节点处理: ${nodeId}`
          );
        }
      }
    }

    // 单个节点删除或节点不形成链，按单个节点处理
    handleSingleNodeDelete(context, nodeId, edges);
  }

  return {
    config: {
      id: "auto-reconnect",
      name: "自动重连",
      description: "删除节点时自动连接左右两侧的端口",
      enabled: true,
      version: "1.0.0",
    },

    hooks: {
      /**
       * 节点删除前处理
       * 在节点删除前检查并创建新的连接
       */
      beforeNodeDelete(context: PluginContext, nodeId: string) {
        handleNodeDelete(context, nodeId);
      },
    },

    setup() {
      if (debug) {
        console.log("[AutoReconnect Plugin] 自动重连插件已启用");
      }
    },

    cleanup() {
      if (debug) {
        console.log("[AutoReconnect Plugin] 自动重连插件已禁用");
      }
    },
  };
}
