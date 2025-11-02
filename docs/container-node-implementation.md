# 容器节点实现详解

## 一、容器节点概述

### 1.1 什么是容器节点

容器节点是一种特殊的工作流节点，用于包含和组织一组子节点。容器节点的主要作用是：

1. **逻辑分组**：将相关的节点组织在一起
2. **作用域隔离**：为子节点提供独立的执行上下文
3. **循环执行**：作为 For 循环节点的循环体
4. **可复用**：容器内的逻辑可以被多次执行

### 1.2 容器节点在工作流中的位置

```
正常工作流：
节点A → 节点B → 节点C → 节点D

带容器的工作流：
节点A → [容器开始 → 节点B → 节点C → 容器结束] → 节点D

For 循环 + 容器：
For 节点
  ├─ loop 端口 → [容器开始 → 循环体节点 → 容器结束] ──┐
  │                                                      │
  └─ next 端口 ←───────────────────────────────────────┘
       │
       ▼
   后续节点
```

---

## 二、容器节点的数据结构

### 2.1 容器节点的定义

```typescript
interface ContainerNode extends WorkflowNode {
  id: string;
  type?: "container" | "group"; // Vue Flow 的容器类型
  data: {
    variant?: "container";
    isContainer: true; // 标识为容器
    label?: string; // 容器名称

    // 容器配置
    config: {
      /** 容器描述 */
      description?: string;
      /** 容器是否可折叠 */
      collapsible?: boolean;
      /** 容器是否默认折叠 */
      collapsed?: boolean;
    };

    // 端口定义
    inputs: PortDefinition[]; // 左侧端口
    outputs: PortDefinition[]; // 右侧端口

    // 容器样式
    style?: {
      /** 容器背景颜色 */
      backgroundColor?: string;
      /** 容器边框颜色 */
      borderColor?: string;
      /** 容器最小宽度 */
      minWidth?: number;
      /** 容器最小高度 */
      minHeight?: number;
    };
  };

  // Vue Flow 容器节点特有字段
  position: { x: number; y: number };
  width?: number;
  height?: number;
}
```

### 2.2 子节点的定义

容器内的子节点通过 `parentNode` 字段关联到容器：

```typescript
interface ChildNode extends WorkflowNode {
  id: string;
  type?: string;

  // 关键字段：指向父容器的 ID
  parentNode: string;

  data: NodeData;

  // 相对于父容器的位置
  position: { x: number; y: number };
}
```

### 2.3 容器的边（Edges）

容器涉及三种类型的边：

1. **外部到容器**：连接到容器的左侧端口（入口）
2. **容器内部**：子节点之间的连接
3. **容器到外部**：从容器的右侧端口连接出去（出口）

```typescript
// 1. 外部到容器（For 节点的 loop 端口连接到容器）
{
  id: 'edge-for-to-container',
  source: 'for-node-1',
  sourceHandle: 'loop',
  target: 'container-1',
  targetHandle: 'input',
}

// 2. 容器内部（子节点之间）
{
  id: 'edge-child-a-to-b',
  source: 'child-node-a',
  sourceHandle: 'output',
  target: 'child-node-b',
  targetHandle: 'input',
}

// 3. 容器到外部（容器连接到后续节点）
{
  id: 'edge-container-to-next',
  source: 'container-1',
  sourceHandle: 'output',
  target: 'next-node',
  targetHandle: 'input',
}
```

---

## 三、容器节点的执行逻辑

### 3.1 容器的入口和出口

#### 入口节点（Entry Node）

入口节点是容器内第一个被执行的节点，由以下条件确定：

1. 没有 `parentNode` 指向容器的前置节点（容器内没有入边）
2. 或者显式连接到容器的左侧端口

```typescript
/**
 * 获取容器的入口节点
 */
function getContainerEntryNode(
  containerId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string | null {
  // 1. 找到所有属于该容器的子节点
  const childNodes = nodes.filter((node) => node.parentNode === containerId);

  if (childNodes.length === 0) {
    return null;
  }

  // 2. 查找入口边（从容器左侧端口指向子节点）
  const entryEdge = edges.find(
    (edge) => edge.source === containerId && edge.sourceHandle === "input" // 容器的左侧端口
  );

  if (entryEdge) {
    return entryEdge.target;
  }

  // 3. 如果没有显式入口边，找到第一个没有容器内前置节点的子节点
  const childNodeIds = new Set(childNodes.map((n) => n.id));

  for (const childNode of childNodes) {
    const hasIncomingFromSibling = edges.some(
      (edge) => edge.target === childNode.id && childNodeIds.has(edge.source)
    );

    if (!hasIncomingFromSibling) {
      return childNode.id;
    }
  }

  // 4. 如果都有前置节点（循环依赖？），返回第一个子节点
  return childNodes[0]?.id ?? null;
}
```

