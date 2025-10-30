# 组件设计原则

## 单一职责原则

每个组件只负责一个明确的功能，避免组件过于臃肿。

```vue
<!-- ❌ 不好：一个组件包含所有逻辑 -->
<template>
  <div>
    <!-- 用户信息 -->
    <div class="user-info">...</div>
    <!-- 订单列表 -->
    <div class="order-list">...</div>
    <!-- 地址管理 -->
    <div class="address-list">...</div>
  </div>
</template>

<!-- ✅ 好：拆分成多个组件 -->
<template>
  <div class="user-profile">
    <UserInfo :user="userInfo" />
    <UserOrders :user-id="userId" />
    <UserAddresses :user-id="userId" />
  </div>
</template>
```

## 组件分层

### 1. 基础组件（通用、无业务逻辑）

```
src/components/common/
├── Button.vue        # 按钮组件
├── Input.vue         # 输入框组件
├── Modal.vue         # 弹窗组件
└── Table.vue         # 表格组件
```

**特点：**

- 高度可复用
- 无业务逻辑
- 通过 props 和 events 通信
- 提供必要的插槽

### 2. 业务组件（包含特定业务逻辑）

```
src/components/business/
├── UserCard.vue      # 用户卡片
├── OrderItem.vue     # 订单项
└── ProductList.vue   # 商品列表
```

**特点：**

- 包含特定业务逻辑
- 可复用于多个页面
- 依赖业务类型定义

### 3. 页面私有组件

```
src/views/user/components/
├── ProfileEditor.vue    # 仅用于用户页面
└── SettingsPanel.vue    # 仅用于用户页面
```

**特点：**

- 仅在特定页面使用
- 可以直接访问父页面数据
- 简化页面主组件的复杂度

## Props 设计

### 明确的类型定义

```vue
<script setup lang="ts">
interface Props {
  title: string;
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: "medium",
  disabled: false,
  loading: false,
});
</script>
```

### Props 设计原则

- ✅ 提供明确的类型定义
- ✅ 提供合理的默认值
- ✅ 使用联合类型限制可选值
- ✅ 必填项不提供默认值

## Events 设计

### 明确的事件命名

```vue
<script setup lang="ts">
// 定义事件类型
interface Emits {
  (e: "update", value: string): void;
  (e: "submit", data: FormData): void;
  (e: "cancel"): void;
  (e: "error", error: Error): void;
}

const emit = defineEmits<Emits>();

// 触发事件
emit("update", newValue);
emit("submit", formData);
</script>
```

### Events 设计原则

- ✅ 事件名称清晰明确
- ✅ 提供完整的类型定义
- ✅ 事件参数类型化
- ✅ 使用动词命名（update、submit、cancel）

## 插槽设计

### 提供扩展点

```vue
<!-- DataTable.vue -->
<template>
  <table>
    <thead>
      <slot name="header" />
    </thead>
    <tbody>
      <tr v-for="item in data" :key="item.id">
        <slot name="row" :item="item" />
      </tr>
    </tbody>
    <tfoot>
      <slot name="footer" />
    </tfoot>
  </table>
</template>
```

## 性能优化

### 1. 使用计算属性缓存

```vue
<script setup lang="ts">
// ✅ 好：使用 computed 缓存
const filteredList = computed(() => {
  return list.value.filter((item) => item.active);
});

// ❌ 不好：每次渲染都重新计算
function getFilteredList() {
  return list.value.filter((item) => item.active);
}
</script>
```

### 2. 合理使用 v-show 和 v-if

```vue
<template>
  <!-- 频繁切换使用 v-show -->
  <div v-show="isVisible">频繁切换的内容</div>

  <!-- 条件渲染使用 v-if -->
  <div v-if="hasPermission">需要权限的内容</div>
</template>
```

### 3. 列表使用唯一 key

```vue
<template>
  <!-- ✅ 好：使用唯一的 id -->
  <div v-for="item in list" :key="item.id">{{ item.name }}</div>

  <!-- ❌ 不好：使用 index -->
  <div v-for="(item, index) in list" :key="index">{{ item.name }}</div>
</template>
```

## 组件文档化

### Props 和 Events 注释

```vue
<script setup lang="ts">
interface Props {
  /** 表格数据源 */
  data: Array<any>;
  /** 表格列配置 */
  columns: TableColumn[];
  /** 是否显示分页器 */
  showPagination?: boolean;
}

interface Emits {
  /** 当前页改变时触发 */
  (e: "page-change", page: number): void;
  /** 行被点击时触发 */
  (e: "row-click", row: any): void;
}

const props = withDefaults(defineProps<Props>(), {
  showPagination: true,
});

const emit = defineEmits<Emits>();
</script>
```

## 最佳实践

- ✅ 组件职责单一，不超过 200 行代码
- ✅ 复杂逻辑抽离为 Hooks
- ✅ Props 和 Events 提供完整类型定义
- ✅ 使用插槽提供扩展点
- ✅ 合理使用计算属性缓存
- ✅ 列表必须使用唯一 key

## 注意事项

- ⚠️ 避免组件过于复杂，超过 200 行需考虑拆分
- ⚠️ 不要在组件中直接操作 DOM
- ⚠️ 避免 Props 过多，超过 5 个需考虑重构
- ⚠️ 事件命名要清晰，避免使用 click、change 等通用名称
