import { BaseNode } from "@workflow-imohuan/node-executor";
import type {
  NodeData,
  PortDefinition,
  WorkflowExecutionContext,
} from "@workflow-imohuan/node-executor";

export interface DelayNodeConfig {
  /** 延迟时间（毫秒） */
  delay: number;
  /** 是否传递输入数据 */
  passthrough: boolean;
}

/**
 * 延迟节点
 * 等待指定时间后继续执行，用于调试或控制执行速度
 */
export class DelayNode extends BaseNode {
  readonly type = "delay";
  readonly label = "延迟";
  readonly description = "等待指定时间后继续执行";
  readonly category = "流程控制";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "delay",
        name: "延迟时间(ms)",
        type: "number",
        description: "延迟的毫秒数，默认1000ms",
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "output",
        name: "输出",
        type: "any",
        description: "延迟后输出的数据",
      },
    ];
  }

  protected getDefaultConfig(): DelayNodeConfig {
    return {
      delay: 1000, // 默认延迟1秒
      passthrough: true, // 默认传递输入数据
    };
  }

  /**
   * 获取节点样式配置
   * 示例：自定义标题栏颜色和图标
   *
   * headerColor 支持三种格式：
   * 1. 字符串（单色）："#38bdf8"
   * 2. 对象（单色）：{ color: "#38bdf8" }
   * 3. 对象（渐变）：{ from: "#38bdf8", to: "#0ea5e9" }
   *
   * icon 支持三种格式：
   * 1. 字符串（emoji）："⏱"
   * 2. SVG 字符串：完整的 SVG HTML 代码
   * 3. 组件名称：项目中已注册的图标组件名称，如 "IconPlay"
   */
  protected getStyleConfig() {
    return {
      // 示例 1: 使用字符串单色
      // headerColor: "red",
      // 示例 2: 使用对象单色
      // headerColor: { color: "#38bdf8" },
      // 示例 3: 使用对象渐变（当前使用）
      // headerColor: { from: "#38bdf8", to: "#0ea5e9" },
      // showIcon: true,
      // icon: "IconPlay",
    };
  }

  async execute(
    config: DelayNodeConfig,
    inputs: Record<string, any>,
    _context: WorkflowExecutionContext
  ): Promise<any> {
    const delayTime = config.delay || 1000;

    // 等待指定时间
    await new Promise((resolve) => setTimeout(resolve, delayTime));

    // 决定输出什么数据
    const outputData = { delayed: true };

    return {
      outputs: {
        output: outputData,
      },
      raw: outputData,
      summary: `已延迟 ${delayTime}ms`,
    };
  }
}
