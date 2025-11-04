# AI Browser Tools 项目重构文档（GPT Codex 方案）

## 1. 背景概述

AI Browser Tools 由前端可视化节点编辑器、工作流执行内核（`packages/node-executor`）、浏览器节点集合（`packages/browser-nodes`）以及 Worker / Server 双模式执行环境组成。随着功能扩张，现有代码在模块划分、状态治理、执行协议等方面暴露出结构性瓶颈，亟需一次系统性重构以支撑多主题、插件化、协作等未来能力。

## 2. 重构目标

1. **构建清晰分层**：以 Service + Store + View 为核心，拆解巨型组件，限定依赖方向。
2. **统一 UI 规范**：沉淀 Panel、Modal、Form、Toolbar 等基础组件，实现主题与交互一致性。
3. **执行架构可拔插**：模块化 `node-executor`，统一 Worker / Server 协议，支持多执行模式。
4. **节点模型标准化**：使用 Schema 化节点定义，自动生成前端表单与元数据。
5. **数据与协议可靠**：提供版本化存储、迁移策略，完善执行日志、错误码与恢复流程。
6. **测试自动化**：补齐单元/端到端测试，接入 CI，确保重构期间功能不回退。

## 3. 现状问题详解

### 3.1 画布与节点编辑

- `NodeEditor.vue` 超过 2000 行，集成渲染、快捷键、拖拽、执行状态轮询等多重职责。
- 直接访问 VueFlow 实例与 DOM，状态更新分散且不可测试，`setInterval` 轮询导致性能隐患。
- Quick Node 菜单、Ctrl 连线、容器拖拽等逻辑耦合严重，缺乏可组合的服务层。

### 3.2 侧栏、弹窗与基础 UI

- `WorkflowFileTree.vue`、`NodeListPanel.vue`、`VariableEditorModal.vue` 均内置标题栏、工具栏、空状态，样式不统一且难以维护。
- 节点分类颜色、图标、搜索行为硬编码在组件内部，无法主题化或复用。

### 3.3 Store 与业务耦合

- `useNodeEditorStore` 集合持久化、历史记录、剪贴板、执行、容器拖拽等复杂逻辑，Store 角色模糊。
- `useWorkflowStore` 同时负责树形数据、拖拽运算、本地存储，逻辑分布在多个组件，难以复用和测试。

### 3.4 执行状态管理

- `useWorkflowExecution` 通过 mitt 手动订阅事件并维护多份 Map，包含通知、日志、快照等杂糅逻辑。
- 组件侧只能通过轮询更新 UI，无法做到多执行上下文或服务化复用。

### 3.5 Worker / Server 双模式

- Worker 与 Server 的协议差异大，需要大量条件分支；缺乏 `protocolVersion`、错误码和鉴权设计。
- 连接管理、心跳、重连逻辑在 `useWorkflowWorker` 与 `useWorkflowServerClient` 中重复实现。

### 3.6 节点执行内核

- `executeWorkflow` 单体函数负责拓扑遍历、日志收集、变量解析、循环调度，代码难以扩展。
- For/If/容器节点逻辑深度嵌入，缺少 Hook 扩展点；配置解析缺乏 schema 校验，错误在运行期才暴露。

### 3.7 节点定义与前端渲染

- 浏览器节点继承 `BaseNode` 类，输入/输出/默认值零散分布，前端表单无法自动生成。
- 缺失 metadata 构建流水线，无法按需加载或为插件生态提供标准入口。

### 3.8 页面与路由结构

- `Home.vue` 通过 `<iframe>` 承载多个页面，导致状态重复初始化与调试困难。
- Demo 页面与正式页面未分层，路由与布局耦合。

## 4. 目标架构设计

### 4.1 分层架构与依赖约束

- 划分 **View → Feature → Service → Core** 四层：View 仅渲染交互，Feature 组织业务组件，Service 承担状态与副作用，Core（`packages/*`）封装执行与节点内核。
- 依赖方向严格自上而下；禁止 Feature 之间、Service 之间的环依赖，跨模块通信通过显式事件与 store。
- 使用 typed event bus（mitt 封装）+ Pinia store 做跨层数据同步。

### 4.2 目录结构调整

