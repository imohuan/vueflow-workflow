import { BaseNode } from "../base-node.ts";
import type { PortDefinition, WorkflowExecutionContext } from "../base-node.ts";

/**
 * 回显节点（调试用）
 * 输出的结果就是输入的内容，支持变量
 */
export class EchoNode extends BaseNode {
  readonly type = "echo";
  readonly label = "回显";
  readonly description = "输出输入的内容，用于调试和查看数据";
  readonly category = "调试工具";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "input",
        name: "输入",
        type: "any",
        required: false,
        description: "要输出的数据，支持任意类型",
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "output",
        name: "输出",
        type: "any",
        description: "与输入相同的数据",
      },
    ];
  }

  protected getDefaultConfig(): Record<string, any> {
    return {
      message: "",
      logToConsole: true,
    };
  }

  /**
   * 自定义节点样式
   */
  protected getStyleConfig() {
    return {
      headerColor: { from: "#10b981", to: "#059669" }, // 绿色渐变
      showIcon: true,
      icon: "IconInfo",
    };
  }

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    _context: WorkflowExecutionContext
  ): Promise<any> {
    const inputData =
      config.input ??
      inputs.input ??
      inputs.__input__ ??
      inputs.default ??
      null;
    const message = config.message || "";
    const logToConsole = config.logToConsole !== false;

    // 如果配置了消息，在控制台打印
    if (logToConsole) {
      if (message) {
        console.log(`[Echo节点] ${message}:`, inputData);
      } else {
        console.log("[Echo节点] 输出数据:", inputData);
      }
    }

    // 生成摘要信息
    let summary = "已回显数据";
    if (message) {
      summary = `${message}: ${this.formatDataForSummary(inputData)}`;
    } else {
      summary = `回显: ${this.formatDataForSummary(inputData)}`;
    }

    return {
      outputs: {
        output: inputData,
      },
      raw: inputData,
      summary,
    };
  }

  /**
   * 格式化数据用于摘要显示
   */
  private formatDataForSummary(data: any): string {
    if (data === null) return "null";
    if (data === undefined) return "undefined";
    if (typeof data === "string") return `"${data}"`;
    if (typeof data === "number" || typeof data === "boolean")
      return String(data);
    if (Array.isArray(data)) return `Array(${data.length})`;
    if (typeof data === "object") {
      const keys = Object.keys(data);
      if (keys.length === 0) return "{}";
      return `{ ${keys.slice(0, 3).join(", ")}${
        keys.length > 3 ? "..." : ""
      } }`;
    }
    return String(data);
  }
}
