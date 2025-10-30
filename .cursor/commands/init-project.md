请帮我初始化一个全新的 Vue 3 + TypeScript + Vite 项目,按照以下步骤执行：

### 第一步：创建基础项目

1. 使用 `pnpm create vite . --template vue-ts` 在当前目录下创建项目（如果还未创建）
2. 选择：Vue + TypeScript

### 第二步：安装所有依赖

一次性安装以下所有依赖：

**核心依赖：**

- vue-router (路由管理)
- pinia (状态管理)
- @vueuse/core (组合式工具集)
- lodash-es (工具函数库)
- mitt (事件总线)
- axios (HTTP 请求库)

**开发依赖：**

- @types/lodash-es (lodash TypeScript 类型)
- @tailwindcss/vite (Tailwind CSS Vite 插件)
- tailwindcss (Tailwind CSS)
- oxlint (代码检查工具)
- prettier (代码格式化工具)
- @prettier/plugin-oxc (Prettier OXC 插件，加速格式化)

执行命令：

```bash
pnpm add vue-router pinia @vueuse/core lodash-es mitt axios
pnpm add -D @types/lodash-es @tailwindcss/vite tailwindcss oxlint prettier @prettier/plugin-oxc
```

### 第三步：配置开发工具

#### 1. 配置 Prettier

创建 `.prettierrc` 文件：

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["@prettier/plugin-oxc"]
}
```

创建 `.prettierignore` 文件：

```
node_modules
dist
.vscode
.idea
*.log
pnpm-lock.yaml
package-lock.json
```

#### 2. 配置 OXC Linter

创建 `oxlintrc.json` 文件：

```json
{
  "plugins": ["typescript", "import"],
  "rules": {
    "typescript/no-explicit-any": "warn",
    "typescript/no-unused-vars": "error",
    "import/no-duplicates": "error"
  },
  "ignores": ["node_modules", "dist", "*.config.ts"]
}
```

#### 3. 添加 package.json 脚本

在 `package.json` 中添加以下脚本：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "format": "prettier --write \"src/**/*.{ts,tsx,vue,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,vue,js,jsx,json,css,md}\"",
    "lint": "oxlint src",
    "lint:fix": "oxlint --fix src"
  }
}
```

### 第四步：配置 Vite 和 Tailwind CSS

#### 1. 配置 vite.config.ts

```typescript
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
```

#### 2. 配置 TypeScript 路径别名

在 `tsconfig.json` 的 `compilerOptions` 中添加：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

#### 3. 配置 Tailwind CSS

在 `src/style.css` 中添加：

```css
@import "tailwindcss";
```

### 第五步：创建项目目录结构

创建以下目录和文件：

```
src/
├── assets/              # 静态资源
├── components/          # 组件
│   ├── common/         # 通用组件
│   └── business/       # 业务组件
├── composables/         # Hooks
│   ├── common/         # 通用 Hooks
│   ├── business/       # 业务 Hooks
│   └── ui/             # UI Hooks
├── config/              # 配置文件
├── router/              # 路由配置
├── stores/              # Pinia 状态管理
├── typings/             # TypeScript 类型声明
├── utils/               # 工具函数
├── views/               # 页面组件
└── icons/               # SVG 图标
```

### 第六步：创建基础配置文件

#### 1. 创建路由配置

创建 `src/router/index.ts`：

```typescript
import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "Home",
    component: () => import("@/views/Home.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
```

#### 2. 创建 Pinia Store

创建 `src/stores/index.ts`：

```typescript
import { createPinia } from "pinia";

const pinia = createPinia();

export default pinia;
```

创建 `src/stores/app.ts`（示例 Store）：

```typescript
import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useAppStore = defineStore("app", () => {
  // state
  const loading = ref(false);
  const theme = ref<"light" | "dark">("light");

  // getters
  const isDark = computed(() => theme.value === "dark");

  // actions
  function setLoading(value: boolean) {
    loading.value = value;
  }

  function toggleTheme() {
    theme.value = theme.value === "light" ? "dark" : "light";
  }

  return {
    loading,
    theme,
    isDark,
    setLoading,
    toggleTheme,
  };
});
```