```
src/
├── app/                 # 应用入口、布局、路由
├── components/          # 纯展示组件（无副作用）
├── features/            # 按业务垂直拆分（canvas / workflow-tree / node-library / node-config / execution / variables / demo）
├── services/            # 跨组件的领域服务 (CanvasService、ExecutionService 等)
├── stores/              # Pinia store，映射服务层状态
├── ui/                  # PanelShell、ModalShell、FormField 等基础 UI
├── config/              # 主题、schema、常量
├── composables/         # 通用 hook（无业务耦合）
├── utils/               # 工具函数
└── workflow/ / workers/ # 保留现有子系统，逐步迁移
```

### 4.3 Service + Store + View 模式

- **Service**：封装外部依赖（Worker、WebSocket、LocalStorage），对外暴露明确 API 与事件流。
- **Store**：只维护可序列化状态，接收 Service 事件更新，向 View 提供 computed getter。
- **View/组件**：通过 props/composables 订阅 store 与 service，禁止直接操作外部依赖。

### 4.4 UI 基础层（Shell）

- `PanelShell`：统一侧栏结构（标题/工具栏/主体/底栏）、尺寸控制、拖拽/关闭行为。
- `ModalShell`：提供遮罩、动效、焦点管理、Esc/点击空白关闭等通用逻辑。
- `Toolbar`, `EmptyState`, `SearchInput`, `FormField` 等集中在 `src/ui/`，并通过 `config/theme.ts` 管理颜色与空间。
- 所有面板/弹窗组件迁移到新 Shell，禁止在业务组件内重复定义标题栏。

### 4.5 Canvas 模块

- `features/canvas/CanvasView.vue`：负责 VueFlow 容器、布局与视图拆分（统计条、快捷菜单、结果面板等）。
- `services/canvasService.ts`：封装 VueFlow API（缩放、自动布局、节点投影、快捷键、容器拖拽、Ctrl 连线候选）。
- `useCanvasStore`：维护节点、边、UI 状态及选中信息，通过服务事件更新执行状态，彻底移除轮询。
- Quick Node 菜单、容器高亮等做成子组件或 composable，便于测试与复用。

### 4.6 Workflow Tree 模块

- `WorkflowTreeService`：负责树结构 CRUD、拖拽 result 计算、Drop Target 判定与不可变更新。
- `PersistenceService`：统一 localStorage 读写、版本号、迁移与错误处理。
- `WorkflowTreePanel.vue`：使用 `PanelShell` 渲染树、搜索、工具栏，逻辑集中在服务层。

### 4.7 Node Library 模块

- `NodeRegistryService`：加载 & 缓存 metadata，提供分类、搜索、推荐、颜色映射；支持热更新。
- `NodeLibraryPanel.vue`：基于配置渲染 Accordion、搜索过滤、拖拽至画布，所有颜色/文案来自配置或服务。

### 4.8 Node Config & Variables 模块

- `NodeConfigService`：根据 schema 生成配置表单、校验规则、默认值补齐；处理节点配置变更与持久化。
- `VariableService`：封装 `buildVariableContext`、`resolveConfigWithVariables`、预览分页、拖拽插入等逻辑。
- `VariableEditorModal` → 基于 `ModalShell` + `VariablePreviewPanel`，仅负责展示与调用服务方法。

### 4.9 Execution 统一服务

- `ExecutionService`：抽象执行 API（`start/stop/subscribe/clear`），内部选择 `WorkerAdapter` 或 `ServerAdapter`，统一心跳、重连、错误恢复。
- `ExecutionStore`：维护 `executions`, `nodeStates`, `activeEdges`, `snapshots`，提供 selector 给画布或监控面板。
- 通过事件流实现实时更新，移除组件中的 `setInterval` 轮询。

### 4.10 执行协议（ExecutionProtocol v1）

- 协议消息：`INIT`/`INIT_RESULT`（含 `protocolVersion`、metadata）、`EXECUTION_START`、`EXECUTION_EVENT`、`EXECUTION_ERROR`、`PING/PONG`。
- 事件 payload 统一字段命名（节点状态、边激活、循环事件、日志），支持版本校验与可选 token 鉴权。
- Worker 与 Server 共享协议包（`packages/execution-protocol`），适配器仅负责传输层实现。

### 4.11 节点执行内核模块化

