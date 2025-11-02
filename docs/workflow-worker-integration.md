# 工作流 Worker 集成说明

## 概述

工作流执行功能已成功迁移到 Web Worker 中，实现了以下目标：

1. **非阻塞执行**：工作流在 Worker 线程中执行，不影响主线程的 UI 响应
2. **节点元数据共享**：Worker 在初始化时自动发送节点元数据到主线程
3. **实时事件通信**：通过 `postMessage` 和 mitt 事件系统实现实时状态更新
4. **架构清晰**：Worker、主线程和 UI 层职责分明

## 文件结构

### 新增文件

1. **`src/workers/workflowWorker.ts`**

   - Worker 主文件
   - 加载和管理节点注册表（CoreNodeRegistry + BrowserNodeRegistry）
   - 执行工作流
   - 通过 postMessage 发送事件到主线程

2. **`src/composables/useWorkflowWorker.ts`**

   - Worker 管理 Composable
   - 单例模式管理 Worker 实例
   - 处理 Worker 消息并转发到 mitt emitter
   - 提供节点元数据查询接口

3. **`src/composables/useWorkflowExecutor.ts`**
   - 工作流执行器 Composable
   - 提供简洁的执行接口
   - 生成唯一执行 ID
   - 检查 Worker 就绪状态

### 修改文件

1. **`src/composables/useNodeRegistry.ts`**

   - 从 Worker 异步加载节点元数据
   - 保留本地注册表作为回退方案
   - 支持动态节点注册

2. **`src/composables/nodeEditor/useNodeExecution.ts`**

   - 修改 `executeWorkflow` 函数使用 Worker
   - 移除同步执行逻辑
   - 通过事件系统异步更新状态

3. **`src/stores/nodeEditor.ts`**

   - 更新 `executeWorkflow` 调用签名
   - 添加工作流完成/错误事件监听器
   - 自动重置执行状态

4. **`src/views/NodeEditor.vue`**
   - 传递正确的 workflowId 参数

## 通信流程

### 1. 初始化流程

```
应用启动
  ↓
main.ts 创建 workflowEmitter
  ↓
NodeListPanel.vue 使用 useNodeRegistry()
  ↓
useNodeRegistry → useWorkflowWorker()
  ↓
Worker 创建并初始化
  ↓
Worker 加载节点注册表 (CoreNodeRegistry + BrowserNodeRegistry)
  ↓
Worker 发送节点元数据到主线程
  ↓
主线程渲染节点列表
```

### 2. 执行流程

```
用户点击"执行"按钮
  ↓
handleExecuteWorkflow()
  ↓
store.executeWorkflow(workflowId)
  ↓
useNodeExecution.executeWorkflow()
  ↓
useWorkflowExecutor.execute()
  ↓
Worker 收到 EXECUTE_WORKFLOW 消息
  ↓
Worker 执行工作流 (executeWorkflow)
  ↓
Worker 发送 WORKFLOW_EVENT 消息到主线程
  ↓
useWorkflowWorker 转发到 mitt emitter
  ↓
useWorkflowExecution 监听事件并更新节点状态
  ↓
UI 实时显示执行进度
  ↓
执行完成，重置 isExecutingWorkflow
```

### 3. 事件类型

Worker 发送的事件通过 mitt 分发到主线程：

- `STARTED` - 工作流开始执行
- `NODE_STATUS` - 节点状态变化（pending → running → success/error）
- `NODE_PROGRESS` - 节点进度更新
- `NODE_LOG` - 节点日志
- `EDGE_ACTIVE` - 边激活（流程流转动画）
- `LOOP_STARTED` / `LOOP_COMPLETED` - 循环开始/完成
- `ITERATION_STARTED` / `ITERATION_COMPLETED` - 迭代开始/完成
- `COMPLETED` - 工作流执行完成
- `ERROR` - 工作流执行错误

## 优势

### 性能优势

