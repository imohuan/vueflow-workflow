import { BaseNode } from "@node-executor/core";
import type {
  PortDefinition,
  WorkflowExecutionContext,
  NodeResult,
} from "@node-executor/core";
import { createMCPClient } from "../../mcp-client.ts";
import type { MCPClient } from "../../types.ts";

/**
 * 初始化 MCP 服务节点
 * 用于在工作流开始时初始化 MCP 客户端，并将客户端存储到执行上下文中
 * 后续节点可以从执行上下文中获取该客户端
 */
export class InitializeMCPNode extends BaseNode {
  readonly type = "initializeMCP";
  readonly label = "初始化MCP服务";
  readonly description = "初始化 MCP 客户端服务，后续节点将使用此服务";
  readonly category = "浏览器管理";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "apiUrl",
        name: "API地址",
        type: "string",
        required: false,
      },
      {
        id: "enableLog",
        name: "启用日志",
        type: "boolean",
        required: false,
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "client",
        name: "MCP客户端",
        type: "object",
        description: "初始化后的 MCP 客户端实例",
      },
      {
        id: "status",
        name: "状态信息",
        type: "object",
        description: "客户端初始化状态",
      },
    ];
  }

  protected getDefaultConfig(): Record<string, any> {
    return {
      apiUrl: "/api/mcp",
      enableLog: true,
    };
  }

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    context: WorkflowExecutionContext
  ): Promise<any> {
    // execute 方法不会被调用，因为我们重写了 run 方法
    throw new Error("InitializeMCPNode 必须通过 run 方法调用");
  }

  /**
   * 重写 run 方法以访问执行上下文
   */
  async run(
    config: Record<string, any>,
    inputs: Record<string, any>,
    context: WorkflowExecutionContext
  ): Promise<NodeResult> {
    const startTime = Date.now();
    const timestamp = Date.now();

    try {
      // 合并配置和输入数据
      const mergedConfig = { ...config };
      for (const [key, value] of Object.entries(inputs)) {
        if (value !== undefined && value !== null) {
          mergedConfig[key] = value;
        }
      }

      // 从配置或输入中获取参数
      const apiUrl = inputs.apiUrl || config.apiUrl || "/api/mcp";
      const enableLog =
        inputs.enableLog !== undefined
          ? inputs.enableLog
          : config.enableLog !== undefined
          ? config.enableLog
          : true;

      // 创建新的 MCP 客户端实例
      const mcpClient = createMCPClient({
        apiUrl,
        enableLog,
      });

      // 初始化客户端
      const initialized = await mcpClient.initialize();

      if (!initialized) {
        throw new Error("MCP 客户端初始化失败");
      }

      // 将客户端存储到执行上下文中
      context.mcpClient = mcpClient;

      // 获取客户端状态
      const status = mcpClient.getStatus();

      const executionResult = {
        outputs: {
          client: mcpClient,
          status: {
            sessionId: status.sessionId,
            isInitialized: status.isInitialized,
            apiUrl: status.apiUrl,
          },
        },
        raw: {
          client: mcpClient,
          status,
        },
        summary: `MCP 客户端已初始化（Session ID: ${
          status.sessionId || "N/A"
        }）`,
      };

      const duration = Date.now() - startTime;
      const resultData = this.formatExecutionResult(executionResult);

      return {
        duration,
        data: resultData,
        status: "success",
        timestamp,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      return {
        duration,
        data: {
          outputs: {},
          raw: null,
        },
        status: "error",
        error: error.message || "执行失败",
        timestamp,
      };
    }
  }
}
