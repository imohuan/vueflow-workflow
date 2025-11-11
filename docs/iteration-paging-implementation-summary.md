# 迭代分页功能实现总结

## 概述

本功能为循环节点（ForNode）内的子节点实现了迭代历史记录和分页显示功能。用户现在可以查看循环执行过程中每次迭代的详细结果，而不仅仅是最后一次迭代的数据。

## 核心变更

### 1. 类型定义扩展

#### 文件：`packages/flow-nodes/src/executor/types.ts`

**新增类型：**

```typescript
// 单次迭代的执行数据
interface IterationResultData {
  iterationIndex: number;          // 迭代索引（从 0 开始）
  iterationVars: Record<string, any>; // 迭代变量（item, index 等）
  executionResult: any;            // 该次迭代的执行结果
  executionStatus: NodeExecutionStatus; // 执行状态
  executionDuration?: number;      // 执行时长（毫秒）
  executionTimestamp: number;      // 执行时间戳
  executionError?: string;         // 错误信息（如果有）
}

// 迭代历史记录
interface IterationHistory {
  iterations: IterationResultData[]; // 所有迭代的执行记录
  totalIterations: number;          // 总迭代次数
  currentPage: number;              // 当前显示的页码（从 1 开始）
}
```

**扩展现有类型：**

```typescript
interface NodeExecutionState {
  // ... 现有字段
  iterationHistory?: IterationHistory; // 新增：迭代历史
}

interface ExecutionOptions {
  // ... 现有字段
  onIterationUpdate?: (nodeId: string, iterationData: IterationResultData) => void;
}
```

### 2. ExecutionContext 增强

#### 文件：`packages/flow-nodes/src/executor/ExecutionContext.ts`

**新增功能：**

- 添加 `nodeIterationHistories` Map 用于存储节点的迭代历史
- 实现迭代历史管理方法：
  - `appendIterationResult()`: 追加新的迭代结果
  - `getIterationHistory()`: 获取节点的迭代历史
  - `clearIterationHistory()`: 清空指定节点的迭代历史
  - `clearAllIterationHistories()`: 清空所有迭代历史

**关键实现：**

```typescript
appendIterationResult(nodeId: string, iterationData: IterationResultData): void {
  let history = this.nodeIterationHistories.get(nodeId);
  if (!history) {
    history = {
      iterations: [],
      totalIterations: 0,
      currentPage: 1,
    };
    this.nodeIterationHistories.set(nodeId, history);
  }
  
  history.iterations.push(iterationData);
  history.totalIterations = history.iterations.length;
  
  // 同步更新节点状态
  const nodeState = this.nodeStates.get(nodeId);
  if (nodeState) {
    nodeState.iterationHistory = { ...history };
  }
}
```

### 3. WorkflowExecutor 修改

#### 文件：`packages/flow-nodes/src/executor/WorkflowExecutor.ts`

**关键修改：**

在 `executeContainerNodes` 方法中：

1. **获取迭代索引**
   ```typescript
   const iterationIndex = iterationVars.index ?? 0;
   ```

2. **保存每次迭代的结果**
   ```typescript
   const iterationData = {
     iterationIndex,
     iterationVars,
     executionResult: nodeOutput || null,
     executionStatus: nodeState.status,
     executionDuration: nodeState.duration,
     executionTimestamp: Date.now(),
     executionError: nodeState.error,
   };
   
   context.appendIterationResult(node.id, iterationData);
   ```

3. **通知前端**
   ```typescript
   options.onIterationUpdate?.(node.id, iterationData);
   ```

### 4. 前端事件系统集成

#### 文件：`src/v2/features/vueflow/executor/types.ts`

**新增事件类型：**

```typescript
interface ExecutionIterationUpdateEvent extends ExecutionNodeEvent {
  iterationData: IterationResultData;
}

type ExecutionEventMessage =
  | // ... 其他事件
  | { type: "ITERATION_UPDATE"; payload: ExecutionIterationUpdateEvent };
```

