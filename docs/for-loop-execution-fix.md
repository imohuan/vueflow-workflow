# For 循环节点执行逻辑修复方案

## 一、问题分析

### 1.1 当前实现的问题

#### 核心问题

目前 `workflowExecutor.ts` 使用简单的 BFS 队列执行逻辑，无法正确处理 For 循环节点的容器化循环执行需求。

#### For 循环节点的特殊性

For 循环节点有 **3 个端口**：

```
┌─────────────────────┐
│      For 循环       │
◄─────────────────────┤ 左侧：输入端口 (items)
│                     │
│                     ├─────► 右侧：循环结束端口 (next)
│                     │
└──────┬──────────────┘
       │
       ▼ 底部：循环体端口 (loop)
```

**预期执行流程**：

1. For 节点接收输入数据（数组）
2. For 节点底部端口连接一个**容器节点**
3. 容器内包含循环体的所有节点
4. **每次迭代**：
   - 从容器左侧端口开始执行
   - 依次执行容器内的所有节点
   - 执行到容器右侧端口结束
   - 保存本次迭代的结果
5. 所有迭代完成后，才从 For 节点的右侧端口继续执行

**当前实现的问题**：

- ✅ For 节点本身可以正确生成迭代数据
- ❌ 没有循环执行容器内节点的逻辑
- ❌ 没有识别和处理容器的逻辑
- ❌ 没有为每次迭代保存独立的结果
- ❌ 没有将迭代上下文传递给容器内的节点
- ❌ 循环未结束就从右侧端口继续执行了

---

## 二、容器节点的概念

### 2.1 容器节点的定义

容器节点是一个特殊的节点类型，用于包含一组子节点。

**容器节点的特征**：

```typescript
interface ContainerNode extends WorkflowNode {
  data: {
    isContainer: true; // 标识为容器
    variant?: "container"; // 容器类型
  };
  // 容器内的子节点通过 parentNode 字段关联
}

// 子节点
interface ChildNode extends WorkflowNode {
  parentNode: string; // 指向容器节点的 ID
}
```

**容器的端口**：

- **左侧端口**：容器的入口，接收来自 For 节点的循环体端口
- **右侧端口**：容器的出口，连接到下一个节点或返回 For 节点
- **内部节点**：容器内的第一个节点连接左侧端口，最后一个节点连接右侧端口

### 2.2 容器与 For 节点的关系

```
For 节点
  │
  ▼ loop 端口
容器左侧端口
  │
  ▼ 内部执行（迭代 1）
  ├─ 节点 A
  ├─ 节点 B
  └─ 节点 C
  │
  ▼ 内部执行（迭代 2）
  ├─ 节点 A
  ├─ 节点 B
  └─ 节点 C
  │
  ▼ ... (迭代 N)
容器右侧端口
  │
  ▼ 返回 For 节点
For 节点右侧端口 (next)
  │
  ▼ 继续后续节点
```

---

## 三、新的执行逻辑设计

### 3.1 核心概念：执行栈

引入**执行栈**来管理循环和嵌套执行：

```typescript
interface ExecutionFrame {
  /** 帧类型 */
  type: "normal" | "loop";

  /** 当前执行的节点队列 */
  queue: string[];

  /** 已访问的节点集合 */
  visited: Set<string>;

  /** 当前帧的上下文数据 */
  context: Record<string, any>;

  /** 循环相关（仅 type='loop' 时有效） */
  loopContext?: {
    /** 循环节点 ID */
    forNodeId: string;

    /** 容器节点 ID */
    containerId: string;

    /** 总迭代次数 */
    totalIterations: number;

    /** 当前迭代索引（0-based） */
    currentIteration: number;

    /** 当前迭代的上下文变量 */
    iterationVariables: Record<string, any>;

    /** 每次迭代的结果 */
    iterationResults: Array<{
      index: number;
      variables: Record<string, any>;
      nodeResults: Record<string, NodeResult>;
    }>;
  };
}
```

### 3.2 执行流程

#### 主流程

