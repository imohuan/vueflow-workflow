/**
 * WebSocket 工作流执行服务器
 */

import { WebSocketServer, WebSocket } from "ws";
import { WorkflowExecutor, createNodeResolver } from "../executor";
import { createNodeUtils } from "../index";
import type { ServerConfig, ClientMessage, ServerMessage } from "./types";
import type { BaseFlowNode } from "../BaseFlowNode";

const loggerPrefix = "[FlowServer]";

/**
 * 创建并启动 WebSocket 服务器
 * @param config 服务器配置
 * @returns 服务器实例和关闭函数
 */
export function createWorkflowServer(config: ServerConfig) {
  const {
    port,
    host = "localhost",
    nodeRegistry,
    enableLogging = true,
    historyHandlers,
  } = config;

  const log = (...args: any[]) => {
    if (enableLogging) {
      console.log(loggerPrefix, ...args);
    }
  };

  const error = (...args: any[]) => {
    if (enableLogging) {
      console.error(loggerPrefix, ...args);
    }
  };

  // 创建节点工具函数
  const nodeUtils = createNodeUtils(nodeRegistry);

  // 创建 WebSocket 服务器
  const wss = new WebSocketServer({ port, host });

  log(`启动服务器 ws://${host}:${port}`);
  log(`已加载 ${nodeUtils.getAllNodeTypes().length} 个节点类型`);

  // 处理客户端连接
  wss.on("connection", (ws: WebSocket) => {
    log("客户端已连接");

    // 为每个连接创建独立的执行器和状态
    let executor: WorkflowExecutor | null = null;
    let initialized = false;
    let currentWorkflow: any = null; // 保存当前执行的工作流

    const executionContext: {
      executionId: string | null;
      workflowId: string | null;
    } = {
      executionId: null,
      workflowId: null,
    };

    // 发送消息给客户端
    const sendMessage = (message: ServerMessage) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    };

    // 重置执行上下文
    const resetContext = () => {
      executionContext.executionId = null;
      executionContext.workflowId = null;
    };

    // 获取上下文 ID
    const requireContext = () => {
      if (!executionContext.executionId || !executionContext.workflowId) {
        throw new Error("执行上下文未初始化");
      }
      return {
        executionId: executionContext.executionId,
        workflowId: executionContext.workflowId,
      };
    };

    const getOptionalContext = () => ({
      executionId: executionContext.executionId ?? undefined,
      workflowId: executionContext.workflowId ?? undefined,
    });

    // 包装执行选项
    const wrapExecutionOptions = (options?: any) => ({
      ...options,
      onExecutionStart: (payload: any) => {
        executionContext.executionId = payload.executionId;
        executionContext.workflowId = payload.workflowId;
        sendMessage({ type: "EXECUTION_START", payload });
        sendMessage({
          type: "STATE_CHANGE",
          payload: { ...getOptionalContext(), state: "running" },
        });
        options?.onExecutionStart?.(payload);
      },
      onExecutionComplete: (result: any) => {
        executionContext.executionId = result.executionId;
        executionContext.workflowId = result.workflowId;
        sendMessage({ type: "EXECUTION_COMPLETE", payload: result });
        sendMessage({
          type: "STATE_CHANGE",
          payload: { ...getOptionalContext(), state: "completed" },
        });
        // 保存历史记录，包含工作流结构
        if (historyHandlers && currentWorkflow) {
          historyHandlers
            .saveHistory(result, {
              nodes: currentWorkflow.nodes,
              edges: currentWorkflow.edges,
            })
            .catch((err) => {
              error("保存历史记录失败:", err);
            });
        }
        options?.onExecutionComplete?.(result);
        resetContext();
      },
      onExecutionError: (payload: any) => {
        executionContext.executionId = payload.executionId;
        executionContext.workflowId = payload.workflowId;
        sendMessage({ type: "EXECUTION_ERROR", payload });
        sendMessage({
          type: "STATE_CHANGE",
          payload: { ...getOptionalContext(), state: "error" },
        });
        // 保存错误的历史记录，包含工作流结构
        if (historyHandlers && payload.result && currentWorkflow) {
          historyHandlers
            .saveHistory(payload.result, {
              nodes: currentWorkflow.nodes,
              edges: currentWorkflow.edges,
            })
            .catch((err) => {
              error("保存历史记录失败:", err);
            });
        }
        options?.onExecutionError?.(payload);
        resetContext();
      },
      onNodeStart: (nodeId: string) => {
        const ids = requireContext();
        sendMessage({ type: "NODE_START", payload: { ...ids, nodeId } });
        options?.onNodeStart?.(nodeId);
      },
      onNodeComplete: (nodeId: string, result: any) => {
        const ids = requireContext();
        sendMessage({
          type: "NODE_COMPLETE",
          payload: { ...ids, nodeId, result },
        });
        options?.onNodeComplete?.(nodeId, result);
      },
      onNodeError: (nodeId: string, err: Error) => {
        const ids = requireContext();
        sendMessage({
          type: "NODE_ERROR",
          payload: { ...ids, nodeId, error: err.message },
        });
        options?.onNodeError?.(nodeId, err);
      },
      onProgress: (progress: number) => {
        sendMessage({
          type: "PROGRESS",
          payload: { ...getOptionalContext(), progress },
        });
        options?.onProgress?.(progress);
      },
      onCacheHit: (nodeId: string, cachedResult: any) => {
        const ids = requireContext();
        sendMessage({
          type: "CACHE_HIT",
          payload: { ...ids, nodeId, cachedResult },
        });
        options?.onCacheHit?.(nodeId, cachedResult);
      },
      onIterationUpdate: (nodeId: string, iterationData: any) => {
        const ids = requireContext();
        sendMessage({
          type: "ITERATION_UPDATE",
          payload: { ...ids, nodeId, iterationData },
        });
        options?.onIterationUpdate?.(nodeId, iterationData);
      },
    });

    // 初始化执行器
    const handleInit = () => {
      try {
        log("初始化执行器");
        const nodeResolver = createNodeResolver(nodeRegistry);
        executor = new WorkflowExecutor(nodeResolver);
        initialized = true;
        sendMessage({ type: "INITIALIZED" });
        log("执行器初始化完成");
      } catch (err) {
        error("初始化失败:", err);
        sendMessage({
          type: "ERROR",
          payload: {
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          },
        });
      }
    };

    // 执行工作流
    const handleExecute = async (payload: { workflow: any; options?: any }) => {
      if (!executor || !initialized) {
        sendMessage({
          type: "ERROR",
          payload: { message: "执行器未初始化，请先发送 INIT 消息" },
        });
        return;
      }

      try {
        log("开始执行工作流:", payload.workflow.workflow_id);
        // 保存当前工作流信息
        currentWorkflow = payload.workflow;
        const options = wrapExecutionOptions(payload.options);
        await executor.execute(payload.workflow, options);
        log("工作流执行完成");
      } catch (err) {
        error("工作流执行失败:", err);
      }
    };

    // 处理消息
    ws.on("message", async (data: Buffer) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());

        switch (message.type) {
          case "INIT":
            handleInit();
            break;

          case "EXECUTE":
            await handleExecute(message.payload);
            break;

          case "PAUSE":
            if (executor) {
              executor.pause();
              sendMessage({
                type: "STATE_CHANGE",
                payload: { ...getOptionalContext(), state: "paused" },
              });
              log("执行已暂停");
            }
            break;

          case "RESUME":
            if (executor) {
              executor.resume();
              sendMessage({
                type: "STATE_CHANGE",
                payload: { ...getOptionalContext(), state: "running" },
              });
              log("执行已恢复");
            }
            break;

          case "STOP":
            if (executor) {
              executor.stop();
              sendMessage({
                type: "STATE_CHANGE",
                payload: { ...getOptionalContext(), state: "cancelled" },
              });
              resetContext();
              log("执行已停止");
            }
            break;

          case "GET_CACHE_STATS":
            if (executor) {
              const stats = executor.getCacheStats(message.payload.workflowId);
              sendMessage({
                type: "CACHE_STATS",
                payload: {
                  requestId: message.payload.requestId,
                  stats,
                },
              });
            }
            break;

          case "CLEAR_CACHE":
            if (executor) {
              executor.clearCache(message.payload.workflowId);
              log("已清空缓存:", message.payload.workflowId);
            }
            break;

          case "CLEAR_ALL_CACHE":
            if (executor) {
              executor.clearAllCache();
              log("已清空所有缓存");
            }
            break;

          case "GET_NODE_LIST":
            const metadata = nodeUtils.getAllNodeMetadata();
            const nodes = metadata.map((node) => ({
              type: node.type,
              label: node.label,
              description: node.description,
              category: node.category,
              icon: node.style?.icon,
              tags: [],
              inputs: node.inputs.map((input) => ({
                name: input.name,
                type: input.type,
                description: input.description,
                required: input.required,
                defaultValue: input.defaultValue,
                options: input?.options ?? [],
              })),
              outputs: node.outputs.map((output) => ({
                name: output.name,
                type: output.type,
                description: output.description,
              })),
            }));

            sendMessage({
              type: "NODE_LIST",
              payload: {
                requestId: message.payload.requestId,
                nodes,
              },
            });
            log(`已返回节点列表，共 ${nodes.length} 个节点`);
            break;

          case "GET_HISTORY":
            if (historyHandlers) {
              try {
                const history = await historyHandlers.getHistory(
                  message.payload.workflowId,
                  message.payload.limit
                );
                sendMessage({
                  type: "HISTORY_DATA",
                  payload: {
                    requestId: message.payload.requestId,
                    history,
                  },
                });
                log(`已返回历史记录，共 ${history.length} 条`);
              } catch (err) {
                error("获取历史记录失败:", err);
                sendMessage({
                  type: "ERROR",
                  payload: {
                    message: err instanceof Error ? err.message : String(err),
                  },
                });
              }
            } else {
              sendMessage({
                type: "HISTORY_DATA",
                payload: {
                  requestId: message.payload.requestId,
                  history: [],
                },
              });
            }
            break;

          case "CLEAR_HISTORY":
            if (historyHandlers) {
              try {
                await historyHandlers.clearHistory(message.payload.workflowId);
                log(
                  message.payload.workflowId
                    ? `已清空工作流历史: ${message.payload.workflowId}`
                    : "已清空所有历史记录"
                );
              } catch (err) {
                error("清空历史记录失败:", err);
              }
            }
            break;

          case "DELETE_HISTORY":
            if (historyHandlers) {
              try {
                await historyHandlers.deleteHistory(
                  message.payload.executionId
                );
                log(`已删除执行历史: ${message.payload.executionId}`);
              } catch (err) {
                error("删除历史记录失败:", err);
                sendMessage({
                  type: "ERROR",
                  payload: {
                    message: err instanceof Error ? err.message : String(err),
                  },
                });
              }
            }
            break;

          default:
            log("未知消息类型:", message);
        }
      } catch (err) {
        error("处理消息失败:", err);
        sendMessage({
          type: "ERROR",
          payload: {
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          },
        });
      }
    });

    ws.on("close", () => {
      log("客户端已断开连接");
    });

    ws.on("error", (err) => {
      error("WebSocket 错误:", err);
    });
  });

  // 返回控制函数
  return {
    /**
     * 关闭服务器
     */
    close: () => {
      return new Promise<void>((resolve) => {
        wss.close(() => {
          log("服务器已关闭");
          resolve();
        });
      });
    },

    /**
     * 获取服务器信息
     */
    getInfo: () => ({
      port,
      host,
      nodeCount: nodeUtils.getAllNodeTypes().length,
      nodeTypes: nodeUtils.getAllNodeTypes(),
    }),
  };
}