#### 出口节点（Exit Node）

出口节点是容器内最后一个被执行的节点，由以下条件确定：

1. 没有 `parentNode` 指向容器的后续节点（容器内没有出边）
2. 或者显式连接到容器的右侧端口

```typescript
/**
 * 获取容器的出口节点
 */
function getContainerExitNode(
  containerId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string | null {
  // 1. 找到所有属于该容器的子节点
  const childNodes = nodes.filter((node) => node.parentNode === containerId);

  if (childNodes.length === 0) {
    return null;
  }

  // 2. 查找出口边（从子节点指向容器右侧端口）
  const exitEdge = edges.find(
    (edge) => edge.target === containerId && edge.targetHandle === "output" // 容器的右侧端口
  );

  if (exitEdge) {
    return exitEdge.source;
  }

  // 3. 如果没有显式出口边，找到最后一个没有容器内后续节点的子节点
  const childNodeIds = new Set(childNodes.map((n) => n.id));

  for (const childNode of childNodes) {
    const hasOutgoingToSibling = edges.some(
      (edge) => edge.source === childNode.id && childNodeIds.has(edge.target)
    );

    if (!hasOutgoingToSibling) {
      return childNode.id;
    }
  }

  // 4. 如果都有后续节点（循环依赖？），返回最后一个子节点
  return childNodes[childNodes.length - 1]?.id ?? null;
}
```

### 3.2 容器的执行流程

```typescript
/**
 * 执行容器内的所有节点
 */
async function executeContainer(
  containerId: string,
  context: WorkflowExecutionContext,
  options: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    nodeFactory: (type: string) => BaseNode | undefined;
    nodeResults: Record<string, NodeResult>;
    incomingMap: Map<string, WorkflowEdge[]>;
    outgoingMap: Map<string, WorkflowEdge[]>;
  }
): Promise<{
  containerResults: Record<string, NodeResult>;
  exitNodeId: string | null;
}> {
  const { nodes, edges, nodeFactory, nodeResults, incomingMap, outgoingMap } =
    options;

  // 1. 获取入口节点
  const entryNodeId = getContainerEntryNode(containerId, nodes, edges);
  if (!entryNodeId) {
    throw new Error(`容器 ${containerId} 没有入口节点`);
  }

  // 2. 获取出口节点
  const exitNodeId = getContainerExitNode(containerId, nodes, edges);
  if (!exitNodeId) {
    throw new Error(`容器 ${containerId} 没有出口节点`);
  }

  // 3. 初始化容器执行队列
  const containerQueue: string[] = [entryNodeId];
  const containerVisited = new Set<string>();
  const containerResults: Record<string, NodeResult> = {};

  // 4. 获取容器内所有节点 ID
  const childNodeIds = new Set(
    nodes.filter((n) => n.parentNode === containerId).map((n) => n.id)
  );

  // 5. 执行容器内节点
  while (containerQueue.length > 0) {
    const nodeId = containerQueue.shift()!;

    if (containerVisited.has(nodeId)) {
      continue;
    }
    containerVisited.add(nodeId);

    const currentNode = nodes.find((n) => n.id === nodeId);
    if (!currentNode) {
      continue;
    }

    // 执行节点
    const executor = nodeFactory(deriveNodeType(currentNode));
    if (!executor) {
      throw new Error(`未找到节点执行器: ${deriveNodeType(currentNode)}`);
    }

    // 收集输入（从容器内的前置节点或容器外部）
    const inputs = collectNodeInputs(nodeId, {
      incomingMap,
      nodeResults: { ...nodeResults, ...containerResults },
    });

    const config = { ...currentNode.data.config };

    // 执行节点（注入迭代变量）
    const result = await executor.run(config, inputs, context);

    // 保存结果
    containerResults[nodeId] = result;
    nodeResults[nodeId] = result;

    // 如果是出口节点，停止执行
    if (nodeId === exitNodeId) {
      break;
    }

    // 添加后续节点（仅容器内的节点）
    const nextEdges = outgoingMap.get(nodeId) ?? [];
    nextEdges.forEach((edge) => {
      if (childNodeIds.has(edge.target) && !containerVisited.has(edge.target)) {
        containerQueue.push(edge.target);
      }
    });
  }

  return {
    containerResults,
    exitNodeId,
  };
}
```