```
1. 初始化执行栈，推入初始帧
2. While 栈不为空：
   a. 获取栈顶帧
   b. 从帧的队列中取出节点
   c. 执行节点
   d. 如果是 For 节点：
      - 创建循环帧
      - 推入执行栈
      - 跳过 For 节点的右侧端口
   e. 如果是容器出口：
      - 检查是否还有迭代
      - 如果有：重置容器队列，继续下一次迭代
      - 如果没有：弹出循环帧，继续 For 节点的右侧端口
   f. 否则：正常添加后续节点到队列
3. 返回执行结果
```

#### For 节点特殊处理

```typescript
async function executeForNode(
  forNode: WorkflowNode,
  forConfig: ForConfig,
  inputs: Record<string, any>,
  context: WorkflowExecutionContext
): Promise<{
  iterations: Array<Record<string, any>>;
  containerId: string;
}> {
  // 1. 解析迭代数据
  const items = resolveItems(forConfig, inputs.items);

  // 2. 生成迭代变量
  const iterations = items.map((value, index) => ({
    [forConfig.itemName]: value,
    [forConfig.indexName]: index,
  }));

  // 3. 获取容器 ID
  const containerId = forConfig.containerId;
  if (!containerId) {
    throw new Error("For 节点未配置容器 ID");
  }

  return { iterations, containerId };
}
```

#### 循环帧执行

```typescript
async function executeLoopFrame(frame: ExecutionFrame): Promise<void> {
  const { loopContext } = frame;

  while (loopContext.currentIteration < loopContext.totalIterations) {
    // 1. 设置当前迭代的上下文变量
    const iterationVars = loopContext.iterationVariables;

    // 2. 重置容器内节点队列
    frame.queue = [getContainerEntryNode(loopContext.containerId)];
    frame.visited.clear();

    // 3. 执行容器内所有节点
    const iterationNodeResults: Record<string, NodeResult> = {};

    while (frame.queue.length > 0) {
      const nodeId = frame.queue.shift()!;

      // 检查是否是容器出口
      if (isContainerExitNode(nodeId, loopContext.containerId)) {
        break;
      }

      // 执行节点（注入迭代变量）
      const result = await executeNode(nodeId, {
        ...context,
        ...iterationVars, // 注入当前迭代的变量
      });

      iterationNodeResults[nodeId] = result;

      // 添加后续节点
      addSubsequentNodes(frame.queue, nodeId);
    }

    // 4. 保存本次迭代结果
    loopContext.iterationResults.push({
      index: loopContext.currentIteration,
      variables: iterationVars,
      nodeResults: iterationNodeResults,
    });

    // 5. 进入下一次迭代
    loopContext.currentIteration++;
  }

  // 6. 循环结束，弹出循环帧
  executionStack.pop();

  // 7. 继续 For 节点的右侧端口
  const nextEdges = getNextEdges(loopContext.forNodeId, "next");
  addEdgesToQueue(nextEdges);
}
```

---

## 四、数据结构修改

### 4.1 ForConfig 修改（已有，无需修改）

```typescript
export interface ForConfig {
  mode: "input" | "static" | "range";
  itemsPath?: string;
  staticItems?: any[];
  range?: {
    start: number;
    end: number;
    step: number;
  };
  itemName: string; // 迭代变量名
  indexName: string; // 索引变量名
  containerId?: string | null; // 容器节点 ID ✅ 已有
}
```

### 4.2 NodeResult 修改

为支持循环节点的多次迭代结果，需要扩展 `NodeResult`：

```typescript
export interface NodeResult {
  duration: number;
  status: "success" | "error";
  error?: string;
  timestamp: number;
  data: NodeResultData;

  // 新增：循环迭代结果
  iterations?: IterationResult[];
}

export interface IterationResult {
  /** 迭代索引（0-based） */
  index: number;

  /** 本次迭代的变量 */
  variables: Record<string, any>;

  /** 本次迭代中容器内所有节点的执行结果 */
  nodeResults: Record<string, NodeResult>;

  /** 本次迭代的耗时 */
  duration: number;

  /** 本次迭代的状态 */
  status: "success" | "error";

  /** 本次迭代的错误信息 */
  error?: string;
}
```

### 4.3 WorkflowExecutionContext 修改

```typescript
export interface WorkflowExecutionContext {
  /** MCP 客户端实例（由初始化节点设置） */
  mcpClient?: any;

  // 新增：当前迭代变量（For 循环注入）
  loopVariables?: Record<string, any>;

  /** 其他共享数据 */
  [key: string]: unknown;
}
```

