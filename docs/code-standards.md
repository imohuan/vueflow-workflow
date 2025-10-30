# 代码规范

## 类型安全

### 所有函数必须有明确类型

```typescript
// ✅ 好的做法
function getUser(id: string): Promise<UserInfo> {
  return fetchData<UserInfo>(`/api/users/${id}`);
}

// ❌ 不好的做法
function getUser(id: any): any {
  return fetchData(`/api/users/${id}`);
}
```

### 避免使用 any

```typescript
// ✅ 好：使用具体类型
function processData(data: UserInfo): string {
  return data.name;
}

// ⚠️ 可接受：使用 unknown 然后类型守卫
function processData(data: unknown): string {
  if (isUserInfo(data)) {
    return data.name;
  }
  throw new Error("Invalid data");
}

// ❌ 不好：使用 any
function processData(data: any): any {
  return data.name;
}
```

### 使用类型守卫

```typescript
// 类型守卫函数
function isUserInfo(obj: unknown): obj is UserInfo {
  return typeof obj === "object" && obj !== null && "id" in obj && "name" in obj && "email" in obj;
}
```

## 错误处理

### 工具函数中的错误处理

```typescript
export async function fetchUserData(userId: string): Promise<UserInfo | null> {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("获取用户数据失败:", error);
    return null;
  }
}
```

### 组件中的错误处理

```vue
<script setup lang="ts">
const loading = ref(false);
const error = ref<string | null>(null);

async function loadData() {
  loading.value = true;
  error.value = null;

  try {
    const data = await fetchData();
    // 处理数据
  } catch (e) {
    error.value = e instanceof Error ? e.message : "未知错误";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div v-if="loading">加载中...</div>
  <div v-else-if="error" class="error">{{ error }}</div>
  <div v-else><!-- 正常内容 --></div>
</template>
```

## 命名规范

### 变量命名

```typescript
// ✅ 好：有意义的命名
const userList = ref<UserInfo[]>([]);
const isLoading = ref(false);
const totalCount = ref(0);

// ❌ 不好：无意义的命名
const list = ref([]);
const flag = ref(false);
const num = ref(0);
```

### 函数命名

```typescript
// ✅ 好：动词开头，清晰表达意图
function getUserById(id: string) {}
function validateEmail(email: string) {}
function handleSubmit() {}

// ❌ 不好：不清晰的命名
function user(id: string) {}
function check(email: string) {}
function click() {}
```

### 常量命名

```typescript
// ✅ 好：大写下划线分隔
const MAX_USER_COUNT = 100;
const API_BASE_URL = "https://api.example.com";

// 配置对象使用小驼峰
const apiConfig = {
  timeout: 5000,
  retries: 3,
} as const;
```

### 类型命名

```typescript
// ✅ 好：接口使用 PascalCase
interface UserInfo {
  id: string;
  name: string;
}

// 类型别名使用 PascalCase
type UserRole = "admin" | "user" | "guest";

// 泛型使用单个大写字母或 PascalCase
type Result<T> = { data: T; error: Error | null };
```

## 代码组织

### 组件内部顺序

```vue
<script setup lang="ts">
// 1. 导入
import { ref, computed, onMounted } from "vue";
import { useUserStore } from "@/stores/user";

// 2. Props 定义
interface Props {
  title: string;
}
const props = defineProps<Props>();

// 3. Emits 定义
interface Emits {
  (e: "update", value: string): void;
}
const emit = defineEmits<Emits>();

// 4. Composables
const userStore = useUserStore();

// 5. 响应式数据
const count = ref(0);

// 6. 计算属性
const doubleCount = computed(() => count.value * 2);

// 7. 方法
function handleClick() {
  count.value++;
}

// 8. 生命周期
onMounted(() => {
  // 初始化逻辑
});
</script>

<template>
  <!-- 模板 -->
</template>

<style scoped>
/* 样式 */
</style>
```

### 导入顺序

```typescript
// 1. Vue 核心
import { ref, computed, type Ref } from "vue";

// 2. 第三方库
import { debounce } from "lodash-es";
import { useLocalStorage } from "@vueuse/core";

// 3. 项目内部模块
import { useUserStore } from "@/stores/user";
import { formatDate } from "@/utils/format";
import type { UserInfo } from "@/typings/api";

// 4. 组件
import Button from "@/components/common/Button.vue";

// 5. 样式
import "./styles.css";
```

### 类型导入规范

使用 `type` 关键字明确标记类型导入，这样可以：

- 明确区分类型导入和值导入
- 在编译后完全移除类型导入，减小包体积
- 避免循环依赖问题

```typescript
// ✅ 好：使用 type 关键字标记类型导入
import { ref, computed, type Ref, type ComputedRef } from "vue";
import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { UserInfo, ProductInfo } from "@/typings/api";

// ✅ 好：纯类型导入使用 import type
import type { RouteRecordRaw } from "vue-router";
import type { StoreDefinition } from "pinia";

// ❌ 不好：类型导入没有使用 type 关键字
import { ref, Ref, computed, ComputedRef } from "vue";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

// ⚠️ 注意：接口和类型别名始终使用 import type
import type { UserInfo } from "@/typings/api"; // ✅ 正确
import { UserInfo } from "@/typings/api"; // ❌ 错误
```

**规则说明：**

1. **混合导入**：当同时导入值和类型时，在类型前加 `type` 关键字

   ```typescript
   import { ref, type Ref } from "vue";
   ```

2. **纯类型导入**：当只导入类型时，使用 `import type`

   ```typescript
   import type { UserInfo } from "@/typings/api";
   ```

