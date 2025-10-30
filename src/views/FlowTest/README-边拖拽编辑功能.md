# VueFlow 边拖拽编辑功能实现总结

## 功能描述

实现了以下功能：

1. **边的拖拽重连**：可以拖拽已存在的连接线的端点，重新连接到其他节点
2. **宽区域触发**：不需要精确点击细线，在连接线周围 20px 范围内都可以触发拖拽
3. **Hover 显示删除按钮**：鼠标悬停在连接线上时，在中间位置显示删除按钮
4. **边更新事件处理**：拖拽完成后更新边的连接信息，并防止重复连接

---

## 核心实现步骤

### 1. 在 VueFlow 组件中启用边编辑功能

在 `index.vue` 中配置 VueFlow：

```vue
<VueFlow
  v-model:nodes="nodes"
  v-model:edges="edges"
  :edges-updatable="true"
  :edge-updater-radius="1000"
  @edge-update="onEdgeUpdate"
>
```

**关键配置项：**

- `:edges-updatable="true"` - 启用边的拖拽编辑功能
- `:edge-updater-radius="1000"` - 设置可拖拽区域半径（默认约 10px，设置大值后整条边都可拖拽）
- `@edge-update` - 监听边更新事件

### 2. 实现边更新事件处理函数

```typescript
const onEdgeUpdate = ({ edge, connection }: EdgeUpdateEvent) => {
  // 检查新连接是否已存在（防止重复连接）
  const exists = edges.value.some(
    (e) =>
      e.id !== edge.id &&
      e.source === connection.source &&
      e.target === connection.target &&
      e.sourceHandle === connection.sourceHandle &&
      e.targetHandle === connection.targetHandle
  );

  if (exists) {
    return;
  }

  // 更新边的连接信息
  edges.value = edges.value.map((e) =>
    e.id === edge.id
      ? {
          ...e,
          type: "custom",
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
        }
      : e
  );
};
```

### 3. 创建自定义边组件 (CustomEdge.vue)

**核心设计思路：**

- 使用**两个路径**：一个可见的细路径 + 一个透明的宽路径
- 宽路径负责响应鼠标事件（hover、拖拽）
- 细路径只负责显示，不响应鼠标事件

**关键代码：**

```vue
<template>
  <g class="vue-flow__edge-custom">
    <!-- 可见的细路径 - 只负责显示 -->
    <path
      :id="id"
      class="vue-flow__edge-path-visual"
      :d="pathData"
      :marker-end="markerEnd"
    />

    <!-- 透明的宽路径 - 负责交互（hover + 拖拽） -->
    <path
      :d="pathData"
      class="vue-flow__edge-path vue-flow__edge-interaction"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    />

    <!-- Hover 时显示的删除按钮 -->
    <foreignObject
      v-if="isHovered"
      :width="40"
      :height="40"
      :x="edgeCenterX - 20"
      :y="edgeCenterY - 20"
    >
      <button @click="onDelete">删除</button>
    </foreignObject>
  </g>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useVueFlow, type EdgeProps, getBezierPath } from "@vue-flow/core";

const props = defineProps<EdgeProps>();
const isHovered = ref(false);
const { removeEdges } = useVueFlow();

// 计算边的路径
const path = computed(() =>
  getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  })
);

// 提取路径字符串
const pathData = computed(() => path.value[0]);

// 计算边的中心点（用于放置删除按钮）
const edgeCenterX = computed(() => path.value[1] ?? 0);
const edgeCenterY = computed(() => path.value[2] ?? 0);

// 箭头标记
const markerEnd = computed(() => props.markerEnd);

// 删除边
const onDelete = () => {
  removeEdges([props.id]);
};
</script>

<style scoped>
/* 可见的边路径 - 只负责显示 */
.vue-flow__edge-path-visual {
  stroke: #b1b1b7;
  stroke-width: 2;
  fill: none;
  pointer-events: none; /* 关键：不响应鼠标事件 */
}

/* 透明的宽路径 - 负责 hover 和拖拽交互 */
.vue-flow__edge-interaction {
  stroke: transparent;
  stroke-width: 20; /* 宽度决定了触发区域的大小 */
  fill: none;
  cursor: pointer;
}

/* Hover 状态 */
.vue-flow__edge-custom:hover .vue-flow__edge-path-visual {
  stroke: #6366f1;
  stroke-width: 3;
}

.edgebutton-foreignobject {
  overflow: visible;
  pointer-events: none; /* foreignObject 不响应事件 */
}

.edgebutton-foreignobject button {
  pointer-events: all; /* 只有按钮响应事件 */
}
</style>
```