#### 文件：`src/v2/features/vueflow/events/eventTypes.ts`

**扩展 ExecutionEvents：**

```typescript
interface ExecutionEvents {
  // ... 其他事件
  "execution:iteration:update": ExecutionIterationUpdateEvent;
}
```

### 5. Worker 层消息传递

#### 文件：`src/v2/features/vueflow/executor/worker.ts`

**添加回调包装：**

```typescript
const wrapExecutionOptions = (options?: ExecutionOptions): ExecutionOptions => ({
  // ... 其他回调
  onIterationUpdate: (nodeId: string, iterationData: any) => {
    const ids = requireContextIds();
    postMessageToMain({
      type: "ITERATION_UPDATE",
      payload: { ...ids, nodeId, iterationData },
    });
    options?.onIterationUpdate?.(nodeId, iterationData);
  },
});
```

### 6. VueFlowExecution 消息处理

#### 文件：`src/v2/features/vueflow/executor/VueFlowExecution.ts`

**添加消息处理器：**

```typescript
function handleIterationUpdate(payload: any) {
  eventBusUtils.emit("execution:iteration:update", payload);
}

// 在消息路由中
case "ITERATION_UPDATE":
  handleIterationUpdate(message.payload);
  break;
```

### 7. Canvas Store 更新

#### 文件：`src/v2/stores/canvas.ts`

**新增方法：**

```typescript
// 追加节点的迭代历史记录
function appendNodeIterationHistory(nodeId: string, iterationData: any) {
  const node = getNodeById(nodeId);
  if (!node) return;
  
  const history = node.data?.iterationHistory || {
    iterations: [],
    totalIterations: 0,
    currentPage: 1,
  };
  
  history.iterations.push(iterationData);
  history.totalIterations = history.iterations.length;
  
  updateNode(nodeId, {
    data: { ...node.data, iterationHistory: history },
  });
}

// 设置节点当前查看的迭代页码
function setNodeIterationPage(nodeId: string, page: number) {
  const node = getNodeById(nodeId);
  if (!node?.data?.iterationHistory) return;
  
  const history = node.data.iterationHistory;
  history.currentPage = Math.max(1, Math.min(page, history.totalIterations));
  
  updateNode(nodeId, {
    data: { ...node.data, iterationHistory: history },
  });
}

// 清空节点的迭代历史
function clearNodeIterationHistory(nodeId: string) {
  const node = getNodeById(nodeId);
  if (!node) return;
  
  updateNode(nodeId, {
    data: { ...node.data, iterationHistory: undefined },
  });
}
```

### 8. CanvasView 事件监听

#### 文件：`src/v2/features/canvas/CanvasView.vue`

**监听迭代更新事件：**

```typescript
events.on("execution:iteration:update", ({ nodeId, iterationData }: any) => {
  console.log(`[CanvasView] 节点 ${nodeId} 迭代 ${iterationData.iterationIndex + 1} 更新:`, iterationData);
  canvasStore.appendNodeIterationHistory(nodeId, iterationData);
});
```

### 9. NodeConfigModal UI 实现

#### 文件：`src/v2/features/canvas/components/modals/NodeConfigModal.vue`

**核心功能实现：**

1. **状态管理**
   ```typescript
   const currentIterationPage = ref(1);
   
   const iterationHistory = computed(() => {
     const node = canvasStore.nodes.find(n => n.id === selectedNodeId.value);
     return node?.data?.iterationHistory;
   });
   
   const hasIterationHistory = computed(() => {
     return !!iterationHistory.value && iterationHistory.value.totalIterations > 0;
   });
   
   const currentIterationData = computed(() => {
     if (!hasIterationHistory.value) return null;
     const page = currentIterationPage.value;
     const iterations = iterationHistory.value.iterations;
     return iterations[page - 1];
   });
   ```

