/**
 * 服务端 WebSocket 执行器
 * 
 * 使用示例：
 * ```typescript
 * import { createWorkflowServer } from 'workflow-flow-nodes/server';
 * import { NODE_CLASS_REGISTRY } from 'workflow-flow-nodes';
 * 
 * const server = createWorkflowServer({
 *   port: 3001,
 *   host: 'localhost',
 *   nodeRegistry: NODE_CLASS_REGISTRY,
 *   enableLogging: true,
 * });
 * 
 * // 关闭服务器
 * await server.close();
 * ```
 */

export { createWorkflowServer } from "./server";
export type { ServerConfig, ClientMessage, ServerMessage } from "./types";
