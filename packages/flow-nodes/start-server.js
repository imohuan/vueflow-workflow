/**
 * WebSocket 服务器启动示例
 * 演示如何使用 createWorkflowServer 函数
 */

// import { createWorkflowServer } from "./server";
// import { NODE_CLASS_REGISTRY } from "../index";

import { NODE_CLASS_REGISTRY } from "./dist/index.js"
import { createWorkflowServer } from "./dist/server/index.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

// Node.js 全局变量声明
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 从环境变量读取配置，或使用默认值
const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = process.env.HOST || "localhost";

// 历史记录存储目录
const HISTORY_DIR = path.join(__dirname, "history");

// 确保历史记录目录存在
if (!fs.existsSync(HISTORY_DIR)) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

/**
 * 历史记录管理
 */
const historyHandlers = {
  /**
   * 获取历史记录
   */
  async getHistory(workflowId, limit) {
    try {
      const files = fs.readdirSync(HISTORY_DIR);
      const historyFiles = files
        .filter((file) => file.endsWith(".json"))
        .map((file) => {
          const filePath = path.join(HISTORY_DIR, file);
          const content = fs.readFileSync(filePath, "utf-8");
          try {
            return JSON.parse(content);
          } catch (err) {
            console.error(`解析历史文件失败: ${file}`, err);
            return null;
          }
        })
        .filter(Boolean);

      // 按工作流ID过滤
      let filtered = workflowId
        ? historyFiles.filter((record) => record.workflowId === workflowId)
        : historyFiles;

      // 按时间倒序排序
      filtered.sort((a, b) => b.startTime - a.startTime);

      // 限制返回数量
      if (limit && limit > 0) {
        filtered = filtered.slice(0, limit);
      }

      return filtered;
    } catch (err) {
      console.error("获取历史记录失败:", err);
      return [];
    }
  },

  /**
   * 保存历史记录
   */
  async saveHistory(result, workflow) {
    try {
      // 将 Map 转换为普通对象以便序列化
      const nodeResultsObj = {};
      if (result.nodeResults instanceof Map) {
        result.nodeResults.forEach((value, key) => {
          nodeResultsObj[key] = value;
        });
      }

      const record = {
        executionId: result.executionId,
        workflowId: result.workflowId,
        success: result.success,
        startTime: result.startTime,
        endTime: result.endTime,
        duration: result.duration,
        error: result.error,
        executedNodeCount: result.executedNodeIds?.length || 0,
        skippedNodeCount: result.skippedNodeIds?.length || 0,
        cachedNodeCount: result.cachedNodeIds?.length || 0,
        executedNodeIds: result.executedNodeIds || [],
        skippedNodeIds: result.skippedNodeIds || [],
        cachedNodeIds: result.cachedNodeIds || [],
        nodeResults: nodeResultsObj,
        // 保存工作流结构快照
        nodes: workflow?.nodes,
        edges: workflow?.edges,
      };

      // 以执行ID命名文件
      const filename = `${result.executionId}.json`;
      const filePath = path.join(HISTORY_DIR, filename);

      fs.writeFileSync(filePath, JSON.stringify(record, null, 2), "utf-8");
      console.log(`✅ 已保存历史记录: ${filename}`);
    } catch (err) {
      console.error("保存历史记录失败:", err);
      throw err;
    }
  },

  /**
   * 清空历史记录
   */
  async clearHistory(workflowId) {
    try {
      const files = fs.readdirSync(HISTORY_DIR);

      if (workflowId) {
        // 清空指定工作流的历史
        let deletedCount = 0;
        for (const file of files) {
          if (!file.endsWith(".json")) continue;

          const filePath = path.join(HISTORY_DIR, file);
          const content = fs.readFileSync(filePath, "utf-8");
          try {
            const record = JSON.parse(content);
            if (record.workflowId === workflowId) {
              fs.unlinkSync(filePath);
              deletedCount++;
            }
          } catch (err) {
            console.error(`解析历史文件失败: ${file}`, err);
          }
        }
        console.log(`🗑️ 已删除 ${deletedCount} 条历史记录 (工作流: ${workflowId})`);
      } else {
        // 清空所有历史
        for (const file of files) {
          if (file.endsWith(".json")) {
            fs.unlinkSync(path.join(HISTORY_DIR, file));
          }
        }
        console.log(`🗑️ 已清空所有历史记录`);
      }
    } catch (err) {
      console.error("清空历史记录失败:", err);
      throw err;
    }
  },

  /**
   * 删除单个历史记录
   */
  async deleteHistory(executionId) {
    try {
      const filename = `${executionId}.json`;
      const filePath = path.join(HISTORY_DIR, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ 已删除历史记录: ${filename}`);
      } else {
        throw new Error(`历史记录不存在: ${executionId}`);
      }
    } catch (err) {
      console.error("删除历史记录失败:", err);
      throw err;
    }
  },
};

console.log("========================================");
console.log("🚀 启动 WebSocket 工作流执行服务器");
console.log("========================================");

// 创建并启动服务器
const server = createWorkflowServer({
  port: PORT,
  host: HOST,
  nodeRegistry: NODE_CLASS_REGISTRY,
  enableLogging: true,
  historyHandlers,
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
