# For 循环节点开发文档

## 概述

本文档详细介绍了如何在 v2 版本中实现 For 循环节点及其容器节点的完整功能。For 循环节点是一个特殊的控制流节点，它包含一个循环体容器，支持将外部节点拖拽到容器内，并提供了丰富的交互反馈。

## 功能需求

### 1. 节点结构

#### 1.1 For 循环节点（ForNode）

- **端口配置**：
  - 左侧标准端口（输入）：用于接收循环数据源
  - 右侧标准端口（输出）：用于输出循环完成后的数据
  - 底部中央圆形端口（输出）：连接到循环体容器节点

#### 1.2 For 循环体容器节点（ForLoopContainerNode）

- **端口配置**：
  - 顶部中央圆形端口（输入）：接收来自 For 循环节点的连接
  - 左侧标准端口（输出）：循环体入口，只能连接容器内部节点
  - 右侧标准端口（输入）：循环体出口，只能连接容器内部节点

### 2. 交互功能

#### 2.1 节点拖拽进入容器

- 外部节点可以拖拽到容器内
- 拖拽过程中检测节点与容器的交集
- 有交集时显示容器高亮样式（蓝色边框）
- 节点有外部连接时显示警告样式（红色边框）
- 松开鼠标后将节点移入容器，触发容器尺寸更新

#### 2.2 容器内节点拖拽

- 容器内的节点可以在容器内自由拖拽
- 拖拽结束后触发容器尺寸更新

#### 2.3 Ctrl + 拖拽脱离容器

- 按住 Ctrl 键拖拽容器内节点到容器外
- 拖拽过程中检测节点与容器的交集状态
- 有交集时显示正常高亮（蓝色边框）
- 无交集时显示警告样式（红色边框）
- 松开鼠标后根据交集状态决定是否脱离容器

#### 2.4 连接限制

- 容器内节点的端口只能连接到容器内的其他节点
- 容器内节点不能连接到容器外的节点
- 容器外节点不能连接到容器内的节点

## 架构设计

### 1. 组件结构

```
src/v2/features/vueflow/
├── components/
│   └── nodes/
│       ├── ForNode.vue              # For 循环节点组件
│       └── ForLoopContainerNode.vue # For 循环体容器节点组件
└── plugins/
    └── forLoopPlugin.ts             # For 循环节点交互逻辑插件
```

### 2. 插件系统集成

For 循环节点的特殊交互逻辑通过插件系统实现，插件负责：

- 监听节点拖拽事件
- 检测节点与容器的交集
- 管理容器高亮状态
- 处理节点移入/移出容器的逻辑
- 限制容器内外节点的连接
- 处理 For 节点删除时同步删除关联容器

## 详细实现方案

### 1. ForNode 组件实现

#### 1.1 组件结构

**伪代码：**

```
ForNode 组件:
  - 使用 StandardNode 作为基础组件
  - 自定义端口布局：
    * 左侧输入端口（标准椭圆端口）
    * 右侧输出端口（标准椭圆端口）
    * 底部中央循环端口（圆形端口，不可连接）
  - 显示循环配置信息（模式、变量名等）
```

#### 1.2 端口定义

**伪代码：**

```
端口配置:
  inputs:
    - id: "items"
      name: "循环数据"
      position: Left
      type: target
      variant: ellipse

  outputs:
    - id: "loop"
      name: "循环体"
      position: Bottom
      type: source
      variant: circle
      connectable: false  # 只能通过插件连接

    - id: "next"
      name: "下一步"
      position: Right
      type: source
      variant: ellipse
```

#### 1.3 创建容器节点

**伪代码：**

```
当创建 ForNode 时:
  1. 创建 ForNode 节点
  2. 自动创建对应的 ForLoopContainerNode
  3. 建立 ForNode 的 "loop" 端口到容器的连接
  4. 在 ForNode 的 data.config 中存储 containerId
  5. 在容器的 data.config 中存储 forNodeId
```

### 2. ForLoopContainerNode 组件实现

#### 2.1 组件结构

**伪代码：**

```
ForLoopContainerNode 组件:
  - 使用虚线边框的容器样式
  - 包含标题栏（显示"批处理体"和容器ID）
  - 内容区域用于容纳子节点
  - 支持动态尺寸调整
  - 支持高亮状态显示（正常/警告）
```

#### 2.2 端口定义

**伪代码：**

```
端口配置:
  inputs:
    - id: "loop-in"
      name: "循环入口"
      position: Top
      type: target
      variant: circle
      connectable: false  # 只能通过插件连接

    - id: "loop-right"
      name: "循环体出口"
      position: Left
      type: target
      variant: ellipse
      # 只能连接容器内部节点（通过插件限制）

  outputs:
    - id: "loop-left"
      name: "循环体入口"
      position: Right
      type: source
      variant: ellipse
      # 只能连接容器内部节点（通过插件限制）
```