- 拆分核心模块：
  - `GraphScheduler`：拓扑遍历、队列管理、循环帧。
  - `ExecutionContextManager`：变量环境、循环变量、共享资源。
  - `ConfigResolver`：基于 schema 解析配置与变量，提前抛出错误。
  - `ResultCollector`：统一记录日志、节点结果、快照，便于回放。
  - `HookSystem`：对 `beforeNode/afterNode/onError/loop` 等生命周期开放扩展点。
- `executeWorkflow` 仅组合上述模块，并处理取消、异常上报、统计输出。

### 4.12 节点定义流水线

- 引入 `createNodeDefinition` 函数式 API，声明 meta、inputs、outputs、schema、运行逻辑。
- 编写 CLI（`pnpm build:metadata`）聚合所有节点定义输出 JSON + d.ts，前端按需加载。
- 提供 BaseNode → Definition 的过渡 adapter，分阶段迁移 `workflow-browser-nodes`。

### 4.13 数据持久化与迁移

- 统一 `PersistenceService` 管理本地存储，提供 `version`, `migrate`, `backup` 能力。
- 迁移脚本负责转换旧工作流、配置、历史记录；必要时支持导出/导入方便回滚。
- 默认启用 feature flag 控制新旧 Canvas / Execution / NodeDefinition，降低上线风险。

### 4.14 测试与监控

- **Unit**：GraphScheduler、ConfigResolver、WorkflowTreeService、VariableService、ExecutionService。
- **Integration**：执行协议握手、Worker/Server 事件流、节点配置渲染、变量解析与预览。
- **E2E**：Playwright 覆盖“创建节点 → 配置 → 执行 → 查看结果”“Worker/Server 模式切换”“文件树拖拽”。
- CI 引入 ESLint + TypeCheck + Vitest + Playwright；可选接入 Sentry/LogRocket 追踪执行异常。

## 5. 实施阶段与里程碑

| 阶段 | 核心工作                                                                          | 交付物                                                  | 预计用时 |
| ---- | --------------------------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| 0    | 基线与环境：新建分支、CI、lint、测试框架、协议包骨架                              | 重构分支、CI pipeline、质量检查清单                     | 1 周     |
| 1    | UI Shell & 布局：`PanelShell`/`ModalShell`、主题配置、路由布局替换（移除 iframe） | `ui/` 组件库、统一 Layout、示例迁移                     | 1.5 周   |
| 2    | Canvas 拆分：`CanvasService`、`useCanvasStore`、VueFlow 封装、执行状态推送        | 新 `CanvasView`、快捷键/拖拽回归测试、旧版 feature flag | 2 周     |
| 3    | WorkflowTree & Variable 服务：树形 CRUD、拖拽、持久化、变量预览迁移               | `WorkflowTreeService`、`VariableService`、迁移脚本 v1   | 1.5 周   |
| 4    | ExecutionService & 协议统一：适配器、心跳、错误恢复、store 改造                   | `ExecutionService`、协议文档、Worker/Server 双模式 demo | 2 周     |
| 5    | Node Executor 模块化：GraphScheduler、HookSystem、ConfigResolver、单测            | 新执行内核、For/If/容器 Hook、回归脚本                  | 2 周     |
| 6    | 节点定义流水线：`createNodeDefinition`、metadata 构建 CLI、浏览器节点迁移         | metadata JSON/d.ts、示例节点迁移、兼容层                | 1.5 周   |
| 7    | 测试与迁移收尾：Vitest/Playwright、性能评估、数据迁移 GA、文档                    | 测试报告、迁移指南、性能对比指标                        | 1.5 周   |

> 阶段可按团队能力并行推进，但需保证核心能力（UI Shell、ExecutionService、Node Executor）优先落地并通过回归测试。

## 6. 风险与控制策略

