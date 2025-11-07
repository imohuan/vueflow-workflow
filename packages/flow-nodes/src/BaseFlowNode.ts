/**
 * 支持的数据类型
 */
export type NodeDataType =
  | "string" // 字符串
  | "number" // 数字
  | "boolean" // 布尔值
  | "array" // 数组
  | "object" // 对象
  | "date" // 日期时间
  | "any" // 任意类型
  | "file" // 文件
  | "json" // JSON
  | string; // 允许自定义类型

/**
 * 输入/输出端口定义
 */
export interface PortConfig {
  /** 端口唯一标识 */
  name: string;
  /** 数据类型 */
  type: NodeDataType;
  /** 端口描述 */
  description?: string;
  /** 是否必填（仅输入端口有效） */
  required?: boolean;
  /** 默认值（仅输入端口有效） */
  defaultValue?: any;
  /** 是否允许多连接（仅输入端口有效） */
  multiple?: boolean;
  /** 选项列表（用于下拉选择、单选、复选等） */
  options?: Array<{
    label: string;
    value: string | number | boolean;
  }>;
}

/**
 * 节点样式配置
 */
export interface NodeStyleConfig {
  /** 标题栏样式 */
  headerStyle?: Record<string, any>;
  /** 主体区域样式 */
  bodyStyle?: Record<string, any>;
  /**
   * 标题栏颜色（快捷配置）
   * - 字符串：单色（如 "#a855f7"）
   * - 数组：渐变色（如 ["#a855f7", "#ec4899"]）
   */
  headerColor?: string | string[];
  /** 节点图标（emoji 或 SVG） */
  icon?: string;
  /** 是否显示图标 */
  showIcon?: boolean;
}

/**
 * 节点执行上下文
 */
export interface NodeExecutionContext {
  /** 节点唯一 ID */
  nodeId: string;
  /** 工作流全局上下文 */
  workflow?: Record<string, any>;
  /** 中止信号 */
  signal?: AbortSignal;
  /** 其他自定义数据 */
  [key: string]: any;
}

/**
 * 节点执行结果
 */
export interface NodeExecutionResult {
  /** 输出数据（键为输出端口 name） */
  outputs?: Record<string, any>;
  /** 原始输出数据（用于单输出端口场景） */
  raw?: any;
  /** 执行摘要 */
  summary?: string;
  /** 是否成功 */
  success?: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 节点基类
 * 所有自定义流程节点都应继承此类
 */
export abstract class BaseFlowNode {
  /** 节点类型标识（唯一） */
  abstract readonly type: string;

  /** 节点显示名称 */
  abstract readonly label: string;

  /** 节点描述 */
  abstract readonly description?: string;

  /** 节点分类 */
  abstract readonly category?: string;

  /**
   * 定义输入端口
   * @returns 输入端口配置数组
   */
  protected abstract defineInputs(): PortConfig[];

  /**
   * 定义输出端口
   * @returns 输出端口配置数组
   */
  protected abstract defineOutputs(): PortConfig[];

  /**
   * 获取节点样式配置
   * @returns 样式配置对象
   */
  protected getStyleConfig(): NodeStyleConfig {
    return {};
  }

  /**
   * 执行节点逻辑（核心方法）
   * @param inputs - 输入数据（键为输入端口 name）
   * @param context - 执行上下文
   * @returns 执行结果
   */
  abstract execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> | NodeExecutionResult;

  /**
   * 获取输入端口定义
   */
  getInputs(): PortConfig[] {
    return this.defineInputs();
  }

  /**
   * 获取输出端口定义
   */
  getOutputs(): PortConfig[] {
    return this.defineOutputs();
  }

  /**
   * 获取样式配置
   */
  getStyle(): NodeStyleConfig {
    return this.getStyleConfig();
  }

  /**
   * 从输入数据中获取指定端口的值
   * @param inputs - 输入数据
   * @param portName - 端口名称
   * @param defaultValue - 默认值
   * @returns 端口值
   */
  protected getInput<T = any>(
    inputs: Record<string, any>,
    portName: string,
    defaultValue?: T
  ): T {
    if (inputs && Object.prototype.hasOwnProperty.call(inputs, portName)) {
      return inputs[portName] as T;
    }

    // 查找端口配置中的默认值
    const inputDef = this.defineInputs().find((i) => i.name === portName);
    if (inputDef && inputDef.defaultValue !== undefined) {
      return inputDef.defaultValue as T;
    }

    return defaultValue as T;
  }

