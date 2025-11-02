/**
 * 工作流 WebSocket 服务器 - 主入口
 *
 * 使用方式：
 *
 * 1. 作为独立服务器运行：
 *    ```bash
 *    pnpm dev
 *    ```
 *
 * 2. 在代码中集成：
 *    ```typescript
 *    import { WorkflowServer } from 'workflow-server';
 *    const server = new WorkflowServer({ port: 3001 });
 *    server.start();
 *    ```
 */

export { WorkflowServer } from "./server.js";
export { NodeRegistryManager } from "./nodeRegistry.js";
export { WorkflowExecutor } from "./executor.js";
export type {
  ClientMessage,
  ServerMessage,
  NodeMetadata,
  ServerConfig,
  ClientConnection,
} from "./types.js";

// 如果直接运行此文件，启动服务器
if (import.meta.url === `file://${process.argv[1]}`) {
  const { WorkflowServer } = await import("./server.js");

  const port = parseInt(process.env.PORT || "3001", 10);
  const host = process.env.HOST || "0.0.0.0";

  const server = new WorkflowServer({ port, host });

  // 启动服务器
  server.start();

  // 优雅退出
  const shutdown = () => {
    console.log("\n收到退出信号...");
    server.stop();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // 定时输出状态
  setInterval(() => {
    const status = server.getStatus();
    if (status.clientCount > 0) {
      console.log(
        `📊 [状态] 连接数: ${status.clientCount}, 节点数: ${status.nodeCount}`
      );
    }
  }, 60000); // 每分钟输出一次
}
