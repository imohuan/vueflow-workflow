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
      <span class="text-xs text-slate-600">对象属性</span>
    </div>

    <!-- 属性列表 -->
    <div v-show="expanded" class="space-y-1">
      <!-- 属性项 -->
      <div
        v-for="(prop, index) in objectProperties"
        :key="index"
        class="space-y-1"
      >
        <!-- 属性行 -->
        <div class="flex items-center gap-1">
          <!-- Key 输入 -->
          <div class="w-12">
            <n-input
              v-model:value="prop.key"
              size="tiny"
              placeholder="属性名"
              class="flex-1"
              @update:value="handleUpdate"
            />
          </div>

          <!-- 类型选择 -->
          <div class="w-16">
            <n-select
              v-model:value="prop.type"
              size="tiny"
              :options="typeOptions"
              :consistent-menu-width="false"
              class="w-28"
              @update:value="handleTypeChange(prop)"
            />
          </div>

          <!-- 值输入区域 -->
          <div
            v-if="prop.type !== 'object' && prop.type !== 'array'"
            class="flex-1"
          >
            <!-- 字符串 -->
            <n-input
              v-if="prop.type === 'string'"
              v-model:value="prop.value"
              size="tiny"
              placeholder="输入字符串值"
              @update:value="handleUpdate"
            />

            <!-- 数字 -->
            <n-input-number
              v-else-if="prop.type === 'number'"
              v-model:value="prop.value"
              size="tiny"
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
              v-else-if="prop.type === 'boolean'"
              v-model:value="prop.value"
              @update:value="handleUpdate"
            />
          </div>

          <!-- 展开按钮（对象/数组） -->
          <div>
            <n-button
              v-if="prop.type === 'object' || prop.type === 'array'"
              size="tiny"
              circle
              secondary
              @click="togglePropertyExpanded(index)"
              :title="prop.expanded ? '收起' : '展开'"
            >
              <template #icon>
                <n-icon
                  :component="
                    prop.expanded ? IconChevronDown : IconChevronRight
                  "
                />
              </template>
            </n-button>

            <!-- 删除按钮 -->
            <n-button
              size="tiny"
              circle
              secondary
              @click="removeProperty(index)"
              title="删除属性"
            >
              <template #icon>
                <n-icon :component="IconDelete" />
              </template>
            </n-button>
          </div>
        </div>

        <!-- 嵌套对象 -->
        <div v-if="prop.type === 'object' && prop.expanded" class="pl-4">
          <ObjectEditor
            v-model:value="prop.value"
            @update:value="handleUpdate"
          />
        </div>

        <!-- 嵌套数组 -->
        <div v-if="prop.type === 'array' && prop.expanded" class="pl-4">
          <ArrayEditor
            v-model:value="prop.value"
            @update:value="handleUpdate"
          />
        </div>
      </div>

      <!-- 添加属性按钮 -->
      <n-button
        block
        text
        size="small"
        @click="addProperty"
        class="text-slate-500! hover:text-slate-700!"
      >
        <template #icon>
          <n-icon :component="IconAdd" />
        </template>
        添加属性
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
import ArrayEditor from "./ArrayEditor.vue";

// Props
interface Props {
  value: Record<string, any>;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  "update:value": [value: Record<string, any>];
}>();

// 类型选项
const typeOptions = [
  { label: "String", value: "string" },
  { label: "Number", value: "number" },
  { label: "Boolean", value: "boolean" },
  { label: "Object", value: "object" },
  { label: "Array", value: "array" },
];

// 属性类型
type PropertyType = "string" | "number" | "boolean" | "object" | "array";

interface ObjectProperty {
  key: string;
  type: PropertyType;
  value: any;
  expanded?: boolean;
}

// 是否展开
const expanded = ref(true);

// 内部属性列表
const objectProperties = ref<ObjectProperty[]>([]);

// 切换展开状态
function toggleExpanded() {
  expanded.value = !expanded.value;
}

// 切换属性展开状态
function togglePropertyExpanded(index: number) {
  const prop = objectProperties.value[index];
  if (prop) {
    prop.expanded = !prop.expanded;
  }
}

// 初始化属性列表
function initProperties() {
  objectProperties.value = Object.entries(props.value || {}).map(
    ([key, value]) => ({
      key,
      type: getValueType(value),
      value,
      expanded: false,
    })
  );
}

// 获取值的类型
function getValueType(value: any): PropertyType {
  if (Array.isArray(value)) return "array";
  if (value === null) return "string";
  const type = typeof value;
  if (type === "object") return "object";
  if (type === "number") return "number";
  if (type === "boolean") return "boolean";
  return "string";
}

// 获取类型的默认值
function getDefaultValue(type: PropertyType): any {
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
      initProperties();
    }
  },
  { immediate: true, deep: true }
);

// 添加属性
function addProperty() {
  objectProperties.value.push({
    key: `newKey${Date.now()}`,
    type: "string",
    value: "",
    expanded: false,
  });
  handleUpdate();
}

// 删除属性
function removeProperty(index: number) {
  objectProperties.value.splice(index, 1);
  handleUpdate();
}

// 处理类型变化
function handleTypeChange(prop: ObjectProperty) {
  prop.value = getDefaultValue(prop.type);
  prop.expanded = false;
  handleUpdate();
}

// 更新值
function handleUpdate() {
  const newValue: Record<string, any> = {};
  objectProperties.value.forEach((prop) => {
    if (prop.key) {
      newValue[prop.key] = prop.value;
    }
  });
  emit("update:value", newValue);
}
</script>

<style scoped></style>
