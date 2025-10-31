# 工作流实时执行预览架构设计

## 一、概述

本文档描述了一个工作流执行实时预览系统的架构设计，该系统支持：

- 实时显示节点执行状态（等待、执行中、成功、失败）
- 实时显示连接线执行动画
- 支持前端 Worker 和后台 WebSocket 两种执行方式
- 支持画布切换和执行状态恢复
- 基于 mitt 事件总线的统一事件处理

## 二、整体架构

### 2.1 架构分层

```
┌─────────────────────────────────────────────────────┐
│                    画布 UI 层                        │
│  (监听事件 → 更新节点/边状态 → 渲染动画)             │
└──────────────────┬──────────────────────────────────┘
                   │ 监听 mitt 事件
┌──────────────────┴──────────────────────────────────┐
│              Mitt 事件总线（核心层）                  │
│  - workflow:node:status     (节点状态变化)           │
│  - workflow:edge:active     (边激活)                 │
│  - workflow:started         (开始执行)               │
│  - workflow:completed       (执行完成)               │
│  - workflow:error           (执行错误)               │
│  - workflow:restore:request (请求恢复数据)           │
│  - workflow:restore:data    (恢复数据响应)           │
└──────────────────┬──────────────────────────────────┘
                   │ 发送事件
      ┌────────────┴────────────┐
      │                         │
┌─────┴─────┐           ┌───────┴────────┐
│  Worker   │           │   WebSocket    │
│  执行器   │           │   客户端       │
│ (前端)    │           │   (后台)       │
└───────────┘           └────────────────┘
```

### 2.2 核心设计原则

1. **解耦原则**：Worker 和 WebSocket 只负责转发数据，不关心 UI 实现
2. **统一事件**：所有执行状态变化通过 mitt 事件传递
3. **任务隔离**：通过 `executionId` 区分不同执行任务
4. **状态一致**：执行状态统一管理，支持恢复和持久化
5. **性能优先**：大量事件时使用节流、批量更新

## 三、数据结构设计

### 3.1 执行任务标识

```typescript
interface ExecutionContext {
  /** 执行任务 ID（唯一标识一次执行） */
  executionId: string;

  /** 工作流 ID */
  workflowId: string;

  /** 执行模式 */
  mode: "worker" | "websocket";

  /** 执行开始时间 */
  startTime: number;

  /** 当前状态 */
  status: "idle" | "running" | "paused" | "completed" | "error";
}
```

### 3.2 节点执行状态

```typescript
interface NodeExecutionState {
  /** 节点 ID */
  nodeId: string;

  /** 执行状态 */
  status: "pending" | "running" | "success" | "error" | "skipped";

  /** 开始执行时间 */
  startTime?: number;

  /** 结束执行时间 */
  endTime?: number;

  /** 执行结果数据（成功时） */
  output?: any;

  /** 错误信息（失败时） */
  error?: {
    message: string;
    stack?: string;
  };

  /** 执行进度（0-100，可选） */
  progress?: number;

  /** 日志信息 */
  logs?: Array<{
    level: "info" | "warn" | "error";
    message: string;
    timestamp: number;
  }>;
}
```

### 3.3 边执行状态

```typescript
interface EdgeExecutionState {
  /** 边 ID */
  edgeId: string;

  /** 是否激活（显示动画） */
  active: boolean;

  /** 激活时间 */
  timestamp?: number;

  /** 传递的数据（可选，用于调试） */
  data?: any;
}
```

### 3.4 执行快照（用于恢复）

```typescript
interface ExecutionSnapshot {
  /** 执行任务信息 */
  context: ExecutionContext;

  /** 所有节点的执行状态 */
  nodes: Record<string, NodeExecutionState>;

  /** 当前激活的边 */
  activeEdges: string[];

  /** 快照时间 */
  snapshotTime: number;

  /** 当前执行到的节点 */
  currentNodeId?: string;
}
```

## 四、Mitt 事件定义

### 4.1 事件类型枚举