---

## 五、UI 分页实现方案

### 5.1 NodeResult 组件修改

为 For 循环节点的结果添加分页功能。

#### 布局设计

```
┌────────────────────────────────────────────┐
│  [查看结果 ▼]              [耗时: 1.2s]     │
├────────────────────────────────────────────┤
│  ✓ 执行成功                                 │
│                                            │
│  循环执行: 共 10 次迭代                      │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  [◀] 第 1/10 次迭代 [▶]               │ │
│  ├──────────────────────────────────────┤ │
│  │  变量:                                │ │
│  │    • item: "数据1"                    │ │
│  │    • index: 0                         │ │
│  ├──────────────────────────────────────┤ │
│  │  容器节点执行结果:                     │ │
│  │    ├─ 节点A: ✓ 成功 (12ms)            │ │
│  │    ├─ 节点B: ✓ 成功 (8ms)             │ │
│  │    └─ 节点C: ✓ 成功 (5ms)             │ │
│  ├──────────────────────────────────────┤ │
│  │  输出结果:                            │ │
│  │    [JSON 数据展示]                    │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

#### 组件实现要点

```vue
<template>
  <!-- 普通节点结果 -->
  <div v-if="!hasIterations" class="normal-result">
    <!-- 原有的结果展示逻辑 -->
  </div>

  <!-- For 循环节点结果 -->
  <div v-else class="loop-result">
    <div class="loop-summary">循环执行: 共 {{ totalIterations }} 次迭代</div>

    <!-- 分页器 -->
    <div class="iteration-pagination">
      <button :disabled="currentPage === 0" @click="prevPage">◀</button>
      <span>第 {{ currentPage + 1 }}/{{ totalIterations }} 次迭代</span>
      <button :disabled="currentPage === totalIterations - 1" @click="nextPage">
        ▶
      </button>
    </div>

    <!-- 当前迭代的结果 -->
    <div class="iteration-content">
      <!-- 迭代变量 -->
      <div class="iteration-variables">
        <div class="label">变量:</div>
        <div
          v-for="(value, key) in currentIteration.variables"
          :key="key"
          class="variable-item"
        >
          • {{ key }}: <JsonViewer :data="value" />
        </div>
      </div>

      <!-- 容器内节点执行结果 -->
      <div class="container-nodes-results">
        <div class="label">容器节点执行结果:</div>
        <div
          v-for="(result, nodeId) in currentIteration.nodeResults"
          :key="nodeId"
          class="node-result-item"
        >
          <span>{{ getNodeName(nodeId) }}</span>
          <span :class="result.status">
            {{ result.status === "success" ? "✓ 成功" : "✗ 失败" }}
          </span>
          <span>({{ result.duration }}ms)</span>
        </div>
      </div>

      <!-- 输出结果（容器最后一个节点的输出） -->
      <div class="iteration-output">
        <div class="label">输出结果:</div>
        <JsonViewer :data="currentIterationOutput" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{
  result?: NodeResult;
}>();

// 是否有迭代结果
const hasIterations = computed(() => {
  return props.result?.iterations && props.result.iterations.length > 0;
});

// 总迭代次数
const totalIterations = computed(() => {
  return props.result?.iterations?.length ?? 0;
});

// 当前页（迭代索引）
const currentPage = ref(0);

// 当前迭代结果
const currentIteration = computed(() => {
  if (!props.result?.iterations) return null;
  return props.result.iterations[currentPage.value];
});

// 当前迭代的输出（容器最后一个节点的输出）
const currentIterationOutput = computed(() => {
  if (!currentIteration.value) return null;
  const nodeResults = currentIteration.value.nodeResults;
  // 找到容器的最后一个节点（可能需要额外的逻辑判断）
  const lastNodeResult = Object.values(nodeResults).pop();
  return lastNodeResult?.data;
});

function prevPage() {
  if (currentPage.value > 0) {
    currentPage.value--;
  }
}

function nextPage() {
  if (currentPage.value < totalIterations.value - 1) {
    currentPage.value++;
  }
}

