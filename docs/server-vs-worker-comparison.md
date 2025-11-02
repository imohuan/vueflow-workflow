# 服务器模式 vs Worker 模式对比

本文档对比了两种工作流执行模式的特点、优缺点和适用场景。

## 📊 功能对比

| 特性           | Worker 模式            | 服务器模式            |
| -------------- | ---------------------- | --------------------- |
| **运行环境**   | 浏览器 Web Worker      | 独立 Node.js 进程     |
| **通信方式**   | postMessage            | WebSocket             |
| **多客户端**   | ❌ 每个页面独立        | ✅ 多客户端共享       |
| **资源占用**   | 每个浏览器页面独立占用 | 服务器端统一管理      |
| **调试**       | 浏览器 DevTools        | Node.js 调试器 + 日志 |
| **扩展性**     | 受限于浏览器           | 可横向扩展            |
| **节点更新**   | 需要刷新页面           | 服务器端热更新        |
| **离线支持**   | ✅ 完全离线            | ❌ 需要网络连接       |
| **性能**       | 受浏览器限制           | 可充分利用服务器资源  |
| **安全性**     | 代码在客户端           | 代码在服务器端        |
| **部署复杂度** | 低（静态文件）         | 中（需要服务器）      |
| **成本**       | 低（仅前端）           | 中（需要服务器资源）  |

## 🎯 适用场景

### Worker 模式适合

✅ **单用户应用**

- 个人工具
- 演示和原型
- 离线应用

✅ **低延迟要求**

- 需要快速响应
- 本地数据处理
- 客户端计算

✅ **简单部署**

- 静态网站托管
- GitHub Pages
- CDN 分发

✅ **隐私优先**

- 数据不离开浏览器
- 无需信任服务器
- 符合 GDPR

### 服务器模式适合

✅ **多用户协作**

- 团队协作平台
- 企业级应用
- SaaS 产品

✅ **资源密集型**

- 大规模数据处理
- 长时间运行的工作流
- 需要大量内存/CPU

✅ **集中管理**

- 统一的节点库
- 版本控制
- 审计日志

✅ **高级功能**

- 定时任务
- 工作流调度
- 跨用户通知

## 🔄 架构对比

### Worker 模式架构

```
┌─────────────────────────────────────────┐
│           浏览器进程                      │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │  主线程 (UI)  │───→│  Web Worker  │  │
│  │              │←───│   (执行器)    │  │
│  └──────────────┘    └──────────────┘  │
│       ↑                     ↑           │
│       │                     │           │
│  ┌────┴─────────────────────┴────┐     │
│  │      Mitt 事件总线              │     │
│  └─────────────────────────────────┘     │
│                                         │
└─────────────────────────────────────────┘

优点：
✅ 零延迟（本地通信）
✅ 无需网络
✅ 简单部署

缺点：
❌ 资源受限
❌ 无法共享
❌ 更新需刷新
```

### 服务器模式架构

```
┌──────────────────┐         ┌──────────────────┐
│   浏览器客户端 1   │         │   浏览器客户端 2   │
├──────────────────┤         ├──────────────────┤
│   主线程 (UI)     │         │   主线程 (UI)     │
└────────┬─────────┘         └────────┬─────────┘
         │ WebSocket                  │ WebSocket
         │                            │
    ┌────┴────────────────────────────┴────┐
    │                                      │
    │      WebSocket 服务器                 │
    │  ┌────────────────────────────────┐  │
    │  │     工作流执行器                │  │
    │  │   (Node.js 环境)               │  │
    │  └────────────────────────────────┘  │
    │  ┌────────────────────────────────┐  │
    │  │     节点注册表                  │  │
    │  │  (CoreNodes + BrowserNodes)   │  │
    │  └────────────────────────────────┘  │
    │                                      │
    └──────────────────────────────────────┘

优点：
✅ 多客户端共享
✅ 资源充足
✅ 集中管理
✅ 可扩展

缺点：
❌ 网络延迟
❌ 需要服务器
❌ 部署复杂
```

## 💻 代码对比

### Worker 模式使用

```typescript
// 前端代码
import { useWorkflowWorker } from "@/composables/useWorkflowWorker";

const worker = useWorkflowWorker();
await worker.waitForReady();

// 执行工作流
worker.execute(workflowId, nodes, edges);

// 监听事件
workflowEmitter.on("WORKFLOW_COMPLETED", (data) => {
  console.log("完成:", data);
});
```

### 服务器模式使用

```typescript
// 前端代码
import { useWorkflowServerClient } from "@/composables/useWorkflowServerClient";

const client = useWorkflowServerClient("ws://localhost:3001");
await client.waitForReady();

// 执行工作流
client.executeWorkflow(executionId, workflowId, nodes, edges);

// 监听事件（使用相同的 emitter）
workflowEmitter.on("WORKFLOW_COMPLETED", (data) => {
  console.log("完成:", data);
});
```

