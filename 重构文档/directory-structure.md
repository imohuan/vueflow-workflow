# `src/newCode/` 目录结构说明

> 所有重构后的代码统一存放在 `src/newCode/` 下，与现有实现严格区分。以下为当前目录及用途简介。

```
src/newCode/
├── app/              # 新应用入口、布局、路由（后续阶段逐步实现）
├── components/       # 重构后使用的 Vue 组件（如基础 UI Shell）
│   └── ui/           # PanelShell、ModalShell 等基础组件
├── composables/      # Composition API hooks（预留，后续按模块补齐）
├── config/           # 重构模块专用配置、常量、主题定义
├── features/         # 业务功能模块（canvas / workflow-tree / node-library 等将在后续阶段落地）
├── services/         # 服务层，封装外部依赖与业务动作
├── stores/           # Pinia store，承接服务层状态
└── views/            # 预览页面或临时调试视图
```

## 已迁移内容

- `components/ui/PanelShell.vue`、`components/ui/ModalShell.vue`：统一的面板与模态壳组件。
- `components/ui/index.ts`：导出 UI Shell 组件。
- `features/canvas/`：Canvas 模块骨架及子组件（阶段 1 占位实现，含 `VerticalTabNav`、`FloatingPanel`、`NodeInfoCard` 等）。
- `services/canvasService.ts`：画布服务，负责 viewport/小地图状态与清理注册。
- `stores/canvas.ts`：Canvas Store，维护节点、连线及执行状态。
- `views/CanvasPreview.vue`：Canvas 模块预览页面。
- `views/UiShellPreview.vue`：UI Shell 预览页面，可通过 `/preview/ui-shell` 访问。

## 后续规划

- `features/canvas/`：阶段 1 中实现的画布模块相关组件。
- `services/canvasService.ts`、`stores/canvas.ts`：画布服务与 store。
- `features/workflow-tree/`、`features/variables/` 等目录将在后续阶段逐步填充。

请在每个阶段结束后同步更新本文档，确保团队成员了解最新目录布局。
