# VueFlow 工作流执行系统设计文档

## 📋 文档概述

**版本**: v3.0  
**创建日期**: 2025-11-06  
**最后更新**: 2025-11-06  
**目标**: 在新的 VueFlow 架构中实现工作流执行系统，支持 Worker 和 Server 两种执行模式，支持选择性执行和结果缓存

---

## 🎯 核心目标

### 1. 统一执行接口

在 `src/newCode/features/vueflow/composables/execution/` 目录下创建统一的工作流执行系统。

### 2. 双模式支持

- **Worker 模式**：浏览器 Web Worker 中执行（默认）
- **Server 模式**：通过 WebSocket 连接远程执行服务器

### 3. 核心执行逻辑统一

**关键设计**：Worker 和 Server 的执行逻辑完全相同，都是基于：

- 输入：`Workflow` 配置（包含 nodes、edges、selectedNodeIds、workflow_id）
- 核心能力：提供节点类型 → 执行函数的映射
- 输出：统一的执行结果

因此，核心执行引擎抽离到 `executor` 模块，两种模式只是运行环境不同。

### 4. 选择性执行和缓存机制

**关键特性**：

- ✅ **选择性执行**：可指定要执行的节点 ID 列表
- ✅ **部分执行**：仅执行选中的节点及其依赖
- ✅ **结果缓存**：相同 workflow_id 的节点结果可缓存复用
- ✅ **单节点调试**：执行单个节点时自动使用缓存的前置结果

### 5. 节点注册集成

从 `workflow-flow-nodes` 包的 `NODE_CLASS_REGISTRY` 动态获取所有可用节点。

### 6. 事件驱动通讯

使用现有的 VueFlow 事件系统实现实时状态推送。

---

## 🏗️ 系统架构

### 整体分层架构

```
┌─────────────────────────────────────────────────────┐
│               VueFlow Canvas (UI Layer)              │
│                     界面交互层                        │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────┐
│          useVueFlowExecution (Facade Layer)          │
│                    统一接口层                         │
│  - 模式切换                                           │
│  - 状态管理                                           │
│  - 事件转发                                           │
└──────────────┬────────────────────┬─────────────────┘
               │                    │
               ▼                    ▼
   ┌───────────────────┐  ┌───────────────────┐
   │  useWorkerExecutor│  │  useServerExecutor│
   │   Worker 适配层   │  │   Server 适配层   │
   └────────┬──────────┘  └──────────┬────────┘
            │                        │
            │    ┌──────────────┐    │
            └───▶│   Executor   │◀───┘
                 │  核心执行引擎 │
                 │ (统一逻辑层) │
                 └──────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │ NODE_REGISTRY │
                │  节点注册表   │
                └───────────────┘
```

### 核心设计理念

**关键洞察**：Worker 和 Server 的区别仅在于「运行环境」，而不是「执行逻辑」。

- **Executor**：纯粹的执行引擎，与环境无关（位于 `packages/flow-nodes/src/executor/`）
- **WorkerExecutor**：在 Worker 线程中运行 Executor
- **ServerExecutor**：在 Node.js 服务器中运行 Executor
- **useVueFlowExecution**：根据模式选择适配器

**为什么放在 `packages/flow-nodes` 中？**

1. ✅ Executor 与 UI 框架无关，是纯粹的执行逻辑
2. ✅ 与节点定义（nodes）紧密相关，适合放在同一个包
3. ✅ 可以被多个项目复用（不仅限于 VueFlow）
4. ✅ 便于独立测试和版本管理

---

## 📦 文件结构

```
packages/flow-nodes/
└── src/
    ├── executor/                        # 🎯 核心执行引擎（环境无关）
    │   ├── index.ts                     # 导出
    │   ├── types.ts                     # Executor 类型定义
    │   ├── WorkflowExecutor.ts          # 工作流执行器（核心类）
    │   ├── NodeResolver.ts              # 节点解析器
    │   └── ExecutionContext.ts          # 执行上下文
    ├── nodes/                           # 节点定义
    ├── types.ts                         # 节点类型
    └── index.ts                         # 导出（包含 executor）

src/newCode/features/vueflow/
├── composables/
│   └── execution/
│       ├── index.ts                     # 统一导出
│       ├── types.ts                     # 执行系统类型定义
│       ├── useVueFlowExecution.ts       # 统一接口（Facade）
│       ├── useWorkerExecutor.ts         # Worker 适配器
│       ├── useServerExecutor.ts         # Server 适配器
│       ├── useExecutionState.ts         # 状态管理
│       └── useNodeRegistry.ts           # 节点注册表管理
└── ...
```