function getNodeName(nodeId: string): string {
  // 从节点映射或 store 中获取节点名称
  return nodeId; // 占位实现
}
</script>
```

### 5.2 分页功能增强

#### 快速跳转

```vue
<div class="iteration-pagination">
  <button :disabled="currentPage === 0" @click="firstPage">
    ⏮ 首页
  </button>
  <button :disabled="currentPage === 0" @click="prevPage">
    ◀ 上一页
  </button>
  
  <input 
    v-model.number="jumpPage" 
    type="number" 
    :min="1" 
    :max="totalIterations"
    @keyup.enter="jumpToPage"
    class="page-input"
  />
  <span>/ {{ totalIterations }}</span>
  
  <button :disabled="currentPage === totalIterations - 1" @click="nextPage">
    下一页 ▶
  </button>
  <button :disabled="currentPage === totalIterations - 1" @click="lastPage">
    末页 ⏭
  </button>
</div>
```

#### 迭代结果对比

```vue
<button @click="openCompareModal">
  对比迭代结果
</button>

<!-- 对比弹窗 -->
<div v-if="showCompare" class="compare-modal">
  <div class="compare-header">
    <select v-model="compareIndexA">
      <option v-for="i in totalIterations" :key="i" :value="i - 1">
        迭代 {{ i }}
      </option>
    </select>

    <span>vs</span>

    <select v-model="compareIndexB">
      <option v-for="i in totalIterations" :key="i" :value="i - 1">
        迭代 {{ i }}
      </option>
    </select>
  </div>

  <div class="compare-content">
    <div class="compare-column">
      <h4>迭代 {{ compareIndexA + 1 }}</h4>
      <JsonViewer :data="iterations[compareIndexA]" />
    </div>

    <div class="compare-column">
      <h4>迭代 {{ compareIndexB + 1 }}</h4>
      <JsonViewer :data="iterations[compareIndexB]" />
    </div>
  </div>
</div>
```

#### 迭代状态概览

```vue
<div class="iterations-overview">
  <div
    v-for="(iteration, index) in result.iterations"
    :key="index"
    :class="[
      'iteration-badge',
      iteration.status === 'success' ? 'success' : 'error',
      index === currentPage ? 'active' : ''
    ]"
    @click="currentPage = index"
  >
    {{ index + 1 }}
  </div>
</div>
```

---

## 六、实现步骤

### 6.1 阶段一：数据结构和类型定义

**任务**：

- [ ] 修改 `types.ts`，添加 `IterationResult` 接口
- [ ] 修改 `NodeResult`，添加 `iterations` 字段
- [ ] 修改 `WorkflowExecutionContext`，添加 `loopVariables` 字段
- [ ] 添加 `ExecutionFrame` 接口

**文件**：

- `packages/node-executor/src/types.ts`

### 6.2 阶段二：执行器逻辑重构

**任务**：

- [ ] 重构 `workflowExecutor.ts`：
  - [ ] 引入执行栈机制
  - [ ] 识别 For 节点和容器节点
  - [ ] 实现循环帧的创建和管理
  - [ ] 实现容器内节点的迭代执行
  - [ ] 收集和保存每次迭代的结果
  - [ ] 正确处理循环结束后的控制流

**文件**：

- `packages/node-executor/src/workflowExecutor.ts`

**关键函数**：

```typescript
// 判断节点是否为容器
function isContainerNode(node: WorkflowNode): boolean {
  return node.data?.isContainer === true;
}

