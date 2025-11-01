import type {
  PortDefinition,
  NodeData,
  NodeResult,
  NodeResultOutput,
  NodeResultData,
  WorkflowExecutionContext,
} from "./types.ts";

/**
 * 节点基类
 * 所有 MCP 节点都继承自此类
 */
export abstract class BaseNode {
  /** 节点类型标识 */
  abstract readonly type: string;

  /** 节点显示名称 */
  abstract readonly label: string;

  /** 节点描述 */
  abstract readonly description: string;

  /** 节点分类 */
  abstract readonly category: string;

  /** 输入端口定义 */
  protected abstract defineInputs(): PortDefinition[];

  /** 输出端口定义 */
  protected abstract defineOutputs(): PortDefinition[];

  /** 默认配置 */
  protected abstract getDefaultConfig(): Record<string, any>;

  /**
   * 执行节点逻辑
   * @param config - 节点配置
   * @param inputs - 输入数据
   * @param context - 工作流执行上下文（用于获取 MCP 客户端等共享状态）
   * @returns 执行结果
   */
  abstract execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    context: WorkflowExecutionContext
  ): Promise<any>;

  /**
   * 创建节点数据
   * @returns 节点数据
   */
  createNodeData(): NodeData {
    const configInputs = this.defineInputs();
    const configOutputs = this.defineOutputs();

    // 为普通节点添加默认的数据流端口
    // 只有当没有任何标记为 isPort 的端口时，才添加默认端口
    const hasCustomInputPorts = configInputs.some((input) => input.isPort);
    const hasCustomOutputPorts = configOutputs.some((output) => output.isPort);

    // 分离配置项和端口
    const configOnlyInputs = configInputs.filter((input) => !input.isPort);

    // 如果没有自定义端口，添加默认端口
    const finalInputs: PortDefinition[] = hasCustomInputPorts
      ? configInputs
      : [
          ...configOnlyInputs, // 保留配置项
          {
            id: "__input__",
            name: "输入",
            type: "any",
            isPort: true,
          },
        ];

    const outputs: PortDefinition[] = hasCustomOutputPorts
      ? configOutputs
      : [
          {
            id: "__output__",
            name: "输出",
            type: "any",
            isPort: true,
          },
        ];

    return {
      config: this.getDefaultConfig(),
      inputs: finalInputs,
      outputs,
      label: this.label,
      category: this.category,
    };
  }

  /**
   * 获取输入端口定义
   */
  getInputDefinitions(): PortDefinition[] {
    return this.defineInputs();
  }

  /**
   * 获取输出端口定义
   */
  getOutputDefinitions(): PortDefinition[] {
    return this.defineOutputs();
  }

  /**
   * 执行节点并返回结果
   * @param config - 节点配置
   * @param inputs - 输入数据
   * @param context - 工作流执行上下文（必须，用于获取 MCP 客户端等共享状态）
   * @returns 节点执行结果
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

      // 执行节点逻辑
      const executionResult = await this.execute(mergedConfig, inputs, context);

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

  /**
   * 将 execute 的返回值格式化为统一结构
   */
  protected formatExecutionResult(result: any): NodeResultData {
    const outputDefs = this.getOutputDefinitions();

    const { outputsPayload, rawPayload, summary } = this.extractOutputs(result);

    const outputs: Record<string, NodeResultOutput> = {};

    if (outputDefs.length === 0) {
      return {
        outputs,
        raw: rawPayload,
        summary,
      };
    }

    if (outputDefs.length === 1) {
      const [def] = outputDefs;
      if (def) {
        const value = this.pickOutputValue(outputsPayload, def.id, rawPayload);
        outputs[def.id] = {
          id: def.id,
          label: def.name,
          type: def.type,
          description: def.description,
          value,
        };
      }
    } else {
      for (const def of outputDefs) {
        if (!def) continue;
        const value = this.pickOutputValue(outputsPayload, def.id, undefined);
        outputs[def.id] = {
          id: def.id,
          label: def.name,
          type: def.type,
          description: def.description,
          value,
        };
      }
    }

    return {
      outputs,
      raw: rawPayload,
      summary,
    };
  }

  /**
   * 统一提取输出数据结构
   */
  private extractOutputs(result: any): {
    outputsPayload: Record<string, any> | any;
    rawPayload: any;
    summary?: string;
  } {
    let outputsPayload = result;
    let rawPayload = result;
    let summary: string | undefined;

    if (result && typeof result === "object" && !Array.isArray(result)) {
      const hasOutputs = Object.prototype.hasOwnProperty.call(
        result,
        "outputs"
      );
      const hasRaw = Object.prototype.hasOwnProperty.call(result, "raw");

      if (hasOutputs) {
        outputsPayload = (result as any).outputs;
      }

      rawPayload = hasRaw
        ? (result as any).raw
        : hasOutputs
        ? (result as any).outputs
        : result;

      if (typeof (result as any).summary === "string") {
        summary = (result as any).summary;
      }
    }

    return {
      outputsPayload,
      rawPayload,
      summary,
    };
  }

  /**
   * 按输出 ID 获取值
   */
  private pickOutputValue(payload: any, outputId: string, fallback: any): any {
    if (
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      Object.prototype.hasOwnProperty.call(payload, outputId)
    ) {
      return payload[outputId];
    }

    if (fallback !== undefined) {
      return fallback;
    }

    return undefined;
  }

  /**
   * 验证配置
   * @param config - 节点配置
   * @returns 验证结果
   */
  validateConfig(config: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const inputs = this.defineInputs();

    // 检查必填字段
    for (const input of inputs) {
      if (input.required && !config[input.id]) {
        errors.push(`${input.name} 是必填项`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取节点元信息
   * @returns 节点元信息
   */
  getMetadata() {
    return {
      type: this.type,
      label: this.label,
      description: this.description,
      category: this.category,
      inputs: this.defineInputs(),
      outputs: this.defineOutputs(),
      defaultConfig: this.getDefaultConfig(),
    };
  }
}
