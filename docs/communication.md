# 组件通信方式

## 通信方式选择

| 方式                    | 使用场景                 | 优点                 | 注意事项                           |
| ----------------------- | ------------------------ | -------------------- | ---------------------------------- |
| **Props/Emit**          | 父子组件通信             | 简单直接，数据流清晰 | 仅适用于直接父子关系               |
| **Pinia Store**         | 全局状态管理             | 跨组件共享状态       | 不要滥用，只存储真正需要共享的状态 |
| **Mitt 事件总线**       | 跨层级组件通信、模块解耦 | 灵活，解耦性强       | 必须清理监听器，避免内存泄漏       |
| **Provide/Inject**      | 祖先向后代传递数据       | 避免 props 层层传递  | 慎用，会增加代码理解难度           |
| **Hooks (Composables)** | 逻辑复用、状态封装       | 高度复用，逻辑清晰   | 避免 Hooks 间相互依赖              |

## Props/Emit（父子组件）

### 父组件传递数据

```vue
<template>
  <ChildComponent
    :title="pageTitle"
    :user="currentUser"
    @update="handleUpdate"
  />
</template>

<script setup lang="ts">
const pageTitle = ref("用户中心");
const currentUser = ref({ name: "张三", age: 25 });

function handleUpdate(data: any) {
  console.log("子组件更新:", data);
}
</script>
```

### 子组件接收 Props 并触发事件

```vue
<template>
  <button @click="emit('update', { timestamp: Date.now() })">更新</button>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  user: { name: string; age: number };
}

interface Emits {
  (e: "update", data: any): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
</script>
```

### v-model 双向绑定

```vue
<!-- 父组件 -->
<CustomInput v-model="inputValue" />

<!-- 子组件 -->
<template>
  <input
    :value="modelValue"
    @input="emit('update:modelValue', $event.target.value)"
  />
</template>

<script setup lang="ts">
interface Props {
  modelValue: string;
}

interface Emits {
  (e: "update:modelValue", value: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
</script>
```

## Pinia Store（全局状态）

### 创建 Store

```typescript
// stores/user.ts
import { defineStore } from "pinia";

export const useUserStore = defineStore("user", () => {
  // state
  const userInfo = ref<UserInfo | null>(null);
  const token = ref<string>("");

  // getters
  const isLoggedIn = computed(() => !!token.value);

  // actions
  async function login(username: string, password: string) {
    const response = await loginApi({ username, password });
    token.value = response.token;
    userInfo.value = response.userInfo;
  }

  return {
    userInfo,
    token,
    isLoggedIn,
    login,
  };
});
```

### 在组件中使用

```vue
<script setup lang="ts">
import { useUserStore } from "@/stores/user";
import { storeToRefs } from "pinia";

const userStore = useUserStore();

// 响应式解构
const { userInfo, isLoggedIn } = storeToRefs(userStore);

// 调用 actions
userStore.login("admin", "123456");
</script>
```

## Mitt 事件总线（跨组件通信）

### 定义事件类型

```typescript
// utils/eventBus.ts
import mitt from "mitt";

export type Events = {
  userLogin: { userId: string; name: string };
  userLogout: void;
  notify: { type: "success" | "error" | "warning"; message: string };
};

export const eventBus = mitt<Events>();
```

### 发送事件

```typescript
import { eventBus } from "@/utils/eventBus";

eventBus.emit("userLogin", { userId: "123", name: "张三" });
eventBus.emit("notify", { type: "success", message: "登录成功" });
```

### 监听事件

```vue
<script setup lang="ts">
import { eventBus } from "@/utils/eventBus";

const handleUserLogin = (data: { userId: string; name: string }) => {
  console.log("用户登录:", data);
};

onMounted(() => {
  eventBus.on("userLogin", handleUserLogin);
});

// 必须清理监听器
onUnmounted(() => {
  eventBus.off("userLogin", handleUserLogin);
});
</script>
```

## Provide/Inject（祖先-后代）

### 祖先组件提供数据

```vue
<script setup lang="ts">
import { provide, ref } from "vue";

const theme = ref("light");
provide("theme", theme);
</script>
```

### 后代组件注入数据

```vue
<script setup lang="ts">
import { inject, type Ref } from "vue";

const theme = inject<Ref<string>>("theme");
</script>
```

### 类型安全的 Provide/Inject

```typescript
import { provide, inject, type InjectionKey, type Ref } from "vue";

// 定义注入键
export const ThemeKey: InjectionKey<Ref<string>> = Symbol("theme");

// 提供
export function provideTheme() {
  const theme = ref("light");
  provide(ThemeKey, theme);
  return theme;
}

// 注入
export function injectTheme() {
  const theme = inject(ThemeKey);
  if (!theme) throw new Error("Theme not provided");
  return theme;
}
```

## 通信方式决策

```
需要组件间通信？
├─ 父子组件？
│  └─ 使用 Props/Emit
│
├─ 需要全局共享状态？
│  └─ 使用 Pinia Store
│
├─ 跨层级事件通知？
│  └─ 使用 Mitt 事件总线
│
└─ 祖先-后代传递数据（且层级很深）？
   └─ 考虑 Provide/Inject（慎用）
```

## 使用场景举例

### 场景 1：用户信息在多个页面使用

**方案：Pinia Store**

```typescript
// stores/user.ts
export const useUserStore = defineStore("user", () => {
  const userInfo = ref<UserInfo | null>(null);
  return { userInfo };
});
```

### 场景 2：父组件向子组件传递数据

**方案：Props**

```vue
<ChildComponent :user="userInfo" />
```

### 场景 3：跨组件的全局通知

**方案：Mitt 事件总线**

```typescript
eventBus.emit("notify", { type: "success", message: "操作成功" });
```

### 场景 4：表单逻辑复用

**方案：Hooks**

```typescript
export function useForm<T>(initialValues: T) {
  // 表单逻辑
}
```

## 最佳实践

### 1. 优先使用 Props/Emit

对于直接的父子组件关系，始终优先使用 Props/Emit。

### 2. 合理使用 Pinia

Pinia 适合存储真正需要跨多个组件共享的全局状态。

```typescript
// ✅ 好：全局用户信息
export const useUserStore = defineStore("user", () => {
  const userInfo = ref<UserInfo | null>(null);
  return { userInfo };
});

// ❌ 不好：组件局部状态
export const useCounterStore = defineStore("counter", () => {
  const count = ref(0); // 应该在组件内部管理
  return { count };
});
```

### 3. 事件总线必须清理

```vue
<script setup lang="ts">
const handler = (data: any) => console.log(data);

onMounted(() => {
  eventBus.on("someEvent", handler);
});

// ✅ 必须清理
onUnmounted(() => {
  eventBus.off("someEvent", handler);
});
</script>
```

### 4. Provide/Inject 谨慎使用

只在确实需要跨多层传递数据时使用，优先考虑其他方案。

## 注意事项

- ⚠️ 不要滥用事件总线，简单的父子通信使用 props/emit
- ⚠️ 事件监听器必须在组件卸载时清理
- ⚠️ Pinia 只存储真正需要共享的状态
- ⚠️ Provide/Inject 会增加代码理解难度，慎用