**注意**：两种模式的事件监听方式完全相同！

## 🔧 配置对比

### Worker 模式

```typescript
// main.ts
// Worker 自动启动，无需配置
```

### 服务器模式

```bash
# 启动服务器
cd packages/workflow-server
PORT=3001 HOST=0.0.0.0 pnpm dev
```

```typescript
// 前端配置
const serverUrl = "ws://localhost:3001";
const client = useWorkflowServerClient(serverUrl);
```

## 📈 性能对比

| 指标         | Worker 模式  | 服务器模式           |
| ------------ | ------------ | -------------------- |
| **启动时间** | ~100ms       | ~500ms（含网络）     |
| **内存占用** | ~50MB/页面   | ~100MB（所有客户端） |
| **CPU 使用** | 受浏览器限制 | 可用所有核心         |
| **并发执行** | 1 个/页面    | 多个（服务器配置）   |
| **网络延迟** | 0ms          | 10-50ms（局域网）    |
| **响应速度** | 最快         | 快                   |

## 🔐 安全性对比

### Worker 模式

✅ **优点**：

- 代码和数据都在客户端
- 无需信任第三方服务器
- 符合隐私法规

❌ **缺点**：

- 客户端代码可被查看
- 无法隐藏业务逻辑
- API 密钥暴露风险

### 服务器模式

✅ **优点**：

- 业务逻辑在服务器端
- API 密钥安全存储
- 可以实施访问控制

❌ **缺点**：

- 需要信任服务器
- 数据传输风险
- 需要额外的安全措施

## 💰 成本对比

### Worker 模式

**一次性成本**：

- 开发成本：低
- 部署成本：几乎为零

**运营成本**：

- 托管：免费（GitHub Pages 等）
- 带宽：低（静态文件）
- 维护：低

**总成本**：极低

### 服务器模式

**一次性成本**：

- 开发成本：中等
- 部署成本：中等

**运营成本**：

- 服务器：$5-50/月（小型）
- 带宽：中等
- 维护：中等

**总成本**：中等

## 🚀 迁移指南

### 从 Worker 迁移到服务器

1. **启动服务器**：

```bash
cd packages/workflow-server
pnpm dev
```

2. **替换 composable**：

```typescript
// 替换前
import { useWorkflowWorker } from "@/composables/useWorkflowWorker";
const worker = useWorkflowWorker();

// 替换后
import { useWorkflowServerClient } from "@/composables/useWorkflowServerClient";
const client = useWorkflowServerClient("ws://localhost:3001");
```

3. **更新执行调用**：

```typescript
// Worker 模式
worker.execute(workflowId, nodes, edges);

// 服务器模式
client.executeWorkflow(executionId, workflowId, nodes, edges);
```

**注意**：事件监听无需修改！

### 从服务器迁移到 Worker

只需反向操作即可，API 基本兼容。

## 🎓 最佳实践

### 推荐组合策略

**开发阶段**：

- 使用 Worker 模式（快速迭代）

**测试阶段**：

- 使用服务器模式（模拟生产环境）

**生产环境**：

- 根据场景选择
- 或同时支持两种模式

### 同时支持两种模式

```typescript
// config.ts
export const EXECUTION_MODE = import.meta.env.VITE_EXECUTION_MODE || "worker";
export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "ws://localhost:3001";

// useWorkflowExecution.ts
export function useWorkflowExecution() {
  if (EXECUTION_MODE === "server") {
    return useWorkflowServerClient(SERVER_URL);
  } else {
    return useWorkflowWorker();
  }
}
```

### 环境变量

```bash
# .env.development
VITE_EXECUTION_MODE=worker

# .env.production
VITE_EXECUTION_MODE=server
VITE_SERVER_URL=wss://api.example.com/workflow
```

## 📊 决策矩阵

用以下问题帮助你选择：

| 问题             | Worker | 服务器 |
| ---------------- | ------ | ------ |
| 需要多用户协作？ | ❌     | ✅     |
| 需要离线支持？   | ✅     | ❌     |
| 工作流计算密集？ | ❌     | ✅     |
| 预算有限？       | ✅     | ❌     |
| 需要集中管理？   | ❌     | ✅     |
| 快速原型开发？   | ✅     | ❌     |
| 企业级应用？     | ❌     | ✅     |

## ✅ 总结

- **Worker 模式**：简单、快速、离线，适合个人和小型项目
- **服务器模式**：强大、可扩展、集中管理，适合企业和多用户场景
- **两种模式可以共存**：根据不同需求灵活切换
- **API 高度兼容**：迁移成本低

选择合适的模式，让你的工作流系统发挥最大价值！
