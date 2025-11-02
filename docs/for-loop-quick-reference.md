# For 循环执行 - 快速参考指南

> 这是一个快速参考指南，用于开发 For 循环和容器节点功能。详细说明请参考：
>
> - [For 循环执行逻辑修复方案](./for-loop-execution-fix.md)
> - [容器节点实现详解](./container-node-implementation.md)

---

## 一、核心概念速查

### 执行流程

```
For 节点 → 解析迭代数据 → 循环开始
                            ↓
                    ┌───────────────┐
                    │  迭代 1        │
                    │  ├─ 注入变量   │
                    │  ├─ 执行容器   │
                    │  └─ 保存结果   │
                    └───────┬───────┘
                            ↓
                    ┌───────────────┐
                    │  迭代 2        │
                    │  ├─ 注入变量   │
                    │  ├─ 执行容器   │
                    │  └─ 保存结果   │
                    └───────┬───────┘
                            ↓
                          ...
                            ↓
                    循环结束 → 从 For 节点右侧端口继续
```

### 关键数据结构

```typescript
// 1. 迭代结果
interface IterationResult {
  index: number;
  variables: Record<string, any>;
  nodeResults: Record<string, NodeResult>;
  duration: number;
  status: "success" | "error";
  error?: string;
}

// 2. NodeResult 扩展
interface NodeResult {
  // ... 原有字段
  iterations?: IterationResult[]; // For 节点独有
}

// 3. 执行上下文
interface WorkflowExecutionContext {
  loopVariables?: Record<string, any>; // 迭代变量
  // ... 其他字段
}
```

---

## 二、关键函数速查

### 容器入口和出口

```typescript
// 获取容器入口节点
function getContainerEntryNode(
  containerId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string | null {
  // 找到容器内第一个节点
}

// 获取容器出口节点
function getContainerExitNode(
  containerId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string | null {
  // 找到容器内最后一个节点
}
```

### 容器执行

```typescript
// 执行容器内所有节点（单次迭代）
async function executeContainer(
  containerId: string,
  context: WorkflowExecutionContext,
  options: ExecutionOptions
): Promise<{
  containerResults: Record<string, NodeResult>;
  exitNodeId: string | null;
}> {
  // 1. 获取入口和出口节点
  // 2. 初始化队列
  // 3. 依次执行容器内节点
  // 4. 返回结果
}
```

### For 节点 + 容器执行

```typescript
async function executeForNodeWithContainer(
  forNode: WorkflowNode,
  context: WorkflowExecutionContext,
  options: ExecutionOptions
): Promise<NodeResult> {
  // 1. 执行 For 节点，获取迭代数据
  const iterations = await getIterations(forNode);

  // 2. 循环执行容器
  for (let i = 0; i < iterations.length; i++) {
    const iterationVars = iterations[i];

    // 3. 创建迭代上下文（注入变量）
    const iterationContext = {
      ...context,
      loopVariables: iterationVars,
    };

    // 4. 执行容器
    const { containerResults } = await executeContainer(
      containerId,
      iterationContext,
      options
    );

    // 5. 保存迭代结果
    iterationResults.push({
      index: i,
      variables: iterationVars,
      nodeResults: containerResults,
      // ...
    });
  }

  // 6. 返回 For 节点结果（包含 iterations）
  return {
    // ...
    iterations: iterationResults,
  };
}
```

---

## 三、实现检查清单

### 阶段一：数据结构（2h）

- [ ] 添加 `IterationResult` 接口到 `types.ts`
- [ ] 修改 `NodeResult`，添加 `iterations?: IterationResult[]`
- [ ] 修改 `WorkflowExecutionContext`，添加 `loopVariables?: Record<string, any>`
- [ ] 添加 `ExecutionFrame` 接口（可选，用于执行栈）

**验证**：编译通过，无类型错误

---

### 阶段二：容器识别（3h）

- [ ] 实现 `getContainerEntryNode()` 函数
- [ ] 实现 `getContainerExitNode()` 函数
- [ ] 实现 `isContainerNode()` 判断函数
- [ ] 添加单元测试

**验证**：能正确识别容器的入口和出口节点

---

### 阶段三：容器执行（5h）

- [ ] 实现 `executeContainer()` 函数
- [ ] 支持迭代变量注入
- [ ] 收集容器内节点结果
- [ ] 处理容器执行错误

**验证**：单次执行容器，所有节点按顺序执行

---

### 阶段四：For 节点执行重构（8h）

- [ ] 修改 `workflowExecutor.ts`
- [ ] 检测 For 节点 + 容器模式
- [ ] 实现循环迭代逻辑
- [ ] 保存每次迭代结果到 `iterations` 数组
- [ ] 确保循环结束后从 For 节点右侧端口继续