#### 2.3 容器尺寸管理

**伪代码：**

```
容器尺寸计算:
  1. 获取所有子节点（parentNode === containerId）
  2. 计算所有子节点的边界框
  3. 添加容器内边距（padding）
  4. 确保最小尺寸（MIN_WIDTH, MIN_HEIGHT）
  5. 更新容器的 width 和 height
  6. 触发容器重新渲染
```

### 3. ForLoopPlugin 插件实现

#### 3.1 插件状态管理

**伪代码：**

```
插件状态:
  - dragTargetContainerId: 当前拖拽目标容器ID
  - containerHighlightState: Map<containerId, highlightType>
    * highlightType: "normal" | "warning" | null
  - ctrlDetachContext:
    * nodeId: 正在脱离的节点ID
    * containerId: 源容器ID
    * isIntersecting: 是否仍与容器有交集
```

#### 3.2 节点拖拽监听

**伪代码：**

```
监听 onNodeDrag 事件:
  1. 获取当前拖拽的节点
  2. 检查节点是否已有父容器
     - 如果有父容器且未按 Ctrl，直接返回
     - 如果有父容器且按 Ctrl，进入脱离模式

  3. 获取与节点相交的所有容器节点
  4. 过滤出 ForLoopContainerNode 类型的容器

  5. 如果按 Ctrl 且节点在容器内:
     - 进入脱离模式
     - 检测节点与源容器的交集
     - 更新容器高亮状态（有交集=正常，无交集=警告）

  6. 如果未按 Ctrl 且节点在容器外:
     - 检查节点是否有外部连接
     - 更新目标容器高亮状态（有连接=警告，无连接=正常）
     - 记录目标容器ID
```

#### 3.3 节点拖拽结束处理

**伪代码：**

```
监听 onNodeDragStop 事件:
  1. 如果处于 Ctrl 脱离模式:
     - 检查节点与容器的最终交集状态
     - 如果无交集，执行脱离操作
     - 清除脱离上下文
     - 清除容器高亮

  2. 如果有目标容器:
     - 检查节点是否有外部连接
     - 如果没有外部连接，执行移入操作
     - 清除目标容器高亮

  3. 触发容器尺寸更新
```

#### 3.4 节点移入容器

**伪代码：**

```
moveNodeIntoContainer(nodeId, containerId):
  1. 获取节点和容器对象
  2. 计算节点相对于容器的位置
     - relativeX = node.position.x - container.position.x
     - relativeY = node.position.y - container.position.y

  3. 设置节点的父容器
     - node.parentNode = containerId
     - node.position = { x: relativeX, y: relativeY }

  4. 确保容器有足够空间容纳节点
     - 计算节点所需空间
     - 如果超出容器边界，扩展容器尺寸
     - 调整节点位置到容器内

  5. 更新容器尺寸
  6. 刷新节点层级类（用于渲染）
  7. 刷新边层级类（用于渲染）
  8. 记录历史记录（用于撤销/重做）
```

#### 3.5 节点脱离容器

**伪代码：**

```
detachNodeFromContainer(nodeId, containerId):
  1. 获取节点对象
  2. 计算节点的绝对位置
     - absoluteX = container.position.x + node.position.x
     - absoluteY = container.position.y + node.position.y

  3. 清除节点的父容器
     - node.parentNode = undefined
     - node.position = { x: absoluteX, y: absoluteY }

  4. 断开节点与容器内其他节点的连接
     - 查找所有连接到该节点的边
     - 如果边的另一端节点不在同一容器内，删除该边

  5. 更新容器尺寸
  6. 刷新节点层级类
  7. 刷新边层级类
  8. 记录历史记录
```

#### 3.6 容器尺寸更新

**伪代码：**

```
updateContainerBounds(containerId):
  1. 获取容器节点对象
  2. 获取所有子节点（parentNode === containerId）

  3. 如果子节点为空:
     - 设置容器为默认尺寸
     - 返回

  4. 计算所有子节点的边界框
     - minX = min(所有子节点的 x)
     - minY = min(所有子节点的 y)
     - maxX = max(所有子节点的 x + width)
     - maxY = max(所有子节点的 y + height)

  5. 添加容器内边距
     - width = maxX - minX + padding.left + padding.right
     - height = maxY - minY + padding.top + padding.bottom + headerHeight

  6. 确保最小尺寸
     - width = max(width, MIN_WIDTH)
     - height = max(height, MIN_HEIGHT)

  7. 更新容器的 style.width 和 style.height
  8. 触发容器组件重新渲染
```

#### 3.7 交集检测

