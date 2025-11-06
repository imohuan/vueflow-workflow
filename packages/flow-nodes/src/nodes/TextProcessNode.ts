import {
  BaseFlowNode,
  type PortConfig,
  type NodeStyleConfig,
  type NodeExecutionContext,
  type NodeExecutionResult,
} from "../BaseFlowNode";

/**
 * 文本处理节点
 */
export class TextProcessNode extends BaseFlowNode {
  readonly type = "text-process";
  readonly label = "文本处理";
  readonly description = "对输入文本进行转换处理";
  readonly category = "文本工具";

  protected defineInputs(): PortConfig[] {
    return [
      {
        name: "text",
        type: "string",
        description: "输入文本",
        required: true,
      },
      {
        name: "mode",
        type: "string",
        description: "处理模式",
        defaultValue: "uppercase",
        options: [
          { label: "大写", value: "uppercase" },
          { label: "小写", value: "lowercase" },
          { label: "反转", value: "reverse" },
        ],
      },
      {
        name: "prefix",
        type: "string",
        description: "添加前缀",
        defaultValue: "",
      },
    ];
  }

  protected defineOutputs(): PortConfig[] {
    return [
      {
        name: "result",
        type: "string",
        description: "处理后的文本",
      },
      {
        name: "length",
        type: "number",
        description: "文本长度",
      },
    ];
  }

  protected getStyleConfig(): NodeStyleConfig {
    return {
      headerColor: "#3b82f6",
      icon: "📝",
      showIcon: true,
      bodyStyle: {
        minWidth: "200px",
      },
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      const text = this.getInput<string>(inputs, "text", "");
      const mode = this.getInput<string>(inputs, "mode", "uppercase");
      const prefix = this.getInput<string>(inputs, "prefix", "");

      const validation = this.validateInputs(inputs);
      if (!validation.valid) {
        return this.createError(validation.errors.join("; "));
      }

      let result = text;
      switch (mode) {
        case "uppercase":
          result = text.toUpperCase();
          break;
        case "lowercase":
          result = text.toLowerCase();
          break;
        case "reverse":
          result = text.split("").reverse().join("");
          break;
      }

      if (prefix) {
        result = prefix + result;
      }

      return this.createOutput({
        result,
        length: result.length,
      });
    } catch (error) {
      return this.createError(error as Error);
    }
  }
}
