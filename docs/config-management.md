# 配置文件管理

## 核心原则

1. **集中管理**：所有配置统一存放在 `config/` 目录
2. **对象组织**：使用对象形式组织配置，避免零散变量
3. **模块划分**：按功能模块划分配置文件（app、api、theme、constants 等）
4. **类型安全**：使用 `as const` + `typeof` 导出类型
5. **统一导出**：通过 `config/index.ts` 统一导出所有配置

## 配置文件结构

```
src/config/
├── index.ts         # 统一导出入口
├── app.ts           # 应用配置（应用信息、分页、上传等）
├── api.ts           # API 配置（baseURL、超时、端点等）
├── theme.ts         # 主题配置（颜色、布局、动画等）
├── constants.ts     # 业务常量（状态枚举、格式、正则等）
└── routes.ts        # 路由配置（默认路径、白名单、权限等）
```

## 配置编写规范

### 1. 使用对象形式 + as const

```typescript
// ✅ 好：对象形式，类型明确
export const apiConfig = {
  baseURL: "https://api.example.com",
  timeout: 5000,
  retries: 3,
} as const;

// ❌ 不好：零散变量
export const API_BASE_URL = "https://api.example.com";
export const API_TIMEOUT = 5000;
export const API_RETRIES = 3;
```

### 2. 分层组织配置

```typescript
export const appConfig = {
  /** 应用信息 */
  app: {
    name: "我的应用",
    version: "1.0.0",
  },
  /** 分页配置 */
  pagination: {
    defaultPage: 1,
    defaultPageSize: 20,
  },
} as const;
```

### 3. 必须使用 JSDoc 注释

```typescript
/** 应用配置 */
export const appConfig = {
  /** 应用名称 */
  name: "我的应用",
  /** 默认页码 */
  defaultPage: 1,
} as const;
```

### 4. 导出类型

```typescript
export const appConfig = {
  /* ... */
} as const;

/** 应用配置类型 */
export type AppConfig = typeof appConfig;
```

### 5. 环境变量处理

```typescript
export const apiConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
  isDev: import.meta.env.DEV,
} as const;
```

## 配置使用方式

### 按需导入（推荐）

```typescript
import { apiConfig, appConfig } from "@/config";

const baseURL = apiConfig.baseURL;
const pageSize = appConfig.pagination.defaultPageSize;
```

### 整体导入

```typescript
import config from "@/config";

const baseURL = config.api.baseURL;
```

## 统一导出配置

在 `config/index.ts` 中统一导出：

```typescript
export { appConfig } from "./app";
export { apiConfig } from "./api";
export { themeConfig } from "./theme";

export const config = {
  app: appConfig,
  api: apiConfig,
  theme: themeConfig,
} as const;

export default config;
```

## JSDoc 注释规范

### 为什么需要 JSDoc

- VSCode 鼠标悬停时显示说明
- 自动补全时显示配置项说明
- 提高代码可维护性

### 注释示例

```typescript
/** 用户配置 */
export const userConfig = {
  /** 默认用户名长度限制 */
  maxNameLength: 20,
  /** 默认头像地址 */
  defaultAvatar: "/default-avatar.png",
} as const;
```

### 注释要求

- ✅ 每个配置对象必须有注释
- ✅ 每个配置字段必须有注释
- ✅ 使用简洁的中文说明
- ✅ 复杂配置可以使用多行注释 + @example

## 常见配置分类

### app.ts - 应用配置

- 应用信息（名称、版本、描述）
- 环境配置（开发/生产）
- 分页配置
- 上传配置
- 本地存储键名

### api.ts - API 配置

- 基础配置（baseURL、timeout）
- 状态码定义
- 重试配置
- API 端点路径

### theme.ts - 主题配置

- 主题模式
- 颜色配置（light/dark）
- 布局尺寸
- 动画配置
- 响应式断点

### constants.ts - 业务常量

- 业务状态枚举
- 日期格式模板
- 正则表达式
- 文件类型定义

### routes.ts - 路由配置

- 默认路由路径
- 路由白名单
- 页面标题配置
- 权限配置

## 注意事项

- ⚠️ 不要将所有配置都写在一个文件中
- ⚠️ 不要使用零散的常量导出
- ⚠️ 环境相关配置必须使用环境变量
- ⚠️ 魔法数字/字符串必须提取到配置文件