**伪代码：**

```
检测节点与容器的交集:
  1. 获取节点的边界框
     - nodeRect = {
         x: node.position.x,
         y: node.position.y,
         width: node.width,
         height: node.height
       }

  2. 获取容器的边界框
     - containerRect = {
         x: container.position.x,
         y: container.position.y,
         width: container.width,
         height: container.height
       }

  3. 计算交集
     - intersectX = max(nodeRect.x, containerRect.x)
     - intersectY = max(nodeRect.y, containerRect.y)
     - intersectWidth = min(nodeRect.x + nodeRect.width, containerRect.x + containerRect.width) - intersectX
     - intersectHeight = min(nodeRect.y + nodeRect.height, containerRect.y + containerRect.height) - intersectY

  4. 判断是否有交集
     - hasIntersection = intersectWidth > 0 && intersectHeight > 0
     - intersectionArea = intersectWidth * intersectHeight
     - intersectionRatio = intersectionArea / (nodeRect.width * nodeRect.height)

  5. 返回交集信息
     - 如果交集比例 > 阈值（如 0.3），认为有有效交集
```

#### 3.8 连接限制

**伪代码：**

```
监听 onConnect 事件（连接验证）:
  1. 获取源节点和目标节点
  2. 检查源节点和目标节点的父容器

  3. 如果源节点在容器内:
     - 如果目标节点不在同一容器内，拒绝连接
     - 如果目标节点在同一容器内，允许连接

  4. 如果目标节点在容器内:
     - 如果源节点不在同一容器内，拒绝连接
     - 如果源节点在同一容器内，允许连接

  5. 如果源节点和目标节点都不在容器内，允许连接

  6. 返回连接是否有效
```

#### 3.9 容器高亮状态管理

**伪代码：**

```
setContainerHighlight(containerId, highlightType):
  1. 更新容器高亮状态映射
     - containerHighlightState.set(containerId, highlightType)

  2. 触发容器组件更新
     - 通过事件总线或响应式状态通知容器组件

  3. 容器组件根据 highlightType 应用样式:
     - "normal": 蓝色边框 + 阴影
     - "warning": 红色边框 + 阴影
     - null: 默认虚线边框

clearContainerHighlight(containerId):
  1. 清除容器高亮状态
     - containerHighlightState.delete(containerId)

  2. 触发容器组件更新
```

#### 3.10 节点删除时同步删除容器

**伪代码：**

```
在插件 hooks.beforeNodeDelete 中处理:

handleForNodeDelete(context, nodeId):
  1. 获取要删除的节点
     - node = context.core.nodes.value.find(n => n.id === nodeId)

  2. 检查节点类型是否为 "for"
     - 如果不是 For 节点，直接返回（不处理）

  3. 获取 For 节点的容器ID
     - containerId = node.data.config?.containerId
     - 如果 containerId 不存在，返回

  4. 获取容器节点
     - container = context.core.nodes.value.find(n => n.id === containerId)
     - 如果容器不存在，返回

  5. 获取容器内的所有子节点
     - childNodes = context.core.nodes.value.filter(n => n.parentNode === containerId)

  6. 处理容器内的子节点:
     - 将子节点移出容器（转换为绝对坐标）
     - 或者直接删除子节点（根据业务需求决定）
     - 清理子节点与容器外节点的连接

  7. 删除容器节点
     - context.core.removeNode(containerId)

  8. 删除与容器相关的所有边
     - 查找所有连接到容器的边
     - context.core.removeEdge(edgeId) 删除这些边

  9. 清除容器相关状态
     - 清除容器高亮状态
     - 清除拖拽目标状态（如果当前容器是拖拽目标）

插件 hooks 配置:
  hooks: {
    beforeNodeDelete(context, nodeId):
      1. 调用 handleForNodeDelete(context, nodeId)
      2. 返回 true（允许删除节点继续执行）
  }
```

**注意事项：**

- 删除 For 节点时，必须先处理容器和子节点，再删除 For 节点本身
- 容器内的子节点可以选择移出容器或一并删除（根据产品需求）
- 需要清理所有与容器相关的连接边
- 删除操作应该记录到历史记录中，支持撤销/重做

### 4. 节点创建集成

#### 4.1 节点类型注册

**伪代码：**

```
在 VueFlowCanvas.vue 中:
  1. 导入 ForNode 和 ForLoopContainerNode 组件
  2. 在 nodeTypes 中注册:
     - "for": ForNode
     - "forLoopContainer": ForLoopContainerNode
  3. 在模板中添加对应的插槽
```

#### 4.2 节点创建逻辑

**伪代码：**