**验证**：执行包含 For 循环的工作流，验证：

- 迭代次数正确
- 每次迭代的变量正确
- 每次迭代的结果独立保存
- 循环结束后继续执行后续节点

---

### 阶段五：UI 分页实现（6h）

- [ ] 修改 `NodeResult.vue`
- [ ] 检测 `result.iterations` 是否存在
- [ ] 实现分页器组件
- [ ] 显示当前迭代的变量
- [ ] 显示当前迭代的节点结果
- [ ] 实现快速跳转功能
- [ ] 实现迭代状态概览（可选）

**验证**：

- 分页器功能正常
- 迭代数据显示正确
- 可以切换不同页面

---

### 阶段六：事件和状态同步（3h）

- [ ] 添加循环相关事件类型
  - `LOOP_STARTED`
  - `ITERATION_STARTED`
  - `ITERATION_COMPLETED`
  - `LOOP_COMPLETED`
- [ ] 在执行器中发射事件
- [ ] 在 `useWorkflowExecution` 中处理事件
- [ ] 在 UI 中实时显示进度

**验证**：控制台能看到迭代进度日志

---

### 阶段七：测试（4h）

- [ ] 简单循环测试（3 次迭代，1 个节点）
- [ ] 复杂循环测试（10 次迭代，5 个节点）
- [ ] 错误处理测试（某次迭代失败）
- [ ] 变量注入测试（验证迭代变量正确传递）
- [ ] UI 分页测试（切换页面，查看结果）

**验证**：所有测试用例通过

---

## 四、代码模板

### 1. 容器入口/出口节点识别

```typescript
// packages/node-executor/src/workflowExecutor.ts

function getContainerEntryNode(
  containerId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string | null {
  const childNodes = nodes.filter((n) => n.parentNode === containerId);
  if (childNodes.length === 0) return null;

  // 方法1：查找显式连接到容器 input 端口的节点
  const entryEdge = edges.find(
    (e) => e.source === containerId && e.sourceHandle === "input"
  );
  if (entryEdge) return entryEdge.target;

  // 方法2：查找没有容器内前置节点的节点
  const childIds = new Set(childNodes.map((n) => n.id));
  for (const child of childNodes) {
    const hasIncoming = edges.some(
      (e) => e.target === child.id && childIds.has(e.source)
    );
    if (!hasIncoming) return child.id;
  }

  return childNodes[0]?.id ?? null;
}

function getContainerExitNode(
  containerId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string | null {
  const childNodes = nodes.filter((n) => n.parentNode === containerId);
  if (childNodes.length === 0) return null;

  // 方法1：查找显式连接到容器 output 端口的节点
  const exitEdge = edges.find(
    (e) => e.target === containerId && e.targetHandle === "output"
  );
  if (exitEdge) return exitEdge.source;

  // 方法2：查找没有容器内后续节点的节点
  const childIds = new Set(childNodes.map((n) => n.id));
  for (const child of childNodes) {
    const hasOutgoing = edges.some(
      (e) => e.source === child.id && childIds.has(e.target)
    );
    if (!hasOutgoing) return child.id;
  }

  return childNodes[childNodes.length - 1]?.id ?? null;
}
```

### 2. 容器执行函数

```typescript
// packages/node-executor/src/workflowExecutor.ts

async function executeContainer(
  containerId: string,
  context: WorkflowExecutionContext,
  nodeMap: Map<string, WorkflowNode>,
  outgoingMap: Map<string, WorkflowEdge[]>,
  incomingMap: Map<string, WorkflowEdge[]>,
  nodeResults: Record<string, NodeResult>,
  nodeFactory: (type: string) => BaseNode | undefined
): Promise<{
  containerResults: Record<string, NodeResult>;
  exitNodeId: string | null;
}> {
  const nodes = Array.from(nodeMap.values());
  const edges = [
    ...Array.from(outgoingMap.values()).flat(),
    ...Array.from(incomingMap.values()).flat(),
  ];

  const entryNodeId = getContainerEntryNode(containerId, nodes, edges);
  const exitNodeId = getContainerExitNode(containerId, nodes, edges);

  if (!entryNodeId || !exitNodeId) {
    throw new Error(`容器 ${containerId} 缺少入口或出口节点`);
  }

  const containerQueue: string[] = [entryNodeId];
  const containerVisited = new Set<string>();
  const containerResults: Record<string, NodeResult> = {};
  const childIds = new Set(
    nodes.filter((n) => n.parentNode === containerId).map((n) => n.id)
  );

  while (containerQueue.length > 0) {
    const nodeId = containerQueue.shift()!;

    if (containerVisited.has(nodeId)) continue;
    containerVisited.add(nodeId);

    const currentNode = nodeMap.get(nodeId);
    if (!currentNode) continue;

    const executor = nodeFactory(deriveNodeType(currentNode));
    if (!executor) {
      throw new Error(`未找到节点执行器: ${deriveNodeType(currentNode)}`);
    }

    const inputs = collectNodeInputs(nodeId, {
      incomingMap,
      nodeResults: { ...nodeResults, ...containerResults },
    });

    const result = await executor.run(currentNode.data.config, inputs, context);

    containerResults[nodeId] = result;
    nodeResults[nodeId] = result;

    if (nodeId === exitNodeId) break;

    const nextEdges = outgoingMap.get(nodeId) ?? [];
    nextEdges.forEach((edge) => {
      if (childIds.has(edge.target) && !containerVisited.has(edge.target)) {
        containerQueue.push(edge.target);
      }
    });
  }

  return { containerResults, exitNodeId };
}
```