3. **默认导出 + 类型**：结合使用
   ```typescript
   import axios, { type AxiosInstance } from "axios";
   ```

## 性能优化

### 使用计算属性缓存

```vue
<script setup lang="ts">
// ✅ 好：使用 computed 缓存
const filteredList = computed(() => {
  return list.value.filter((item) => item.active);
});
</script>
```

### 使用防抖和节流

```typescript
import { debounce, throttle } from "lodash-es";

// 防抖：用于搜索输入
const debouncedSearch = debounce((keyword: string) => {
  performSearch(keyword);
}, 300);

// 节流：用于滚动事件
const throttledScroll = throttle(() => {
  handleScroll();
}, 100);
```

### 路由懒加载

```typescript
// router/index.ts
const routes = [
  {
    path: "/user",
    name: "User",
    // ✅ 好：使用动态导入
    component: () => import("@/views/User.vue"),
  },
];
```

### 按需导入

```typescript
// ✅ 好：按需导入 lodash-es
import { debounce, cloneDeep } from "lodash-es";

// ❌ 不好：全量导入
import _ from "lodash-es";
```

## 注释规范

### 函数注释

```typescript
/**
 * 格式化日期
 * @param date 日期对象、时间戳或日期字符串
 * @param format 格式化模板，默认 YYYY-MM-DD
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date | string | number, format = "YYYY-MM-DD"): string {
  // 实现逻辑
}
```

### 复杂逻辑注释

```typescript
function processData(data: any[]) {
  // 第一步：过滤无效数据
  const validData = data.filter((item) => item.valid);

  // 第二步：按类型分组
  const grouped = groupBy(validData, "type");

  // 第三步：计算统计信息
  return Object.entries(grouped).map(([type, items]) => ({
    type,
    count: items.length,
    total: items.reduce((sum, item) => sum + item.value, 0),
  }));
}
```

### 配置注释

```typescript
/** 应用配置 */
export const appConfig = {
  /** 应用名称 */
  name: "我的应用",
  /** 默认语言 */
  defaultLanguage: "zh-CN",
} as const;
```

## 代码格式化与检查

### 使用 Oxc

项目使用 [Oxc](https://oxc-project.github.io/) 工具链，它是用 Rust 开发的高性能 JavaScript/TypeScript 工具，性能比传统工具快 50-100 倍。

- **代码格式化**：使用 `prettier` + `@prettier/plugin-oxc`
- **代码检查**：使用 `oxlint`

#### 安装

```bash
# 安装代码格式化工具
pnpm add -D prettier @prettier/plugin-oxc

# 安装代码检查工具
pnpm add -D oxlint
```

### 代码格式化配置

#### Prettier 配置文件

创建 `.prettierrc.yaml` 或 `.prettierrc.json`：

```yaml
# .prettierrc.yaml
plugins:
  - "@prettier/plugin-oxc"
semi: true
singleQuote: false
tabWidth: 2
trailingComma: "es5"
```

或者使用 JSON 格式：

```json
{
  "plugins": ["@prettier/plugin-oxc"],
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

#### 针对不同文件类型的配置（可选）

如需针对 JavaScript 和 TypeScript 文件显式指定解析器：

```yaml
# .prettierrc.yaml
plugins:
  - "@prettier/plugin-oxc"

overrides:
  - files:
      - "**/*.{js,mjs,cjs,jsx}"
    options:
      parser: oxc
  - files:
      - "**/*.{ts,mts,cts,tsx}"
    options:
      parser: oxc-ts
```

#### 格式化命令

```bash
# 格式化所有文件
pnpm prettier --write .

# 格式化指定目录
pnpm prettier --write src/

# 检查格式（不修改文件）
pnpm prettier --check .
```

### 代码检查配置

#### Oxlint 基础使用

```bash
# 检查代码
pnpm oxlint

# 检查指定目录
pnpm oxlint src/

# 自动修复可修复的问题
pnpm oxlint --fix
```

#### Oxlint 配置文件（可选）

Oxlint 默认启用 93 条规则，无需配置即可使用。如需自定义，可创建 `.oxlintrc.json`：

```json
{
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "off"
  }
}
```

### package.json 脚本配置

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "oxlint src/",
    "lint:fix": "oxlint --fix src/"
  }
}
```

### 在 Vue 项目中使用

#### Prettier + Oxc 插件

- 支持格式化 `.vue` 文件中的 `<script>` 和 `<style>` 部分
- 自动识别 JavaScript/TypeScript 语法

```bash
# 格式化 Vue 项目
pnpm prettier --write "src/**/*.{vue,ts,js}"
```

#### Oxlint

- 支持检查 Vue 单文件组件的 `<script>` 部分
- 主要检查代码逻辑，不检查 Vue 模板语法

```bash
# 检查 Vue 项目代码质量
pnpm oxlint src/
```

### 使用建议

- **开发时**：配置编辑器自动格式化（保存时运行 Prettier）
- **提交前**：运行 `pnpm format && pnpm lint` 检查代码
- **CI/CD**：使用 `pnpm format:check && pnpm lint` 验证代码质量
- **性能优势**：Oxc 解析器比传统工具快得多，适合大型项目

## 最佳实践清单

- [ ] 所有函数都有明确的类型定义
- [ ] 避免使用 `any` 类型
- [ ] 错误处理完善
- [ ] 变量和函数命名清晰
- [ ] 重复代码已抽离
- [ ] 使用计算属性缓存
- [ ] 路由使用懒加载
- [ ] lodash-es 按需导入
- [ ] 配置使用对象形式并添加 JSDoc 注释
