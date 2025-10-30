# 项目技术栈

## 核心框架

- **构建工具**：Vite（快速的现代化前端构建工具）
- **样式方案**：Tailwind CSS（原子化 CSS 框架）
- **包管理器**：pnpm（快速、节省磁盘空间的包管理工具）
- **路由管理**：Vue Router（Vue 官方路由解决方案）
- **状态管理**：Pinia（Vue 官方状态管理库）
- **工具库**：VueUse（Vue 组合式工具集）、lodash-es（现代化工具函数库）

## 初始化指南

### Vite 项目初始化

创建 Vue + TypeScript 项目：

```bash
pnpm create vite my-vue-app --template vue-ts
cd my-vue-app
```

参考文档：https://vitejs.cn/vite3-cn/guide/

### Tailwind CSS 集成

安装 Tailwind CSS：

```bash
pnpm add -D tailwindcss @tailwindcss/vite
```

配置 Vite 插件（`vite.config.ts`）：

```typescript
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
});
```

在 `src/style.css` 或主样式文件中添加：

```css
@import "tailwindcss";
```

参考文档：https://tailwindcss.com/docs/installation/using-vite

### Vue 生态库集成

#### 安装依赖

```bash
# 路由和状态管理
pnpm add vue-router pinia

# 工具库
pnpm add @vueuse/core lodash-es

# 事件总线
pnpm add mitt

# TypeScript 类型支持
pnpm add -D @types/lodash-es
```

#### Vue Router 配置

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
  // 添加更多路由...
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
```

在 `src/main.ts` 中注册：

```typescript
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

const app = createApp(App);
app.use(router);
app.mount("#app");
```

#### Pinia 配置

创建 `src/stores/index.ts`：

```typescript
import { createPinia } from "pinia";

const pinia = createPinia();

export default pinia;
```

创建示例 Store `src/stores/user.ts`：

```typescript
import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useUserStore = defineStore("user", () => {
  // state
  const name = ref<string>("");
  const age = ref<number>(0);

  // getters
  const userInfo = computed(() => ({
    name: name.value,
    age: age.value,
  }));

  // actions
  function setUser(userName: string, userAge: number) {
    name.value = userName;
    age.value = userAge;
  }

  return {
    name,
    age,
    userInfo,
    setUser,
  };
});
```

在 `src/main.ts` 中注册：

```typescript
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import pinia from "./stores";

const app = createApp(App);
app.use(router);
app.use(pinia);
app.mount("#app");
```

#### Mitt 事件总线配置

创建 `src/utils/eventBus.ts`：

```typescript
import mitt from "mitt";

// 定义事件类型
export type Events = {
  userLogin: { userId: string; name: string };
  userLogout: void;
  notify: { type: "success" | "error" | "warning"; message: string };
  refreshData: { module: string };
};

// 创建事件总线实例
export const eventBus = mitt<Events>();
```

在组件中使用：

```typescript
import { eventBus } from "@/utils/eventBus";
import { onUnmounted } from "vue";

// 发送事件
eventBus.emit("userLogin", { userId: "123", name: "张三" });

// 监听事件
const handleUserLogin = (data: { userId: string; name: string }) => {
  console.log("用户登录:", data);
};

eventBus.on("userLogin", handleUserLogin);

// 组件卸载时清理监听器
onUnmounted(() => {
  eventBus.off("userLogin", handleUserLogin);
});
```

**使用场景：**

- 跨组件通信（非父子关系）
- 全局消息通知
- 模块间解耦通信

**注意事项：**

- 必须定义明确的事件类型
- 组件卸载时务必清理监听器，避免内存泄漏
- 不要滥用事件总线，简单的父子通信优先使用 props/emit

#### VueUse 使用示例

```typescript
import { useLocalStorage, useMouse, useWindowSize } from "@vueuse/core";

// 响应式本地存储
const token = useLocalStorage("token", "");

// 鼠标位置追踪
const { x, y } = useMouse();

// 窗口尺寸
const { width, height } = useWindowSize();
```

#### lodash-es 使用示例

```typescript
import { debounce, throttle, cloneDeep, isEmpty } from "lodash-es";

// 防抖
const debouncedSearch = debounce((keyword: string) => {
  console.log("搜索:", keyword);
}, 300);

// 深拷贝
const deepCopy = cloneDeep(originalData);

// 判断空值
if (isEmpty(data)) {
  console.log("数据为空");
}
```

#### 路径别名配置

在 `vite.config.ts` 中配置路径别名：

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
});
```

在 `tsconfig.json` 中添加路径映射：

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

## 开发命令

```bash
pnpm install     # 安装依赖
pnpm dev         # 启动开发服务器
pnpm build       # 构建生产版本
pnpm preview     # 预览生产构建
```

## 项目配置要点

- 优先使用 TypeScript 进行开发
- 使用 `@tailwindcss/vite` 插件实现无缝集成
- Pinia 推荐使用 Setup Store 写法（Composition API 风格）
- lodash-es 使用按需导入，避免打包体积过大
- 配置路径别名 `@` 指向 `src` 目录
- VueUse 提供丰富的组合式函数，优先使用而非自行实现
- 使用 mitt 作为事件总线，处理跨组件通信
- 推荐多使用 Hooks（Composables）抽离复杂逻辑
- 避免 Hooks 之间相互依赖，防止代码混乱
- 所有配置信息统一放在 `config/` 目录，使用对象形式组织
- 配置文件的每个字段必须使用 JSDoc 注释（`/** */`）
- 遵循 Vite 的约定式路由和资源处理规范