#### 3. 创建事件总线

创建 `src/utils/eventBus.ts`：

```typescript
import mitt from "mitt";

/** 事件类型定义 */
export type Events = {
  notify: { type: "success" | "error" | "warning" | "info"; message: string };
  refresh: void;
};

export const eventBus = mitt<Events>();
```

#### 4. 更新 main.ts

```typescript
import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router";
import pinia from "./stores";

const app = createApp(App);

app.use(router);
app.use(pinia);

app.mount("#app");
```

### 第七步：创建基础工具函数

#### 1. HTTP 请求封装

创建 `src/utils/request.ts`：

```typescript
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";

/** 请求配置 */
const requestConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 10000,
  maxRetries: 3,
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
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = \`Bearer \${token}\`;
    }

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

    if (code === 200 || code === 0) {
      return data;
    }

    console.error("API Error:", message);
    return Promise.reject(new Error(message || "请求失败"));
  },
  async (error: AxiosError) => {
    const config = error.config as AxiosRequestConfig & { _retryCount?: number };

    if (!error.response) {
      console.error("网络错误");
      return Promise.reject(error);
    }

    const { status } = error.response;
    const shouldRetry = status >= 500 || status === 429;

    if (shouldRetry && config) {
      config._retryCount = config._retryCount || 0;

      if (config._retryCount < requestConfig.maxRetries) {
        config._retryCount++;
        await new Promise((resolve) => setTimeout(resolve, requestConfig.retryDelay));
        return instance(config);
      }
    }

    return Promise.reject(error);
  }
);

/** 请求方法封装 */
export const request = {
  get<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
    return instance.get(url, { params, ...config });
  },

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return instance.post(url, data, config);
  },

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return instance.put(url, data, config);
  },

  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.delete(url, config);
  },

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

#### 2. 创建环境变量文件

创建 `.env.development`：

```
VITE_API_BASE_URL=http://localhost:3000/api
```

创建 `.env.production`：

```
VITE_API_BASE_URL=https://api.example.com
```

#### 3. 格式化工具

创建 `src/utils/format.ts`：

```typescript
/**
 * 格式化日期
 */