### 3. For 节点执行（在 workflowExecutor 中）

```typescript
// packages/node-executor/src/workflowExecutor.ts

// 在 executeWorkflow 函数中，检测 For 节点
if (deriveNodeType(currentNode) === "for") {
  const forConfig = currentNode.data.config as ForConfig;

  // 检查是否配置了容器
  if (!forConfig.containerId) {
    throw new Error("For 节点未配置容器 ID");
  }

  // 执行 For 节点本身，获取迭代数据
  const forResult = await executor.run(config, inputs, context);
  const iterations = forResult.data?.raw?.iterations as Array<
    Record<string, any>
  >;

  // 准备迭代结果存储
  const iterationResults: IterationResult[] = [];

  // 循环执行容器
  for (let i = 0; i < iterations.length; i++) {
    const iterationVars = iterations[i];
    const iterationStartTime = Date.now();

    try {
      // 创建迭代上下文
      const iterationContext: WorkflowExecutionContext = {
        ...context,
        loopVariables: iterationVars,
      };

      // 执行容器
      const { containerResults } = await executeContainer(
        forConfig.containerId,
        iterationContext,
        nodeMap,
        outgoingMap,
        incomingMap,
        nodeResults,
        nodeFactory
      );

      const iterationDuration = Date.now() - iterationStartTime;

      // 保存迭代结果
      iterationResults.push({
        index: i,
        variables: iterationVars,
        nodeResults: containerResults,
        duration: iterationDuration,
        status: "success",
      });
    } catch (error) {
      const iterationDuration = Date.now() - iterationStartTime;

      iterationResults.push({
        index: i,
        variables: iterationVars,
        nodeResults: {},
        duration: iterationDuration,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });

      // 根据配置决定是否继续
      if (!forConfig.errorHandling?.continueOnError) {
        throw error;
      }
    }
  }

  // 保存 For 节点结果（包含迭代结果）
  nodeResults[currentNode.id] = {
    ...forResult,
    iterations: iterationResults,
  };

  // 继续执行 For 节点的右侧端口（next）
  const nextEdges = outgoingMap.get(currentNode.id) ?? [];
  const nextEdge = nextEdges.find((e) => e.sourceHandle === "next");
  if (nextEdge) {
    queue.push(nextEdge.target);
  }

  continue; // 跳过正常的后续节点处理
}
```

### 4. UI 分页组件

```vue
<!-- src/components/node-editor/NodeResult.vue -->

<template>
  <!-- 普通节点结果 -->
  <div v-if="!hasIterations">
    <!-- 原有的结果展示 -->
  </div>

  <!-- For 循环节点结果 -->
  <div v-else class="loop-result">
    <div class="loop-summary">循环执行: 共 {{ totalIterations }} 次迭代</div>

    <!-- 分页器 -->
    <div class="iteration-pagination">
      <button :disabled="currentPage === 0" @click="currentPage--">◀</button>
      <span>第 {{ currentPage + 1 }} / {{ totalIterations }} 次</span>
      <button
        :disabled="currentPage === totalIterations - 1"
        @click="currentPage++"
      >
        ▶
      </button>
    </div>

    <!-- 当前迭代内容 -->
    <div v-if="currentIteration" class="iteration-content">
      <!-- 变量 -->
      <div class="iteration-variables">
        <div class="label">迭代变量:</div>
        <div v-for="(value, key) in currentIteration.variables" :key="key">
          {{ key }}: <JsonViewer :data="value" />
        </div>
      </div>

      <!-- 容器节点结果 -->
      <div class="container-results">
        <div class="label">容器节点执行结果:</div>
        <div
          v-for="(result, nodeId) in currentIteration.nodeResults"
          :key="nodeId"
        >
          <span>{{ nodeId }}</span>
          <span :class="result.status">{{ result.status }}</span>
          <span>({{ result.duration }}ms)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{
  result?: NodeResult;
}>();

const hasIterations = computed(() => {
  return props.result?.iterations && props.result.iterations.length > 0;
});

const totalIterations = computed(() => {
  return props.result?.iterations?.length ?? 0;
});

const currentPage = ref(0);

const currentIteration = computed(() => {
  if (!props.result?.iterations) return null;
  return props.result.iterations[currentPage.value];
});
</script>
```