```typescript
enum WorkflowEventType {
  // 执行生命周期
  STARTED = "workflow:started",
  COMPLETED = "workflow:completed",
  ERROR = "workflow:error",
  PAUSED = "workflow:paused",
  RESUMED = "workflow:resumed",

  // 节点状态
  NODE_STATUS = "workflow:node:status",
  NODE_PROGRESS = "workflow:node:progress",
  NODE_LOG = "workflow:node:log",

  // 边状态
  EDGE_ACTIVE = "workflow:edge:active",
  EDGE_INACTIVE = "workflow:edge:inactive",

  // 恢复机制
  RESTORE_REQUEST = "workflow:restore:request",
  RESTORE_DATA = "workflow:restore:data",
}
```

### 4.2 事件 Payload 定义

```typescript
// 工作流开始
interface WorkflowStartedPayload {
  executionId: string;
  workflowId: string;
  mode: "worker" | "websocket";
  timestamp: number;
  totalNodes: number;
}

// 工作流完成
interface WorkflowCompletedPayload {
  executionId: string;
  timestamp: number;
  duration: number;
  successNodes: number;
  failedNodes: number;
}

// 工作流错误
interface WorkflowErrorPayload {
  executionId: string;
  error: {
    message: string;
    nodeId?: string;
    stack?: string;
  };
  timestamp: number;
}

// 节点状态变化
interface NodeStatusPayload {
  executionId: string;
  nodeId: string;
  status: NodeExecutionState["status"];
  timestamp: number;
  output?: any;
  error?: { message: string; stack?: string };
  duration?: number;
}

// 节点进度更新
interface NodeProgressPayload {
  executionId: string;
  nodeId: string;
  progress: number; // 0-100
  message?: string;
  timestamp: number;
}

// 节点日志
interface NodeLogPayload {
  executionId: string;
  nodeId: string;
  level: "info" | "warn" | "error";
  message: string;
  timestamp: number;
}

// 边激活
interface EdgeActivePayload {
  executionId: string;
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  timestamp: number;
  data?: any;
}

// 恢复请求
interface RestoreRequestPayload {
  executionId: string;
  workflowId: string;
  requestTime: number;
}

// 恢复数据
interface RestoreDataPayload {
  executionId: string;
  snapshot: ExecutionSnapshot;
}
```

## 五、执行状态管理

### 5.1 状态管理器职责

创建一个 `useWorkflowExecution` Composable 负责：

1. **状态存储**

   - 维护当前所有执行任务的状态
   - 维护每个节点的执行状态
   - 维护激活的边

2. **事件监听**

   - 监听 mitt 事件
   - 更新内部状态
   - 触发 UI 更新

3. **状态查询**

   - 根据 executionId 查询执行状态
   - 根据 nodeId 查询节点状态
   - 判断某个执行任务是否为当前活跃任务

4. **恢复机制**
   - 发送恢复请求
   - 接收并应用恢复数据
   - 重建执行状态

### 5.2 状态管理数据结构

```typescript
interface WorkflowExecutionState {
  // 当前活跃的执行任务
  activeExecutionId: string | null;

  // 所有执行任务的上下文
  executions: Map<string, ExecutionContext>;

  // 节点执行状态（按 executionId 分组）
  nodeStates: Map<string, Map<string, NodeExecutionState>>;

  // 激活的边（按 executionId 分组）
  activeEdges: Map<string, Set<string>>;

  // 执行历史快照（用于恢复）
  snapshots: Map<string, ExecutionSnapshot>;
}
```

## 六、实现步骤

### 6.1 Phase 1: 基础架构（优先）

1. **定义类型**

   - 创建 `typings/workflowExecution.d.ts`
   - 定义所有接口和枚举

2. **创建 Mitt 实例**

   - 在 `main.ts` 中创建全局 mitt 实例
   - 定义类型化的 emitter

3. **创建状态管理器**

   - 创建 `composables/workflow/useWorkflowExecution.ts`
   - 实现状态存储和查询
   - 实现事件监听和状态更新

