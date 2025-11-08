# VueFlow 模块

这是一个对 VueFlow 进行封装和增强的模块，提供了更易用的接口和功能扩展。

## 目录结构

```
vueflow/
├── components/           # VueFlow 组件
│   └── VueFlowCanvas.vue # 画布组件
├── core/                # 核心逻辑
│   ├── vueflowConfig.ts # 配置文件
│   └── useVueFlowCore.ts# 核心 Hook
├── events/              # 事件系统
│   ├── eventBus.ts      # 事件总线
│   ├── eventTypes.ts    # 事件类型
│   ├── useVueFlowEvents.ts # 事件 Hook
│   └── index.ts
├── plugins/             # 插件系统（扩展功能）
│   ├── types.ts         # 插件类型
│   ├── copyPastePlugin.ts # 复制粘贴插件
│   └── index.ts
└── index.ts             # 统一导出
```

## 核心功能

### 1. VueFlowCanvas 组件

画布组件是对 VueFlow 的高级封装，集成了背景、控制按钮、小地图等功能。

#### 使用示例

```vue
<template>
  <VueFlowCanvas
    :custom-node-component="CustomNode"
    :show-background="true"
    :show-controls="true"
    :show-mini-map="false"
  />
</template>

<script setup>
import { VueFlowCanvas } from "@/v2/features/vueflow";
import CustomNode from "./CustomNode.vue";
</script>
```

#### Props

- `customNodeComponent`: 自定义节点组件
- `showBackground`: 是否显示背景网格
- `showControls`: 是否显示控制按钮
- `showMiniMap`: 是否显示小地图
- `config`: VueFlow 配置
- `backgroundConfig`: 背景配置
- `controlsConfig`: 控制按钮配置
- `miniMapConfig`: 小地图配置

### 2. 配置系统

画布配置由 `useEditorConfigStore` 统一管理，包括：

- **连线样式**: 直线、贝塞尔曲线、阶梯线、平滑阶梯
- **连线粗细**: 1-5px
- **连线颜色**: 默认颜色和激活颜色
- **连线动画**: 开启/关闭
- **网格背景**: 显示/隐藏、类型、间距、颜色
- **画布设置**: 网格吸附、缩放等

配置会自动保存到 localStorage，并在画布上实时生效。

### 3. 事件系统

基于 mitt 实现的轻量级事件系统，支持画布内外的事件通信。

#### 事件类型

- **节点事件**: `node:added`, `node:deleted`, `node:clicked`, `node:double-clicked`, `node:context-menu`
- **边事件**: `edge:added`, `edge:deleted`, `edge:selected`
- **画布事件**: `canvas:zoom-changed`, `canvas:clicked`, `canvas:fit-view`
- **工作流事件**: `workflow:loaded`, `workflow:saved`, `workflow:execution-started`

#### 使用示例

```ts
import { useVueFlowEvents } from "@/v2/features/vueflow";

const events = useVueFlowEvents();

// 监听节点添加
events.on("node:added", ({ node }) => {
  console.log("节点已添加:", node);
});

// 监听节点双击（打开配置）
events.on("node:double-clicked", ({ node }) => {
  openNodeConfig(node);
});

// 发送事件
events.emit("workflow:loaded", { workflowId: "123" });
```

### 4. 插件系统

插件系统用于扩展画布功能，而不是封装基础组件。

#### 插件接口

```ts
interface VueFlowPlugin {
  config: PluginConfig; // 插件配置
  hooks?: PluginHooks; // 生命周期钩子
  shortcuts?: PluginShortcut[]; // 快捷键
  setup?: (context) => void; // 初始化
  cleanup?: (context) => void; // 清理
}
```

#### 插件示例

```ts
// 复制粘贴插件
const copyPastePlugin = createCopyPastePlugin();

// 注册插件
const pluginManager = createPluginManager();
pluginManager.register(copyPastePlugin);
pluginManager.enable("copy-paste");
```

#### 可扩展的功能

- ✅ 复制粘贴（Ctrl+C/V/X）
- 🚧 历史记录（撤销/重做）
- 🚧 自动布局（Dagre）
- 🚧 多选操作
- 🚧 对齐辅助线
- 🚧 快捷键系统

## 架构设计

### 数据流

```
CanvasView
   ↓
VueFlowCanvas (封装层)
   ↓
useVueFlowCore (核心逻辑)
   ↓
Pinia Store ←→ VueFlow 实例
   ↓
useVueFlowEvents (事件系统)
   ↓
PluginManager (插件系统)
```

### 配置流

```
SettingsPanel (设置面板)
   ↓
useEditorConfigStore (配置 Store)
   ↓ (自动保存)
localStorage
   ↓ (读取)
VueFlowCanvas (应用配置)
```

## 开发指南

### 添加新功能插件

1. 在 `plugins/` 目录创建插件文件
2. 实现 `VueFlowPlugin` 接口
3. 在 `plugins/index.ts` 中导出
4. 在需要的地方注册和启用

### 添加新事件类型

1. 在 `events/eventTypes.ts` 中定义事件接口
2. 添加到 `VueFlowEventMap` 类型
3. 在相应位置触发事件

### 修改画布配置

1. 在 `useEditorConfigStore` 中添加配置字段
2. 在 `SettingsPanel` 中添加 UI 控件
3. 在 `VueFlowCanvas` 中读取并应用配置

## 注意事项

1. **不要**将 VueFlow 的基础组件（Background、Controls、MiniMap）封装为插件
2. 插件系统专注于**功能扩展**，而非组件封装
3. 所有配置变更会自动保存到 localStorage
4. 事件监听器会在组件卸载时自动清理
5. 插件需要在画布初始化后才能正常工作