---

## 🔧 核心组件设计

### 1. Executor 模块（核心执行引擎）

**位置**: `packages/flow-nodes/src/executor/`

**职责**：

- 解析工作流图（nodes + edges）
- 确定节点执行顺序（拓扑排序）
- 按序执行节点
- 管理节点间数据流
- 处理执行错误和重试

**关键特性**：

- ✅ 环境无关（可在 Worker 或 Node.js 中运行）
- ✅ 纯函数式设计
- ✅ 完整的类型定义
- ✅ 事件驱动（通过回调通知）
- ✅ 独立包，可复用

#### 核心类：WorkflowExecutor

**输入**：

- `nodes`: 节点配置数组
- `edges`: 连接配置数组
- `nodeResolver`: 节点解析器（type → 执行函数）
- `eventEmitter`: 事件回调函数

**输出**：

- 执行结果对象
- 实时事件通知（通过回调）

**关键方法**：

- `execute()`: 执行工作流
- `pause()`: 暂停执行
- `resume()`: 恢复执行
- `stop()`: 停止执行

#### 核心接口：NodeResolver

```typescript
// 节点解析器接口
interface NodeResolver {
  // 根据类型获取节点执行函数
  resolve(type: string): NodeExecuteFunction;

  // 获取节点元数据
  getMetadata(type: string): NodeMetadata;

  // 获取节点代码（用于预览）
  getCode(type: string): string | undefined;
}
```

**实现方式**：

- Worker 模式：从 `NODE_CLASS_REGISTRY` 创建实例
- Server 模式：同样从 `NODE_CLASS_REGISTRY` 创建实例

**关键点**：两种模式使用相同的节点解析逻辑！

**导入方式**：

```typescript
import { WorkflowExecutor, NodeResolver } from "workflow-flow-nodes";
```

---

### 2. useVueFlowExecution（统一接口层）

**职责**：

- 提供统一的 API 给 UI 层
- 根据模式切换底层适配器
- 管理全局执行状态
- 转发和聚合事件

**核心能力**：

- 执行控制（execute, pause, resume, stop）
- 模式切换（switchMode）
- 状态查询（status, progress, nodeStates）
- 事件监听（on, off）
- 节点查询（getNodeMetadata, getNodeCode）

---

### 3. useWorkerExecutor（Worker 适配器）

**职责**：

- 管理 Web Worker 实例
- 在 Worker 中初始化 Executor
- 转发消息到 Worker
- 接收并转发 Worker 事件

**工作流程**：

1. 创建 Worker 实例
2. Worker 中导入：
   ```typescript
   import { WorkflowExecutor, NodeResolver } from "workflow-flow-nodes";
   import { NODE_CLASS_REGISTRY } from "workflow-flow-nodes";
   ```
3. 创建 `NodeResolver` 实例
4. 创建 `WorkflowExecutor` 实例
5. 接收主线程的执行请求
6. 调用 Executor 执行
7. 通过 postMessage 发送事件

---

### 4. useServerExecutor（Server 适配器）

**职责**：

- 管理 WebSocket 连接
- 发送执行请求到服务器
- 接收并转发服务器事件
- 心跳保活和重连

**工作流程**：

1. 建立 WebSocket 连接
2. 服务器端初始化 Executor
3. 发送执行请求（nodes + edges JSON）
4. 服务器调用 Executor 执行
5. 通过 WebSocket 接收事件

**服务器端**：

- 使用相同的 `WorkflowExecutor` 类
- 使用相同的 `NodeResolver` 实现
- 通过 WebSocket 发送事件

---

### 5. useExecutionState（状态管理）

**职责**：

- 管理当前执行状态
- 追踪节点执行进度
- 计算执行进度百分比
- 存储执行历史

---

### 6. useNodeRegistry（节点注册表）

**职责**：

- 从 `NODE_CLASS_REGISTRY` 获取节点
- 缓存节点元数据
- 提供节点查询接口
- 提供节点代码提取功能

**节点代码获取**：
仅用于展示，不涉及实际执行。通过 `.toString()` 获取方法源码。

---

## 📡 事件通讯系统

### 事件流向

