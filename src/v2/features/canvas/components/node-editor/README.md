# Node Editor 节点编辑器

节点配置面板的模块化重构版本，实现更好的代码组织和数据管理。

## 目录结构

```
node-editor/
├── index.ts                          # 导出入口
├── README.md                         # 文档
├── types.ts                          # 类型定义
├── NodeConfigPanel.vue               # 主面板组件
├── NodeConfigTab.vue                 # 节点配置 Tab
├── GeneralSettingsTab.vue            # 通用设置 Tab
├── editors/                          # 特殊节点编辑器
│   ├── IfNodeEditor.vue             # IF 节点编辑器
│   └── DefaultNodeEditor.vue        # 默认节点编辑器
└── composables/                      # 组合式函数
    ├── useNodeConfig.ts             # 节点配置管理
    └── useNodeConfigFields.ts       # 字段配置生成
```

## 组件说明

### NodeConfigPanel.vue
主面板组件，负责：
- Tab 切换
- 变量拖拽事件监听
- 集成子组件

### NodeConfigTab.vue
节点配置 Tab，负责：
- 根据节点类型显示对应编辑器
- 操作按钮（重置、删除）
- 协调编辑器和主面板通信

### GeneralSettingsTab.vue
通用设置 Tab，负责：
- 节点基本信息显示
- 基础配置编辑（名称、描述、颜色）

### editors/IfNodeEditor.vue
IF 节点专用编辑器，负责：
- IF 条件配置
- 统一管理 `params.config`

### editors/DefaultNodeEditor.vue
默认节点编辑器，负责：
- 根据节点 inputs 动态生成配置字段
- 通用参数配置

## Composables

### useNodeConfig
节点配置管理，提供：
- `selectedNode` - 当前选中节点
- `nodeConfig` - 节点配置数据
- `handleConfigChange` - 配置变更处理
- `handleParamChange` - 参数变更处理
- `handleReset` - 重置配置
- `handleDeleteNode` - 删除节点

### useNodeConfigFields
字段配置生成，提供：
- `nodeTypeConfig` - 动态生成的配置字段

## 数据流

```
用户操作
   ↓
编辑器组件 (IfNodeEditor / DefaultNodeEditor)
   ↓
Tab 组件 (NodeConfigTab / GeneralSettingsTab)
   ↓
主面板 (NodeConfigPanel)
   ↓
Composable (useNodeConfig)
   ↓
VueFlow updateNode
   ↓
节点数据更新
```

## 扩展特殊节点编辑器

如需添加新的特殊节点编辑器：

1. 在 `editors/` 目录创建新组件，如 `LoopNodeEditor.vue`
2. 实现组件接口：
   ```vue
   <script setup lang="ts">
   interface Props {
     selectedNode: Node;
     nodeConfig: Record<string, any>;
   }
   
   interface Emits {
     (e: "update:params", params: Record<string, any>): void;
   }
   </script>
   ```
3. 在 `NodeConfigTab.vue` 中添加条件判断：
   ```vue
   <LoopNodeEditor
     v-else-if="selectedNode.type === 'loop'"
     :selected-node="selectedNode"
     :node-config="nodeConfig"
     @update:params="handleParamsUpdate"
   />
   ```

## 优势

1. **模块化**：每个组件职责单一，易于维护
2. **可扩展**：轻松添加新的特殊节点编辑器
3. **数据集中**：使用 composable 集中管理数据逻辑
4. **类型安全**：完整的 TypeScript 类型定义
5. **易测试**：组件和逻辑分离，便于单元测试
