# 重构实施日志

## 2025-11-04

- 完成阶段 0（目录结构与 UI Shell 迁移）的基础工作：

  - 新建 `src/newCode/` 目录，并初始化 `app/`、`components/`、`composables/`、`features/`、`services/`、`stores/`、`config/` 结构。
  - 将 `PanelShell`、`ModalShell` 组件迁移至 `src/newCode/components/ui/`，同步更新聚合导出并保持目录语义。
  - 将 `UiShellPreview` 页面迁移至 `src/newCode/views/`，保持 `/preview/ui-shell` 路由可用。
  - 移除旧版 `src/ui/` 与 `src/views/UiShellPreview.vue` 文件，避免重复实现。
  - 更新路由引用新的路径，为后续预览页面迁移打下基础。

- 下一步计划：
  - 按阶段 1 计划拆分 Canvas 模块，初始化 `src/newCode/features/canvas/` 与相关服务、store。
  - 持续在日志中记录关键里程碑与决策。

## 2025-11-04（阶段 1）

- Canvas 模块分层初步完成：

  - 新增 `src/newCode/features/canvas/`，包含 `CanvasView.vue` 以及 `CanvasToolbar`、`CanvasStatsBar`、`NodeResultPanel`、`QuickNodeMenu` 等子组件，占位展示未来布局。
  - 后续调整布局以贴近现有页面：新增 `VerticalTabNav`、`FloatingPanel`、`NodeInfoCard` 组件，实现“小菜单 Tab + 悬浮菜单 + 画布 + 底部工具栏”结构。
  - 新建 `src/newCode/services/canvasService.ts` 统一管理画布 viewport、小地图可见性及清理钩子。
  - 新建 `src/newCode/stores/canvas.ts` 管理节点、连线、执行状态与结果列表，提供统计字段。
  - 新增 `/preview/canvas` 预览页面（`src/newCode/views/CanvasPreview.vue`），用于后续设计与联调。

- 后续计划：
  - 在阶段 2 中重构工作流树与变量模块，继续完善服务/组件分层。
  - Canvas 模块待接入 VueFlow 以及 ExecutionService 事件流。

## 2025-11-05（迁移到 NaiveUI）

- 完成从 Volt 到 NaiveUI 的组件库迁移：

  - 在 `src/main.ts` 中集成 NaiveUI
  - 将所有 newCode 中的按钮替换为 NaiveUI 的 `n-button` 组件
  - 涉及文件：
    - `components/ui/PanelShell.vue` - 使用 `n-button` text 模式的关闭按钮
    - `components/ui/ModalShell.vue` - 使用 `n-button` text 模式的关闭按钮
    - `features/canvas/components/VerticalTabNav.vue` - 导航按钮（text 模式 + 自定义样式）
    - `features/canvas/components/CanvasToolbar.vue` - 工具栏按钮（circle text + primary）
    - `views/UiShellPreview.vue` - 使用 `n-button` 和 `n-space` 替换所有演示按钮
    - `views/Preview.vue` - Tab 切换按钮（primary/default 类型）
  - 使用 NaiveUI 内置的样式系统，减少自定义样式代码
  - 使用 `n-space` 组件统一间距布局
  - 修复 Tailwind lint 警告（important 修饰符位置等）
  - Lint 检查已通过，无错误

- NaiveUI 优势：

  - 开箱即用，无需额外配置
  - 组件 API 简洁直观（type, size, secondary 等属性）
  - 内置主题系统，易于定制
  - 比 Volt 更易用和维护

- 后续计划：
  - 根据需要引入更多 NaiveUI 组件（Input、Select、Card、Message 等）
  - 推进阶段 2：工作流树与变量模块重构