---

## 五、常见问题

### Q1: 如何判断一个节点是否属于容器？

```typescript
function isNodeInContainer(node: WorkflowNode): boolean {
  return !!node.parentNode;
}

function getContainerNodes(
  containerId: string,
  allNodes: WorkflowNode[]
): WorkflowNode[] {
  return allNodes.filter((n) => n.parentNode === containerId);
}
```

### Q2: 如何在容器内访问迭代变量？

```typescript
// 在节点的 execute 方法中
async execute(
  config: any,
  inputs: Record<string, any>,
  context: WorkflowExecutionContext
): Promise<any> {
  const loopVars = context.loopVariables;

  if (loopVars) {
    console.log('当前项:', loopVars.item);
    console.log('当前索引:', loopVars.index);
  }
}
```

### Q3: 如何处理容器内节点的错误？

```typescript
// 在 ForConfig 中添加错误处理配置
interface ForConfig {
  // ...
  errorHandling?: {
    continueOnError: boolean; // 是否继续后续迭代
    maxErrors?: number; // 最大失败次数
  };
}

// 在循环中处理错误
try {
  await executeContainer(/* ... */);
} catch (error) {
  // 记录错误
  iterationResults.push({
    index: i,
    status: "error",
    error: error.message,
    // ...
  });

  // 决定是否继续
  if (!forConfig.errorHandling?.continueOnError) {
    throw error; // 停止循环
  }
  // 否则继续下一次迭代
}
```

### Q4: 如何优化大量迭代的性能？

1. **限制保存的结果数量**：

```typescript
const MAX_SAVED_ITERATIONS = 100;

if (iterationResults.length >= MAX_SAVED_ITERATIONS) {
  // 只保存摘要
  iterationResults.push({
    index: i,
    variables: iterationVars,
    nodeResults: {}, // 不保存详细结果
    summary: "结果已省略",
    // ...
  });
}
```

2. **分批执行**：

```typescript
const BATCH_SIZE = 10;

for (let i = 0; i < iterations.length; i += BATCH_SIZE) {
  const batch = iterations.slice(i, i + BATCH_SIZE);
  await Promise.all(
    batch.map(async (vars, index) => {
      // 并行执行一批
    })
  );
}
```

---

## 六、调试技巧

### 1. 打印执行流程

```typescript
console.log(`[For] 开始执行，迭代次数: ${iterations.length}`);

for (let i = 0; i < iterations.length; i++) {
  console.log(`[For] 迭代 ${i + 1}/${iterations.length}`);
  console.log(`[For] 变量:`, iterations[i]);

  const { containerResults } = await executeContainer(/* ... */);

  console.log(
    `[For] 迭代 ${i + 1} 完成，执行了 ${
      Object.keys(containerResults).length
    } 个节点`
  );
}

console.log(`[For] 循环结束`);
```

### 2. 验证容器边界

```typescript
const entryNode = getContainerEntryNode(containerId, nodes, edges);
const exitNode = getContainerExitNode(containerId, nodes, edges);

console.log(`[Container] 入口节点: ${entryNode}`);
console.log(`[Container] 出口节点: ${exitNode}`);
```

### 3. 检查迭代变量注入

```typescript
// 在节点 execute 方法中
console.log("[Node] 执行上下文:", context);
console.log("[Node] 迭代变量:", context.loopVariables);
```

---

## 七、提交前检查

- [ ] 所有类型定义正确，无 TypeScript 错误
- [ ] 容器入口/出口节点识别功能正常
- [ ] 容器内节点按正确顺序执行
- [ ] For 循环正确执行指定次数
- [ ] 迭代变量正确注入到容器内节点
- [ ] 每次迭代的结果独立保存
- [ ] 循环结束后从 For 节点右侧端口继续执行
- [ ] UI 分页功能正常，能切换不同迭代
- [ ] 错误处理正确（失败时的行为符合预期）
- [ ] 添加了必要的注释和文档
- [ ] 通过所有单元测试

---

**最后更新**：2025-11-01