4. **UI 状态绑定**
   - 在 NodeEditor 画布中集成状态管理器
   - 根据节点状态添加 CSS 类或样式
   - 为边添加激活状态动画

### 6.2 Phase 2: Worker 执行器集成

1. **改造现有 Executor**

   - 在执行器中注入 mitt emitter
   - 在关键执行节点发送事件
   - 包括：开始、节点前/后、完成、错误

2. **Worker 包装**

   - 将执行器放入 Web Worker
   - Worker 接收工作流数据和 executionId
   - Worker 通过 postMessage 发送执行事件
   - 主线程监听 Worker 消息并转发到 mitt

3. **测试验证**
   - 验证事件发送正确
   - 验证 UI 实时更新
   - 验证动画效果

### 6.3 Phase 3: WebSocket 支持（预留）

1. **创建 WebSocket 客户端**

   - 创建 `core/websocket-client.ts`
   - 连接后台服务
   - 监听执行事件消息

2. **事件转发**

   - 接收 WebSocket 消息
   - 解析为标准事件格式
   - 转发到 mitt

3. **执行控制**
   - 支持发送启动、暂停、停止命令
   - 支持发送恢复请求

### 6.4 Phase 4: 恢复机制

1. **快照生成**

   - 在状态管理器中定期生成快照
   - 存储最近的执行状态

2. **恢复请求**

   - 画布切换时判断是否需要恢复
   - 发送恢复请求事件
   - Worker/WebSocket 响应恢复数据

3. **状态重建**
   - 接收恢复数据
   - 重建节点和边状态
   - 触发 UI 更新

### 6.5 Phase 5: 性能优化

1. **事件节流**

   - 对高频事件（如进度更新）进行节流
   - 使用 requestAnimationFrame 批量更新 UI

2. **内存管理**

   - 限制历史快照数量
   - 清理已完成的执行状态

3. **大型工作流优化**
   - 虚拟化渲染（如果节点很多）
   - 选择性更新（只更新可见节点）

## 七、UI 展示设计

### 7.1 节点状态视觉反馈

| 状态    | 视觉效果            |
| ------- | ------------------- |
| pending | 灰色边框，无动画    |
| running | 蓝色边框 + 脉冲动画 |
| success | 绿色边框 + 成功图标 |
| error   | 红色边框 + 错误图标 |
| skipped | 灰色虚线边框        |

### 7.2 边激活动画

- 使用 SVG stroke-dasharray 和 stroke-dashoffset 实现流动动画
- 激活时显示从源节点到目标节点的流动方向
- 持续 1-2 秒后自动消失（或等待下一个节点完成）

### 7.3 执行面板

在画布右侧或底部添加执行面板：

- 显示当前执行任务信息
- 显示执行进度（已完成/总数）
- 显示当前执行节点
- 显示实时日志
- 提供暂停、继续、停止按钮

### 7.4 切换画布提示

当切换到正在执行的工作流时：

- 显示"正在恢复执行状态..."提示
- 显示恢复进度
- 恢复完成后自动开始显示实时更新

## 八、关键技术细节

### 8.1 多任务并发处理

```typescript
// 场景：同时执行多个工作流
// 解决：通过 executionId 隔离状态

// 判断事件是否属于当前画布
function shouldHandleEvent(payload: { executionId: string }) {
  const { activeExecutionId, currentWorkflowId } = state;

  // 如果当前画布没有活跃执行，检查是否是当前工作流的执行
  if (!activeExecutionId) {
    const execution = state.executions.get(payload.executionId);
    return execution?.workflowId === currentWorkflowId;
  }

  // 只处理当前活跃的执行任务
  return payload.executionId === activeExecutionId;
}
```

### 8.2 恢复机制流程

