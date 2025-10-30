# 常用工具方法和 Hooks

本文档介绍项目中常用的工具函数和组合式函数（Hooks），帮助开发者提高开发效率，减少重复代码。

## 目录

- [HTTP 请求工具](#http-请求工具)
- [常用 Hooks](#常用-hooks)
- [其他实用工具](#其他实用工具)

---

## HTTP 请求工具

### Axios 封装

项目使用 Axios 进行 HTTP 请求，并封装了请求/响应拦截器、失败重试、错误处理等功能。

#### 安装依赖

```bash
pnpm add axios
```

#### 实现代码

**文件位置**：`src/utils/request.ts`

```typescript
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { notify } from "./notify"; // 假设项目中有 notify 工具

/** 请求配置 */
const requestConfig = {
  /** 基础 URL */
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  /** 请求超时时间（毫秒） */
  timeout: 10000,
  /** 最大重试次数 */
  maxRetries: 3,
  /** 重试延迟时间（毫秒） */
  retryDelay: 1000,
} as const;

/** 响应数据结构 */
interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

/** 创建 axios 实例 */
const instance: AxiosInstance = axios.create({
  baseURL: requestConfig.baseURL,
  timeout: requestConfig.timeout,
  headers: {
    "Content-Type": "application/json",
  },
});

/** 请求拦截器 */
instance.interceptors.request.use(
  (config) => {
    // 添加 token
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加时间戳防止缓存（可选）
    if (config.method === "get") {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/** 响应拦截器 */
instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { code, data, message } = response.data;

    // 成功响应
    if (code === 200 || code === 0) {
      return data;
    }

    // 业务错误
    notify({
      type: "error",
      title: "请求失败",
      message: message || "未知错误",
    });

    return Promise.reject(new Error(message || "请求失败"));
  },
  async (error: AxiosError) => {
    const config = error.config as AxiosRequestConfig & {
      _retryCount?: number;
    };

    // 处理网络错误
    if (!error.response) {
      notify({
        type: "error",
        title: "网络错误",
        message: "请检查您的网络连接",
      });
      return Promise.reject(error);
    }

    const { status } = error.response;

    // 处理 HTTP 状态码错误
    switch (status) {
      case 401:
        notify({
          type: "error",
          title: "未授权",
          message: "请重新登录",
        });
        // 可以在这里触发登出逻辑
        // router.push('/login');
        break;
      case 403:
        notify({
          type: "error",
          title: "权限不足",
          message: "您没有权限访问此资源",
        });
        break;
      case 404:
        notify({
          type: "error",
          title: "请求失败",
          message: "请求的资源不存在",
        });
        break;
      case 500:
        notify({
          type: "error",
          title: "服务器错误",
          message: "服务器内部错误，请稍后重试",
        });
        break;
      default:
        notify({
          type: "error",
          title: "请求失败",
          message: error.message || "未知错误",
        });
    }

    // 失败重试逻辑（仅对特定错误码重试）
    const shouldRetry = status >= 500 || status === 429; // 服务器错误或限流
    if (shouldRetry && config) {
      config._retryCount = config._retryCount || 0;

      if (config._retryCount < requestConfig.maxRetries) {
        config._retryCount++;

        // 延迟后重试
        await new Promise((resolve) =>
          setTimeout(resolve, requestConfig.retryDelay)
        );

        console.log(
          `重试请求: ${config.url} (${config._retryCount}/${requestConfig.maxRetries})`
        );

        return instance(config);
      }
    }

    return Promise.reject(error);
  }
);

/** 请求方法封装 */
export const request = {
  /**
   * GET 请求
   * @param url 请求地址
   * @param params 请求参数
   * @param config 请求配置
   */
  get<T = any>(
    url: string,
    params?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return instance.get(url, { params, ...config });
  },

  /**
   * POST 请求
   * @param url 请求地址
   * @param data 请求体
   * @param config 请求配置
   */
  post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return instance.post(url, data, config);
  },

  /**
   * PUT 请求
   * @param url 请求地址
   * @param data 请求体
   * @param config 请求配置
   */
  put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return instance.put(url, data, config);
  },

  /**
   * DELETE 请求
   * @param url 请求地址
   * @param config 请求配置
   */
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.delete(url, config);
  },

  /**
   * 上传文件
   * @param url 上传地址
   * @param formData 表单数据
   * @param onProgress 上传进度回调
   */
  upload<T = any>(
    url: string,
    formData: FormData,
    onProgress?: (progressEvent: any) => void
  ): Promise<T> {
    return instance.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: onProgress,
    });
  },
};

export default request;
```

#### 使用示例

```typescript
import request from "@/utils/request";

// GET 请求
const userList = await request.get<UserInfo[]>("/users", { page: 1, size: 10 });

// POST 请求
const newUser = await request.post<UserInfo>("/users", {
  name: "张三",
  email: "zhangsan@example.com",
});

// 上传文件
const formData = new FormData();
formData.append("file", file);

const result = await request.upload("/upload", formData, (progressEvent) => {
  const percent = Math.round(
    (progressEvent.loaded * 100) / progressEvent.total
  );
  console.log(`上传进度: ${percent}%`);
});
```

#### 配置说明

在 `.env` 文件中配置 API 基础地址：

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3000/api

# .env.production
VITE_API_BASE_URL=https://api.example.com
```

---

## 常用 Hooks

### useBoolean

用于管理布尔状态，简化加载状态、对话框显示等场景的代码。

#### 实现代码

**文件位置**：`src/composables/common/useBoolean.ts`

```typescript
import { ref, Ref } from "vue";

/**
 * useBoolean 返回值
 */
interface UseBooleanReturn {
  /** 布尔值 */
  value: Ref<boolean>;
  /** 设置为 true */
  setTrue: () => void;
  /** 设置为 false */
  setFalse: () => void;
  /** 切换布尔值 */
  toggle: () => void;
  /** 设置布尔值 */
  setValue: (val: boolean) => void;
  /** 执行异步函数，自动管理 loading 状态 */
  run: <T>(asyncFn: (...args: any[]) => Promise<T>) => Promise<T | null>;
}

/**
 * 管理布尔状态的 Hook
 * @param initialValue 初始值，默认 false
 * @returns 布尔状态和操作方法
 * @example
 * // 基础用法
 * const loading = useBoolean();
 * loading.setTrue(); // 开始加载
 * loading.setFalse(); // 结束加载
 *
 * @example
 * // 自动管理异步函数的 loading 状态
 * const loading = useBoolean();
 * await loading.run(async () => {
 *   const data = await fetchData();
 *   return data;
 * });
 */
export function useBoolean(initialValue = false): UseBooleanReturn {
  const value = ref(initialValue);

  /** 设置为 true */
  const setTrue = () => {
    value.value = true;
  };

  /** 设置为 false */
  const setFalse = () => {
    value.value = false;
  };

  /** 切换布尔值 */
  const toggle = () => {
    value.value = !value.value;
  };

  /** 设置布尔值 */
  const setValue = (val: boolean) => {
    value.value = val;
  };

  /**
   * 执行异步函数，自动管理 loading 状态
   * @param asyncFn 异步函数
   * @returns 异步函数的返回值，如果出错则返回 null
   */
  const run = async <T>(
    asyncFn: (...args: any[]) => Promise<T>
  ): Promise<T | null> => {
    value.value = true;
    try {
      const result = await asyncFn();
      return result;
    } catch (error) {
      console.error("useBoolean.run error:", error);
      return null;
    } finally {
      value.value = false;
    }
  };

  return {
    value,
    setTrue,
    setFalse,
    toggle,
    setValue,
    run,
  };
}
```

#### 使用示例

##### 示例 1：基础用法

```vue
<script setup lang="ts">
import { useBoolean } from "@/composables/common/useBoolean";

// 对话框显示状态
const dialogVisible = useBoolean();

// 显示对话框
function showDialog() {
  dialogVisible.setTrue();
}

// 隐藏对话框
function hideDialog() {
  dialogVisible.setFalse();
}
</script>

<template>
  <div>
    <button @click="dialogVisible.toggle">
      {{ dialogVisible.value ? "隐藏" : "显示" }}对话框
    </button>

    <div v-if="dialogVisible.value" class="dialog">
      对话框内容
      <button @click="hideDialog">关闭</button>
    </div>
  </div>
</template>
```

##### 示例 2：手动管理 loading（传统方式）

```vue
<script setup lang="ts">
import { useBoolean } from "@/composables/common/useBoolean";
import request from "@/utils/request";

const loading = useBoolean();

// 手动管理 loading 状态
async function fetchData() {
  loading.setTrue();
  try {
    const data = await request.get("/api/data");
    // 处理数据
  } finally {
    loading.setFalse();
  }
}
</script>

<template>
  <button @click="fetchData" :disabled="loading.value">
    {{ loading.value ? "加载中..." : "获取数据" }}
  </button>
</template>
```

##### 示例 3：使用 run 方法自动管理 loading（推荐）

```vue
<script setup lang="ts">
import { useBoolean } from "@/composables/common/useBoolean";
import request from "@/utils/request";
import { ref } from "vue";

const loading = useBoolean();
const data = ref(null);

// 使用 run 方法，自动管理 loading 状态
async function fetchData() {
  const result = await loading.run(async () => {
    return await request.get("/api/data");
  });

  if (result) {
    data.value = result;
  }
}

// 提交表单示例
async function handleSubmit() {
  await loading.run(async () => {
    await request.post("/api/submit", { name: "张三" });
    console.log("提交成功");
  });
}
</script>

<template>
  <div>
    <button @click="fetchData" :disabled="loading.value">
      {{ loading.value ? "加载中..." : "获取数据" }}
    </button>

    <button @click="handleSubmit" :disabled="loading.value">
      {{ loading.value ? "提交中..." : "提交表单" }}
    </button>

    <div v-if="data">{{ data }}</div>
  </div>
</template>
```

##### 示例 4：多个独立的 loading 状态

```vue
<script setup lang="ts">
import { useBoolean } from "@/composables/common/useBoolean";
import request from "@/utils/request";

// 不同操作使用独立的 loading 状态
const fetchLoading = useBoolean();
const submitLoading = useBoolean();
const deleteLoading = useBoolean();

async function fetchData() {
  await fetchLoading.run(() => request.get("/api/data"));
}

async function submitForm() {
  await submitLoading.run(() => request.post("/api/submit", {}));
}

async function deleteItem(id: string) {
  await deleteLoading.run(() => request.delete(`/api/items/${id}`));
}
</script>

<template>
  <div>
    <button @click="fetchData" :disabled="fetchLoading.value">
      {{ fetchLoading.value ? "加载中..." : "获取数据" }}
    </button>

    <button @click="submitForm" :disabled="submitLoading.value">
      {{ submitLoading.value ? "提交中..." : "提交" }}
    </button>

    <button @click="deleteItem('123')" :disabled="deleteLoading.value">
      {{ deleteLoading.value ? "删除中..." : "删除" }}
    </button>
  </div>
</template>
```

### useAsync

用于处理异步操作，自动管理加载状态和错误处理。

#### 实现代码

**文件位置**：`src/composables/common/useAsync.ts`

```typescript
import { ref, Ref } from "vue";

/**
 * useAsync 返回值
 */
interface UseAsyncReturn<T> {
  /** 加载状态 */
  loading: Ref<boolean>;
  /** 错误信息 */
  error: Ref<Error | null>;
  /** 数据 */
  data: Ref<T | null>;
  /** 执行异步函数 */
  execute: (...args: any[]) => Promise<T | null>;
}

/**
 * 处理异步操作的 Hook
 * @param asyncFn 异步函数
 * @param immediate 是否立即执行，默认 false
 * @returns 异步状态和执行方法
 * @example
 * const { loading, data, error, execute } = useAsync(fetchUserList);
 * await execute({ page: 1 });
 */
export function useAsync<T>(
  asyncFn: (...args: any[]) => Promise<T>,
  immediate = false
): UseAsyncReturn<T> {
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const data = ref<T | null>(null);

  /** 执行异步函数 */
  const execute = async (...args: any[]): Promise<T | null> => {
    loading.value = true;
    error.value = null;

    try {
      const result = await asyncFn(...args);
      data.value = result;
      return result;
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
      return null;
    } finally {
      loading.value = false;
    }
  };

  // 立即执行
  if (immediate) {
    execute();
  }

  return {
    loading,
    error,
    data,
    execute,
  };
}
```

#### 使用示例

```vue
<script setup lang="ts">
import { useAsync } from "@/composables/common/useAsync";
import request from "@/utils/request";

interface User {
  id: string;
  name: string;
}

// 获取用户列表
const getUserList = (params: { page: number }) => {
  return request.get<User[]>("/users", params);
};

const { loading, data, error, execute } = useAsync(getUserList);

// 手动触发请求
function loadUsers() {
  execute({ page: 1 });
}
</script>

<template>
  <div>
    <button @click="loadUsers" :disabled="loading">
      {{ loading ? "加载中..." : "加载用户" }}
    </button>

    <div v-if="error" class="error">{{ error.message }}</div>

    <ul v-if="data">
      <li v-for="user in data" :key="user.id">{{ user.name }}</li>
    </ul>
  </div>
</template>
```

### useLocalStorage

用于管理 localStorage，支持自动序列化/反序列化。

#### 实现代码

**文件位置**：`src/composables/common/useLocalStorage.ts`

```typescript
import { ref, Ref, watch } from "vue";

/**
 * 使用 localStorage 的 Hook
 * @param key 存储键名
 * @param initialValue 初始值
 * @returns 响应式存储值
 * @example
 * const user = useLocalStorage('user', { name: '游客' });
 * user.value.name = '张三'; // 自动保存到 localStorage
 */
export function useLocalStorage<T>(key: string, initialValue: T): Ref<T> {
  // 从 localStorage 读取初始值
  const storedValue = localStorage.getItem(key);
  const data = ref<T>(
    storedValue ? JSON.parse(storedValue) : initialValue
  ) as Ref<T>;

  // 监听变化，自动保存到 localStorage
  watch(
    data,
    (newValue) => {
      localStorage.setItem(key, JSON.stringify(newValue));
    },
    { deep: true }
  );

  return data;
}
```

#### 使用示例

```typescript
import { useLocalStorage } from "@/composables/common/useLocalStorage";

// 存储用户信息
const user = useLocalStorage("user", { name: "游客", id: "" });

// 修改会自动保存
user.value.name = "张三";

// 存储主题设置
const theme = useLocalStorage("theme", "light");
theme.value = "dark"; // 自动保存
```

---

## 其他实用工具

### 通知工具

**文件位置**：`src/utils/notify.ts`

```typescript
/**
 * 通知类型
 */
export type NotifyType = "success" | "error" | "warning" | "info";

/**
 * 通知选项
 */
export interface NotifyOptions {
  /** 通知类型 */
  type: NotifyType;
  /** 标题 */
  title: string;
  /** 消息内容 */
  message: string;
  /** 显示时长（毫秒），默认 3000 */
  duration?: number;
}

/**
 * 显示通知
 * @param options 通知选项
 * @example
 * notify({
 *   type: 'success',
 *   title: '操作成功',
 *   message: '数据已保存',
 * });
 */
export function notify(options: NotifyOptions): void {
  const { type, title, message, duration = 3000 } = options;

  // 这里可以集成 UI 库的通知组件
  // 例如 Element Plus: ElNotification(options)
  // 或者使用自定义的通知组件

  console.log(`[${type.toUpperCase()}] ${title}: ${message}`);

  // 简单的浏览器通知实现（可选）
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      body: message,
      icon: `/icons/${type}.svg`,
    });
  }
}
```

### 防抖和节流

**文件位置**：`src/utils/debounce.ts`

```typescript
/**
 * 防抖函数
 * @param fn 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * 节流函数
 * @param fn 要节流的函数
 * @param delay 延迟时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
}
```

**注意**：项目中已安装 `lodash-es`，可以直接使用：

```typescript
import { debounce, throttle } from "lodash-es";
```

### 格式化工具

**文件位置**：`src/utils/format.ts`

```typescript
/**
 * 格式化日期
 * @param date 日期对象、时间戳或日期字符串
 * @param format 格式化模板，默认 YYYY-MM-DD
 * @returns 格式化后的日期字符串
 * @example
 * formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss') // '2024-01-01 12:00:00'
 */