```
Executor (核心引擎)
    │
    ├─ 工作流事件 (workflow:start, complete, error)
    ├─ 节点事件 (node:start, complete, error)
    └─ 进度事件 (progress:update)
    │
    ▼
Worker/Server 适配器 (转发)
    │
    ▼
useVueFlowExecution (聚合)
    │
    ▼
VueFlow Events (全局事件总线)
    │
    ▼
UI 组件 (更新显示)
```

### 关键事件类型

- **工作流级别**：start, complete, error, cancelled
- **节点级别**：start, complete, error, skip
- **进度**：progress:update
- **状态变更**：status:change
- **模式切换**：mode:switch
- **连接**：connection:established, lost, reconnecting

---

## 🔄 执行流程

### Worker 模式流程

1. **初始化阶段**

   - UI 调用 `useVueFlowExecution({ mode: 'worker' })`
   - 创建 Worker 实例
   - Worker 中加载 `NODE_CLASS_REGISTRY`
   - Worker 中创建 `NodeResolver` 和 `WorkflowExecutor`

2. **执行阶段**

   - UI 调用 `execute(nodes, edges)`
   - 通过 postMessage 发送到 Worker
   - Worker 中 Executor 执行工作流
   - 实时发送事件到主线程
   - 主线程更新 UI 状态

3. **完成阶段**
   - Executor 返回最终结果
   - Worker 发送完成事件
   - UI 显示执行结果

### Server 模式流程

1. **初始化阶段**

   - UI 调用 `useVueFlowExecution({ mode: 'server' })`
   - 建立 WebSocket 连接
   - 服务器返回节点元数据

2. **执行阶段**

   - UI 调用 `execute(nodes, edges)`
   - 通过 WebSocket 发送 JSON
   - 服务器中 Executor 执行工作流
   - 实时通过 WebSocket 发送事件
   - UI 更新显示

3. **完成阶段**
   - 服务器 Executor 返回结果
   - WebSocket 发送完成事件
   - UI 显示执行结果

**关键点**：两种模式的 Executor 逻辑完全一致！

---

## 🎯 Executor 核心接口定义

### 输入类型

```typescript
/**
 * 工作流定义
 */
interface Workflow {
  /** 工作流唯一标识（用于缓存） */
  workflow_id: string;

  /** 节点列表 */
  nodes: WorkflowNode[];

  /** 边列表 */
  edges: WorkflowEdge[];

  /** 选中要执行的节点 ID 列表（可选）
   * - 为空：执行所有节点
   * - 有值：仅执行选中节点及其必需的依赖节点
   */
  selectedNodeIds?: string[];

  /** 工作流名称 */
  name?: string;

  /** 工作流描述 */
  description?: string;

  /** 创建时间 */
  createdAt?: number;

  /** 更新时间 */
  updatedAt?: number;
}

/**
 * 执行选项
 */
interface ExecutionOptions {
  /** 超时时间（毫秒） */
  timeout?: number;

  /** 最大重试次数 */
  maxRetries?: number;

  /** 是否使用缓存（默认：true） */
  useCache?: boolean;

  /** 是否清空缓存后执行（默认：false） */
  clearCache?: boolean;

  // 事件回调
  onNodeStart?: (nodeId: string) => void;
  onNodeComplete?: (nodeId: string, result: any) => void;
  onNodeError?: (nodeId: string, error: Error) => void;
  onProgress?: (progress: number) => void;
  onCacheHit?: (nodeId: string, cachedResult: any) => void;
}
```

### 输出类型

```typescript
/**
 * 执行结果
 */
interface ExecutionResult {
  /** 是否成功 */
  success: boolean;

  /** 执行 ID */
  executionId: string;

  /** 工作流 ID */
  workflowId: string;

  /** 开始时间 */
  startTime: number;

  /** 结束时间 */
  endTime: number;

  /** 执行时长（毫秒） */
  duration: number;

  /** 节点执行结果映射 */
  nodeResults: Map<string, NodeExecutionState>;

  /** 实际执行的节点 ID 列表 */
  executedNodeIds: string[];

  /** 跳过的节点 ID 列表（使用缓存） */
  skippedNodeIds: string[];

  /** 缓存命中的节点 ID 列表 */
  cachedNodeIds: string[];

  /** 错误信息 */
  error?: string;
}

/**
 * 节点执行状态
 */
interface NodeExecutionState {
  nodeId: string;
  status: "pending" | "running" | "success" | "error" | "skipped" | "cached";
  startTime?: number;
  endTime?: number;
  duration?: number;
  error?: string;
  outputs?: Record<string, any>;
  fromCache?: boolean; // 是否来自缓存
}
```

