# Workflow Server

基于 WebSocket 的工作流执行服务器，作为 Web Worker 的服务器端替代方案。

## 📦 功能特性

- ✅ **WebSocket 通信**：使用 WebSocket 替代 Web Worker 的 postMessage
- ✅ **节点注册表管理**：自动加载所有节点类型（CoreNodeRegistry + BrowserNodeRegistry）
- ✅ **工作流执行**：支持完整的工作流执行，实时推送事件
- ✅ **心跳检测**：自动检测客户端连接状态
- ✅ **多客户端支持**：支持多个客户端同时连接
- ✅ **错误处理**：完善的错误处理和日志输出

## 🚀 快速开始

### 安装依赖

```bash
cd packages/workflow-server
pnpm install
```

### 启动服务器

#### 方式 1：开发模式（自动重启）

```bash
pnpm dev
```

#### 方式 2：构建后运行

```bash
pnpm build
pnpm start
```

#### 方式 3：自定义端口和主机

```bash
PORT=8080 HOST=localhost pnpm dev
```

### 在代码中使用

```typescript
import { WorkflowServer } from "workflow-server";

const server = new WorkflowServer({
  port: 3001,
  host: "0.0.0.0",
  heartbeatInterval: 30000, // 30秒
  maxConnections: 100,
});

server.start();

// 优雅退出
process.on("SIGTERM", () => {
  server.stop();
  process.exit(0);
});
```

## 📡 通信协议

### 客户端 → 服务器

#### 1. 初始化请求

```json
{
  "type": "INIT",
  "payload": {
    "clientId": "optional-client-id"
  }
}
```

#### 2. 执行工作流

```json
{
  "type": "EXECUTE_WORKFLOW",
  "payload": {
    "executionId": "exec_1234567890",
    "workflowId": "workflow-id",
    "nodes": [
      {
        "id": "start_123",
        "type": "custom",
        "data": { ... }
      }
    ],
    "edges": [
      {
        "id": "edge_123",
        "source": "start_123",
        "target": "end_456"
      }
    ]
  }
}
```

#### 3. 心跳 PING

```json
{
  "type": "PING",
  "payload": {
    "timestamp": 1234567890
  }
}
```

### 服务器 → 客户端

#### 1. 初始化响应

```json
{
  "type": "INITIALIZED",
  "payload": {
    "nodeMetadata": [
      {
        "type": "httpRequest",
        "label": "HTTP 请求",
        "description": "发送 HTTP 请求",
        "category": "网络",
        "inputs": [...],
        "outputs": [...],
        "defaultConfig": {...}
      }
    ],
    "serverId": "server_uuid",
    "timestamp": 1234567890
  }
}
```

#### 2. 工作流事件

```json
{
  "type": "WORKFLOW_EVENT",
  "payload": {
    "eventType": "WORKFLOW_STARTED",
    "eventData": {
      "executionId": "exec_1234567890",
      "workflowId": "workflow-id",
      "timestamp": 1234567890
    }
  }
}
```

**支持的事件类型：**

- `WORKFLOW_STARTED` - 工作流开始
- `WORKFLOW_COMPLETED` - 工作流完成
- `WORKFLOW_ERROR` - 工作流错误
- `NODE_STATUS_CHANGED` - 节点状态变化
- `NODE_PROGRESS` - 节点进度更新
- `NODE_LOG` - 节点日志
- `EDGE_ACTIVATED` - 边激活
- `LOOP_STARTED` - 循环开始
- `ITERATION_STARTED` - 迭代开始
- `ITERATION_COMPLETED` - 迭代完成
- `LOOP_COMPLETED` - 循环完成

#### 3. 心跳 PONG

```json
{
  "type": "PONG",
  "payload": {
    "timestamp": 1234567890,
    "serverTimestamp": 1234567890
  }
}
```

#### 4. 错误消息

```json
{
  "type": "ERROR",
  "payload": {
    "message": "错误描述",
    "stack": "错误堆栈",
    "code": "ERROR_CODE"
  }
}
```

