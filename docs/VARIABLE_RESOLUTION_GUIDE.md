# 工作流变量解析执行实现说明

## 背景

在最新的修复中，我们让 `workflow-node-executor` 端与前端编辑器保持一致的变量解析逻辑，以解决执行阶段无法识别 `{{ 条件判断.allEvaluations }}` 等变量的问题。同时，为了便于排查潜在的变量解析差异，增加了统一前缀的调试日志，并完善了调试节点 `EchoNode` 的输入读取逻辑。

## 核心改动

1. **变量解析能力下沉至执行器**

   - 新增 `packages/node-executor/src/variableResolver.ts`，复用前端的变量上下文构建与模板解析算法。
   - 在执行流程 (`workflowExecutor.ts`) 中调用 `buildVariableContext` + `resolveConfigWithVariables`，在调度节点之前就解析配置中的变量。

2. **上下文键与前端保持一致**

   - `contextMap` 同时保存 `节点名` 与 `节点名.输出ID`，并递归展开字段，确保引用路径与前端 VariableTextInput/Preview 中的显示完全一致。
   - 跳过值为 `undefined` 的输出，避免写入无效键。

3. **统一调试日志**

   - 在变量解析、配置解析、模板替换等关键节点写入 `[NODE_EXECUTOR_DEBUG]` 前缀日志，日志中包含：
     - 构建上下文的目标节点、上游节点 ID、可用键；
     - 模板解析时的原始配置、替换前后值；
     - 解析后的最终配置。
   - 进行问题排查时，只需提供该前缀的日志即可快速定位。

4. **Echo 调试节点增强**
   - `packages/browser-nodes/src/nodes/debug/EchoNode.ts` 现在优先读取解析后的 `config.input`，同时兼容 `inputs.input` / `inputs.__input__` / `inputs.default` 等 fallback，便于直接观察解析结果。

## 使用流程

1. **运行工作流**：在节点配置中引用变量（如 `{{ 条件判断.allEvaluations }}`），执行后即可在回显节点看到解析后的真实数据。
2. **抓取调试日志**：如遇解析异常，打开控制台过滤 `[NODE_EXECUTOR_DEBUG]`，复制全部日志反馈即可。
3. **验证构建**：
   ```bash
   pnpm --filter workflow-node-executor build
   pnpm --filter workflow-browser-nodes build
   ```

## 后续建议

- 如需对其他节点做类似调试，可参考 `EchoNode` 的读取方式，优先使用解析后的 `config`。
- 如果还需要更详细的日志，可在相同前缀下继续扩展，保持统一检索体验。