### 核心方法

```typescript
class WorkflowExecutor {
  constructor(nodeResolver: NodeResolver, options?: ExecutionOptions);

  /**
   * 执行工作流
   * @param workflow - 工作流定义
   * @returns 执行结果
   */
  execute(workflow: Workflow): Promise<ExecutionResult>;

  /**
   * 暂停执行
   */
  pause(): void;

  /**
   * 恢复执行
   */
  resume(): void;

  /**
   * 停止执行
   */
  stop(): void;

  /**
   * 获取执行状态
   */
  getState(): ExecutionState;

  /**
   * 获取缓存的节点结果
   * @param workflowId - 工作流 ID
   * @param nodeId - 节点 ID
   */
  getCachedResult(workflowId: string, nodeId: string): any | null;

  /**
   * 清空指定工作流的缓存
   * @param workflowId - 工作流 ID
   */
  clearCache(workflowId: string): void;

  /**
   * 清空所有缓存
   */
  clearAllCache(): void;

  /**
   * 获取缓存统计
   * @param workflowId - 工作流 ID
   */
  getCacheStats(workflowId: string): {
    totalNodes: number;
    cachedNodes: number;
    hitRate: number;
  };
}
```

---

## 🎯 执行策略详解

执行器会根据 `workflow.selectedNodeIds` 的值**自动判断**执行策略：

### 1. 全量执行（selectedNodeIds 为空或不存在）

**触发条件**：

- `workflow.selectedNodeIds` 为空数组 `[]`
- 或 `workflow.selectedNodeIds` 为 `undefined`

**执行逻辑**：

1. 按拓扑排序执行所有节点
2. 缓存所有节点结果（如果启用缓存）

**使用场景**：

- 首次执行工作流
- 需要完整执行结果
- 工作流修改后的完整验证

**示例**：

```typescript
const workflow: Workflow = {
  workflow_id: 'my-workflow',
  nodes: [...],
  edges: [...],
  // 不指定 selectedNodeIds，或设为 []
};

// 执行所有节点
await executor.execute(workflow);
```

### 2. 选择性执行（selectedNodeIds 有多个元素）

**触发条件**：

- `workflow.selectedNodeIds` 有 2 个或更多元素

**执行逻辑**：

1. 分析选中节点的依赖关系
2. 找出所有必需的前置节点
3. 优先使用缓存的前置节点结果
4. 仅执行缺少缓存的节点
5. 执行选中的目标节点

**使用场景**：

- 调试特定节点
- 部分重新执行
- 修改部分节点后的验证

**示例**：

```
工作流：A → B → C → D → E

场景 1：选中 [D]，已有缓存 [A, B, C]
- 使用缓存：A, B, C
- 执行：D
- 跳过：E

场景 2：选中 [D]，已有缓存 [A, B]
- 使用缓存：A, B
- 执行：C, D
- 跳过：E

场景 3：选中 [C, E]
- 需要执行：A, B, C, D, E（因为 E 依赖 D）
```

### 3. 单节点执行（selectedNodeIds 只有一个元素）

**触发条件**：

- `workflow.selectedNodeIds` 只有 1 个元素

**执行逻辑**：

1. 检查缓存中是否有所有必需的前置节点结果
2. 如果缺少必需的前置结果：
   - 自动执行缺少的前置节点（智能补全）
   - 或抛出错误（严格模式）
3. 仅执行选中的单个节点

**使用场景**：

- 快速调试单个节点
- 测试节点修改
- 验证节点逻辑

**优势**：

- ⚡ 最快的执行速度
- 🎯 精确的调试定位
- 💾 充分利用缓存

**示例**：

```typescript
const workflow: Workflow = {
  workflow_id: 'my-workflow',
  nodes: [...],
  edges: [...],
  selectedNodeIds: ['node-display'], // 只选中一个节点
};

// 自动使用缓存的前置结果，仅执行 node-display
await executor.execute(workflow);
```

---

## 💾 缓存机制详解

### 缓存键设计

