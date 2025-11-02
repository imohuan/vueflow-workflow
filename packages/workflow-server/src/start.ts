/**
 * 工作流服务器启动脚本
 * 用于开发和生产环境直接启动服务器
 */

import { WorkflowServer } from "./server.js";

const port = parseInt(process.env.PORT || "3001", 10);
// Windows 上使用 localhost 更可靠，如需外部访问可设置 HOST=0.0.0.0
const host = process.env.HOST || "localhost";

console.log(`🔧 配置: host=${host}, port=${port}`);

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