---

## 四、For 循环 + 容器的完整执行流程

### 4.1 执行步骤

```typescript
async function executeForNodeWithContainer(
  forNode: WorkflowNode,
  context: WorkflowExecutionContext,
  options: ExecutionOptions
): Promise<NodeResult> {
  // 1. 执行 For 节点，获取迭代数据
  const forConfig = forNode.data.config as ForConfig;
  const forExecutor = nodeFactory("for") as ForNode;

  const forInputs = collectNodeInputs(forNode.id, {
    incomingMap: options.incomingMap,
    nodeResults: options.nodeResults,
  });

  const forResult = await forExecutor.execute(forConfig, forInputs, context);

  const iterations = forResult.iterations as Array<Record<string, any>>;
  const containerId = forConfig.containerId;

  if (!containerId) {
    throw new Error("For 节点未配置容器 ID");
  }

  // 2. 准备迭代结果存储
  const iterationResults: IterationResult[] = [];

  // 3. 循环执行容器
  for (let i = 0; i < iterations.length; i++) {
    const iterationVars = iterations[i];
    const iterationStartTime = Date.now();

    // 发送迭代开始事件
    if (options.emitter) {
      options.emitter.emit(WorkflowEventType.ITERATION_STARTED, {
        executionId: options.executionId,
        forNodeId: forNode.id,
        iterationIndex: i,
        variables: iterationVars,
        timestamp: iterationStartTime,
      });
    }

    try {
      // 创建迭代上下文（注入迭代变量）
      const iterationContext: WorkflowExecutionContext = {
        ...context,
        loopVariables: iterationVars,
      };

      // 执行容器
      const { containerResults, exitNodeId } = await executeContainer(
        containerId,
        iterationContext,
        options
      );

      const iterationEndTime = Date.now();
      const iterationDuration = iterationEndTime - iterationStartTime;

      // 保存迭代结果
      iterationResults.push({
        index: i,
        variables: iterationVars,
        nodeResults: containerResults,
        duration: iterationDuration,
        status: "success",
      });

      // 发送迭代完成事件
      if (options.emitter) {
        options.emitter.emit(WorkflowEventType.ITERATION_COMPLETED, {
          executionId: options.executionId,
          forNodeId: forNode.id,
          iterationIndex: i,
          duration: iterationDuration,
          status: "success",
          timestamp: iterationEndTime,
        });
      }
    } catch (error) {
      const iterationEndTime = Date.now();
      const iterationDuration = iterationEndTime - iterationStartTime;

      // 保存迭代错误
      iterationResults.push({
        index: i,
        variables: iterationVars,
        nodeResults: {},
        duration: iterationDuration,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });

      // 发送迭代错误事件
      if (options.emitter) {
        options.emitter.emit(WorkflowEventType.ITERATION_COMPLETED, {
          executionId: options.executionId,
          forNodeId: forNode.id,
          iterationIndex: i,
          duration: iterationDuration,
          status: "error",
          timestamp: iterationEndTime,
        });
      }

      // 根据错误处理策略决定是否继续
      if (!forConfig.errorHandling?.continueOnError) {
        throw error;
      }
    }
  }

  // 4. 返回 For 节点的最终结果
  const totalDuration = iterationResults.reduce(
    (sum, r) => sum + r.duration,
    0
  );

  return {
    duration: totalDuration,
    status: "success",
    timestamp: Date.now(),
    data: {
      outputs: forResult.outputs,
      raw: forResult.raw,
      summary: `循环执行 ${iterations.length} 次，总耗时 ${totalDuration}ms`,
    },
    // 关键：保存所有迭代结果
    iterations: iterationResults,
  };
}
```

### 4.2 执行流程图

