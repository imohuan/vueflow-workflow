<template>
  <div class="space-y-1">
    <!-- 折叠标题 -->
    <div
      class="flex cursor-pointer items-center gap-2 rounded bg-slate-100 px-2 py-1.5 hover:bg-slate-200"
      @click="toggleExpanded"
    >
      <n-icon
        :component="expanded ? IconChevronDown : IconChevronRight"
        size="14"
      />
      <span class="text-xs text-slate-600">数组元素</span>
    </div>

    <!-- 元素列表 -->
    <div v-show="expanded" class="space-y-1 pl-4">
      <!-- 元素项 -->
      <div v-for="(item, index) in arrayItems" :key="index" class="space-y-1">
        <!-- 元素行 -->
        <div class="flex items-center gap-1">
          <!-- 索引显示 -->
          <div
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-200 text-xs font-medium text-slate-600"
          >
            {{ index }}
          </div>

          <!-- 类型选择 -->
          <n-select
            v-model:value="item.type"
            size="small"
            :options="typeOptions"
            :consistent-menu-width="false"
            class="w-28"
            @update:value="handleTypeChange(item)"
          />

          <!-- 展开按钮（对象/数组） -->
          <n-button
            v-if="item.type === 'object' || item.type === 'array'"
            size="tiny"
            circle
            secondary
            @click="toggleItemExpanded(index)"
            :title="item.expanded ? '收起' : '展开'"
          >
            <template #icon>
              <n-icon
                :component="item.expanded ? IconChevronDown : IconChevronRight"
              />
            </template>
          </n-button>

          <!-- 删除按钮 -->
          <n-button
            size="tiny"
            circle
            secondary
            type="error"
            @click="removeItem(index)"
            title="删除元素"
          >
            <template #icon>
              <n-icon :component="IconDelete" />
            </template>
          </n-button>
        </div>

        <!-- 值输入区域 -->
        <div
          v-if="item.type !== 'object' && item.type !== 'array'"
          class="pl-8"
        >
          <!-- 字符串 -->
          <n-input
            v-if="item.type === 'string'"
            v-model:value="item.value"
            size="small"
            placeholder="输入字符串值"
            @update:value="handleUpdate"
          />

          <!-- 数字 -->
          <n-input-number
            v-else-if="item.type === 'number'"
            v-model:value="item.value"
            size="small"
            class="w-full"
            placeholder="输入数字"
            @update:value="handleUpdate"
          >
            <template #minus-icon>
              <n-icon :component="IconMinus" />
            </template>
            <template #add-icon>
              <n-icon :component="IconAdd" />
            </template>
          </n-input-number>

          <!-- 布尔 -->
          <n-switch
            v-else-if="item.type === 'boolean'"
            v-model:value="item.value"
            @update:value="handleUpdate"
          />
        </div>

        <!-- 嵌套对象 -->
        <div v-if="item.type === 'object' && item.expanded" class="pl-8">
          <ObjectEditor
            v-model:value="item.value"
            @update:value="handleUpdate"
          />
        </div>

        <!-- 嵌套数组 -->
        <div v-if="item.type === 'array' && item.expanded" class="pl-8">
          <ArrayEditor
            v-model:value="item.value"
            @update:value="handleUpdate"
          />
        </div>
      </div>

      <!-- 添加元素按钮 -->
      <n-button
        block
        text
        size="small"
        @click="addItem"
        class="text-slate-500! hover:text-slate-700!"
      >
        <template #icon>
          <n-icon :component="IconAdd" />
        </template>
        添加元素
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import IconAdd from "@/icons/IconAdd.vue";
import IconMinus from "@/icons/IconMinus.vue";
import IconDelete from "@/icons/IconDel.vue";
import IconChevronDown from "@/icons/IconChevronDown.vue";
import IconChevronRight from "@/icons/IconChevronRight.vue";
import ObjectEditor from "./ObjectEditor.vue";

// Props
interface Props {
  value: any[];
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  "update:value": [value: any[]];
}>();

// 类型选项
const typeOptions = [
  { label: "String", value: "string" },
  { label: "Number", value: "number" },
  { label: "Boolean", value: "boolean" },
  { label: "Object", value: "object" },
  { label: "Array", value: "array" },
];

// 元素类型
type ItemType = "string" | "number" | "boolean" | "object" | "array";

interface ArrayItem {
  type: ItemType;
  value: any;
  expanded?: boolean;
}

// 是否展开
const expanded = ref(true);

// 内部元素列表
const arrayItems = ref<ArrayItem[]>([]);

// 切换展开状态
function toggleExpanded() {
  expanded.value = !expanded.value;
}

// 切换元素展开状态
function toggleItemExpanded(index: number) {
  const item = arrayItems.value[index];
  if (item) {
    item.expanded = !item.expanded;
  }
}

// 初始化元素列表
function initItems() {
  arrayItems.value = (props.value || []).map((value) => ({
    type: getValueType(value),
    value,
    expanded: false,
  }));
}

// 获取值的类型
function getValueType(value: any): ItemType {
  if (Array.isArray(value)) return "array";
  if (value === null) return "string";
  const type = typeof value;
  if (type === "object") return "object";
  if (type === "number") return "number";
  if (type === "boolean") return "boolean";
  return "string";
}

// 获取类型的默认值
function getDefaultValue(type: ItemType): any {
  switch (type) {
    case "string":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "object":
      return {};
    case "array":
      return [];
    default:
      return "";
  }
}

// 监听 props 变化
watch(
  () => props.value,
  (newValue) => {
    if (newValue) {
      initItems();
    }
  },
  { immediate: true, deep: true }
);

// 添加元素
function addItem() {
  arrayItems.value.push({
    type: "string",
    value: "",
    expanded: false,
  });
  handleUpdate();
}

// 删除元素
function removeItem(index: number) {
  arrayItems.value.splice(index, 1);
  handleUpdate();
}

// 处理类型变化
function handleTypeChange(item: ArrayItem) {
  item.value = getDefaultValue(item.type);
  item.expanded = false;
  handleUpdate();
}

// 更新值
function handleUpdate() {
  const newValue = arrayItems.value.map((item) => item.value);
  emit("update:value", newValue);
}
</script>

<style scoped></style>
