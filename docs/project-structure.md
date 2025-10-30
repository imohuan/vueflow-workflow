# 项目结构规范

## 标准目录结构

```
src/
├── assets/          # 静态资源（图片、字体等）
├── components/      # 通用组件
│   ├── common/      # 基础通用组件（Button、Input 等）
│   └── business/    # 业务组件
├── composables/     # 组合式函数（Hooks）
│   ├── index.ts     # Hooks 统一导出
│   ├── business/    # 业务逻辑 Hooks（useUser、useProduct 等）
│   ├── common/      # 通用逻辑 Hooks
│   │   ├── useBoolean.ts      # 布尔状态管理
│   │   ├── useAsync.ts        # 异步操作管理
│   │   ├── useLocalStorage.ts # 本地存储管理
│   │   └── useDebounce.ts     # 防抖处理
│   └── ui/          # UI 交互 Hooks（useDialog、useTable 等）
├── config/          # 配置文件目录
│   ├── index.ts     # 配置入口（统一导出）
│   ├── app.ts       # 应用配置
│   ├── theme.ts     # 主题配置
│   ├── api.ts       # API 配置
│   └── constants.ts # 常量配置
├── icons/           # SVG 图标文件
│   ├── common/      # 通用图标
│   └── business/    # 业务图标
├── router/          # 路由配置
│   └── index.ts
├── stores/          # Pinia 状态管理
│   ├── index.ts     # Store 入口
│   └── user.ts      # 用户 Store
├── typings/         # TypeScript 类型声明
│   ├── api.d.ts     # API 相关类型
│   ├── common.d.ts  # 通用类型
│   └── models.d.ts  # 数据模型类型
├── utils/           # 工具函数
│   ├── index.ts     # 工具函数统一导出
│   ├── request.ts   # HTTP 请求封装（Axios）
│   ├── notify.ts    # 通知工具
│   ├── format.ts    # 格式化工具（日期、金额、文件大小等）
│   ├── validate.ts  # 验证工具
│   ├── storage.ts   # 本地存储工具
│   └── eventBus.ts  # 事件总线（Mitt）
├── views/           # 页面组件
│   ├── home/        # 首页模块
│   │   ├── Home.vue
│   │   └── components/  # 页面私有组件
│   └── user/        # 用户模块
│       ├── UserProfile.vue
│       └── components/
├── App.vue          # 根组件
├── main.ts          # 入口文件
└── style.css        # 全局样式
```

## 文件命名规范

### 组件文件

- **Vue 组件**：使用大驼峰命名（PascalCase）
  - `UserProfile.vue`
  - `NavigationBar.vue`
  - `DataTable.vue`

### TypeScript/JavaScript 文件

- **工具函数**：使用小驼峰命名（camelCase）

  - `formatDate.ts`
  - `validateEmail.ts`
  - `parseQuery.ts`

- **类型声明**：使用小驼峰命名，`.d.ts` 后缀
  - `api.d.ts`
  - `userModel.d.ts`

### SVG 图标

- 使用小驼峰命名，`.svg` 后缀
  - `iconHome.svg`
  - `iconUser.svg`
  - `iconArrowRight.svg`

### 目录

- 使用小驼峰命名
  - `components/`
  - `utils/`
  - `typings/`

## SVG 图标管理

### 图标文件组织

```
src/icons/
├── common/
│   ├── iconHome.svg
│   ├── iconSearch.svg
│   └── iconClose.svg
└── business/
    ├── iconOrder.svg
    └── iconProduct.svg
```

### 图标组件封装示例

创建 `src/components/common/SvgIcon.vue`：

```vue
<script setup lang="ts">
interface Props {
  name: string;
  size?: number | string;
  color?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  color: "currentColor",
});

const iconPath = computed(() => {
  return new URL(`../../icons/${props.name}.svg`, import.meta.url).href;
});
</script>

<template>
  <img
    :src="iconPath"
    :style="{ width: `${size}px`, height: `${size}px`, color }"
    alt="icon"
  />
</template>
```

使用方式：

```vue
<SvgIcon name="common/iconHome" :size="20" />
```

## 类型声明管理

### 通用类型声明 `src/typings/common.d.ts`

```typescript
/** 分页参数 */
export interface PaginationParams {
  /** 页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
}

/** API 响应数据结构 */
export interface ApiResponse<T = any> {
  /** 响应状态码 */
  code: number;
  /** 响应消息 */
  message: string;
  /** 响应数据 */
  data: T;
}

/** 列表响应结构 */
export interface ListResponse<T> {
  /** 列表数据 */
  list: T[];
  /** 总记录数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
}
```

### API 类型声明 `src/typings/api.d.ts`

```typescript
/** 用户信息 */
export interface UserInfo {
  /** 用户ID */
  id: string;
  /** 用户名 */
  name: string;
  /** 邮箱 */
  email: string;
  /** 头像地址 */
  avatar?: string;
}

/** 登录请求参数 */
export interface LoginParams {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
}

/** 登录响应数据 */
export interface LoginResponse {
  /** 访问令牌 */
  token: string;
  /** 用户信息 */
  userInfo: UserInfo;
}
```

## 工具函数示例

### 格式化工具 `src/utils/format.ts`

```typescript
/** 格式化日期 */
export function formatDate(
  date: Date | string | number,
  format = "YYYY-MM-DD"
): string {
  // 实现逻辑
}

/** 格式化金额 */
export function formatMoney(amount: number, currency = "¥"): string {
  return `${currency}${amount.toFixed(2)}`;
}

/** 格式化文件大小 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
```

### 验证工具 `src/utils/validate.ts`

```typescript
/** 验证邮箱格式 */
export function validateEmail(email: string): boolean {
  const reg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return reg.test(email);
}

/** 验证手机号格式（中国大陆） */
export function validatePhone(phone: string): boolean {
  const reg = /^1[3-9]\d{9}$/;
  return reg.test(phone);
}
```
