/**
 * MCP 节点注册中心
 * 只导出主项目需要的接口
 */

// 导出节点注册表类
export { BrowserNodeRegistry } from "./node-registry.ts";

// 导出 MCP 客户端（主项目需要）
export { createMCPClient } from "./mcp-client.ts";
export type { MCPClient } from "./mcp-client.ts";
