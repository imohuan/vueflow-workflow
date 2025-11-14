# 节点开发完整指南

本指南详细说明如何在 VueFlow 工作流系统中开发一个新的节点。

## 概述

节点开发分为 **必需部分** 和 **三种可选方案**（可叠加选择）：

### 必需部分

- **后端节点实现** - 在 `packages/flow-nodes/src/nodes/` 中创建节点类

### 三种可选方案（可叠加）

| 方案 | 说明 | 涉及文件 |
|------|------|--------|
| **方案 A** | 自定义节点显示样式 | `src/v2/features/vueflow/components/nodes/` + `VueFlowCanvas.vue` |
| **方案 B** | 自定义节点配置编辑 UI | `src/v2/features/canvas/components/node-editor/editors/` + `NodeConfigTab.vue` |
| **方案 A + B** | 同时自定义显示和编辑 UI | 上述所有文件 |

**说明**：
- 如果不选择任何方案，节点将使用系统默认的 `StandardNode` 显示和 `DefaultNodeEditor` 配置
- 三种方案可以独立选择或组合使用
- 后端节点实现是所有方案的基础

---

## 第一步：后端节点实现

### 1.1 创建节点类

在 `packages/flow-nodes/src/nodes/` 目录下创建节点文件，例如 `VariableAggregateNode.ts`：

```typescript
export class VariableAggregateNode extends BaseFlowNode {
  readonly type = "variableAggregate";      // 节点类型标识（唯一）
  readonly label = "变量聚合";               // 显示名称
  readonly description = "...";              // 节点描述
  readonly category = "数据处理";            // 节点分类

  protected defineInputs(): PortConfig[] {
    // 定义输入参数
    // name: "data" - 参数名称（必须与前端 emitUpdate 中的名称一致）
    // type: "any" - 数据类型
    // required: true - 是否必填
  }

  protected defineOutputs(): PortConfig[] {
    // 定义输出参数
    // name: "aggregated" - 输出名称
  }

  protected getStyleConfig(): NodeStyleConfig {
    // 返回节点样式配置（可选）
    // headerColor, icon, showIcon 等
  }

  async execute(inputs, context): Promise<NodeExecutionResult> {
    // 核心执行逻辑
    const data = this.getInput(inputs, "data", []);
    
    // 验证输入
    if (!Array.isArray(data)) {
      return this.createError("输入数据必须是数组类型");
    }

    // 处理数据...
    const result = { /* 处理结果 */ };

    // 返回结果
    return this.createOutput({ aggregated: result });
  }
}
```

### 1.2 关键要点

- **`type` 字段**：节点的唯一标识，必须与前端注册的名称一致
- **`defineInputs()`**：定义节点的输入参数，参数名称必须与前端编辑器发送的参数名称一致
- **`defineOutputs()`**：定义节点的输出结果
- **`execute()`**：节点的执行逻辑，返回 `NodeExecutionResult`

---

## 第二步：选择前端实现方案

根据需要选择以下方案：

### 方案 A：自定义节点显示样式

如果需要自定义节点在画布上的显示样式，选择此方案。

#### A.1 创建节点组件

在 `src/v2/features/vueflow/components/nodes/` 中创建节点组件：

```vue
<template>
  <div class="node-container">
    <!-- 节点头部 -->
    <div class="node-header">
      <span class="icon">📦</span>
      <span class="label">节点名称</span>
    </div>
    <!-- 节点内容 -->
    <div class="node-body">
      <!-- 自定义内容 -->
    </div>
  </div>
</template>

<script setup lang="ts">
// 节点组件逻辑
</script>

<style scoped>
/* 节点样式 */
</style>
```

#### A.2 在 `nodes/index.ts` 中导出

```typescript
export { default as VariableAggregateNode } from "./VariableAggregateNode.vue";
```

#### A.3 在 `VueFlowCanvas.vue` 中注册

**步骤 1**：导入节点组件

```typescript
import VariableAggregateNode from "./nodes/VariableAggregateNode.vue";
```

**步骤 2**：在 `nodeTypes` 中注册

```typescript
const nodeTypes = {
  variableAggregate: () => VariableAggregateNode,
};
```

**步骤 3**：在模板中添加节点插槽绑定

```vue
<VueFlow>
  <template #node-variableAggregate="nodeProps">
    <VariableAggregateNode v-bind="nodeProps" />
  </template>
</VueFlow>
```

---

### 方案 B：自定义节点配置编辑 UI

如果需要自定义节点参数的编辑界面，选择此方案。

#### B.1 创建自定义编辑器组件

在 `src/v2/features/canvas/components/node-editor/editors/` 中创建自定义编辑器组件，例如 `VariableAggregateNodeEditor.vue`：

