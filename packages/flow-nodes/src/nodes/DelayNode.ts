import {
  BaseFlowNode,
  type PortConfig,
  type NodeStyleConfig,
  type NodeExecutionContext,
  type NodeExecutionResult,
} from "../BaseFlowNode";

/**
 * 延迟节点
 * 在工作流中暂停指定的时间，然后继续传递数据
 */
export class DelayNode extends BaseFlowNode {
  readonly type = "delay";
  readonly label = "延迟";
  readonly description = "暂停工作流执行指定的时间";
  readonly category = "控制流";

  protected defineInputs(): PortConfig[] {
    return [
      {
        name: "delay",
        type: "number",
        description: "延迟时间（毫秒）",
        required: true,
        defaultValue: 1000,
      },
    ];
  }

  protected defineOutputs(): PortConfig[] {
    return [
      {
        name: "output",
        type: "any",
        description: "延迟后输出的数据",
      },
    ];
  }

  protected getStyleConfig(): NodeStyleConfig {
    return {
      headerColor: ["#f59e0b", "#d97706"],
      icon: "⏱️",
      showIcon: true,
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      // 获取延迟时间
      const delay = this.getInput<number>(inputs, "delay", 1000);
      console.log("DelayNode execute", delay);

      // 验证延迟时间
      if (typeof delay !== "number" || delay < 0) {
        return this.createError("延迟时间必须是非负数");
      }

      // 如果延迟时间为 0，直接返回
      if (delay === 0) {
        return this.createOutput({
          output: undefined,
        });
      }

      // 执行延迟
      await this.sleep(delay, context.signal);

      // 延迟完成，返回数据
      return this.createOutput(
        {
          output: undefined,
        },
        undefined,
        `延迟 ${delay}ms 完成`
      );
    } catch (error) {
      // 如果是取消错误，则特殊处理
      if (error instanceof Error && error.name === "AbortError") {
        return this.createError("延迟被取消");
      }
      return this.createError(error as Error);
    }
  }

  /**
   * 睡眠指定时间
   * @param ms - 毫秒数
   * @param signal - 中止信号
   */
  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      // 检查是否已经中止
      if (signal?.aborted) {
        const error = new Error("延迟被取消");
        error.name = "AbortError";
        reject(error);
        return;
      }

      // 设置定时器
      const timer = setTimeout(() => {
        cleanup();
        resolve();
      }, ms);

      // 监听中止事件
      const onAbort = () => {
        cleanup();
        const error = new Error("延迟被取消");
        error.name = "AbortError";
        reject(error);
      };

      // 清理函数
      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      };

      // 注册中止监听器
      signal?.addEventListener("abort", onAbort);
    });
  }
}
