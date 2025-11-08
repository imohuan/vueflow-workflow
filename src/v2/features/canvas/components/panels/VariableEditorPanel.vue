<template>
  <div class="h-full overflow-y-auto bg-white">
    <!-- 顶部工具栏 -->
    <div class="border-b border-slate-200 bg-white p-3">
      <n-space vertical size="small">
        <!-- 搜索框 -->
        <n-input
          v-model:value="searchQuery"
          placeholder="搜索变量..."
          size="small"
          clearable
        >
          <template #prefix>
            <n-icon :component="IconSearch" />
          </template>
        </n-input>

        <!-- 添加变量按钮 -->
        <n-button block secondary size="small" @click="addVariable">
          <template #icon>
            <n-icon :component="IconAdd" />
          </template>
          添加变量
        </n-button>
      </n-space>
    </div>

    <!-- 变量列表 -->
    <div class="p-3">
      <div class="space-y-2">
        <div
          v-for="variable in filteredVariables"
          :key="variable.key"
          class="rounded border border-slate-200 bg-white p-3"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <!-- 变量名 -->
              <div class="flex items-center gap-2">
                <n-tag :type="getVariableTypeColor(variable.type)" size="small">
                  {{ variable.type }}
                </n-tag>
                <span class="font-medium text-slate-800">{{
                  variable.key
                }}</span>
              </div>

              <!-- 变量描述 -->
              <div
                v-if="variable.description"
                class="mt-1 text-xs text-slate-500"
              >
                {{ variable.description }}
              </div>

              <!-- 变量值 -->
              <div class="mt-2">
                <!-- 字符串类型 -->
                <n-input
                  v-if="variable.type === 'string'"
                  v-model:value="variable.value"
                  size="small"
                  placeholder="输入字符串值..."
                  @update:value="handleVariableChange(variable)"
                />

                <!-- 数字类型 -->
                <n-input-number
                  v-else-if="variable.type === 'number'"
                  v-model:value="variable.value"
                  size="small"
                  class="w-full"
                  @update:value="handleVariableChange(variable)"
                >
                  <template #minus-icon>
                    <n-icon :component="IconMinus" />
                  </template>
                  <template #add-icon>
                    <n-icon :component="IconAdd" />
                  </template>
                </n-input-number>

                <!-- 布尔类型 -->
                <n-switch
                  v-else-if="variable.type === 'boolean'"
                  v-model:value="variable.value"
                  @update:value="handleVariableChange(variable)"
                />

                <!-- 对象类型 - 可折叠编辑器 -->
                <ObjectEditor
                  v-else-if="variable.type === 'object'"
                  v-model:value="variable.value"
                  @update:value="handleVariableChange(variable)"
                />

                <!-- 数组类型 - 可折叠编辑器 -->
                <ArrayEditor
                  v-else-if="variable.type === 'array'"
                  v-model:value="variable.value"
                  @update:value="handleVariableChange(variable)"
                />
              </div>
            </div>

            <!-- 操作按钮 -->
            <n-space size="small">
              <n-button
                size="tiny"
                circle
                secondary
                @click="editVariable(variable)"
                title="编辑变量"
              >
                <template #icon>
                  <n-icon :component="IconEdit" />
                </template>
              </n-button>
              <n-button
                size="tiny"
                circle
                secondary
                type="error"
                @click="deleteVariable(variable)"
                title="删除变量"
              >
                <template #icon>
                  <n-icon :component="IconDelete" />
                </template>
              </n-button>
            </n-space>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <n-empty
        v-if="variables.length === 0"
        description="暂无变量"
        class="mt-8"
      >
        <template #extra>
          <n-button size="small" @click="addVariable">添加第一个变量</n-button>
        </template>
      </n-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useMessage, useDialog } from "naive-ui";
import IconSearch from "@/icons/IconSearch.vue";
import IconAdd from "@/icons/IconAdd.vue";
import IconEdit from "@/icons/IconEdit.vue";
import IconDelete from "@/icons/IconDelete.vue";
import IconMinus from "@/icons/IconMinus.vue";
import ObjectEditor from "./components/ObjectEditor.vue";
import ArrayEditor from "./components/ArrayEditor.vue";

// 变量类型
type VariableType = "string" | "number" | "boolean" | "object" | "array";

// 变量定义
interface Variable {
  key: string;
  type: VariableType;
  value: any;
  description?: string;
}

const message = useMessage();
const dialog = useDialog();

// 搜索关键词
const searchQuery = ref("");

// 变量列表（示例数据）
const variables = ref<Variable[]>([
  {
    key: "baseUrl",
    type: "string",
    value: "https://example.com",
    description: "网站基础 URL",
  },
  {
    key: "timeout",
    type: "number",
    value: 30000,
    description: "请求超时时间（毫秒）",
  },
  {
    key: "debug",
    type: "boolean",
    value: false,
    description: "是否启用调试模式",
  },
  {
    key: "headers",
    type: "object",
    value: {
      "Content-Type": "application/json",
      Authorization: "Bearer token123",
      nested: {
        key1: "value1",
        key2: 123,
      },
    },
    description: "HTTP 请求头（支持嵌套对象）",
  },
  {
    key: "userList",
    type: "array",
    value: ["user1", "user2", { name: "user3", age: 25 }, ["nested", "array"]],
    description: "用户列表（支持嵌套数组和对象）",
  },
]);

// 过滤后的变量列表
const filteredVariables = computed(() => {
  if (!searchQuery.value) return variables.value;

  const searchLower = searchQuery.value.toLowerCase();
  return variables.value.filter((variable) => {
    return (
      variable.key.toLowerCase().includes(searchLower) ||
      variable.description?.toLowerCase().includes(searchLower)
    );
  });
});

/**
 * 获取变量类型颜色
 */
function getVariableTypeColor(type: VariableType) {
  const colorMap = {
    string: "success",
    number: "info",
    boolean: "warning",
    object: "default",
    array: "default",
  };
  return colorMap[type] as any;
}

/**
 * 处理变量值变化
 */
function handleVariableChange(variable: Variable) {
  console.log("变量已更新:", variable.key, variable.value);
  message?.success(`变量 ${variable.key} 已更新`);
}

/**
 * 添加变量
 */
function addVariable() {
  dialog?.create({
    title: "添加变量",
    content: "请输入变量名称",
    positiveText: "添加",
    negativeText: "取消",
    onPositiveClick: () => {
      const newVariable: Variable = {
        key: `newVar${Date.now()}`,
        type: "string",
        value: "",
        description: "新变量",
      };
      variables.value.push(newVariable);
      message?.success("变量添加成功");
    },
  });
}

/**
 * 编辑变量
 */
function editVariable(variable: Variable) {
  console.log("编辑变量:", variable);
  message?.info(`编辑变量: ${variable.key}`);
}

/**
 * 删除变量
 */
function deleteVariable(variable: Variable) {
  dialog?.warning({
    title: "删除变量",
    content: `确定要删除变量 "${variable.key}" 吗？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => {
      const index = variables.value.indexOf(variable);
      if (index > -1) {
        variables.value.splice(index, 1);
        message?.success(`变量 ${variable.key} 已删除`);
      }
    },
  });
}
</script>

<style scoped></style>
