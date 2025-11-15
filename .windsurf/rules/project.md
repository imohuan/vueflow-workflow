---
trigger: always_on
---

# 项目开发规范

## 环境与工具

- 包管理器：默认使用 pnpm（如项目中存在 pnpm-lock.yaml）
- Windows 环境：使用 PowerShell 脚本
- 其他环境：根据项目实际配置自动适配（如 npm、yarn、bun 等）
- API 文档查询：使用 Context7 MCP 查询第三方库的最新 API 文档

## 交流与语言

- 全程使用中文进行交流和内容输出
- 代码注释使用中文，除非项目已有英文注释规范
- 变量命名使用英文，遵循驼峰或下划线命名规范

## 前端开发规范

### HTML/CSS

- 编写 HTML 页面时默认使用 Tailwind CSS 进行样式开发
- 图标优先使用 SVG 格式（内联或组件形式）
- 响应式设计：优先采用移动端优先策略
- 语义化 HTML：使用恰当的 HTML5 语义标签

### JavaScript/TypeScript

- 优先使用 TypeScript，确保类型安全
- 使用 ES6+ 现代语法特性
- 异步操作使用 async/await 而非 Promise.then()
- 避免使用 any 类型，尽量提供明确的类型定义

### 组件开发

- 组件化优先：将可复用逻辑抽离为独立组件
- 状态管理：使用 Pinia 进行全局状态管理，采用 Setup Store 写法
- Props 验证：提供完整的 props 类型定义和默认值
- 路由管理：使用 Vue Router 进行页面路由管理
- 工具函数：优先使用 VueUse 提供的组合式函数
- 数据处理：使用 lodash-es 进行复杂数据操作（按需导入）

## 代码质量

### 编码原则

- 遵循 DRY 原则（Don't Repeat Yourself）
- 单一职责原则：每个函数/组件只做一件事
- 代码可读性优先于过度简洁
- 使用有意义的变量和函数命名

### 错误处理

- 必须处理所有可能的异常情况
- 提供用户友好的错误提示信息
- 关键操作添加 try-catch 块
- 避免让程序静默失败

### 性能优化

- 避免不必要的重复渲染
- 大列表使用虚拟滚动
- 图片懒加载和压缩
- 合理使用缓存和防抖节流
- 路由懒加载：使用动态导入 `() => import('@/views/XXX.vue')`
- lodash-es 按需导入：避免 `import _ from 'lodash-es'`

### Vue 生态最佳实践

#### Pinia Store 规范

- 使用 Setup Store 写法（Composition API 风格）
- Store 命名：`use[Name]Store`，如 `useUserStore`
- 保持 Store 职责单一，避免创建过大的全局 Store
- 复杂的派生状态使用 `computed`
- 异步操作封装在 action 函数中

#### Vue Router 规范

- 路由命名：使用大驼峰命名，如 `UserProfile`
- 动态路由参数类型化：使用 TypeScript 定义路由元信息
- 路由守卫：在需要权限控制的路由中使用 `beforeEach`
- 懒加载：所有页面级组件使用动态导入

#### VueUse 使用建议

- 优先使用 VueUse 提供的函数，避免重复造轮子
- 常用函数：`useLocalStorage`、`useDebounce`、`useThrottle`、`useWindowSize`
- 响应式工具：`useVModel`、`useToggle`、`useCounter`
- 网络请求：`useFetch` 可用于简单的数据获取场景

#### lodash-es 使用规范

- 按需导入：`import { debounce, cloneDeep } from 'lodash-es'`
- 禁止全量导入：避免 `import _ from 'lodash-es'`
- 常用函数：`debounce`、`throttle`、`cloneDeep`、`isEmpty`、`isEqual`
- 优先使用原生方法：如果原生 JavaScript 方法足够，不必使用 lodash

## API 文档查询规范

### Context7 MCP 使用

在使用第三方库开发功能前，必须通过 Context7 MCP 查询最新的 API 文档，确保使用的是最新、最正确的 API。

#### 查询流程