```typescript
interface CacheKey {
  workflowId: string; // 工作流 ID
  nodeId: string; // 节点 ID
}

// 缓存键格式：`${workflowId}:${nodeId}`
// 示例：'workflow_001:node_http_request'
```

### 缓存内容

```typescript
interface CachedNodeResult {
  /** 节点 ID */
  nodeId: string;

  /** 执行状态 */
  status: "success" | "error";

  /** 执行时间 */
  timestamp: number;

  /** 输出数据 */
  outputs: Record<string, any>;

  /** 执行耗时 */
  duration: number;

  /** 节点配置哈希（用于检测节点是否修改） */
  configHash?: string;
}
```

### 缓存策略

#### 1. 缓存写入时机

- ✅ 节点执行成功后立即写入
- ✅ 仅缓存成功的结果
- ❌ 错误结果不缓存

#### 2. 缓存失效条件

- 节点配置被修改（configHash 不匹配）
- 手动调用 `clearCache()`
- 工作流结构变化（edges 改变）

#### 3. 缓存使用策略

```typescript
// 优先级：新执行 > 有效缓存 > 报错
if (nodeConfig.modified) {
  // 节点被修改，重新执行
  executeNode();
} else if (hasValidCache) {
  // 使用缓存
  useCachedResult();
} else {
  // 无缓存且无法执行（缺少前置结果）
  throw new Error("Missing required inputs");
}
```

### 缓存管理 API

```typescript
// 获取缓存统计
executor.getCacheStats(workflowId: string): {
  totalNodes: number;
  cachedNodes: number;
  hitRate: number;
}

// 清空特定工作流缓存
executor.clearCache(workflowId: string): void;

// 清空所有缓存
executor.clearAllCache(): void;

// 获取单个节点缓存
executor.getCachedResult(workflowId: string, nodeId: string): any | null;

// 预热缓存（执行前置节点）
executor.warmupCache(
  workflow: Workflow,
  targetNodeIds: string[]
): Promise<void>;
```

---

## ⚙️ 配置与默认值

### 默认执行配置

- **执行模式**: `worker`（默认）
- **超时**: `60000ms`（60 秒）
- **最大重试**: `3` 次
- **实时预览**: `true`（启用）
- **服务器地址**: `ws://localhost:3001`

### 默认执行选项

- **使用缓存**: `true`（启用）
- **清空缓存**: `false`（不清空）
- **缓存过期时间**: `24小时`
- **执行策略**: 自动根据 `selectedNodeIds` 判断

### 配置优先级

1. 函数参数配置（最高优先级）
2. localStorage 存储的用户配置
3. 默认配置（最低优先级）

---

## 📊 性能与限制

### Worker 模式

**优势**：

- 不阻塞 UI 线程
- 本地执行，无网络延迟
- 数据隐私（不离开浏览器）
- 适合轻量级工作流

**限制**：

- 浏览器内存限制
- 无法访问 Node.js API
- 无法访问文件系统

### Server 模式

**优势**：

- 完整 Node.js 环境
- 强大计算能力
- 可访问文件系统和数据库
- 多用户共享资源

**限制**：

- 需要网络连接
- 存在网络延迟
- 需要部署服务器

---

## 🚧 实现步骤

### Phase 1: 核心 Executor（优先级：最高）

**目标**：实现环境无关的执行引擎

**位置**: `packages/flow-nodes/src/executor/`

1. 在 `packages/flow-nodes/src/` 创建 `executor/` 目录
2. 定义核心类型（executor/types.ts）
3. 实现 `WorkflowExecutor` 类
4. 实现 `NodeResolver` 接口
5. 实现 `ExecutionContext` 类
6. 在 `packages/flow-nodes/src/index.ts` 中导出 executor
7. 编写单元测试

**验收标准**：

- Executor 可以在纯 Node.js 环境中运行
- 所有单元测试通过
- 类型定义完整
- 可以通过 `workflow-flow-nodes` 包导入

### Phase 2: Worker 适配器（优先级：高）

**目标**：在 Worker 中运行 Executor

1. 实现 `useWorkerExecutor`
2. 创建 Worker 脚本
3. 集成 NODE_CLASS_REGISTRY
4. 实现消息通信
5. 实现事件转发
6. 测试 Worker 模式执行

### Phase 3: 统一接口（优先级：高）

**目标**：提供统一的 API