```
1. 用户切换到工作流 A
2. 检测到工作流 A 有正在执行的任务（executionId: xxx）
3. 发送恢复请求事件
   emit('workflow:restore:request', { executionId: 'xxx', workflowId: 'A' })

4. Worker/WebSocket 接收到请求
5. 生成执行快照（包含已执行节点的状态）
6. 发送恢复数据事件
   emit('workflow:restore:data', { executionId: 'xxx', snapshot: {...} })

7. 状态管理器接收恢复数据
8. 重建节点和边的状态
9. 更新 UI（显示已完成节点为绿色，当前节点为蓝色等）
10. 继续监听后续执行事件
```

### 8.3 Worker 通信机制

```typescript
// 主线程 → Worker
worker.postMessage({
  type: 'execute',
  payload: {
    executionId: 'xxx',
    workflow: { nodes, edges },
    config: {...}
  }
})

// Worker → 主线程
self.postMessage({
  type: 'workflow:node:status',
  payload: {
    executionId: 'xxx',
    nodeId: 'node1',
    status: 'running',
    timestamp: Date.now()
  }
})

// 主线程接收并转发到 mitt
worker.onmessage = (e) => {
  const { type, payload } = e.data
  emitter.emit(type, payload)
}
```

### 8.4 WebSocket 消息格式

```json
// 后台 → 前端
{
  "type": "workflow:node:status",
  "payload": {
    "executionId": "exec_123",
    "nodeId": "node_456",
    "status": "running",
    "timestamp": 1699000000000
  }
}

// 前端 → 后台（控制命令）
{
  "type": "workflow:control",
  "action": "pause",
  "executionId": "exec_123"
}

// 前端 → 后台（恢复请求）
{
  "type": "workflow:restore:request",
  "payload": {
    "executionId": "exec_123",
    "workflowId": "wf_789"
  }
}
```

## 九、性能考虑

### 9.1 事件频率控制

- **节点状态变化**：无需节流（低频）
- **节点进度更新**：节流至 100ms（高频）
- **日志消息**：节流至 50ms，缓冲批量发送
- **边激活**：无需节流，但自动过期（2 秒后）

### 9.2 UI 更新优化

```typescript
// 使用 requestAnimationFrame 批量更新
const pendingUpdates = new Set<string>();

function scheduleNodeUpdate(nodeId: string) {
  pendingUpdates.add(nodeId);

  if (!isUpdateScheduled) {
    isUpdateScheduled = true;
    requestAnimationFrame(() => {
      // 批量更新所有待更新节点
      pendingUpdates.forEach((id) => updateNodeUI(id));
      pendingUpdates.clear();
      isUpdateScheduled = false;
    });
  }
}
```

### 9.3 内存管理

- 限制保留最近 5 次执行的状态
- 自动清理 1 小时前的执行记录
- 快照使用 WeakMap 存储，避免内存泄漏

## 十、错误处理

### 10.1 常见错误场景

1. **Worker 崩溃**

   - 监听 Worker error 事件
   - 发送 workflow:error 事件
   - 标记所有运行中节点为 error 状态

2. **WebSocket 断连**

   - 自动重连机制（指数退避）
   - 断连时暂停执行状态显示
   - 重连后发送恢复请求

3. **恢复数据丢失**

   - 提示用户"无法恢复执行状态"
   - 提供"重新开始执行"选项

4. **事件乱序**
   - 使用 timestamp 排序
   - 忽略过期事件（比当前状态时间早的）

### 10.2 降级策略

- 如果 Worker 不可用，回退到主线程执行（性能降低但功能可用）
- 如果 mitt 事件系统异常，直接调用状态更新函数
- 如果动画性能差，提供"禁用动画"选项

## 十一、测试策略

### 11.1 单元测试

- 测试状态管理器的状态更新逻辑
- 测试事件 payload 的序列化/反序列化
- 测试恢复机制的状态重建

### 11.2 集成测试

- 测试 Worker 执行 + 事件转发
- 测试 WebSocket 连接 + 消息处理
- 测试多任务并发场景

### 11.3 E2E 测试

- 测试完整的执行流程和 UI 更新
- 测试画布切换和状态恢复
- 测试错误场景和降级行为

## 十二、开发检查清单