2. **执行结果显示逻辑修改**
   ```typescript
   const executionStatus = computed(() => {
     // 如果有迭代历史，使用当前页的迭代数据
     if (hasIterationHistory.value && currentIterationData.value) {
       return {
         status: currentIterationData.value.executionStatus,
         result: currentIterationData.value.executionResult,
         error: currentIterationData.value.executionError,
         duration: currentIterationData.value.executionDuration,
         timestamp: currentIterationData.value.executionTimestamp,
       };
     }
     // 否则使用节点的常规执行结果
     // ...
   });
   ```

3. **分页控件 UI**
   - 左右箭头按钮用于导航
   - 显示当前页码和总页数
   - 禁用状态处理（首页/末页）
   - "迭代 N" 徽章显示当前查看的迭代

4. **页面切换逻辑**
   ```typescript
   function handleIterationPageChange(page: number) {
     if (!hasIterationHistory.value) return;
     const totalPages = iterationHistory.value.totalIterations;
     if (page < 1 || page > totalPages) return;
     
     currentIterationPage.value = page;
     canvasStore.setNodeIterationPage(selectedNodeId.value, page);
   }
   ```

5. **自动同步页码**
   ```typescript
   watch([selectedNodeId, iterationHistory], () => {
     if (hasIterationHistory.value && iterationHistory.value) {
       currentIterationPage.value = iterationHistory.value.currentPage || 1;
     } else {
       currentIterationPage.value = 1;
     }
   }, { immediate: true });
   ```

## 数据流

### 正常执行流程

```
ForNode 执行迭代
    ↓
WorkflowExecutor.executeContainerNodes
    ↓ (如果 iterationIndex === 0)
清空容器内所有子节点的迭代历史
    ↓
context.appendIterationResult(nodeId, iterationData)
    ↓
options.onIterationUpdate(nodeId, iterationData)
    ↓
Worker: postMessage({ type: "ITERATION_UPDATE", payload })
    ↓
VueFlowExecution: handleIterationUpdate
    ↓
eventBusUtils.emit("execution:iteration:update", payload)
    ↓
CanvasView: events.on("execution:iteration:update")
    ↓ (如果 iterationIndex === 0)
清空节点的前端迭代历史
    ↓
canvasStore.appendNodeIterationHistory(nodeId, iterationData)
    ↓
更新节点的 data.iterationHistory
    ↓
NodeConfigModal 响应式更新显示
```

### 迭代历史清理机制

#### 触发时机
1. **第一次迭代开始时**（`iterationIndex === 0`）
   - 后端：`WorkflowExecutor.executeContainerNodes` 清空容器内所有子节点的迭代历史
   - 前端：`CanvasView` 接收到第一次迭代数据时清空该节点的迭代历史

2. **执行上下文重置时**
   - `ExecutionContext.reset()` 清空所有迭代历史

#### 清理范围
- **后端**：容器内的所有子节点
- **前端**：接收到更新的具体节点

#### 实现代码

**后端清理（WorkflowExecutor.ts）：**
```typescript
// 如果是第一次迭代，清空容器内所有节点的迭代历史
if (iterationIndex === 0) {
  console.log(
    `[WorkflowExecutor] 清空容器 ${containerId} 内 ${containerNodes.length} 个节点的迭代历史`
  );
  for (const node of containerNodes) {
    context.clearIterationHistory(node.id);
  }
}
```

**前端清理（CanvasView.vue）：**
```typescript
// 如果是第一次迭代，先清空旧的迭代历史
if (iterationData.iterationIndex === 0) {
  console.log(`[CanvasView] 清空节点 ${nodeId} 的旧迭代历史`);
  canvasStore.clearNodeIterationHistory(nodeId);
}
```

#### 为什么需要清理
- **防止数据累积**：多次执行同一个工作流时，迭代历史会不断累积
- **内存管理**：避免内存无限增长
- **数据准确性**：确保显示的是当前执行的迭代历史，而不是历史遗留数据

## 文件清单

### 后端/Executor
- ✅ `packages/flow-nodes/src/executor/types.ts`
- ✅ `packages/flow-nodes/src/executor/ExecutionContext.ts`
- ✅ `packages/flow-nodes/src/executor/WorkflowExecutor.ts`
- ✅ `packages/flow-nodes/src/executor/index.ts`