1. 实现 `useVueFlowExecution`
2. 实现模式切换逻辑
3. 实现状态管理（`useExecutionState`）
4. 实现节点注册表（`useNodeRegistry`）
5. 集成 VueFlow 事件系统
6. 编写集成测试

### Phase 4: Server 适配器（优先级：中）

**目标**：通过 WebSocket 运行 Executor

1. 实现 `useServerExecutor`
2. 实现 WebSocket 连接管理
3. 服务器端集成 Executor
4. 实现心跳和重连
5. 测试 Server 模式执行

### Phase 5: 高级功能（优先级：低）

1. 执行历史和日志
2. 断点调试功能
3. 单步执行
4. 性能优化（缓存、懒加载）

---

## 🧪 测试策略

### 单元测试

**Executor 核心**：

- 节点执行顺序测试
- 数据流转测试
- 错误处理测试
- 暂停/恢复测试

**NodeResolver**：

- 节点解析测试
- 元数据获取测试
- 代码提取测试

### 集成测试

**Worker 模式**：

- 完整工作流执行
- 事件通信测试
- 错误场景测试

**Server 模式**：

- WebSocket 连接测试
- 完整工作流执行
- 断线重连测试

### E2E 测试

- 模式切换测试
- UI 交互测试
- 实时状态更新测试

---

## 📝 开发检查清单

### Executor 开发（packages/flow-nodes）

- [ ] 在 `packages/flow-nodes/src/executor/` 创建目录
- [ ] 定义核心类型（executor/types.ts）
  - [ ] Workflow 类型定义
  - [ ] ExecutionOptions 类型
  - [ ] ExecutionResult 类型
  - [ ] CacheKey 和 CachedNodeResult 类型
- [ ] 实现 WorkflowExecutor 类
  - [ ] 实现拓扑排序算法
  - [ ] 实现依赖分析（找出必需的前置节点）
  - [ ] 实现执行策略自动判断（根据 selectedNodeIds）
  - [ ] 实现全量执行逻辑
  - [ ] 实现选择性执行逻辑
  - [ ] 实现单节点执行逻辑
  - [ ] 实现数据流管理
  - [ ] 实现错误处理和重试
- [ ] 实现缓存机制
  - [ ] 实现缓存读写
  - [ ] 实现缓存失效检测（configHash）
  - [ ] 实现缓存清理
  - [ ] 实现缓存统计
- [ ] 实现 NodeResolver 接口
- [ ] 实现 ExecutionContext 类
- [ ] 在主 index.ts 中导出 executor
- [ ] 编写单元测试
  - [ ] 测试自动策略判断
  - [ ] 测试全量执行（selectedNodeIds 为空）
  - [ ] 测试选择性执行（selectedNodeIds 多个）
  - [ ] 测试单节点执行（selectedNodeIds 单个）
  - [ ] 测试缓存命中
  - [ ] 测试缓存失效
  - [ ] 测试前置节点自动补全
- [ ] 通过所有测试
- [ ] 更新 package.json 类型声明

### Worker 适配器

- [ ] 创建 Worker 脚本
- [ ] 集成 Executor
- [ ] 实现消息通信
- [ ] 实现事件转发
- [ ] 测试基本执行
- [ ] 测试错误场景

### Server 适配器

- [ ] 实现 WebSocket 客户端
- [ ] 实现服务器端 Executor
- [ ] 实现心跳机制
- [ ] 测试连接稳定性
- [ ] 测试执行正确性

### 统一接口

- [ ] 实现模式切换
- [ ] 实现状态管理
- [ ] 集成事件系统
- [ ] 编写使用文档
- [ ] 完成集成测试

---

## 🔗 相关文档

- [项目开发指南](./project-structure.md) - 项目结构和规范
- [Worker vs Server 对比](./server-vs-worker-comparison.md) - 两种模式对比
- [Workflow Worker 集成指南](./workflow-worker-integration.md) - Worker 集成细节
- [Workflow Server 快速开始](./workflow-server-quickstart.md) - Server 部署指南
- [组件通信方式](./communication.md) - 事件通信规范

---

## 💡 关键设计决策

### 1. 为什么抽离 Executor 到独立包？

**问题**：Worker 和 Server 模式都需要执行相同的逻辑

**解决方案**：

- 将核心执行逻辑抽离到 `packages/flow-nodes/src/executor/`
- Executor 与运行环境和 UI 框架无关
- Worker 和 Server 仅作为「适配器」
- 作为 `workflow-flow-nodes` 包的一部分导出