// 获取容器的入口节点
function getContainerEntryNode(
  containerId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string | null {
  // 找到连接到容器左侧端口的第一个子节点
}

// 获取容器的出口节点
function getContainerExitNode(
  containerId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string | null {
  // 找到连接到容器右侧端口的最后一个子节点
}

// 执行循环帧
async function executeLoopFrame(
  frame: ExecutionFrame,
  nodeMap: Map<string, WorkflowNode>,
  outgoingMap: Map<string, WorkflowEdge[]>,
  incomingMap: Map<string, WorkflowEdge[]>,
  nodeResults: Record<string, NodeResult>
  // ... 其他参数
): Promise<void> {
  // 循环执行逻辑
}
```

### 6.3 阶段三：For 节点修改

**任务**：

- [ ] 修改 `ForNode.ts` 的 `execute` 方法：
  - [ ] 确保返回迭代数据
  - [ ] 确保返回容器 ID
  - [ ] 返回格式适配新的执行器逻辑

**文件**：

- `packages/node-executor/src/nodes/ForNode.ts`

**注意**：

- For 节点本身不执行循环，只准备迭代数据
- 循环逻辑由 `workflowExecutor` 处理

### 6.4 阶段四：UI 分页实现

**任务**：

- [ ] 修改 `NodeResult.vue`：
  - [ ] 检测是否有 `iterations` 数据
  - [ ] 实现分页器组件
  - [ ] 实现迭代结果展示
  - [ ] 实现变量展示
  - [ ] 实现容器内节点结果展示
  - [ ] 实现快速跳转功能
  - [ ] （可选）实现迭代对比功能
  - [ ] （可选）实现迭代状态概览

**文件**：

- `src/components/node-editor/NodeResult.vue`

**样式要点**：

```css
.loop-result {
  /* 循环结果容器 */
}

.iteration-pagination {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
}

.iteration-content {
  /* 迭代内容区域 */
}

.iteration-variables {
  /* 迭代变量区域 */
}

.container-nodes-results {
  /* 容器节点结果区域 */
}

.iterations-overview {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.iteration-badge {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.iteration-badge.success {
  background: #dcfce7;
  color: #16a34a;
}

.iteration-badge.error {
  background: #fee2e2;
  color: #dc2626;
}

.iteration-badge.active {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

### 6.5 阶段五：事件和状态同步

**任务**：

- [ ] 修改事件类型定义，支持迭代进度事件
- [ ] 在执行器中发射迭代相关事件
- [ ] 在 `useWorkflowExecution` 中处理迭代事件
- [ ] 在 UI 中实时显示迭代进度

**新增事件类型**：

```typescript
// 循环开始事件
interface LoopStartedPayload {
  executionId: string;
  forNodeId: string;
  containerId: string;
  totalIterations: number;
  timestamp: number;
}

// 迭代开始事件
interface IterationStartedPayload {
  executionId: string;
  forNodeId: string;
  iterationIndex: number;
  variables: Record<string, any>;
  timestamp: number;
}

// 迭代完成事件
interface IterationCompletedPayload {
  executionId: string;
  forNodeId: string;
  iterationIndex: number;
  duration: number;
  status: "success" | "error";
  timestamp: number;
}

// 循环完成事件
interface LoopCompletedPayload {
  executionId: string;
  forNodeId: string;
  totalIterations: number;
  successCount: number;
  errorCount: number;
  duration: number;
  timestamp: number;
}
```

**事件类型枚举**：

```typescript
export enum WorkflowEventType {
  // ... 现有事件
  LOOP_STARTED = "loop:started",
  ITERATION_STARTED = "iteration:started",
  ITERATION_COMPLETED = "iteration:completed",
  LOOP_COMPLETED = "loop:completed",
}
```

### 6.6 阶段六：测试和验证

**测试用例**：

1. **简单循环**：

   - 3 次迭代，每次迭代执行 1 个节点
   - 验证迭代次数正确
   - 验证每次迭代的变量正确传递

2. **复杂循环**：

   - 10 次迭代，每次迭代执行 5 个节点
   - 验证容器内节点的执行顺序
   - 验证每次迭代的结果独立保存

3. **嵌套循环**（如果支持）：

   - 外层循环 3 次，内层循环 5 次
   - 验证嵌套循环的执行正确性

4. **错误处理**：

   - 某次迭代中节点执行失败
   - 验证错误信息正确保存
   - 验证后续迭代是否继续执行（根据配置）

5. **UI 分页**：
   - 验证分页器功能
   - 验证快速跳转
   - 验证迭代结果显示正确

---

## 七、注意事项

### 7.1 性能考虑

- **大量迭代**：如果迭代次数很多（如 1000+ 次），需要考虑：

  - 是否需要限制保存的迭代结果数量
  - 是否需要分批执行
  - 是否需要后台执行

- **内存占用**：每次迭代的结果都会保存在内存中，需要：
  - 限制单次迭代结果的大小
  - 提供清理旧结果的机制

### 7.2 容器节点识别

- **容器 ID 配置**：

  - For 节点的 `containerId` 字段必须正确配置
  - 在 UI 中，连接 For 节点的 `loop` 端口到容器时，自动填充 `containerId`

- **容器边界识别**：
  - 容器的入口节点：第一个 `parentNode` 指向容器 ID 的节点
  - 容器的出口节点：最后一个连接到容器右侧端口的节点

### 7.3 变量作用域

- **迭代变量**：

  - 迭代变量（如 `item`、`index`）只在容器内可见
  - 容器外的节点无法访问迭代变量

- **变量传递**：
  - 通过 `WorkflowExecutionContext` 的 `loopVariables` 字段传递
  - 执行节点时合并到上下文中

### 7.4 错误处理策略

可以考虑提供配置选项：

```typescript
interface ForConfig {
  // ... 现有字段

  // 错误处理策略
  errorHandling?: {
    /** 迭代失败时是否继续后续迭代 */
    continueOnError: boolean;
    /** 最大失败次数（超过则停止循环） */
    maxErrors?: number;
  };
}
```

### 7.5 迭代结果存储

- **结果大小限制**：

  - 建议限制单次迭代结果的大小（如 1MB）
  - 超过限制时，只保存摘要信息

- **结果清理**：
  - 提供手动清理机制
  - 可选自动清理旧的迭代结果

---

## 八、后续优化方向

### 8.1 迭代并行执行

如果迭代之间没有依赖关系，可以考虑并行执行：

```typescript
interface ForConfig {
  // ... 现有字段

  /** 是否并行执行迭代 */
  parallel?: boolean;

  /** 并行度（同时执行的迭代数量） */
  concurrency?: number;
}
```

### 8.2 迭代结果聚合

提供多种结果聚合方式：

- **数组聚合**：所有迭代的输出合并为一个数组
- **对象聚合**：使用迭代变量作为 key，输出作为 value
- **统计聚合**：计算平均值、最大值、最小值等

### 8.3 条件终止

提供提前终止循环的机制：

```typescript
interface ForConfig {
  // ... 现有字段

  /** 终止条件表达式 */
  breakCondition?: string; // 如: "item.error === true"
}
```

### 8.4 迭代进度可视化

在 UI 中显示循环执行的进度：

- 进度条
- 当前迭代信息
- 预计剩余时间

---

## 九、总结

### 9.1 核心改动

| 模块     | 改动内容                                 | 影响范围 |
| -------- | ---------------------------------------- | -------- |
| 类型定义 | 新增 `IterationResult`、`ExecutionFrame` | 低       |
| 执行器   | 引入执行栈，重构循环逻辑                 | **高**   |
| For 节点 | 返回格式调整                             | 中       |
| UI 组件  | 新增分页功能                             | 中       |
| 事件系统 | 新增迭代事件                             | 低       |

### 9.2 实现优先级

1. **P0**（必须实现）：

   - 执行栈和循环逻辑（核心）
   - 迭代结果存储
   - UI 基本分页

2. **P1**（推荐实现）：

   - 迭代事件和实时进度
   - 快速跳转和迭代概览
   - 错误处理策略

3. **P2**（后续优化）：
   - 迭代对比功能
   - 并行执行
   - 结果聚合

### 9.3 预计工作量

- **阶段一**（数据结构）：2 小时
- **阶段二**（执行器重构）：8-12 小时（核心工作）
- **阶段三**（For 节点修改）：1 小时
- **阶段四**（UI 分页）：4-6 小时
- **阶段五**（事件同步）：2-3 小时
- **阶段六**（测试验证）：3-4 小时

**总计**：20-28 小时

---

## 十、参考资料

### 10.1 相关文件

- `packages/node-executor/src/workflowExecutor.ts` - 工作流执行器
- `packages/node-executor/src/nodes/ForNode.ts` - For 循环节点
- `packages/node-executor/src/types.ts` - 类型定义
- `src/components/node-editor/NodeResult.vue` - 节点结果组件
- `src/workflow/execution/useWorkflowExecution.ts` - 执行状态管理

### 10.2 设计模式参考

- **执行栈模式**：用于管理嵌套执行和循环
- **迭代器模式**：用于遍历迭代结果
- **观察者模式**：用于事件通知

---

**文档版本**：v1.0  
**创建日期**：2025-11-01  
**最后更新**：2025-11-01  
**作者**：AI Assistant
