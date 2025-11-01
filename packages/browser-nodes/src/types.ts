/**
 * MCP 相关类型定义
 */

/**
 * MCP 响应结果
 */
export interface MCPResponse<T = any> {
  success: boolean;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * MCP 客户端类型
 * 导入实际的 MCPClient 类
 */
export type { MCPClient } from "./mcp-client.ts";
