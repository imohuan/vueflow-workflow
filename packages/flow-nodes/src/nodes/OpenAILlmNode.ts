import {
  BaseFlowNode,
  type PortConfig,
  type NodeStyleConfig,
  type NodeExecutionContext,
  type NodeExecutionResult,
} from "../BaseFlowNode";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

/**
 * 消息类型
 */
export interface Message {
  role: "system" | "user" | "assistant";
  type: "text" | "image";
  message: string;
}

/**
 * OpenAI LLM 节点
 * 用于调用 OpenAI 兼容的大模型 API
 */
export class OpenAILlmNode extends BaseFlowNode {
  readonly type = "openaiLlm";
  readonly label = "AI 大模型";
  readonly description = "调用 OpenAI 兼容的大模型 API";
  readonly category = "AI";

  protected defineInputs(): PortConfig[] {
    return [
      {
        name: "baseUrl",
        type: "string",
        description: "API 基础 URL",
        required: true,
        defaultValue: "https://api.openai.com/v1",
      },
      {
        name: "apiKey",
        type: "string",
        description: "API Key",
        required: true,
      },
      {
        name: "model",
        type: "string",
        description: "模型名称",
        required: true,
        defaultValue: "gpt-3.5-turbo",
      },
      {
        name: "systemMessages",
        type: "array",
        description: "系统提示词列表",
        defaultValue: [],
      },
      {
        name: "userMessages",
        type: "array",
        description: "用户提示词列表",
        defaultValue: [],
      },
      {
        name: "temperature",
        type: "number",
        description: "温度参数（0-2）",
        defaultValue: 1,
      },
      {
        name: "maxTokens",
        type: "number",
        description: "最大 token 数",
        defaultValue: 2048,
      },
      {
        name: "topP",
        type: "number",
        description: "Top P 参数（0-1）",
        defaultValue: 1,
      },
      {
        name: "frequencyPenalty",
        type: "number",
        description: "频率惩罚（-2 到 2）",
        defaultValue: 0,
      },
      {
        name: "presencePenalty",
        type: "number",
        description: "存在惩罚（-2 到 2）",
        defaultValue: 0,
      },
    ];
  }

  protected defineOutputs(): PortConfig[] {
    return [
      {
        name: "response",
        type: "string",
        description: "AI 响应内容",
      },
      {
        name: "fullResponse",
        type: "object",
        description: "完整的 API 响应",
      },
    ];
  }

  protected getStyleConfig(): NodeStyleConfig {
    return {
      headerColor: ["#10b981", "#059669"], // 绿色渐变
      icon: "ai",
      showIcon: true,
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      // 获取输入参数
      let baseUrl = this.getInput<string>(
        inputs,
        "baseUrl",
        "https://api.openai.com/v1"
      );
      const apiKey = this.getInput<string>(inputs, "apiKey", "");
      const model = this.getInput<string>(inputs, "model", "gpt-3.5-turbo");
      const systemMessages = this.getInput<Message[]>(
        inputs,
        "systemMessages",
        []
      );
      const userMessages = this.getInput<Message[]>(inputs, "userMessages", []);
      const temperature = this.getInput<number>(inputs, "temperature", 1);
      const maxTokens = this.getInput<number>(inputs, "maxTokens", 2048);
      const topP = this.getInput<number>(inputs, "topP", 1);
      const frequencyPenalty = this.getInput<number>(
        inputs,
        "frequencyPenalty",
        0
      );
      const presencePenalty = this.getInput<number>(
        inputs,
        "presencePenalty",
        0
      );

      // 验证必填参数
      const validation = this.validateInputs(inputs);
      if (!validation.valid) {
        return this.createError(validation.errors.join("; "));
      }

      // 检查是否中止
      if (context.signal?.aborted) {
        return this.createError("请求已中止");
      }

      // 处理 baseUrl：移除末尾斜杠，检查是否有 /v1 后缀，如果没有则自动补全
      baseUrl = baseUrl.replace(/\/$/, ""); // 移除末尾的斜杠
      if (!baseUrl.endsWith("/v1")) {
        baseUrl = `${baseUrl}/v1`;
      }

      // 创建 OpenAI 客户端
      const client = new OpenAI({
        apiKey,
        baseURL: baseUrl,
      });

      // 构建消息列表
      const messages: ChatCompletionMessageParam[] = [];

      // 添加系统消息
      if (Array.isArray(systemMessages) && systemMessages.length > 0) {
        for (const msg of systemMessages) {
          if (msg.role === "system" && msg.message) {
            if (msg.type === "text") {
              messages.push({
                role: "system",
                content: msg.message,
              } as ChatCompletionMessageParam);
            } else if (msg.type === "image") {
              // 图片类型消息 - system 角色不支持图片内容
              // OpenAI API 的 system 角色只支持文本内容
              // 将图片类型的系统消息转换为用户消息，避免丢失信息
              messages.push({
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: { url: msg.message },
                  },
                ],
              } as ChatCompletionMessageParam);
            }
          }
        }
      }

      // 添加用户消息
      if (Array.isArray(userMessages) && userMessages.length > 0) {
        for (const msg of userMessages) {
          if (msg.role === "user" && msg.message) {
            if (msg.type === "text") {
              messages.push({
                role: "user",
                content: msg.message,
              } as ChatCompletionMessageParam);
            } else if (msg.type === "image") {
              // 图片类型消息
              messages.push({
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: { url: msg.message },
                  },
                ],
              } as ChatCompletionMessageParam);
            }
          }
        }
      }

      // 如果没有消息，返回错误
      if (messages.length === 0) {
        return this.createError("至少需要提供一个系统或用户消息");
      }

      // 使用 OpenAI 库创建聊天完成
      const completion = await client.chat.completions.create(
        {
          model,
          messages,
          temperature: Math.max(0, Math.min(2, temperature)),
          max_tokens: Math.max(1, maxTokens),
          top_p: Math.max(0, Math.min(1, topP)),
          frequency_penalty: Math.max(-2, Math.min(2, frequencyPenalty)),
          presence_penalty: Math.max(-2, Math.min(2, presencePenalty)),
        },
        {
          signal: context.signal, // 支持 AbortSignal
        }
      );

      // 提取响应内容
      const responseText = completion.choices?.[0]?.message?.content || "";

      // 构建完整响应对象
      const fullResponse = {
        id: completion.id,
        object: completion.object,
        created: completion.created,
        model: completion.model,
        choices: completion.choices,
        usage: completion.usage,
      };

      return this.createOutput(
        {
          response: responseText,
          fullResponse,
        },
        responseText,
        `模型 ${model} 调用成功`
      );
    } catch (error) {
      // 处理 OpenAI API 错误
      if (error instanceof OpenAI.APIError) {
        return this.createError(`API 错误: ${error.status} - ${error.message}`);
      }

      // 处理中止错误
      if ((error as Error).name === "AbortError") {
        return this.createError("请求已中止");
      }

      // 处理其他错误
      return this.createError(error as Error);
    }
  }
}