```vue
<template>
  <div class="editor-container">
    <!-- 分组列表 -->
    <div v-for="(group, idx) in groups" :key="idx" class="group-item">
      <!-- 分组头部 -->
      <div class="group-header">
        <span>{{ group.name }}</span>
        <button @click="removeGroup(idx)">删除</button>
      </div>

      <!-- 分组内容 -->
      <div class="group-content">
        <div v-for="(item, itemIdx) in group.children" :key="itemIdx" class="item-row">
          <input v-model="group.children[itemIdx]" />
          <button v-if="!isLastEmptyItem(idx, itemIdx)" @click="removeGroupItem(idx, itemIdx)">
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 添加分组按钮 -->
    <button @click="addGroup">新增分组</button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { Node } from "@vue-flow/core";
import type { NodeConfigData } from "../types";

interface Group {
  name: string;
  children: string[];
}

interface Props {
  selectedNode: Node;
  nodeConfig: NodeConfigData;
}

const props = defineProps<Props>();
const emit = defineEmits<{ "update:params": [params: Record<string, any>] }>();

const groups = ref<Group[]>([]);

// 初始化分组数据
function initializeGroups() {
  const params = props.nodeConfig.params || {};
  const groupsData = params.data || [];  // 参数名称必须与后端一致

  if (Array.isArray(groupsData) && groupsData.length > 0) {
    groups.value = groupsData.map((g: any) => ({
      name: g.name || "",
      children: Array.isArray(g.children) ? [...g.children] : [],
    }));
  } else {
    // 初始化默认分组
    groups.value = [
      { name: "Group1", children: [""] },
      { name: "Group2", children: [""] },
    ];
  }
}

watch(() => props.nodeConfig, initializeGroups, { deep: true });
initializeGroups();

function addGroup() {
  groups.value.push({
    name: `Group${groups.value.length + 1}`,
    children: [""],
  });
  emitUpdate();
}

function removeGroup(idx: number) {
  groups.value.splice(idx, 1);
  emitUpdate();
}

function updateGroupItem(groupIdx: number, itemIdx: number, value: string) {
  groups.value[groupIdx].children[itemIdx] = value;
  
  // 自动添加新行（如果最后一项有数据）
  if (itemIdx === groups.value[groupIdx].children.length - 1 && value.trim() !== "") {
    groups.value[groupIdx].children.push("");
  }
  
  emitUpdate();
}

function removeGroupItem(groupIdx: number, itemIdx: number) {
  groups.value[groupIdx].children.splice(itemIdx, 1);
  emitUpdate();
}

function isLastEmptyItem(groupIdx: number, itemIdx: number): boolean {
  const children = groups.value[groupIdx]?.children || [];
  return itemIdx === children.length - 1 && children[itemIdx]?.trim() === "";
}

// 发送更新事件（参数名称必须与后端一致）
function emitUpdate() {
  const data = groups.value.map((group) => ({
    name: group.name,
    children: group.children,
  }));

  emit("update:params", { data });
}
</script>
```

#### B.2 关键要点

- **参数名称一致性**：`emitUpdate()` 中发送的参数名称必须与后端 `defineInputs()` 中的 `name` 一致
- **数据格式**：发送的数据格式必须与后端期望的格式相同
- **初始化**：从 `nodeConfig.params` 中读取已保存的参数

#### B.3 在 `NodeConfigTab.vue` 中注册编辑器

**步骤 1**：导入编辑器组件

```typescript
import VariableAggregateNodeEditor from "./editors/VariableAggregateNodeEditor.vue";
```

**步骤 2**：在模板中添加条件判断

```vue
<VariableAggregateNodeEditor
  v-else-if="selectedNode.data?.nodeType === 'variableAggregate'"
  :selected-node="selectedNode"
  :node-config="nodeConfig"
  @update:params="handleParamsUpdate"
/>
```

**重要**：`nodeType` 值必须与后端节点的 `type` 字段一致

---

### 方案 A + B：同时自定义显示和编辑 UI

如果同时需要自定义节点显示和编辑 UI，则需要结合方案 A 和方案 B 的所有步骤：

1. **方案 A 的所有步骤**：创建节点组件、导出、在 `VueFlowCanvas.vue` 中注册
2. **方案 B 的所有步骤**：创建编辑器组件、在 `NodeConfigTab.vue` 中注册

两个方案的节点类型必须保持一致。

---

## 命名规范总结

为了确保节点正常工作，必须保证以下名称一致：

| 位置 | 名称 | 示例 | 说明 |
|------|------|------|------|
| 后端 `VariableAggregateNode.ts` | `readonly type` | `"variableAggregate"` | 节点类型标识 |
| 前端 `VueFlowCanvas.vue` | `nodeTypes` 的键 | `variableAggregate` | 必须与后端 `type` 一致 |
| 前端 `VueFlowCanvas.vue` | 节点插槽名称 | `#node-variableAggregate` | 格式：`#node-{type}` |
| 前端 `NodeConfigTab.vue` | 条件判断 `nodeType` | `'variableAggregate'` | 必须与后端 `type` 一致 |
| 后端 `defineInputs()` | 参数 `name` | `"data"` | 输入参数名称 |
| 前端编辑器 `emitUpdate()` | 发送的参数键 | `data` | 必须与后端参数名称一致 |
| 前端编辑器 `initializeGroups()` | 读取的参数键 | `params.data` | 必须与后端参数名称一致 |