| 风险           | 描述                            | 缓解措施                                                             |
| -------------- | ------------------------------- | -------------------------------------------------------------------- |
| 功能回退       | 大规模拆分导致关键流程不可用    | 为 Canvas/Execution/NodeDefinition 引入 feature flag，阶段性回归测试 |
| 数据迁移失败   | 新旧本地存储结构不兼容          | 编写版本化迁移，提供备份/回滚脚本，灰度发布                          |
| 协议不兼容     | 旧 Worker/Server 无法理解新协议 | 握手阶段检查 `protocolVersion`，提供兼容适配层并在控制台提示升级     |
| 执行性能下降   | 新架构初期可能增加调度开销      | 引入性能监控指标（FPS、执行耗时），对比回归并优化热路径              |
| 开发冲突       | 多人同时改动核心模块            | 以模块为单位拆分 PR，提前锁定文件，建立代码所有权                    |
| 测试覆盖不足   | 新模块缺少自动化测试            | 强制 PR 附带单元/端到端测试，CI 红灯禁止合入                         |
| 第三方依赖风险 | 新增库可能影响体积或兼容性      | 评估依赖体积与维护度，优先复用现有生态（VueUse、lodash-es 按需）     |

## 7. 质量与测试策略

- **Lint & TypeCheck**：新增 ESLint + TypeScript 严格模式，集成 Tailwind 与 Vue 规则。
- **Unit Test**：覆盖服务层与执行内核关键逻辑，维护快照、边案例与错误路径。
- **Integration Test**：模拟 Worker/Server 事件流，校验 ExecutionService 与 store 行为。
- **E2E Test**：Playwright 驱动核心用户路径，包含 Worker/Server 模式、节点拖拽、变量预览。
- **性能基线**：记录旧版 FPS、执行耗时、初始加载时间，重构阶段定期对比。
- **灰度发布**：通过环境变量或用户设置启用新功能，逐步扩大范围。

## 8. 交付物清单

- 分阶段 PR 与合并记录，附带评审 checklist。
- `docs/refactoring/`：架构设计、实施日志、迁移说明、性能报告。
- `docs/execution-protocol.md`：协议定义、状态机、错误码。
- `docs/node-definition-guide.md`：节点 schema、metadata 构建、插件准入标准。
- 自动化测试报告：Vitest 覆盖率、Playwright 场景记录、性能对比。
- 数据迁移脚本与恢复工具，确保用户数据安全。

## 9. 后续扩展建议

- 基于 HookSystem 与 metadata 构建插件市场，支持第三方节点热插拔。
- 引入多主题与国际化，利用统一 UI Shell 快速切换。
- 构建实时协作（WebSocket 同步）、操作日志与回放功能。
- 搭建执行监控面板，展示运行指标、错误分布、队列情况。
- 为 ExecutionService 扩展 gRPC / HTTP 远程执行适配器，实现云端执行。

---

本文件由 GPT Codex 方案生成并维护，实施过程中请结合实际进展持续更新细节、风险评估与时间表，确保重构安全落地。

> 注：阶段之间可存在部分并行，根据团队规模调整。

## 6. 风险与应对

| 风险              | 描述                           | 缓解措施                                     |
| ----------------- | ------------------------------ | -------------------------------------------- |
| 功能回退          | 大规模拆分可能导致关键功能失效 | 引入 feature flag，阶段性回归测试            |
| 数据迁移失败      | LocalStorage 数据结构改变      | 提供版本化迁移与回退策略                     |
| Worker 协议不兼容 | 老版本 Worker 与新前端冲突     | 在初始化阶段校验 `protocolVersion`，提示升级 |
| 开发冲突          | 多人协作修改同一区域           | 以功能为单位拆分 PR，提前锁定修改范围        |
| 测试缺失          | 新模块缺乏覆盖                 | 强制 PR 附带测试/用例，CI 限制合入           |

## 7. 交付物清单

- 重构后的代码（按阶段 PR）。
- `docs/refactoring/` 下架构设计、实施记录与迁移说明。
- `docs/execution-protocol.md`：执行消息协议文档。
- `docs/node-definition-guide.md`：节点定义与元数据构建指南。
- 测试报告：单测覆盖率、E2E 场景、性能基准。
- 迁移脚本与注意事项（含旧数据恢复方案）。

## 8. 后续扩展建议

- 在新架构上引入国际化、多主题实时切换。
- 搭建插件机制（第三方节点市场），利用 HookSystem 扩展执行流程。
- 研发实时协作能力（WebSocket 同步、操作日志）。
- 建立运行时监控面板，展示执行指标、性能、错误。

---

本文件由 GPT Codex 方案生成，供重构实施团队参考。实施过程中应结合实际进展持续更新细节与时间表。
