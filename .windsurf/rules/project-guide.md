---
trigger: always_on
---

---

## alwaysApply: true

# 项目开发指南

这是一个基于 Vue 3 + TypeScript + Vite + Tailwind CSS 的现代化前端项目。

## 核心技术栈

- **构建工具**：Vite
- **样式方案**：Tailwind CSS
- **UI 组件**：纯 Tailwind CSS + Vue 组件（位于 `src/components/common/`）
- **包管理器**：pnpm
- **路由管理**：Vue Router
- **状态管理**：Pinia（Setup Store 风格）
- **工具库**：VueUse、lodash-es、mitt（事件总线）

## 开发原则

1. **类型安全优先**：所有函数必须有明确的类型定义，避免使用 `any`
2. **逻辑分离**：复杂逻辑抽离为 Hooks（Composables），保持组件简洁
3. **配置集中管理**：所有配置统一放在 `config/` 目录，使用对象形式组织
4. **单一职责**：组件、函数、Hooks 都保持单一职责
5. **避免循环依赖**：Hooks 之间不要相互依赖，使用参数传递或 Pinia 共享状态

## 项目规范速查

### 文件命名

- Vue 组件：`PascalCase.vue`（如 `UserProfile.vue`）
- TypeScript 文件：`camelCase.ts`（如 `formatDate.ts`）
- 类型声明：`camelCase.d.ts`（如 `api.d.ts`）
- SVG 图标：`iconName.svg`（如 `iconHome.svg`）

### 目录结构

```
src/
├── components/      # 组件（common/ 通用，business/ 业务）
├── composables/     # Hooks（business/ common/ ui/）
├── config/          # 配置文件（使用对象形式 + JSDoc 注释）
├── stores/          # Pinia Store
├── typings/         # TypeScript 类型声明
├── utils/           # 工具函数
├── views/           # 页面组件
├── volt/            # Volt UI 组件（从 PrimeVue 下载的组件）
└── icons/           # SVG 图标
```

### 组件通信

- **父子组件** → 使用 `Props/Emit`
- **全局状态** → 使用 `Pinia Store`
- **跨组件通信** → 使用 `Mitt 事件总线`
- **逻辑复用** → 使用 `Hooks (Composables)`

### 代码组织

- 配置信息统一放在 `config/` 目录，使用对象形式 + `as const`
- 配置字段必须添加 JSDoc 注释（`/** */`）
- Pinia 使用 Setup Store 写法
- lodash-es 按需导入：`import { debounce } from 'lodash-es'`
- 路由懒加载：`component: () => import('@/views/XXX.vue')`
- **Volt 组件导入必须使用 `@/volt` 路径别名**：
  - `import Button from '@/volt/Button.vue'`
  - `import DataTable from '@/volt/DataTable.vue'`
  - 禁止使用相对路径导入 Volt 组件（如 `../volt/Button.vue`）
- **类型导入必须使用 `type` 关键字**：
  - 混合导入：`import { ref, type Ref } from "vue"`
  - 纯类型导入：`import type { UserInfo } from "@/typings/api"`
  - 默认导出 + 类型：`import axios, { type AxiosInstance } from "axios"`

### 性能优化

- 使用计算属性缓存复杂计算
- 大列表使用虚拟滚动（VueUse 的 `useVirtualList`）
- 防抖节流使用 lodash-es 或 VueUse
- 路由和组件懒加载

## 详细文档导航

### 📚 核心文档

- **[技术栈和初始化](../../docs/tech-stack.md)** - 技术栈详解、初始化指南、依赖配置
- **[项目结构规范](../../docs/project-structure.md)** - 目录结构、文件命名、图标管理
- **[配置文件管理](../../docs/config-management.md)** - 配置组织、JSDoc 注释、环境变量
- **[Volt UI 组件库配置](../../docs/volt-setup.md)** - Volt 安装、配置、使用指南

### 🎨 设计规范

- **[组件设计原则](../../docs/component-design.md)** - 单一职责、组件分层、Props/Events 设计
- **[Hooks 使用指南](../../docs/hooks-guide.md)** - Hooks 编写、避免依赖、常用模板

### 📡 通信与规范

- **[组件通信方式](../../docs/communication.md)** - Props/Emit、Pinia、Mitt、Provide/Inject
- **[代码规范](../../docs/code-standards.md)** - 类型安全、错误处理、命名规范、性能优化

### 🛠️ 工具和库

- **[常用工具方法和 Hooks](../../docs/common-utilities.md)** - HTTP 请求封装、useBoolean、useAsync 等实用工具

### ✅ 质量保证

- **[开发检查清单](../../docs/checklist.md)** - 开发前、开发中、提交前的完整检查清单

## 快速参考

### 创建新功能的标准流程

1. 在 `typings/` 中定义相关类型
2. 在 `config/` 中添加配置（如需要）
3. 创建 Hooks 抽离复杂逻辑（`composables/`）
4. 开发组件（保持职责单一）
5. 测试功能和交互
6. 检查清单验证
7. 提交代码

### 常见问题

**Q: 什么时候使用 Pinia？**  
A: 只在需要跨多个组件共享的全局状态时使用，局部状态应在组件内管理。

**Q: Hooks 可以相互调用吗？**  
A: 避免 Hooks 相互依赖。如果需要共享状态，使用 Pinia；如果需要传递数据，使用参数。

**Q: 配置文件如何组织？**  
A: 使用对象形式组织，添加 JSDoc 注释，使用 `as const`，通过 `config/index.ts` 统一导出。

**Q: 如何处理跨组件通信？**  
A: 父子用 Props/Emit，全局状态用 Pinia，事件通知用 Mitt，避免使用 Provide/Inject。

**Q: 如何管理加载状态？**  
A: 使用 `useBoolean` Hook 简化布尔状态管理，或使用 `useAsync` 自动处理异步操作的加载状态。

**Q: HTTP 请求如何封装？**  
A: 使用 `utils/request.ts` 中的 Axios 封装，已包含失败重试、拦截器和错误处理。

**Q: 如何使用 Volt UI 组件？**  
A: 使用 `npx volt-vue add [组件名]` 下载组件到 `src/volt/` 目录，然后使用 `@/volt` 路径别名导入，如 `import Button from '@/volt/Button.vue'`。

**Q: Volt 组件如何定制样式？**  
A: 可通过三种方式：1) 修改 CSS 变量；2) 传递 Tailwind 类到 class 属性；3) 直接修改 `src/volt/` 中的组件文件。

## 注意事项

- ⚠️ 事件总线监听器必须在组件卸载时清理
- ⚠️ 避免 Hooks 之间形成依赖链
- ⚠️ 配置文件每个字段都要有 JSDoc 注释
- ⚠️ lodash-es 必须按需导入，避免 `import _ from 'lodash-es'`
- ⚠️ 不要滥用 Pinia，只存储真正需要共享的状态
- ⚠️ **类型导入必须添加 `type` 关键字**，避免类型和值混淆
- ⚠️ **Volt 组件必须使用 `@/volt` 路径别名导入**，禁止使用相对路径

## 开发工具

- **包管理**：`pnpm install` / `pnpm add xxx`
- **开发**：`pnpm dev`
- **构建**：`pnpm build`
- **预览**：`pnpm preview`

---

💡 **提示**：遇到具体问题时，请查阅对应的详细文档获取完整指南和示例代码。
