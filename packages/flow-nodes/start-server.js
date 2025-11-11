/**
 * WebSocket 服务器启动示例
 * 演示如何使用 createWorkflowServer 函数
 */

// import { createWorkflowServer } from "./server";
// import { NODE_CLASS_REGISTRY } from "../index";

import { NODE_CLASS_REGISTRY } from "./dist/index.js"
import { createWorkflowServer } from "./dist/server.js"
// Node.js 全局变量声明

// 从环境变量读取配置，或使用默认值
const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = process.env.HOST || "localhost";

console.log("========================================");
console.log("🚀 启动 WebSocket 工作流执行服务器");
console.log("========================================");

// 创建并启动服务器
const server = createWorkflowServer({
  port: PORT,
  host: HOST,
  nodeRegistry: NODE_CLASS_REGISTRY,
  enableLogging: true,
});

// 获取服务器信息
const info = server.getInfo();
console.log("\n服务器信息:");
console.log(`  地址: ws://${info.host}:${info.port}`);
console.log(`  节点数: ${info.nodeCount}`);
console.log(`  节点类型: ${info.nodeTypes.slice(0, 5).join(", ")}... (共 ${info.nodeTypes.length} 个)`);
console.log("\n服务器已启动，等待客户端连接...");
console.log("========================================\n");

// 优雅退出
const shutdown = async () => {
  console.log("\n收到退出信号，正在关闭服务器...");
  await server.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// 导出服务器实例（用于测试）
export { server };