```
┌─────────────────────────────────────────────────────────┐
│ For 节点执行开始                                          │
├─────────────────────────────────────────────────────────┤
│ 1. 解析迭代数据（数组、范围等）                           │
│ 2. 获取容器 ID                                           │
│ 3. 初始化迭代结果数组                                     │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │ 迭代循环开始 (i = 0)           │
        └───────────────┬───────────────┘
                        │
        ┌───────────────▼───────────────┐
        │ 准备迭代变量                   │
        │ { item: ..., index: i }       │
        └───────────────┬───────────────┘
                        │
        ┌───────────────▼───────────────┐
        │ 创建迭代上下文                 │
        │ context.loopVariables = {...} │
        └───────────────┬───────────────┘
                        │
        ┌───────────────▼───────────────┐
        │ 执行容器内所有节点              │
        │   ├─ 入口节点                 │
        │   ├─ 中间节点                 │
        │   └─ 出口节点                 │
        └───────────────┬───────────────┘
                        │
        ┌───────────────▼───────────────┐
        │ 保存本次迭代结果                │
        │ iterationResults[i] = {...}   │
        └───────────────┬───────────────┘
                        │
        ┌───────────────▼───────────────┐
        │ 是否还有下一次迭代？            │
        └───────┬───────────────┬───────┘
                │ 是            │ 否
        ┌───────▼───────┐       │
        │ i++           │       │
        │ 继续循环       │       │
        └───────┬───────┘       │
                │               │
                └───────┬───────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │ For 节点执行结束                │
        │ 返回结果（包含所有迭代结果）      │
        └───────────────┬───────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │ 继续执行 For 节点的右侧端口      │
        └───────────────────────────────┘
```

---

## 五、容器节点的 UI 实现

### 5.1 容器节点组件

```vue
<!-- ContainerNode.vue -->
<template>
  <div
    :id="node.id"
    class="container-node"
    :class="[
      isHighlighted && 'highlighted',
      data.highlightType === 'warning' && 'highlight-warning',
    ]"
    :style="containerStyle"
  >
    <!-- 容器头部 -->
    <div class="container-header">
      <div class="container-title">
        {{ data.label || "容器" }}
      </div>
      <div class="container-actions">
        <button
          v-if="data.config.collapsible"
          @click="toggleCollapse"
          class="collapse-btn"
        >
          {{ isCollapsed ? "展开" : "收起" }}
        </button>
      </div>
    </div>

    <!-- 左侧端口（入口） -->
    <Handle
      id="input"
      type="target"
      :position="Position.Left"
      class="container-port container-port-input"
    />

    <!-- 容器内容区域 -->
    <div v-if="!isCollapsed" class="container-content">
      <!-- 子节点由 Vue Flow 自动渲染在这里 -->
      <slot />
    </div>

    <!-- 右侧端口（出口） -->
    <Handle
      id="output"
      type="source"
      :position="Position.Right"
      class="container-port container-port-output"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Handle, Position } from "@vue-flow/core";
import type { WorkflowNode } from "@/typings/nodeEditor";

interface Props {
  node: WorkflowNode;
}

const props = defineProps<Props>();

const data = computed(() => props.node.data);
const isHighlighted = computed(() => data.value.isHighlighted);
const isCollapsed = ref(data.value.config?.collapsed || false);

const containerStyle = computed(() => ({
  backgroundColor: data.value.style?.backgroundColor || "#f8fafc",
  borderColor: data.value.style?.borderColor || "#cbd5e1",
  minWidth: `${data.value.style?.minWidth || 400}px`,
  minHeight: `${data.value.style?.minHeight || 300}px`,
}));

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}
</script>

<style scoped>
.container-node {
  position: relative;
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  background: var(--bg-color);
  padding: 12px;
  transition: all 0.2s;
}

.container-node.highlighted {
  border-color: #3b82f6;
  background-color: rgba(59, 130, 246, 0.05);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.container-node.highlight-warning {
  border-color: #f59e0b;
  background-color: rgba(245, 158, 11, 0.05);
}

.container-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.container-title {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.container-content {
  min-height: 200px;
  padding: 8px;
}

.container-port {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #cbd5e1;
  border: 2px solid #fff;
}

.container-port-input {
  left: -6px;
}

.container-port-output {
  right: -6px;
}

.collapse-btn {
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.collapse-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}
</style>
```