**好处**：

- ✅ 代码复用（Worker、Server、其他环境都可使用）
- ✅ 易于测试（纯函数，独立测试）
- ✅ 易于维护（单一职责，独立版本）
- ✅ 易于扩展（可支持更多运行模式）
- ✅ 与节点定义在同一个包（关注点集中）
- ✅ 可被其他项目复用（不依赖 VueFlow）

### 2. 为什么使用 NodeResolver 接口？

**问题**：不同环境下获取节点的方式可能不同

**解决方案**：

- 定义统一的 NodeResolver 接口
- Executor 依赖接口而非具体实现
- 不同环境提供不同实现

**好处**：

- ✅ 解耦（Executor 不依赖具体环境）
- ✅ 灵活（易于替换实现）
- ✅ 可测试（可 mock NodeResolver）

### 3. 为什么使用回调而非直接事件？

**问题**：Executor 需要通知外部执行状态

**解决方案**：

- Executor 接收回调函数作为参数
- 通过回调通知状态变化
- 外部决定如何处理事件（发送到 Worker、WebSocket 等）

**好处**：

- ✅ 环境无关（不依赖特定事件系统）
- ✅ 灵活（外部自由处理）
- ✅ 可测试（易于验证回调）

### 4. 为什么需要选择性执行和缓存？

**问题**：

- 调试时需要反复执行单个节点
- 完整执行耗时长，效率低
- 修改部分节点后需要重新执行整个流程

**解决方案**：

- 支持选择性执行特定节点
- 缓存节点执行结果
- 自动分析和使用依赖缓存

**好处**：

- ⚡ 显著提升调试效率（秒级 vs 分钟级）
- 💾 减少重复计算
- 🎯 精确定位问题节点
- 🔄 支持迭代式开发

**实际场景**：

```
工作流：数据获取 → 数据清洗 → 特征提取 → 模型预测 → 结果展示

调试"结果展示"节点：
- 传统方式：重新执行所有节点（~5分钟）
- 缓存方式：直接使用前置缓存（<1秒）
```

---

## 📞 技术支持

如有疑问或建议，请在项目 issue 中提出。

---

## 📊 附录：使用示例

### 示例 1：全量执行工作流

```typescript
const workflow: Workflow = {
  workflow_id: 'data-processing-001',
  name: '数据处理流程',
  nodes: [...],
  edges: [...],
  // 不指定 selectedNodeIds，全量执行
};

const result = await executor.execute(workflow);
console.log('执行完成', result.executedNodeIds); // 所有节点
```

### 示例 2：选择性执行特定节点

```typescript
const workflow: Workflow = {
  workflow_id: 'data-processing-001',
  nodes: [...],
  edges: [...],
  selectedNodeIds: ['node-predict', 'node-display'], // 只执行这两个节点
};

// 自动识别为选择性执行模式
const result = await executor.execute(workflow, {
  useCache: true, // 使用缓存
});

console.log('执行的节点', result.executedNodeIds);
console.log('使用缓存的节点', result.cachedNodeIds);
```

### 示例 3：单节点调试

```typescript
const workflow: Workflow = {
  workflow_id: 'data-processing-001',
  nodes: [...],
  edges: [...],
  selectedNodeIds: ['node-display'], // 只调试展示节点（自动识别为单节点模式）
};

const result = await executor.execute(workflow, {
  useCache: true, // 使用缓存
});

// 自动使用缓存的前置结果，仅执行 node-display
// 如果缺少必需的前置节点缓存，会自动执行缺少的节点
```

### 示例 4：清空缓存重新执行

```typescript
const workflow: Workflow = {
  workflow_id: 'data-processing-001',
  nodes: [...],
  edges: [...],
  // 不指定 selectedNodeIds，自动全量执行
};

const result = await executor.execute(workflow, {
  clearCache: true, // 清空缓存后重新执行
});
```

### 示例 5：查询缓存状态

```typescript
// 获取缓存统计
const stats = executor.getCacheStats("data-processing-001");
console.log("缓存命中率", stats.hitRate); // 0.8 (80%)

// 获取单个节点缓存
const cached = executor.getCachedResult("data-processing-001", "node-predict");

if (cached) {
  console.log("使用缓存结果", cached.outputs);
}
```

---

**文档版本**: v3.0  
**最后更新**: 2025-11-06  
**作者**: AI Assistant