## 🔧 配置选项

```typescript
interface ServerConfig {
  /** WebSocket 端口（默认：3001） */
  port: number;

  /** 主机地址（默认：0.0.0.0） */
  host?: string;

  /** 心跳间隔，毫秒（默认：30000） */
  heartbeatInterval?: number;

  /** 最大连接数（默认：100） */
  maxConnections?: number;
}
```

## 📊 服务器状态

获取服务器状态：

```typescript
const status = server.getStatus();
console.log(status);
// {
//   serverId: "server_uuid",
//   isRunning: true,
//   clientCount: 2,
//   nodeCount: 25,
//   config: { ... }
// }
```

## 🔍 调试

服务器会输出详细的日志信息：

```
========================================
🚀 工作流 WebSocket 服务器
========================================
[NodeRegistry] 正在初始化节点注册表...
[NodeRegistry] ✅ 已加载 25 个节点
✅ 服务器已启动
   地址: ws://0.0.0.0:3001
   节点数: 25
   最大连接数: 100
========================================

✅ 客户端已连接: client_abc123 (总连接数: 1)
[client_abc123] 处理初始化请求
[client_abc123] ✅ 已发送 25 个节点元数据
[client_abc123] 执行工作流: my-workflow (ID: exec_123)
[Executor] 开始执行工作流: my-workflow (执行ID: exec_123)
[Executor] ✅ 工作流执行完成: exec_123
```

## 🌐 客户端连接示例

### 浏览器客户端

```typescript
const ws = new WebSocket("ws://localhost:3001");

ws.onopen = () => {
  console.log("已连接到服务器");

  // 初始化
  ws.send(
    JSON.stringify({
      type: "INIT",
    })
  );
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case "INITIALIZED":
      console.log("节点元数据:", message.payload.nodeMetadata);
      break;

    case "WORKFLOW_EVENT":
      console.log("工作流事件:", message.payload);
      break;

    case "ERROR":
      console.error("错误:", message.payload);
      break;
  }
};

// 执行工作流
function executeWorkflow(nodes, edges) {
  ws.send(
    JSON.stringify({
      type: "EXECUTE_WORKFLOW",
      payload: {
        executionId: `exec_${Date.now()}`,
        workflowId: "my-workflow",
        nodes,
        edges,
      },
    })
  );
}

// 心跳
setInterval(() => {
  ws.send(
    JSON.stringify({
      type: "PING",
      payload: {
        timestamp: Date.now(),
      },
    })
  );
}, 30000);
```

## 🔄 与 Web Worker 的对比

| 特性         | Web Worker             | Workflow Server       |
| ------------ | ---------------------- | --------------------- |
| **运行环境** | 浏览器主线程           | 独立的 Node.js 进程   |
| **通信方式** | postMessage            | WebSocket             |
| **多客户端** | ❌ 每个页面独立        | ✅ 多客户端共享       |
| **资源占用** | 每个浏览器页面独立占用 | 服务器端统一管理      |
| **调试**     | 浏览器 DevTools        | Node.js 调试器 + 日志 |
| **扩展性**   | 受限于浏览器           | 可横向扩展            |
| **节点更新** | 需要刷新页面           | 服务器端热更新        |
| **适用场景** | 单用户应用             | 多用户、企业级应用    |

## 📝 注意事项

1. **安全性**：生产环境建议添加：

   - WebSocket 认证机制
   - TLS/SSL 加密（wss://）
   - 请求速率限制
   - IP 白名单

2. **性能优化**：

   - 大型工作流建议分批发送节点数据
   - 考虑使用消息压缩
   - 根据实际需求调整心跳间隔

3. **错误处理**：
   - 客户端应实现重连机制
   - 服务器端已实现基础错误恢复
   - 建议添加工作流执行超时机制

## 🛠️ 开发

### 构建

```bash
pnpm build
```

### 类型检查

```bash
pnpm tsc --noEmit
```

### 清理

```bash
rm -rf dist node_modules
```

## 📄 许可证

MIT