### 5.2 容器拖拽高亮

当拖拽节点到容器上方时，高亮显示容器：

```typescript
// 在节点编辑器中监听拖拽事件
import { useVueFlow } from "@vue-flow/core";

const { getIntersectingNodes, updateNode } = useVueFlow();

function onNodeDrag(event: { node: Node }) {
  const draggedNode = event.node;

  // 查找与拖拽节点相交的容器节点
  const intersectingNodes = getIntersectingNodes(draggedNode).filter(
    (node) => node.data?.isContainer
  );

  // 清除所有容器的高亮
  nodes.value.forEach((node) => {
    if (node.data?.isContainer) {
      updateNode(node.id, {
        data: {
          ...node.data,
          isHighlighted: false,
        },
      });
    }
  });

  // 高亮相交的容器
  if (intersectingNodes.length > 0) {
    const targetContainer = intersectingNodes[0];
    updateNode(targetContainer.id, {
      data: {
        ...targetContainer.data,
        isHighlighted: true,
        highlightType: "normal",
      },
    });
  }
}

function onNodeDragStop(event: { node: Node }) {
  const draggedNode = event.node;

  // 查找最终停放位置的容器
  const intersectingNodes = getIntersectingNodes(draggedNode).filter(
    (node) => node.data?.isContainer
  );

  if (intersectingNodes.length > 0) {
    const targetContainer = intersectingNodes[0];

    // 将节点添加到容器
    updateNode(draggedNode.id, {
      parentNode: targetContainer.id,
      position: {
        x: draggedNode.position.x - targetContainer.position.x,
        y: draggedNode.position.y - targetContainer.position.y,
      },
    });
  }

  // 清除所有高亮
  nodes.value.forEach((node) => {
    if (node.data?.isContainer) {
      updateNode(node.id, {
        data: {
          ...node.data,
          isHighlighted: false,
        },
      });
    }
  });
}
```

---

## 六、技术难点和解决方案

### 6.1 难点一：容器内节点的相对定位

**问题**：子节点的位置是相对于容器的，拖拽时需要转换坐标系。

**解决方案**：

```typescript
// 拖入容器时：转换为相对坐标
function addNodeToContainer(
  nodeId: string,
  containerId: string,
  absolutePosition: { x: number; y: number }
) {
  const container = nodes.value.find((n) => n.id === containerId);
  if (!container) return;

  const relativePosition = {
    x: absolutePosition.x - container.position.x,
    y: absolutePosition.y - container.position.y,
  };

  updateNode(nodeId, {
    parentNode: containerId,
    position: relativePosition,
  });
}

// 拖出容器时：转换为绝对坐标
function removeNodeFromContainer(nodeId: string) {
  const node = nodes.value.find((n) => n.id === nodeId);
  if (!node || !node.parentNode) return;

  const container = nodes.value.find((n) => n.id === node.parentNode);
  if (!container) return;

  const absolutePosition = {
    x: container.position.x + node.position.x,
    y: container.position.y + node.position.y,
  };

  updateNode(nodeId, {
    parentNode: undefined,
    position: absolutePosition,
  });
}
```

### 6.2 难点二：容器边界的正确识别

**问题**：如何准确识别容器的入口节点和出口节点？

**解决方案**：

1. **显式端口连接**（推荐）：

   - 容器提供虚拟的 "内部入口节点" 和 "内部出口节点"
   - 用户必须显式连接容器左侧端口 → 入口节点 → ... → 出口节点 → 容器右侧端口

2. **自动推断**（备用）：
   - 入口节点：容器内没有来自同容器其他节点的入边
   - 出口节点：容器内没有指向同容器其他节点的出边

### 6.3 难点三：迭代变量的注入和隔离

**问题**：如何将迭代变量（如 `item`、`index`）注入到容器内节点的执行上下文，同时不影响其他节点？

**解决方案**：

```typescript
// 在执行容器内节点时，合并迭代变量到上下文
async function executeNodeInContainer(
  node: WorkflowNode,
  baseContext: WorkflowExecutionContext,
  iterationVars: Record<string, any>
): Promise<NodeResult> {
  // 创建新的上下文对象，不修改原始上下文
  const nodeContext: WorkflowExecutionContext = {
    ...baseContext,
    loopVariables: iterationVars,
  };

  // 执行节点
  const executor = nodeFactory(deriveNodeType(node));
  const result = await executor.run(node.data.config, inputs, nodeContext);

  return result;
}
```