export function formatDate(date: Date | string | number, format = "YYYY-MM-DD"): string {
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
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return \`\${(bytes / Math.pow(k, i)).toFixed(2)} \${units[i]}\`;
}

/**
 * 格式化金额
 */
export function formatMoney(amount: number, currency = "¥"): string {
  const formatted = amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
  return \`\${currency}\${formatted}\`;
}
```

#### 4. 工具函数统一导出

创建 `src/utils/index.ts`：

```typescript
export { request } from "./request";
export * from "./format";
export { eventBus } from "./eventBus";
```

### 第八步：创建常用 Hooks

#### 1. useBoolean Hook

创建 `src/composables/common/useBoolean.ts`：

```typescript
import { ref, Ref } from "vue";

interface UseBooleanReturn {
  value: Ref<boolean>;
  setTrue: () => void;
  setFalse: () => void;
  toggle: () => void;
  setValue: (val: boolean) => void;
  run: <T>(asyncFn: (...args: any[]) => Promise<T>) => Promise<T | null>;
}

/**
 * 管理布尔状态的 Hook
 */
export function useBoolean(initialValue = false): UseBooleanReturn {
  const value = ref(initialValue);

  const setTrue = () => {
    value.value = true;
  };

  const setFalse = () => {
    value.value = false;
  };

  const toggle = () => {
    value.value = !value.value;
  };

  const setValue = (val: boolean) => {
    value.value = val;
  };

  const run = async <T>(asyncFn: (...args: any[]) => Promise<T>): Promise<T | null> => {
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

#### 2. useAsync Hook

创建 `src/composables/common/useAsync.ts`：

```typescript
import { ref, Ref } from "vue";

interface UseAsyncReturn<T> {
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  data: Ref<T | null>;
  execute: (...args: any[]) => Promise<T | null>;
}

/**
 * 处理异步操作的 Hook
 */
export function useAsync<T>(
  asyncFn: (...args: any[]) => Promise<T>,
  immediate = false
): UseAsyncReturn<T> {
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const data = ref<T | null>(null);

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

#### 3. Hooks 统一导出

创建 `src/composables/index.ts`：

```typescript
export { useBoolean } from "./common/useBoolean";
export { useAsync } from "./common/useAsync";
```

### 第九步：创建示例页面

创建 `src/views/Home.vue`：

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useBoolean } from "@/composables";
import { useAppStore } from "@/stores/app";

const appStore = useAppStore();
const loading = useBoolean();
const count = ref(0);

async function handleClick() {
  await loading.run(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    count.value++;
  });
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
      <h1 class="text-3xl font-bold text-gray-800 mb-4">欢迎使用 Vue 3</h1>

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-gray-600">当前主题:</span>
          <button
            @click="appStore.toggleTheme"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            {{ appStore.theme }}
          </button>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-gray-600">计数器:</span>
          <span class="text-2xl font-bold text-blue-500">{{ count }}</span>
        </div>

        <button
          @click="handleClick"
          :disabled="loading.value.value"
          class="w-full py-3 bg-green-500 text-white rounded hover:bg-green-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {{ loading.value.value ? "加载中..." : "点击增加" }}
        </button>
      </div>
    </div>
  </div>
</template>
```

### 第十步：测试配置

执行以下命令测试配置是否生效：

```bash
# 1. 测试 Prettier 格式化
pnpm format

# 2. 测试 OXC Linter
pnpm lint

# 3. 运行开发服务器
pnpm dev
```

### 第十一步：清理和验证

1. 删除不需要的默认文件（如 `src/components/HelloWorld.vue`）
2. 更新 `src/App.vue`：

```vue
<script setup lang="ts">
import { RouterView } from "vue-router";
</script>

<template>
  <RouterView />
</template>
```

3. 验证项目结构是否完整
4. 验证所有配置文件是否正确

### 完成

项目初始化完成！你现在拥有一个配置完整的 Vue 3 + TypeScript + Vite 项目，包括：

✅ Tailwind CSS 样式系统
✅ Vue Router 路由管理
✅ Pinia 状态管理
✅ Axios HTTP 请求封装
✅ 常用工具函数和 Hooks
✅ Prettier 代码格式化
✅ OXC Linter 代码检查
✅ 完整的项目目录结构
✅ 示例页面和组件

可以开始开发你的应用了！

---

## 常见问题和解决方案

### 问题 1：TypeScript 找不到 `.vue` 模块

**错误信息：**

```
找不到模块"@/views/Home.vue"或其相应的类型声明。
```

**原因：**
TypeScript 默认不识别 `.vue` 文件，需要添加模块声明。

**解决方案：**
创建 `src/vite-env.d.ts` 文件：

```typescript
/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, any>;
  export default component;
}
```

### 问题 2：`useAsync` Hook 的类型错误

**错误信息：**

```
不能将类型"Ref<UnwrapRef<T> | null>"分配给类型"Ref<T | null>"
```

**原因：**
Vue 的 `ref()` 会对值进行深度解包（UnwrapRef），导致泛型类型 `T` 被解包后与返回类型不匹配。

**解决方案：**
在 `src/composables/common/useAsync.ts` 中，将 `data` 从 `ref` 改为 `shallowRef`：

```typescript
import { ref, shallowRef, type Ref } from "vue";