  /**
   * 创建输出结果
   * @param outputs - 输出数据（键为输出端口 name）
   * @param raw - 原始数据（可选，用于单输出端口）
   * @param summary - 执行摘要（可选）
   * @returns 标准化的执行结果
   */
  protected createOutput(
    outputs: Record<string, any> | any,
    raw?: any,
    summary?: string
  ): NodeExecutionResult {
    const outputDefs = this.defineOutputs();

    // 单输出端口场景：直接传入值
    if (outputDefs.length === 1 && !this.isPlainObject(outputs)) {
      const [outputDef] = outputDefs;
      return {
        outputs: {
          [outputDef!.name]: outputs,
        },
        raw: raw ?? outputs,
        summary,
        success: true,
      };
    }

    // 多输出端口场景：传入对象
    return {
      outputs: this.isPlainObject(outputs) ? outputs : {},
      raw: raw ?? outputs,
      summary,
      success: true,
    };
  }

  /**
   * 创建错误结果
   * @param error - 错误信息
   * @returns 错误结果
   */
  protected createError(error: string | Error): NodeExecutionResult {
    return {
      success: false,
      error: error instanceof Error ? error.message : error,
      outputs: {},
    };
  }

  /**
   * 验证必填输入
   * @param inputs - 输入数据
   * @returns 验证结果
   */
  validateInputs(inputs: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const inputDefs = this.defineInputs();

    for (const input of inputDefs) {
      if (input.required) {
        const value = inputs[input.name];
        if (value === undefined || value === null || value === "") {
          errors.push(`"${input.name}" 是必填项`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取节点元信息
   */
  getMetadata() {
    return {
      type: this.type,
      label: this.label,
      description: this.description,
      category: this.category,
      inputs: this.defineInputs(),
      outputs: this.defineOutputs(),
      style: this.getStyleConfig(),
    };
  }

  /**
   * 判断节点是否应该使用缓存
   * 子类可以重写此方法来自定义缓存策略
   * @param inputs - 当前输入数据
   * @param context - 执行上下文
   * @returns 是否应该使用缓存
   */
  shouldUseCache(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): boolean {
    // 默认策略：始终允许使用缓存
    // 缓存有效性由缓存键（configHash）来判断
    return true;
  }

  /**
   * 获取用于缓存判断的输入参数
   * 子类可以重写此方法来指定哪些输入应该参与缓存判断
   * 默认情况下，所有输入都会参与缓存判断
   * @param inputs - 完整的输入数据
   * @returns 应该参与缓存判断的输入数据
   */
  protected getCacheableInputs(
    inputs: Record<string, any>
  ): Record<string, any> {
    // 默认：所有输入都参与缓存判断
    return inputs;
  }

  /**
   * 计算节点配置的哈希值
   * 用于判断节点配置是否发生变化
   * @param inputs - 输入数据
   * @param nodeData - 节点配置数据
   * @returns 配置哈希值
   */
  computeConfigHash(
    inputs: Record<string, any>,
    nodeData: Record<string, any> = {}
  ): string {
    // 获取可缓存的输入
    const cacheableInputs = this.getCacheableInputs(inputs);

    // 合并节点配置参数
    const configData = {
      type: this.type,
      inputs: cacheableInputs,
      // params: nodeData.params || {},
    };

    // 计算哈希
    return this.hashObject(configData);
  }

  /**
   * 计算对象的简单哈希值
   * @param obj - 要计算哈希的对象
   * @returns 哈希字符串
   */
  private hashObject(obj: any): string {
    // 将对象转换为稳定的 JSON 字符串（排序键）
    const jsonString = this.stableStringify(obj);

    // 使用简单的哈希算法（DJB2）
    let hash = 5381;
    for (let i = 0; i < jsonString.length; i++) {
      hash = (hash * 33) ^ jsonString.charCodeAt(i);
    }

    // 转换为十六进制字符串
    return (hash >>> 0).toString(16);
  }

  /**
   * 将对象转换为稳定的 JSON 字符串（键排序）
   * @param obj - 要序列化的对象
   * @returns JSON 字符串
   */
  private stableStringify(obj: any): string {
    if (obj === null || obj === undefined) {
      return String(obj);
    }

    if (typeof obj !== "object") {
      return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
      return (
        "[" + obj.map((item) => this.stableStringify(item)).join(",") + "]"
      );
    }

    // 对象：按键排序
    const keys = Object.keys(obj).sort();
    const pairs = keys.map((key) => {
      return JSON.stringify(key) + ":" + this.stableStringify(obj[key]);
    });

    return "{" + pairs.join(",") + "}";
  }

  /**
   * 判断是否为普通对象
   */
  private isPlainObject(obj: any): obj is Record<string, any> {
    return obj !== null && typeof obj === "object" && !Array.isArray(obj);
  }
}