在节点内部访问迭代变量：

```typescript
// 节点的 execute 方法
async execute(
  config: any,
  inputs: Record<string, any>,
  context: WorkflowExecutionContext
): Promise<any> {
  // 访问迭代变量
  const loopVars = context.loopVariables;

  if (loopVars) {
    console.log('当前迭代项:', loopVars.item);
    console.log('当前迭代索引:', loopVars.index);
  }

  // ... 节点逻辑
}
```

### 6.4 难点四：容器结果的收集和展示

**问题**：每次迭代都会产生大量的节点结果，如何高效存储和展示？

**解决方案**：

1. **分层存储**：

   - For 节点的 `iterations` 数组存储所有迭代
   - 每个迭代对象包含 `nodeResults`，存储容器内节点的结果

2. **按需加载**：

   - UI 只展示当前页的迭代结果
   - 不在内存中展开所有迭代的数据

3. **结果压缩**：
   - 对于大型结果，只存储摘要
   - 提供"查看完整结果"的按钮

---

## 七、测试用例

### 7.1 基本功能测试

```typescript
describe("容器节点执行", () => {
  test("应正确识别容器的入口节点", () => {
    const nodes = [
      { id: "container-1", data: { isContainer: true } },
      { id: "node-a", parentNode: "container-1" },
      { id: "node-b", parentNode: "container-1" },
    ];

    const edges = [{ source: "node-a", target: "node-b" }];

    const entryNode = getContainerEntryNode("container-1", nodes, edges);
    expect(entryNode).toBe("node-a");
  });

  test("应正确识别容器的出口节点", () => {
    const nodes = [
      { id: "container-1", data: { isContainer: true } },
      { id: "node-a", parentNode: "container-1" },
      { id: "node-b", parentNode: "container-1" },
    ];

    const edges = [{ source: "node-a", target: "node-b" }];

    const exitNode = getContainerExitNode("container-1", nodes, edges);
    expect(exitNode).toBe("node-b");
  });

  test("应正确执行容器内的所有节点", async () => {
    // ... 测试代码
  });
});
```

### 7.2 For 循环 + 容器测试

```typescript
describe("For 循环 + 容器", () => {
  test("应正确执行 3 次迭代", async () => {
    const forNode = {
      id: "for-1",
      data: {
        variant: "for",
        config: {
          mode: "static",
          staticItems: ["a", "b", "c"],
          itemName: "item",
          indexName: "index",
          containerId: "container-1",
        },
      },
    };

    const result = await executeForNodeWithContainer(forNode, context, options);

    expect(result.iterations).toHaveLength(3);
    expect(result.iterations[0].variables).toEqual({ item: "a", index: 0 });
    expect(result.iterations[1].variables).toEqual({ item: "b", index: 1 });
    expect(result.iterations[2].variables).toEqual({ item: "c", index: 2 });
  });

  test("应将迭代变量正确注入到容器内节点", async () => {
    // ... 测试代码
  });

  test("应收集每次迭代中所有节点的结果", async () => {
    // ... 测试代码
  });
});
```

---

## 八、最佳实践

### 8.1 容器设计原则

1. **保持容器简单**：一个容器只完成一个逻辑任务
2. **明确入口和出口**：始终显式连接入口和出口节点
3. **避免副作用**：容器内的节点不应修改全局状态
4. **命名清晰**：容器名称应清楚描述其功能

### 8.2 For 循环使用建议

1. **限制迭代次数**：避免过多的迭代（如超过 1000 次）
2. **异步控制**：对于耗时操作，考虑添加延迟或分批执行
3. **错误处理**：配置合理的错误处理策略
4. **结果清理**：及时清理不需要的迭代结果

### 8.3 性能优化建议

1. **避免深层嵌套**：嵌套容器层级不应超过 3 层
2. **减少节点数量**：容器内节点数量控制在 10 个以内
3. **结果压缩**：对于大型结果，只保存必要的数据
4. **懒加载**：迭代结果按需加载，不全部加载到内存

---

**文档版本**：v1.0  
**创建日期**：2025-11-01  
**最后更新**：2025-11-01
