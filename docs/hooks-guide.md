# Hooks（Composables）使用指南

## 核心原则

1. **单一职责**：一个 Hook 只负责一个明确的功能
2. **避免依赖**：Hooks 之间不要相互依赖
3. **参数传递**：通过参数传递数据，而非调用其他 Hooks
4. **共享状态用 Pinia**：需要共享状态时使用 Pinia Store

## Hooks 目录结构

```
src/composables/
├── business/      # 业务逻辑 Hooks (useUser, useOrder, useProduct)
├── common/        # 通用 Hooks (useAsync, usePagination, useDebounce)
└── ui/            # UI 交互 Hooks (useModal, useTable, useForm)
```

## 基础 Hook 编写

### 标准结构

```typescript
export function useCounter(initial = 0) {
  // 1. 响应式状态
  const count = ref(initial);

  // 2. 计算属性
  const doubleCount = computed(() => count.value * 2);

  // 3. 方法
  function increment() {
    count.value++;
  }

  function decrement() {
    count.value--;
  }

  // 4. 返回（使用 readonly 保护内部状态）
  return {
    count: readonly(count),
    doubleCount,
    increment,
    decrement,
  };
}
```

### 使用示例

```vue
<script setup lang="ts">
const { count, doubleCount, increment } = useCounter(10);
</script>
```

## 避免 Hooks 相互依赖

### ❌ 错误示例：Hooks 相互依赖

```typescript
// useUserProfile.ts
import { useUser } from "./useUser";

export function useUserProfile() {
  const { userInfo } = useUser(); // 依赖其他 Hook
  // ...
}

// useUserSettings.ts
import { useUserProfile } from "./useUserProfile";

export function useUserSettings() {
  const { profile } = useUserProfile(); // 形成依赖链
  // ...
}
```

**问题**：

- 形成依赖链，难以追踪数据流
- 修改一个 Hook 可能影响多个 Hook
- 增加代码复杂度

### ✅ 正确示例 1：通过参数传递

```typescript
// useUserProfile.ts
export function useUserProfile(userId: string) {
  const profile = ref<UserProfile | null>(null);

  async function fetchProfile() {
    profile.value = await fetchUserProfileApi(userId);
  }

  return { profile, fetchProfile };
}

// useUserSettings.ts
export function useUserSettings(userId: string) {
  const settings = ref<UserSettings | null>(null);

  async function fetchSettings() {
    settings.value = await fetchUserSettingsApi(userId);
  }

  return { settings, fetchSettings };
}

// 组件中使用
const userId = "123";
const { profile } = useUserProfile(userId);
const { settings } = useUserSettings(userId);
```

### ✅ 正确示例 2：使用 Pinia 共享状态

```typescript
// stores/user.ts
export const useUserStore = defineStore("user", () => {
  const userId = ref<string>("");
  const userInfo = ref<UserInfo | null>(null);
  return { userId, userInfo };
});

// composables/useUserProfile.ts
import { useUserStore } from "@/stores/user";

export function useUserProfile() {
  const userStore = useUserStore();

  async function fetchProfile() {
    const profile = await fetchUserProfileApi(userStore.userId);
    return profile;
  }

  return { fetchProfile };
}
```

## 常用 Hooks 模板

### 异步数据获取

```typescript
export function useAsyncData<T>(fetchFn: () => Promise<T>) {
  const data = ref<T | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function execute() {
    loading.value = true;
    error.value = null;
    try {
      data.value = await fetchFn();
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  }

  return {
    data: readonly(data),
    loading: readonly(loading),
    error: readonly(error),
    execute,
  };
}
```

### 分页管理

```typescript
export function usePagination(initialPage = 1, initialPageSize = 20) {
  const page = ref(initialPage);
  const pageSize = ref(initialPageSize);
  const total = ref(0);

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

  function setPage(newPage: number) {
    page.value = Math.max(1, Math.min(newPage, totalPages.value));
  }

  return {
    page: readonly(page),
    pageSize: readonly(pageSize),
    total: readonly(total),
    totalPages,
    setPage,
  };
}
```

### 表单管理

```typescript
export function useForm<T extends Record<string, any>>(
  initialValues: T,
  onSubmit: (values: T) => Promise<void>
) {
  const values = reactive<T>({ ...initialValues });
  const errors = ref<Partial<Record<keyof T, string>>>({});
  const submitting = ref(false);

  function setFieldValue<K extends keyof T>(field: K, value: T[K]) {
    values[field] = value;
    delete errors.value[field];
  }

  async function handleSubmit() {
    if (submitting.value) return;
    submitting.value = true;
    try {
      await onSubmit(values);
    } finally {
      submitting.value = false;
    }
  }

  return {
    values,
    errors,
    submitting: readonly(submitting),
    setFieldValue,
    handleSubmit,
  };
}
```

## 何时使用 Hooks

### ✅ 适合使用 Hooks

- 复杂的业务逻辑（表单验证、数据处理）
- 可复用的状态逻辑（分页、筛选）
- 异步操作封装（API 调用）
- UI 交互逻辑（弹窗、表格操作）

### ❌ 不适合使用 Hooks

- 简单的计算逻辑（直接使用 computed）
- 一次性的逻辑（直接在组件中实现）
- 需要全局共享的状态（使用 Pinia）

## 最佳实践

### 1. 明确的参数依赖

```typescript
// ✅ 好：参数明确
export function useUserOrders(userId: string) {
  // ...
}

// ❌ 不好：隐式依赖
export function useUserOrders() {
  const { userId } = useUser(); // 隐式依赖
}
```

### 2. 使用 readonly 保护状态

```typescript
export function useCounter() {
  const count = ref(0);

  return {
    count: readonly(count), // 只读暴露
    increment: () => count.value++,
  };
}
```

### 3. 使用事件总线解耦

```typescript
// composables/useNotification.ts
import { eventBus } from "@/utils/eventBus";

export function useNotification() {
  function showSuccess(message: string) {
    eventBus.emit("notify", { type: "success", message });
  }

  return { showSuccess };
}
```

## 注意事项

- ⚠️ 避免 Hooks 之间形成依赖链
- ⚠️ 需要共享状态时使用 Pinia，而非 Hooks
- ⚠️ 保持 Hooks 职责单一，不要过于复杂
- ⚠️ 使用 readonly 防止外部直接修改状态