1. **解析库 ID**：使用 `resolve-library-id` 工具获取库的 Context7 ID

   - 输入库名称（如 "vue"、"pinia"、"vueuse"）
   - 获取准确的库 ID（格式：`/org/project` 或 `/org/project/version`）

2. **获取文档**：使用 `get-library-docs` 工具获取最新文档
   - 使用第一步获得的库 ID
   - 可指定具体的主题（如 "hooks"、"routing"、"composition-api"）
   - 根据需要调整 tokens 参数（默认 5000，复杂场景可增加）

#### 适用场景

必须使用 Context7 MCP 查询的情况：

- 使用新的第三方库或框架
- 使用不熟悉的 API
- API 可能已更新或弃用的情况
- 需要查看完整参数、返回值、使用示例

可以跳过查询的情况：

- 使用非常基础、确定不会改变的原生 JavaScript API
- 项目内部自定义的工具函数和组件
- 已经非常熟悉且近期使用过的 API

#### 常用库查询示例

- Vue 3 核心 API：查询 `vue` 或 `/vuejs/core`
- Pinia 状态管理：查询 `pinia` 或 `/vuejs/pinia`
- VueUse 工具库：查询 `vueuse` 或 `/@vueuse/core`
- Vue Router：查询 `vue-router` 或 `/vuejs/router`
- Tailwind CSS：查询 `tailwindcss` 或 `/tailwindlabs/tailwindcss`
- lodash-es：查询 `lodash` 或 `/lodash/lodash`

#### 注意事项

- 优先查询官方维护的文档库（trust score 7-10）
- 如果库有多个版本，优先使用项目中实际安装的版本
- 查询时指定具体主题可以获得更精准的文档内容
- 将查询到的 API 信息应用到代码中，确保参数、类型、用法正确

## 工作流程

### 开发流程

1. 理解需求：确认功能需求和技术细节
2. **查询最新 API**：使用 Context7 MCP 查询相关第三方库的最新 API 文档（必须步骤）
3. 实现优先：先实现功能，后优化代码
4. 测试验证：确保功能正常工作
5. 代码整理：清理临时代码和调试信息

### 代码修改

- 优先修改现有文件，避免创建不必要的新文件
- 保持项目结构一致性
- 修改配置文件时保留现有配置项
- 删除代码前确认无其他依赖

## 文档策略

- **禁止主动创建文档**：除非用户明确要求，否则不要创建 README、开发文档、API 文档等任何形式的文档
- **禁止在 docs 目录创建文档**：`docs/` 目录是系统级文档目录，禁止在此目录下创建任何文档。即使用户要求创建文档，也应在项目根目录或其他合适位置创建
- **禁止生成注释文档**：不要为每个函数生成冗长的 JSDoc 注释，除非用户强调需要
- **代码即文档**：编写自解释的代码，使用清晰的命名和结构
- **必要说明**：仅在复杂逻辑处添加简短的行内注释

## 测试策略

- 关键业务逻辑必须经过测试验证
- 边界条件和异常情况的测试
- 不必为每个函数写单元测试，除非用户要求
- 优先进行功能性手动测试

## Git 提交规范

- 不要主动执行 git commit，除非用户明确要求
- 不要使用 --no-verify 跳过 hooks
- 永远不要 force push 到 main/master 分支
- 提交信息使用中文，格式：`类型: 简短描述`

## 依赖管理

- 安装新依赖前检查是否已存在类似功能的包
- 优先选择维护活跃、star 数高的成熟库
- 记录依赖的用途和版本选择原因
- 避免安装体积过大的依赖

## 响应方式

- 理解需求后直接开始实现，不要过度询问
- 如遇到模糊需求，基于最佳实践做出合理推断并实施
- 完成任务后简洁汇报，无需冗长说明
- 遇到错误时，直接修复而不是仅仅指出问题

## 禁止行为

- ❌ 禁止生成极长的哈希值或二进制内容
- ❌ 禁止创建不必要的临时脚本（完成后需清理）
- ❌ 禁止在未理解需求时盲目猜测参数
- ❌ 禁止修改 git 配置
- ❌ 禁止使用 emoji 表情，除非用户明确要求