export function formatDate(
  date: Date | string | number,
  format = "YYYY-MM-DD"
): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  return format
    .replace("YYYY", String(year))
    .replace("MM", month)
    .replace("DD", day)
    .replace("HH", hours)
    .replace("mm", minutes)
    .replace("ss", seconds);
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小
 * @example
 * formatFileSize(1024) // '1.00 KB'
 * formatFileSize(1048576) // '1.00 MB'
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}

/**
 * 格式化金额
 * @param amount 金额
 * @param currency 货币符号，默认 ¥
 * @returns 格式化后的金额字符串
 * @example
 * formatMoney(1234.5) // '¥1,234.50'
 * formatMoney(1234.5, '$') // '$1,234.50'
 */
export function formatMoney(amount: number, currency = "¥"): string {
  const formatted = amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
  return `${currency}${formatted}`;
}
```

---

## 使用建议

### 工具方法组织

```
src/utils/
├── request.ts        # HTTP 请求封装
├── notify.ts         # 通知工具
├── format.ts         # 格式化工具
├── storage.ts        # 存储工具
└── validate.ts       # 验证工具
```

### Hooks 组织

```
src/composables/
├── common/
│   ├── useBoolean.ts
│   ├── useAsync.ts
│   ├── useLocalStorage.ts
│   └── useDebounce.ts
├── business/
│   ├── useUser.ts
│   └── useProduct.ts
└── ui/
    ├── useDialog.ts
    └── useTable.ts
```

### 最佳实践

1. **统一导出**：在 `utils/index.ts` 和 `composables/index.ts` 中统一导出

```typescript
// utils/index.ts
export { request } from "./request";
export { notify } from "./notify";
export * from "./format";

// composables/index.ts
export { useBoolean } from "./common/useBoolean";
export { useAsync } from "./common/useAsync";
export { useLocalStorage } from "./common/useLocalStorage";
```

2. **类型安全**：所有函数都要有明确的类型定义
3. **错误处理**：关键操作添加 try-catch 块
4. **文档注释**：使用 JSDoc 注释说明函数用途和参数
5. **单一职责**：每个工具函数只做一件事

---

## 相关文档

- [Hooks 使用指南](./hooks-guide.md) - Hooks 编写规范和最佳实践
- [代码规范](./code-standards.md) - 代码规范和类型安全
- [项目结构规范](./project-structure.md) - 目录结构和文件组织