### 4. 注册自定义边组件

在 `index.vue` 中：

```vue
<VueFlow>
  <!-- 注册自定义边 -->
  <template #edge-custom="edgeProps">
    <CustomEdge v-bind="edgeProps" />
  </template>
</VueFlow>
```

并在创建边时指定类型：

```typescript
edges.value = [
  ...edges.value,
  {
    id: `edge-${Date.now()}`,
    type: "custom", // 使用自定义边
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
  },
];
```

---

## 关键技术点

### 1. 双路径设计

**为什么需要两个路径？**

- **可见路径**：细线（2px），用户看到的样式
- **透明路径**：宽线（20px），用于扩大鼠标交互区域

**为什么透明路径要添加 `vue-flow__edge-path` 类？**

- VueFlow 内部通过这个类名来识别可拖拽的边
- 只有带这个类名的元素才能触发边的拖拽编辑功能

### 2. 路径顺序很重要

```vue
<!-- 先渲染可见路径（在底层） -->
<path class="vue-flow__edge-path-visual" />

<!-- 后渲染透明路径（在顶层） -->
<path class="vue-flow__edge-path vue-flow__edge-interaction" />
```

后渲染的元素在 SVG 中层级更高，会优先响应鼠标事件。

### 3. pointer-events 控制

```css
/* 可见路径：不响应事件 */
.vue-flow__edge-path-visual {
  pointer-events: none;
}

/* 透明路径：响应所有事件 */
.vue-flow__edge-interaction {
  cursor: pointer;
}

/* foreignObject：不响应事件 */
.edgebutton-foreignobject {
  pointer-events: none;
}

/* 删除按钮：响应事件 */
.edgebutton-foreignobject button {
  pointer-events: all;
}
```

### 4. edgeUpdaterRadius 参数

- **默认值**：约 10px，只在边的端点附近可以拖拽
- **设置大值**：如 1000，整条边的任意位置都可以拖拽
- **工作原理**：VueFlow 计算鼠标位置到边端点的距离，小于这个值才允许拖拽

---

## 需要注意的问题

```vue
<path :style="style" class="vue-flow__edge-path" />
```

### ⚠️ 2. 确保路径数据同步

```typescript
// 提取为独立的 computed，确保响应式更新
const pathData = computed(() => path.value[0]);

// 两个路径都使用相同的 pathData
<path :d="pathData" class="vue-flow__edge-path-visual" />
<path :d="pathData" class="vue-flow__edge-path" />
```

### ⚠️ 3. foreignObject 的 pointer-events 设置

```css
/* foreignObject 本身不响应事件 */
.edgebutton-foreignobject {
  pointer-events: none;
}

/* 但内部的按钮需要响应事件 */
.edgebutton-foreignobject button {
  pointer-events: all;
}
```

**原因**：如果 foreignObject 响应事件，会阻止透明路径的拖拽功能。

### ⚠️ 4. 防止重复连接

```typescript
const onEdgeUpdate = ({ edge, connection }: EdgeUpdateEvent) => {
  // 必须排除当前边本身（e.id !== edge.id）
  const exists = edges.value.some(
    (e) =>
      e.id !== edge.id && // 关键：排除自己
      e.source === connection.source &&
      e.target === connection.target &&
      e.sourceHandle === connection.sourceHandle &&
      e.targetHandle === connection.targetHandle
  );

  if (exists) {
    return; // 已存在相同连接，不允许更新
  }

  // 更新边...
};
```

---

## 移植到其他项目的步骤

### 1. 复制必要文件