1. **主线程不阻塞**：复杂工作流执行不影响 UI 响应
2. **并行处理**：可以同时运行多个工作流（如果需要）
3. **资源隔离**：Worker 崩溃不影响主线程

### 架构优势

1. **职责分离**：
   - Worker：纯执行逻辑
   - 主线程：UI 更新和用户交互
   - mitt：事件分发
2. **可扩展性**：

   - 未来可轻松支持服务器模式（WebSocket）
   - 可动态注册节点
   - 支持多 Worker 并行

3. **测试友好**：
   - Worker 可独立测试
   - 事件系统易于 mock

## 使用示例

### 在组件中执行工作流

```typescript
import { useWorkflowExecutor } from "@/composables/useWorkflowExecutor";

const workflowExecutor = useWorkflowExecutor();

async function runWorkflow() {
  // 等待 Worker 就绪
  await workflowExecutor.waitForReady();

  // 执行工作流
  const executionId = workflowExecutor.execute("my-workflow-id", nodes, edges);

  console.log(`工作流执行 ID: ${executionId}`);
}
```

### 监听执行事件

```typescript
import { inject } from "vue";
import { WorkflowEventType } from "@/typings/workflowExecution";

const emitter = inject("workflowEmitter");

emitter.on(WorkflowEventType.NODE_STATUS, (payload) => {
  console.log(`节点 ${payload.nodeId} 状态: ${payload.status}`);
});
```

### 获取节点元数据

```typescript
import { useNodeRegistry } from "@/composables/useNodeRegistry";

const registry = useNodeRegistry();

// 自动从 Worker 加载
console.log(registry.getAllNodeMetadata.value);
```

## 未来扩展

### 服务器模式

1. 创建 WebSocket 连接到服务器
2. 服务器提供节点注册表 API（RESTful）
3. 通过 WebSocket 发送执行请求和接收事件
4. 复用现有的事件系统（mitt）

### 多 Worker 支持

1. 创建 Worker 池管理器
2. 根据工作流优先级分配 Worker
3. 支持并行执行多个工作流

### 节点热更新

1. 支持动态注册新节点
2. Worker 接收 `REGISTER_NODES` 消息
3. 主线程自动刷新节点列表

## 注意事项

1. **Worker 初始化时机**：

   - Worker 在首次调用 `useNodeRegistry()` 或 `useWorkflowWorker()` 时自动初始化
   - 应用启动时会在 NodeListPanel 渲染时触发初始化

2. **执行状态管理**：

   - `isExecutingWorkflow` 状态由事件监听器自动管理
   - 不要手动修改此状态

3. **节点元数据加载**：

   - 节点列表可能在 Worker 初始化完成前短暂为空
   - 已实现自动等待机制

4. **错误处理**：
   - Worker 错误会通过 `ERROR` 消息传递到主线程
   - 主线程会自动重置执行状态

## 测试建议

1. **单元测试**：

   - 测试 Worker 消息处理
   - 测试事件转发逻辑
   - 测试执行器状态管理

2. **集成测试**：

   - 测试完整的执行流程
   - 测试节点元数据加载
   - 测试错误处理

3. **性能测试**：
   - 测试大型工作流执行性能
   - 测试并发执行能力
   - 测试内存占用

## 调试

### 开启 Worker 日志

Worker 中的 console.log 会显示在浏览器控制台：

```
[Worker] 工作流执行 Worker 已启动
[Worker] 已加载 XX 个节点
[Worker] 收到执行请求: exec_xxx
```

### 查看事件流

在开发模式下，所有工作流事件会自动打印：

```typescript
// main.ts
if (import.meta.env.DEV) {
  workflowEmitter.on("*", (type, payload) => {
    console.log(`[Workflow Event] ${String(type)}`, payload);
  });
}
```

### Worker 错误调试

如果 Worker 加载失败，检查：

1. Vite 配置是否支持 Worker
2. Worker 文件路径是否正确
3. Worker 依赖的模块是否正确导入

