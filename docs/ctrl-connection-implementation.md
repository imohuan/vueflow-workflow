# Ctrl 拖拽快速连线实现说明

## 功能目标

- 支持在拖拽连线时按住 `Ctrl` 键即可快速吸附最近的合法端口，并在松开鼠标时立即创建连接。
- 吸附过程中提供实时的节点高亮与连线颜色反馈，帮助用户判断当前连接是否合法。
- 在保持准确性的同时控制性能开销，避免在大画布上拖动时出现明显卡顿。

## 核心实现流程

### 1. 全局状态与上下文注入

- 在 `NodeEditor.vue` 中新增 `ctrlConnectActive` 计算属性以及 `ctrlConnectCandidate` 状态，用于记录当前是否处于 Ctrl 吸附模式、候选节点与端口信息。
- 通过 `provide(CTRL_CONNECT_CONTEXT_KEY, …)` 将状态下发给子组件，配合 `contextKeys.ts` 中的类型定义为节点包裹组件和连线组件提供统一数据来源。

### 2. 指针位置捕获与 DOM 命中

- 使用 `useEventListener(window, "mousemove", …)` 持续缓存最近的画布坐标 (`lastPointerPosition`) 与屏幕坐标 (`lastClientPointer`)，仅当指针处于 Vue Flow 根元素内时才更新。
- 在 `getProjectedPositionFromEvent` 中统一处理鼠标与触摸事件，同时更新 `lastClientPointer`，以便在连接结束（`onConnectEnd`）时继续使用同一指针信息。

### 3. 端口匹配算法

- `updateCtrlConnectCandidate` 会在以下场景触发：
  - Ctrl 状态变化、连接开始、指针移动、外部请求刷新。
- 算法步骤：
  1. 利用 `document.elementFromPoint(lastClientPointer)` 获取当前指针下的元素，再向上寻找 `.vue-flow__node` 与 `.vue-flow__handle`。
  2. 通过 `vueFlowApi.findNode(nodeId)` 取得 Vue Flow 内部的 `GraphNode`，读取其 `handleBounds`（所有 handle 的绝对尺寸与偏移）。
  3. 将 `GraphNode.computedPosition` 与 `handleBounds` 相加得到端口中心点坐标，构造候选列表。
  4. 如果当前命中元素本身就是合法的 handle，则给予大幅度的负权重，使其在距离相同的情况下优先被选中。
  5. 遍历候选端口，基于指针与端口中心的距离选出最优端口，同时构建潜在连接对象并调用 `store.validateConnection(connection, { ignoreExisting: true, silent: true })` 进行静默校验。
  6. 将候选结果写入 `ctrlConnectCandidate`，供连线和节点组件进行后续反馈。

### 4. 视觉反馈

- `CustomConnectionLine.vue` 通过 `inject` 获取 `ctrlConnectCandidate`，在存在候选端口时将连线终点移动到端口中心，并根据合法性切换颜色。
- `NodeWrapper.vue` 同样通过上下文感知，使用独立的 CSS 类在候选节点外框添加绿色或红色高亮。

### 5. 连接落地

- 在 `onConnectEnd` 中调用 `finalizeCtrlConnection()`：
  - 再次确认候选端口合法且未出现重复连接。
  - 组合成新的 `Edge` 实例并走现有的 `store.addEdge` 流程，保证样式、历史记录等逻辑保持一致。
  - 重置候选状态以避免留下残影。

## 性能优化要点

- 替换原先的全量节点遍历，改为 `elementFromPoint` + `handleBounds` 直接定位端口，指针移动时的计算完全限制在单个节点范围内。
- `store.validateConnection` 增加 `silent` 选项，吸附探测时不会输出大量告警，减少 DevTools 噪音。
- 仅在实际进入 Ctrl 模式、指针位于画布内且命中到节点时才执行计算，避免多余的更新。

## 相关文件列表

- `src/views/NodeEditor.vue`：Ctrl 模式的状态、事件监听、端口匹配与自动建边逻辑。
- `src/components/node-editor/contextKeys.ts`：上下文键及类型定义。
- `src/components/node-editor/CustomConnectionLine.vue`：拖拽预览线吸附与颜色反馈。
- `src/components/node-editor/nodes/NodeWrapper.vue`：候选节点的边框高亮。
- `src/composables/nodeEditor/useEdgeManagement.ts`、`src/typings/nodeEditor.d.ts`：为静默校验引入 `silent` 参数。

## 使用与测试建议

1. 在画布上从输出端口按住 `Ctrl` 拖动，观察连线会贴合目标端口中心，节点根据合法性高亮。
2. 松开鼠标即可立即创建连接，无需额外点击。
3. 将指针移动到非法端口或不同节点时，颜色会转为红色并取消候选；松开不会创建连接。
4. 在大规模节点场景下拖动，确认画布保持流畅，避免出现明显卡顿。

如需进一步扩展（例如为不同节点提供自定义吸附规则），可在 `updateCtrlConnectCandidate` 中加入节点自定义策略或在 `validateConnection` 前增加额外判断。
