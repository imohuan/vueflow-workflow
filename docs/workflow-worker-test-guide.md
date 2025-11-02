# 工作流 Worker 测试指南

## 快速测试

### 1. 启动应用

```bash
pnpm dev
```

### 2. 验证 Worker 初始化

打开浏览器控制台，应该看到：

```
[Worker] 工作流执行 Worker 已启动
[Worker] 已加载 XX 个节点
[Worker] 初始化完成，已发送 XX 个节点元数据
[WorkflowWorker] Worker 初始化完成，已加载 XX 个节点
[NodeRegistry] 已从 Worker 加载 XX 个节点
```

### 3. 验证节点列表渲染

1. 点击左侧菜单栏的"节点列表"图标
2. 应该能看到所有节点分类显示
3. 如果节点列表为空，等待 1-2 秒（Worker 初始化中）

### 4. 验证工作流执行

#### 创建简单工作流

1. 从节点列表拖拽"开始"节点到画布
2. 拖拽"延迟"节点（流程控制 → Delay）
3. 拖拽"结束"节点
4. 连接节点：开始 → 延迟 → 结束
5. 配置延迟节点：设置延迟时间（如 2000ms）

#### 执行工作流

1. 点击底部中央的"执行"按钮（播放图标）
2. 观察控制台输出：

```
[NodeEditor] 工作流执行已提交到 Worker: exec_xxxxx
[Worker] 收到执行请求: exec_xxxxx
[Workflow Event] workflow:started { executionId, workflowId, ... }
[Workflow Event] workflow:node:status { nodeId: 'start_xxx', status: 'running' }
[Workflow Event] workflow:node:status { nodeId: 'start_xxx', status: 'success' }
[Workflow Event] workflow:node:status { nodeId: 'delay_xxx', status: 'running' }
[Workflow Event] workflow:node:status { nodeId: 'delay_xxx', status: 'success' }
[Workflow Event] workflow:node:status { nodeId: 'end_xxx', status: 'success' }
[Workflow Event] workflow:completed { executionId, duration, ... }
[Worker] 工作流执行完成: exec_xxxxx
```

3. 观察画布上的节点状态变化：
   - 节点边框颜色变化（pending → running → success）
   - 连接线动画效果
   - 节点显示执行时间

### 5. 验证复杂工作流

#### 测试循环节点

1. 创建工作流：开始 → For 循环 → 结束
2. 配置 For 循环：
   - 循环模式：固定次数
   - 次数：3
3. 在 For 循环内部添加延迟节点
4. 执行工作流
5. 观察控制台输出循环事件：

```
[Workflow Event] workflow:loop:started { forNodeId, totalIterations: 3 }
[Workflow Event] workflow:iteration:started { iterationIndex: 0 }
[Workflow Event] workflow:iteration:completed { iterationIndex: 0, status: 'success' }
[Workflow Event] workflow:iteration:started { iterationIndex: 1 }
...
[Workflow Event] workflow:loop:completed { successCount: 3, errorCount: 0 }
```

#### 测试条件分支

1. 创建工作流：开始 → If 条件 → 结束
2. 配置 If 条件：
   - 条件表达式：`true`（或其他表达式）
3. 连接 true 和 false 分支
4. 执行工作流
5. 验证只有一个分支被执行

### 6. 验证浏览器节点

#### 测试导航节点

1. 创建工作流：开始 → 初始化 MCP → 导航 → 结束
2. 配置导航节点：
   - URL：`https://www.example.com`
3. 执行工作流
4. 观察浏览器打开新标签页
5. 检查节点执行结果

#### 测试截图节点

1. 创建工作流：开始 → 导航 → 截图 → 结束
2. 执行工作流
3. 查看截图节点的执行结果（Base64 或保存的图片）

### 7. 验证错误处理

#### 测试节点执行错误

1. 创建一个会失败的节点配置（如无效的 URL）
2. 执行工作流
3. 观察控制台错误日志：

```
[Worker] 工作流执行失败: exec_xxxxx
[Workflow Event] workflow:node:status { nodeId, status: 'error', error: { message } }
[Workflow Event] workflow:error { executionId, error: { message } }
```

4. 验证节点显示错误状态（红色边框）

#### 测试 Worker 未就绪

1. 刷新页面
2. 立即点击执行按钮（在 Worker 初始化完成前）
3. 应该看到提示："工作流执行器未就绪，请稍后再试"

## 性能测试

### 测试大型工作流

1. 创建包含 50+ 节点的复杂工作流
2. 执行工作流
3. 验证：
   - UI 保持响应（可以拖动画布、缩放）
   - 节点状态实时更新
   - 控制台无性能警告

### 测试并发执行

1. 打开多个浏览器标签页
2. 在每个标签页中执行不同的工作流
3. 验证所有工作流都能正常执行

## 调试技巧

### 查看 Worker 状态

在控制台中执行：

```javascript
// 查看 Worker 状态
console.log(
  "Worker Status:",
  window.__workflowWorker?.status?.value || "Not initialized"
);

// 查看节点元数据
const registry = window.__workflowWorker?.nodeMetadata?.value || [];
console.table(
  registry.map((n) => ({
    type: n.type,
    label: n.label,
    category: n.category,
  }))
);
```

### 查看执行状态

```javascript
// 查看当前执行任务
const execution = window.__workflowExecution;
console.log("Active Execution:", execution?.activeExecutionId?.value);
console.log("All Executions:", execution?.executions?.value);
```

### 监听所有事件

```javascript
// 在控制台中执行
const emitter =
  document.querySelector("#app").__vue_app__.config.globalProperties.$emitter;
emitter.on("*", (type, payload) => {
  console.log("🔔", type, payload);
});
```

## 常见问题

### 节点列表为空

**原因**：Worker 还未初始化完成

**解决**：等待 1-2 秒，或检查控制台是否有 Worker 错误

### 执行按钮无响应

**原因**：

1. Worker 未就绪
2. 没有开始节点
3. 已经在执行中

**解决**：

1. 检查控制台 Worker 状态
2. 添加开始节点
3. 等待当前执行完成

### Worker 加载失败

**错误**：`Failed to load Worker`

**解决**：

1. 检查 Vite 配置
2. 确认 `src/workers/workflowWorker.ts` 文件存在
3. 清除缓存并重新构建：`rm -rf node_modules/.vite && pnpm dev`

### 节点执行卡住

**原因**：节点内部出现无限循环或长时间阻塞

**解决**：

1. 刷新页面（Worker 会自动终止）
2. 检查节点配置
3. 查看 Worker 控制台日志

## 成功标志

如果以下所有测试通过，说明 Worker 集成成功：

- ✅ Worker 成功初始化并发送节点元数据
- ✅ 节点列表正确渲染所有节点
- ✅ 工作流执行时 UI 保持响应
- ✅ 节点状态实时更新
- ✅ 执行完成后状态自动重置
- ✅ 错误被正确捕获和显示
- ✅ 控制台无 Worker 相关错误
- ✅ 浏览器节点（如导航、截图）正常工作
- ✅ 循环和条件节点正确执行

## 下一步

集成测试通过后，可以：

1. 添加更多浏览器节点
2. 实现服务器模式（WebSocket + RESTful API）
3. 优化 Worker 性能
4. 添加工作流暂停/恢复功能
5. 实现工作流调试器

