# 工作流服务器快速开始

本指南将帮助你快速启动和使用基于 WebSocket 的工作流服务器。

## 📋 前提条件

- Node.js 18+
- pnpm 包管理器
- 已安装项目依赖

## 🚀 启动服务器

### 步骤 1：安装依赖

```bash
# 在项目根目录安装所有依赖
pnpm install
```

### 步骤 2：启动服务器

```bash
# 进入服务器目录
cd packages/workflow-server

# 开发模式启动（自动重启）
pnpm dev
```

你将看到类似以下的输出：

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
```

### 步骤 3：启动前端应用

在另一个终端窗口：

```bash
# 返回项目根目录
cd ../..

# 启动前端开发服务器
pnpm dev
```

### 步骤 4：访问演示页面

打开浏览器访问：

```
http://localhost:5173/server-mode
```

## 🎯 使用演示

### 演示页面功能

1. **服务器连接状态**

   - 实时显示 WebSocket 连接状态
   - 自动重连机制（连接断开后 5 秒自动重连）

2. **节点元数据显示**

   - 显示从服务器加载的所有节点类型
   - 显示节点分类和数量

3. **测试工作流执行**
   - 点击"执行测试工作流"按钮
   - 执行一个包含 HTTP 请求的简单工作流
   - 实时查看执行日志

### 测试工作流说明

默认的测试工作流包含 3 个节点：

```
开始节点 → HTTP 请求节点 → 结束节点
```

HTTP 请求节点会向 `https://jsonplaceholder.typicode.com/todos/1` 发送 GET 请求。

## 🔧 配置选项

### 自定义端口

```bash
# 使用自定义端口
PORT=8080 pnpm dev
```

### 自定义主机

```bash
# 只监听本地连接
HOST=localhost pnpm dev
```

### 组合配置

```bash
PORT=8080 HOST=localhost pnpm dev
```

## 📊 服务器日志

服务器会输出详细的日志信息：

```
✅ 客户端已连接: client_abc123 (总连接数: 1)
[client_abc123] 处理初始化请求
[client_abc123] ✅ 已发送 25 个节点元数据
[client_abc123] 执行工作流: test-workflow (ID: exec_123)
[Executor] 开始执行工作流: test-workflow (执行ID: exec_123)
[Executor] ✅ 工作流执行完成: exec_123
```

## 🔍 调试技巧

### 1. 检查 WebSocket 连接

在浏览器开发者工具中：

```javascript
// 检查 WebSocket 状态
const ws = new WebSocket("ws://localhost:3001");
ws.onopen = () => console.log("Connected!");
ws.onmessage = (e) => console.log("Message:", JSON.parse(e.data));
```

### 2. 查看网络请求

- 打开 Chrome DevTools
- 切换到 Network 标签
- 过滤 WS (WebSocket)
- 查看消息收发详情

### 3. 服务器状态监控

在演示页面中可以实时查看：

- 连接状态（绿色圆点 = 已连接）
- 服务器 ID
- 已加载节点数量
- 执行日志

## 🚧 常见问题

### 问题 1：服务器启动失败

**错误**：`Error: listen EADDRINUSE: address already in use`

**解决**：端口已被占用，使用不同端口：

```bash
PORT=3002 pnpm dev
```

### 问题 2：前端无法连接

**检查项**：

1. 服务器是否正在运行？
2. 服务器地址是否正确？（默认 `ws://localhost:3001`）
3. 防火墙是否阻止了连接？

**修改连接地址**：
编辑 `src/views/ServerModeDemo.vue`：

```typescript
const serverUrl = "ws://localhost:3002"; // 修改为你的地址
```

### 问题 3：工作流执行失败

**检查项**：

1. 查看服务器控制台的错误日志
2. 查看前端执行日志
3. 确认节点配置是否正确

### 问题 4：连接自动断开

**可能原因**：

1. 心跳超时（默认 30 秒）
2. 网络不稳定
3. 服务器重启

**自动重连**：客户端会在 5 秒后自动尝试重连。

## 📝 下一步

1. **集成到自己的项目**

   - 参考 `src/composables/useWorkflowServerClient.ts`
   - 参考 `src/views/ServerModeDemo.vue`

2. **自定义节点**

   - 查看 `packages/browser-nodes/src/` 目录
   - 添加自己的节点类型

3. **生产部署**

   - 构建服务器：`cd packages/workflow-server && pnpm build`
   - 使用 PM2 或 Docker 部署
   - 配置 Nginx 反向代理
   - 添加 SSL/TLS 支持（wss://）

4. **性能优化**
   - 启用消息压缩
   - 配置负载均衡
   - 添加 Redis 缓存

## 🔗 相关文档

- [Worker 架构优化总结](./worker-architecture-optimization.md)
- [服务器 API 文档](../packages/workflow-server/README.md)
- [节点开发指南](./component-design.md)

## 💡 提示

- 服务器模式适合多用户、企业级场景
- Worker 模式适合单用户、离线场景
- 可以在同一个应用中同时支持两种模式

---

**遇到问题？**

1. 检查服务器和前端的控制台日志
2. 查看 `packages/workflow-server/README.md` 获取详细文档
3. 使用浏览器 DevTools 调试 WebSocket 连接