```
src/views/FlowTest/
  ├── CustomEdge.vue           # 自定义边组件（必需）
  ├── CustomConnectionLine.vue # 连接线预览（可选，用于创建新连接时的样式统一）
  └── index.vue                # 主页面（参考配置）
```

### 2. 在目标页面中配置 VueFlow

```vue
<template>
  <VueFlow
    v-model:edges="edges"
    :edges-updatable="true"
    :edge-updater-radius="1000"
    @edge-update="onEdgeUpdate"
  >
    <!-- 注册自定义边 -->
    <template #edge-custom="edgeProps">
      <CustomEdge v-bind="edgeProps" />
    </template>

    <!-- （可选）注册连接线预览 -->
    <template #connection-line="connectionLineProps">
      <CustomConnectionLine v-bind="connectionLineProps" />
    </template>
  </VueFlow>
</template>

<script setup lang="ts">
import type { EdgeUpdateEvent } from "@vue-flow/core";
import CustomEdge from "./CustomEdge.vue";

const onEdgeUpdate = ({ edge, connection }: EdgeUpdateEvent) => {
  // 处理边更新逻辑
};
</script>
```

### 3. 创建边时指定类型

```typescript
const onConnect = (connection: Connection) => {
  edges.value = [
    ...edges.value,
    {
      id: `edge-${Date.now()}`,
      type: "custom", // 必须指定为 custom
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
    },
  ];
};
```

### 4. 根据需要调整样式

在 `CustomEdge.vue` 中调整：

- 边的颜色：`.vue-flow__edge-path-visual { stroke: #xxx }`
- Hover 颜色：`.vue-flow__edge-custom:hover .vue-flow__edge-path-visual { stroke: #xxx }`
- 触发区域宽度：`.vue-flow__edge-interaction { stroke-width: 20 }`
- 删除按钮样式：修改 `<button>` 的 class

---

## 可选功能：CustomConnectionLine

**作用**：在从端口拖拽创建新连接时，显示的预览线样式。

**是否必需**：

- ❌ 对于边拖拽编辑功能，**不是必需的**
- ✅ 对于创建新连接的视觉一致性，**建议添加**

如果不添加，创建新连接时会显示 VueFlow 默认的直线预览，与自定义边的曲线样式不一致。

---

## 完整功能清单

| 功能             | 实现方式                                    | 是否必需 |
| ---------------- | ------------------------------------------- | -------- |
| 边拖拽重连       | `:edges-updatable="true"` + `@edge-update`  | ✅ 必需  |
| 宽区域触发       | `:edge-updater-radius="1000"` + 双路径设计  | ✅ 必需  |
| Hover 删除按钮   | `@mouseenter/@mouseleave` + `foreignObject` | ⚪ 可选  |
| 防止重复连接     | `onEdgeUpdate` 中检查                       | ✅ 推荐  |
| 连接预览样式统一 | `CustomConnectionLine.vue`                  | ⚪ 可选  |

---

## 调试技巧

### 1. 查看透明路径的实际位置

临时修改透明路径的颜色：

```css
.vue-flow__edge-interaction {
  stroke: rgba(255, 0, 0, 0.3); /* 半透明红色 */
}
```

### 2. 检查拖拽区域是否生效

- 鼠标移到边上时，光标应该变成 `pointer` 手型
- 如果没有变化，检查 `edge-updater-radius` 是否设置

### 3. 检查路径是否同步

在 computed 中添加 console.log：

```typescript
const pathData = computed(() => {
  const p = path.value[0];
  console.log("Path data:", p);
  return p;
});
```

---

## 总结

实现边拖拽编辑功能的核心要点：

1. **VueFlow 配置**：`edges-updatable` + `edge-updater-radius` + `@edge-update`
2. **双路径设计**：透明宽路径（交互） + 可见细路径（显示）
3. **类名关键**：透明路径必须有 `vue-flow__edge-path` 类
4. **事件控制**：通过 `pointer-events` 精确控制哪些元素响应事件
5. **防重复连接**：在 `onEdgeUpdate` 中检查并过滤

移植时只需复制 `CustomEdge.vue`，配置好 VueFlow 参数，并处理 `@edge-update` 事件即可。