```
当用户创建 For 节点时:
  1. 创建 ForNode 节点
     - id: 生成唯一ID
     - type: "for"
     - position: 用户点击位置
     - data: {
         label: "批处理",
         type: "for",
         config: {
           mode: "variable",
           variable: "",
           itemName: "item",
           indexName: "index"
         }
       }

  2. 创建对应的 ForLoopContainerNode
     - id: `${forNodeId}_body`
     - type: "forLoopContainer"
     - position: { x: forNode.x, y: forNode.y + 220 }
     - data: {
         label: "批处理体",
         type: "forLoopContainer",
         config: {
           forNodeId: forNodeId
         }
       }

  3. 创建连接边
     - source: forNodeId
     - sourceHandle: "loop"
     - target: containerId
     - targetHandle: "loop-in"

  4. 将节点和边添加到画布
```

### 5. 样式设计

#### 5.1 ForNode 样式

**伪代码：**

```
ForNode 样式:
  - 使用橙色标题栏（与 v1 保持一致）
  - 白色内容区域
  - 显示循环配置信息卡片
  - 底部中央圆形端口（特殊样式）
```

#### 5.2 ForLoopContainerNode 样式

**伪代码：**

```
ForLoopContainerNode 样式:
  - 默认状态:
    * 虚线边框（border-dashed）
    * 白色背景
    * 圆角

  - 正常高亮状态:
    * 实线蓝色边框（border-indigo-500）
    * 蓝色阴影（shadow-indigo-200）
    * 蓝色光晕（ring-indigo-200）

  - 警告高亮状态:
    * 实线红色边框（border-red-500）
    * 红色阴影（shadow-red-200）
    * 红色光晕（ring-red-200）

  - 标题栏:
    * 高度: CONTAINER_HEADER_HEIGHT
    * 背景: 渐变灰色
    * 显示容器名称和ID
```

## 实现步骤

### 阶段 1: 基础组件实现

1. 创建 ForNode.vue 组件
2. 创建 ForLoopContainerNode.vue 组件
3. 实现基本的端口布局和样式
4. 注册节点类型

### 阶段 2: 插件基础功能

1. 创建 forLoopPlugin.ts 插件
2. 实现节点拖拽监听
3. 实现交集检测逻辑
4. 实现容器高亮状态管理

### 阶段 3: 节点移入/移出

1. 实现节点移入容器逻辑
2. 实现节点脱离容器逻辑
3. 实现容器尺寸自动更新
4. 处理节点位置计算

### 阶段 4: 连接限制

1. 实现连接验证逻辑
2. 限制容器内外节点连接
3. 处理节点脱离时的连接清理

### 阶段 5: 节点删除处理

1. 实现 For 节点删除时的容器同步删除逻辑
2. 处理容器内子节点的处理策略（移出或删除）
3. 清理与容器相关的所有连接边
4. 清除容器相关状态

### 阶段 6: 完善和优化

1. 优化拖拽体验
2. 添加动画效果
3. 处理边界情况
4. 性能优化

## 注意事项

1. **坐标系统**：容器内节点的位置是相对于容器的，需要正确转换绝对坐标和相对坐标
2. **层级管理**：容器节点和子节点需要正确的 z-index 层级
3. **事件传播**：容器内节点的事件需要正确处理，避免被容器拦截
4. **性能考虑**：容器尺寸更新需要防抖处理，避免频繁计算
5. **历史记录**：节点移入/移出容器需要记录到历史记录中，支持撤销/重做
6. **连接清理**：节点脱离容器时需要清理无效的连接
7. **边界检测**：确保节点不会拖拽到容器外，或提供合理的边界限制
8. **节点删除**：删除 For 节点时必须同步删除关联容器，并正确处理容器内的子节点

## 参考实现

- v1 版本实现位置：

  - `src/v1/components/node-editor/nodes/ForNode.vue` - For 节点组件
  - `src/v1/components/node-editor/nodes/LoopContainerNode.vue` - 容器节点组件
  - `src/v1/composables/nodeEditor/useNodeLayout.ts` - 节点布局和容器管理逻辑
  - `src/v1/composables/nodeEditor/useNodeManagement.ts` - 节点创建和删除逻辑（包含 For 节点删除时同步删除容器的逻辑）
  - `src/v1/views/NodeEditor.vue` - 拖拽处理逻辑（直接在组件中实现，未使用插件系统）

## 测试要点

1. 节点可以正常拖拽到容器内
2. 容器尺寸能够自动调整
3. Ctrl + 拖拽可以脱离容器
4. 容器内外节点连接限制生效
5. 容器高亮状态正确显示
6. 节点位置计算准确
7. 历史记录功能正常
8. 删除 For 节点时同步删除关联容器
9. 删除 For 节点时正确处理容器内的子节点（移出或删除）
10. 删除 For 节点时清理所有相关连接边