---

## 完整示例：变量聚合节点

### 场景 1：仅后端实现（使用默认 UI）

**需要的文件**：
- `packages/flow-nodes/src/nodes/VariableAggregateNode.ts` - 后端节点

**说明**：
- 节点将使用系统默认的 `StandardNode` 显示
- 参数编辑将使用 `DefaultNodeEditor` 显示

### 场景 2：后端 + 方案 A（自定义显示）

**需要的文件**：
- `packages/flow-nodes/src/nodes/VariableAggregateNode.ts` - 后端节点
- `src/v2/features/vueflow/components/nodes/VariableAggregateNode.vue` - 自定义节点组件
- `src/v2/features/vueflow/components/nodes/index.ts` - 导出节点
- `src/v2/features/vueflow/components/VueFlowCanvas.vue` - 注册节点

**说明**：
- 节点将使用自定义的显示样式
- 参数编辑仍使用 `DefaultNodeEditor`

### 场景 3：后端 + 方案 B（自定义编辑 UI）

**需要的文件**：
- `packages/flow-nodes/src/nodes/VariableAggregateNode.ts` - 后端节点
- `src/v2/features/canvas/components/node-editor/editors/VariableAggregateNodeEditor.vue` - 自定义编辑器
- `src/v2/features/canvas/components/node-editor/NodeConfigTab.vue` - 注册编辑器

**说明**：
- 节点显示使用默认的 `StandardNode`
- 参数编辑将使用自定义的编辑器

### 场景 4：后端 + 方案 A + 方案 B（完全自定义）

**需要的文件**：
- `packages/flow-nodes/src/nodes/VariableAggregateNode.ts` - 后端节点
- `src/v2/features/vueflow/components/nodes/VariableAggregateNode.vue` - 自定义节点组件
- `src/v2/features/vueflow/components/nodes/index.ts` - 导出节点
- `src/v2/features/vueflow/components/VueFlowCanvas.vue` - 注册节点
- `src/v2/features/canvas/components/node-editor/editors/VariableAggregateNodeEditor.vue` - 自定义编辑器
- `src/v2/features/canvas/components/node-editor/NodeConfigTab.vue` - 注册编辑器

**说明**：
- 节点显示和参数编辑都使用自定义实现

---

## 常见问题

### Q1：我应该选择哪种方案？

**答**：根据需求选择：
- **仅需后端**：只实现后端节点，使用系统默认 UI
- **需要自定义显示**：选择方案 A（自定义节点样式）
- **需要自定义编辑**：选择方案 B（自定义编辑 UI）
- **都需要自定义**：选择方案 A + B（完全自定义）

### Q2：节点类型不匹配导致节点无法显示

**原因**：后端 `type` 与前端 `nodeTypes` 键名不一致

**解决**：确保所有地方的节点类型名称完全相同

### Q3：节点显示为默认样式而不是自定义样式

**原因**：选择了方案 A 但未正确注册

**解决**：
1. 确保在 `nodeTypes` 中注册了节点
2. 在 `VueFlow` 模板中添加 `<template #node-{type}>` 插槽
3. 插槽名称格式必须为 `#node-{nodeType}`

### Q4：参数无法保存

**原因**：编辑器发送的参数名称与后端定义的输入参数名称不一致

**解决**：检查 `emitUpdate()` 中的参数名称是否与 `defineInputs()` 中的 `name` 一致

### Q5：编辑器组件无法显示

**原因**：选择了方案 B 但未正确注册

**解决**：
1. 确保在 `NodeConfigTab.vue` 中添加了条件判断
2. `nodeType` 值必须与后端 `type` 字段一致
3. 确保导入了编辑器组件

---

## 最佳实践

1. **命名一致性**：始终保持节点类型名称在所有地方一致
2. **参数验证**：在后端 `execute()` 方法中验证输入参数
3. **错误处理**：使用 `createError()` 返回错误信息
4. **文档注释**：为节点类和方法添加详细的 JSDoc 注释
5. **样式配置**：通过 `getStyleConfig()` 自定义节点外观
6. **缓存策略**：根据需要实现 `shouldUseCache()` 方法

---

## 相关文件

- 后端基类：`packages/flow-nodes/src/BaseFlowNode.ts`
- 前端画布：`src/v2/features/vueflow/components/VueFlowCanvas.vue`
- 前端配置面板：`src/v2/features/canvas/components/node-editor/NodeConfigTab.vue`
- 编辑器目录：`src/v2/features/canvas/components/node-editor/editors/`
- 节点目录：`packages/flow-nodes/src/nodes/`