export function useAsync<T>(
  asyncFn: (...args: any[]) => Promise<T>,
  immediate = false
): UseAsyncReturn<T> {
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const data = shallowRef<T | null>(null); // ✅ 使用 shallowRef

  // ... 其他代码
}
```

**为什么使用 `shallowRef`：**

- `ref()` 会深度解包嵌套的响应式对象，导致类型推断复杂
- `shallowRef()` 只在 `.value` 层面进行响应式处理
- 对于异步数据（通常是普通对象或数组），`shallowRef` 更合适且性能更好

### 问题 3：`useBoolean` 在模板中的使用

**错误信息：**

```
不能将类型"Ref<boolean, boolean>"分配给类型"Booleanish | undefined"
```

**原因：**
`useBoolean()` 返回的对象中，`value` 属性本身就是一个 `Ref<boolean>`，在模板中需要访问两次 `.value`。

**错误示例：**

```vue
<template>
  <button :disabled="loading.value">
    {{ loading.value ? "加载中..." : "点击" }}
  </button>
</template>

<script setup lang="ts">
const loading = useBoolean();
// loading.value 是 Ref<boolean>，不是 boolean
</script>
```

**正确示例：**

```vue
<template>
  <button :disabled="loading.value.value">
    {{ loading.value.value ? "加载中..." : "点击" }}
  </button>
</template>

<script setup lang="ts">
const loading = useBoolean();
// loading.value.value 才是真正的 boolean 值
</script>
```

**说明：**

- 第一个 `.value`：访问 `useBoolean()` 返回对象的 `value` 属性（得到 `Ref<boolean>`）
- 第二个 `.value`：访问 ref 的实际布尔值（得到 `boolean`）

### 问题 4：初始化项目后的文档第 655 行错误

**注意：**
文档示例中的 `Home.vue` 第 655 行使用了错误的方式：

```vue
<!-- ❌ 错误 -->
:disabled="loading.value"
```

应该改为：

```vue
<!-- ✅ 正确 -->
:disabled="loading.value.value"
```

同时第 658 行也需要修改：

```vue
<!-- ❌ 错误 -->
{{ loading.value ? "加载中..." : "点击增加" }}

<!-- ✅ 正确 -->
{{ loading.value.value ? "加载中..." : "点击增加" }}
```

---

## 开发建议

### 1. 类型安全最佳实践

- **优先使用 `shallowRef`**：对于异步数据、大型对象等，使用 `shallowRef` 避免深度响应式和类型问题
- **明确类型定义**：所有函数和 Hook 都应提供完整的类型定义
- **避免 `any`**：尽量使用具体类型或泛型，实在需要时使用 `unknown` 并进行类型守卫

### 2. Hooks 使用规范

- **返回对象而非数组**：返回对象更易于理解和使用（如 `useBoolean` 返回对象）
- **状态嵌套注意**：当 Hook 返回包含 `Ref` 的对象时，使用时需要注意嵌套层级
- **命名清晰**：返回的状态和方法应有清晰的命名，避免歧义

### 3. 响应式数据选择

| 场景                         | 使用                    | 原因                    |
| ---------------------------- | ----------------------- | ----------------------- |
| 简单值（数字、字符串、布尔） | `ref()`                 | 简单且类型安全          |
| 复杂对象（需要深度响应）     | `ref()` 或 `reactive()` | 自动深度响应式          |
| 异步数据、大对象             | `shallowRef()`          | 避免深度解包，性能更好  |
| 泛型数据                     | `shallowRef<T>()`       | 避免 UnwrapRef 类型问题 |

````

## 注意事项

1. **项目名称**：在第一步中记得替换 `[在此填入项目名称]` 为实际的项目名称
2. **API 地址**：记得在 `.env` 文件中配置正确的 API 基础地址
3. **依赖版本**：所有依赖会安装最新稳定版本
4. **Git 管理**：初始化后建议立即执行 `git init` 并提交初始代码

## 可选配置

### 添加 Vitest（可选）

如果需要单元测试：

```bash
pnpm add -D vitest @vue/test-utils happy-dom
```

### 添加 UI 组件库（可选）

根据需求选择：

```bash
# Element Plus
pnpm add element-plus

# Ant Design Vue
pnpm add ant-design-vue

# Naive UI
pnpm add naive-ui
```
````