### 前端/事件系统
- ✅ `src/v2/features/vueflow/executor/types.ts`
- ✅ `src/v2/features/vueflow/executor/worker.ts`
- ✅ `src/v2/features/vueflow/executor/VueFlowExecution.ts`
- ✅ `src/v2/features/vueflow/events/eventTypes.ts`

### 前端/UI
- ✅ `src/v2/stores/canvas.ts`
- ✅ `src/v2/features/canvas/CanvasView.vue`
- ✅ `src/v2/features/canvas/components/modals/NodeConfigModal.vue`

### 文档
- ✅ `docs/iteration-paging-test-guide.md`
- ✅ `docs/iteration-paging-implementation-summary.md`

## 关键特性

### 1. 迭代历史自动清理
- **后端清理**：在 `WorkflowExecutor.executeContainerNodes` 中，当 `iterationIndex === 0`（第一次迭代）时，自动清空容器内所有子节点的迭代历史
- **前端清理**：在 `CanvasView.vue` 中，接收到第一次迭代数据时（`iterationIndex === 0`），先清空该节点的前端迭代历史
- **上下文重置**：在 `ExecutionContext.reset()` 中清空所有迭代历史
- **防止数据累积**：确保每次执行 ForNode 时，都从干净的状态开始记录迭代历史

### 2. 实时更新
- 每次迭代执行完成后立即保存和更新
- 前端实时接收迭代数据并更新 UI

### 3. 响应式设计
- 使用 Vue 的响应式系统自动更新显示
- 页码切换流畅，无需重新加载数据

### 4. 完整的数据保留
每次迭代保存的信息包括：
- 迭代索引和变量
- 执行结果
- 执行状态（成功/失败）
- 执行时长
- 时间戳
- 错误信息（如果有）

### 5. 用户友好的 UI
- 直观的分页控件
- 清晰的迭代标识
- 边界条件处理（禁用首页/末页按钮）
- 徽章显示当前迭代

## 兼容性

### 向后兼容
- 不影响现有的非循环节点
- 不影响没有迭代历史的节点显示
- 可选功能，不破坏现有工作流

### 数据结构兼容
- `iterationHistory` 字段是可选的
- 旧的执行结果显示逻辑仍然有效

## 性能考虑

### 当前实现
- 所有迭代数据存储在内存中
- 适用于中小规模的迭代（< 1000 次）

### 潜在优化方向
1. **大数据集处理**
   - 实现虚拟滚动
   - 分批加载迭代数据
   - 数据压缩存储

2. **持久化**
   - localStorage 存储
   - IndexedDB 存储
   - 后端持久化

3. **内存管理**
   - 限制存储的迭代数量
   - 旧数据的清理策略
   - 数据分页加载

## 已测试场景

- ✅ 基本的循环节点执行
- ✅ 多次迭代的分页浏览
- ✅ 边界条件（第一页/最后一页）
- ✅ 节点切换时的状态重置
- ✅ 执行错误的迭代显示

## 待测试场景

- [ ] 嵌套循环（ForNode 内包含 ForNode）
- [ ] 大量迭代（1000+ 次）的性能
- [ ] 并发执行多个循环节点
- [ ] 循环中断/停止的处理
- [ ] 缓存命中时的迭代历史

## 下一步开发建议

1. **增强功能**
   - 迭代对比视图
   - 迭代搜索/过滤
   - 执行时间分析图表
   - 异常迭代高亮

2. **优化**
   - 大数据集的虚拟滚动
   - 懒加载迭代数据
   - 数据压缩

3. **持久化**
   - 工作流保存时包含迭代历史
   - 历史记录导出功能
   - 历史记录导入功能

4. **用户体验**
   - 键盘快捷键（← → 切换页面）
   - 跳转到指定迭代
   - 迭代执行动画
   - 批量操作迭代数据