### Phase 1 完成标准

- [ ] 类型定义完整且导出正确
- [ ] Mitt 实例创建并全局可访问
- [ ] 状态管理器实现基本 CRUD
- [ ] 节点状态可以正确更新和查询
- [ ] UI 可以根据状态显示不同样式

### Phase 2 完成标准

- [ ] Executor 可以发送完整的执行事件
- [ ] Worker 可以正确接收和执行工作流
- [ ] Worker 消息可以正确转发到 mitt
- [ ] 画布可以实时显示执行过程
- [ ] 边动画正常工作

### Phase 3 完成标准

- [ ] WebSocket 客户端可以连接后台
- [ ] WebSocket 消息正确转发到 mitt
- [ ] 支持发送控制命令
- [ ] 前端和后台事件格式统一

### Phase 4 完成标准

- [ ] 快照生成正确
- [ ] 恢复请求可以正确发送和响应
- [ ] 状态重建后 UI 显示正确
- [ ] 切换画布后继续显示实时更新

### Phase 5 完成标准

- [ ] 高频事件正确节流
- [ ] UI 更新批量进行，性能良好
- [ ] 内存占用稳定，无泄漏
- [ ] 大型工作流（100+ 节点）性能可接受

## 十三、参考实现

### 13.1 类似系统参考

- **ComfyUI**：工作流执行和恢复机制
- **n8n**：实时执行预览和日志
- **Node-RED**：节点状态和调试面板
- **Prefect**：执行状态管理和可视化

### 13.2 技术栈参考

- **Vue Flow**：画布节点和边的响应式更新
- **VueUse**：`useWebSocket` 用于 WebSocket 封装
- **mitt**：轻量级事件总线
- **Web Worker**：后台执行和消息传递

## 十四、后续扩展

### 14.1 功能扩展

- 支持执行回放（播放历史执行过程）
- 支持断点调试（暂停在某个节点）
- 支持条件断点（节点输出满足条件时暂停）
- 支持执行分析（耗时统计、性能瓶颈）

### 14.2 UI 增强

- 小地图显示执行进度
- 时间轴显示执行历史
- 实时图表显示性能指标
- 多窗口同时查看不同执行任务

---

## 附录：快速开始指南

### 创建文件顺序

1. `typings/workflowExecution.d.ts` - 类型定义
2. `composables/workflow/useWorkflowExecution.ts` - 状态管理
3. 修改 `core/executor/workflowExecutor.ts` - 添加事件发送
4. 创建 `core/executor/executorWorker.ts` - Worker 包装
5. 修改 `views/NodeEditor.vue` - 集成状态管理和 UI 更新
6. 创建 `components/node-editor/ExecutionPanel.vue` - 执行面板
7. 修改节点和边组件 - 添加状态样式

### 关键代码位置

| 功能             | 文件路径                                           |
| ---------------- | -------------------------------------------------- |
| 类型定义         | `typings/workflowExecution.d.ts`                   |
| 状态管理         | `composables/workflow/useWorkflowExecution.ts`     |
| Executor 集成    | `core/executor/workflowExecutor.ts`                |
| Worker 包装      | `core/executor/executorWorker.ts`                  |
| WebSocket 客户端 | `core/websocket-client.ts`                         |
| 画布集成         | `views/NodeEditor.vue`                             |
| 节点样式         | `components/node-editor/nodes/NodeWrapper.vue`     |
| 边动画           | `components/node-editor/edges/InteractiveEdge.vue` |
| 执行面板         | `components/node-editor/ExecutionPanel.vue`        |

### Mitt 事件调试

在开发阶段，可以在 `main.ts` 中添加全局事件监听器用于调试：

```typescript
// 开发环境下打印所有 workflow 事件
if (import.meta.env.DEV) {
  emitter.on("*", (type, payload) => {
    if (type.startsWith("workflow:")) {
      console.log(`[Workflow Event] ${type}`, payload);
    }
  });
}
```

这样可以在控制台看到所有执行事件，便于调试和问题排查。
