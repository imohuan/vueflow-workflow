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

        <!-- 按钮组 -->
        <div class="flex gap-2">
          <!-- 添加变量按钮 -->
          <n-button secondary size="small" @click="addVariable" class="flex-1">
            <template #icon>
              <n-icon :component="IconAdd" />
            </template>
            添加变量
          </n-button>
          <!-- JSON 编辑器按钮 -->
          <n-button secondary size="small" @click="openJsonEditor">
            <template #icon>
              <n-icon :component="IconCode" />
            </template>
            JSON 编辑器
          </n-button>
        </div>
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
                <span
                  class="font-medium text-lg font-mono underline text-blue-400"
                  >{{ variable.key }}</span
                >

                <n-tag :type="getVariableTypeColor(variable.type)" size="small">
                  {{ variable.type }}
                </n-tag>
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
                @click="deleteVariable(variable)"
                title="删除变量"
              >
                <template #icon>
                  <n-icon :component="IconDel" />
                </template>
              </n-button>
            </n-space>
          </div>

          <!-- 变量描述 -->
          <div v-if="variable.description" class="mt-1 text-xs text-slate-500">
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
              @update:value="debounceHandleVariableChange(variable)"
            />

            <!-- 数字类型 -->
            <n-input-number
              v-else-if="variable.type === 'number'"
              v-model:value="variable.value"
              size="small"
              class="w-full"
              @update:value="debounceHandleVariableChange(variable)"
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
              @update:value="debounceHandleVariableChange(variable)"
            />

            <!-- 对象类型 - 可折叠编辑器 -->
            <ObjectEditor
              v-else-if="variable.type === 'object'"
              v-model:value="variable.value"
              @update:value="debounceHandleVariableChange(variable)"
            />

            <!-- 数组类型 - 可折叠编辑器 -->
            <ArrayEditor
              v-else-if="variable.type === 'array'"
              v-model:value="variable.value"
              @update:value="debounceHandleVariableChange(variable)"
            />
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <n-empty
        v-if="globalVariables.length === 0"
        description="暂无变量"
        class="mt-8"
      >
        <template #extra>
          <n-button size="small" @click="addVariable">添加第一个变量</n-button>
        </template>
      </n-empty>
    </div>

    <!-- 变量编辑表单模态框 -->
    <n-modal
      v-model:show="showVariableForm"
      preset="dialog"
      :title="editingVariable ? '编辑变量' : '添加变量'"
      :positive-text="editingVariable ? '保存' : '添加'"
      negative-text="取消"
      @positive-click="saveVariableForm"
      @negative-click="cancelVariableForm"
    >
      <n-form
        :model="variableForm"
        label-placement="left"
        label-width="80"
        require-mark-placement="left"
      >
        <n-form-item label="变量名称" required>
          <n-input
            v-model:value="variableForm.key"
            placeholder="例如: baseUrl"
            :disabled="!!editingVariable"
          />
        </n-form-item>

        <n-form-item label="变量类型" required>
          <n-select
            v-model:value="variableForm.type"
            :options="[
              { label: '字符串', value: 'string' },
              { label: '数字', value: 'number' },
              { label: '布尔', value: 'boolean' },
              { label: '对象', value: 'object' },
              { label: '数组', value: 'array' },
            ]"
            @update:value="handleTypeChange"
          />
        </n-form-item>

        <n-form-item label="默认值" required>
          <!-- 字符串 -->
          <n-input
            v-if="variableForm.type === 'string'"
            v-model:value="variableForm.value"
            placeholder="输入字符串值"
          />
          <!-- 数字 -->
          <n-input-number
            v-else-if="variableForm.type === 'number'"
            v-model:value="variableForm.value"
            class="w-full"
          />
          <!-- 布尔 -->
          <n-switch
            v-else-if="variableForm.type === 'boolean'"
            v-model:value="variableForm.value"
          />
          <!-- 对象/数组 -->
          <n-input
            v-else
            v-model:value="variableForm.value"
            type="textarea"
            placeholder="输入 JSON 格式"
            :rows="3"
          />
        </n-form-item>

        <n-form-item label="描述">
          <n-input
            v-model:value="variableForm.description"
            placeholder="可选，描述变量用途"
            type="textarea"
            :rows="2"
          />
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useMessage, useDialog } from "naive-ui";
import IconSearch from "@/icons/IconSearch.vue";
import IconAdd from "@/icons/IconAdd.vue";
import IconEdit from "@/icons/IconEdit.vue";
import IconDel from "@/icons/IconDel.vue";
import IconMinus from "@/icons/IconMinus.vue";
import IconCode from "@/icons/IconCode.vue";
import ObjectEditor from "./components/ObjectEditor.vue";
import ArrayEditor from "./components/ArrayEditor.vue";
import {
  useWorkflowStore,
  type GlobalVariable,
  type GlobalVariableType,
} from "@/v2/stores/workflow";
import { useUiStore } from "@/v2/stores/ui";
import { debounce } from "lodash-es";

const message = useMessage();
const dialog = useDialog();
const workflowStore = useWorkflowStore();
const uiStore = useUiStore();
const { globalVariables } = storeToRefs(workflowStore);

// 搜索关键词
const searchQuery = ref("");

// 变量表单状态
const showVariableForm = ref(false);
const editingVariable = ref<GlobalVariable | null>(null);
const variableForm = ref({
  key: "",
  type: "string" as GlobalVariableType,
  value: "" as any,
  description: "",
});

// 过滤后的变量列表
const filteredVariables = computed(() => {
  if (!searchQuery.value) return globalVariables.value;

  const searchLower = searchQuery.value.toLowerCase();
  return globalVariables.value.filter((variable) => {
    return (
      variable.key.toLowerCase().includes(searchLower) ||
      variable.description?.toLowerCase().includes(searchLower)
    );
  });
});

/**
 * 获取变量类型颜色
 */
function getVariableTypeColor(type: GlobalVariableType) {
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
function handleVariableChange(variable: GlobalVariable) {
  console.log("变量已更新:", variable.key, variable.value);
  workflowStore.updateGlobalVariable(variable.key, variable);
  message?.success(`变量 ${variable.key} 已更新`);
}

function debounceHandleVariableChange(variable: GlobalVariable) {
  debounce(() => {
    handleVariableChange(variable);
  }, 1000);
}

/**
 * 添加变量
 */
function addVariable() {
  editingVariable.value = null;
  variableForm.value = {
    key: "",
    type: "string",
    value: "",
    description: "",
  };
  showVariableForm.value = true;
}

/**
 * 编辑变量
 */
function editVariable(variable: GlobalVariable) {
  editingVariable.value = variable;

  // 对象和数组类型需要转换为 JSON 字符串
  let displayValue = variable.value;
  if (variable.type === "object" || variable.type === "array") {
    displayValue = JSON.stringify(variable.value, null, 2);
  }

  variableForm.value = {
    key: variable.key,
    type: variable.type,
    value: displayValue,
    description: variable.description || "",
  };
  showVariableForm.value = true;
}

/**
 * 保存变量表单
 */
function saveVariableForm() {
  // 验证
  if (!variableForm.value.key.trim()) {
    message?.error("变量名称不能为空");
    return false;
  }

  // 检查变量名是否已存在（编辑时排除自身）
  const exists = globalVariables.value.some(
    (v) =>
      v.key === variableForm.value.key && v.key !== editingVariable.value?.key
  );
  if (exists) {
    message?.error("变量名称已存在");
    return false;
  }

  // 处理值（对象和数组类型需要解析 JSON）
  let finalValue = variableForm.value.value;
  if (
    variableForm.value.type === "object" ||
    variableForm.value.type === "array"
  ) {
    if (typeof finalValue === "string") {
      try {
        finalValue = JSON.parse(finalValue);
      } catch (error) {
        message?.error("JSON 格式错误，请检查输入");
        return false;
      }
    }
  }

  if (editingVariable.value) {
    // 更新变量
    workflowStore.updateGlobalVariable(editingVariable.value.key, {
      key: variableForm.value.key,
      type: variableForm.value.type,
      value: finalValue,
      description: variableForm.value.description,
    });
    message?.success("变量更新成功");
  } else {
    // 添加新变量
    const newVariable: GlobalVariable = {
      key: variableForm.value.key,
      type: variableForm.value.type,
      value: finalValue,
      description: variableForm.value.description,
    };
    workflowStore.addGlobalVariable(newVariable);
    message?.success("变量添加成功");
  }

  showVariableForm.value = false;
  return true;
}

/**
 * 取消变量表单
 */
function cancelVariableForm() {
  showVariableForm.value = false;
  editingVariable.value = null;
}

/**
 * 处理类型变化，重置值
 */
function handleTypeChange(type: GlobalVariableType) {
  const oldType = variableForm.value.type;

  // 如果从非对象/数组类型切换到对象/数组类型，需要转换为 JSON 字符串
  if (
    (type === "object" || type === "array") &&
    oldType !== "object" &&
    oldType !== "array"
  ) {
    switch (type) {
      case "object":
        variableForm.value.value = "{}";
        break;
      case "array":
        variableForm.value.value = "[]";
        break;
    }
  }
  // 如果从对象/数组类型切换到其他类型
  else if (
    (oldType === "object" || oldType === "array") &&
    type !== "object" &&
    type !== "array"
  ) {
    switch (type) {
      case "string":
        variableForm.value.value = "";
        break;
      case "number":
        variableForm.value.value = 0;
        break;
      case "boolean":
        variableForm.value.value = false;
        break;
    }
  }
  // 在对象和数组之间切换
  else if (type === "object" && oldType === "array") {
    variableForm.value.value = "{}";
  } else if (type === "array" && oldType === "object") {
    variableForm.value.value = "[]";
  }
  // 其他基本类型之间切换
  else {
    switch (type) {
      case "string":
        variableForm.value.value = "";
        break;
      case "number":
        variableForm.value.value = 0;
        break;
      case "boolean":
        variableForm.value.value = false;
        break;
    }
  }
}

/**
 * 删除变量
 */
function deleteVariable(variable: GlobalVariable) {
  dialog?.warning({
    title: "删除变量",
    content: `确定要删除变量 "${variable.key}" 吗？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => {
      workflowStore.deleteGlobalVariable(variable.key);
      message?.success(`变量 ${variable.key} 已删除`);
    },
  });
}

/**
 * 打开 JSON 编辑器
 */
function openJsonEditor() {
  // 将所有变量转换为 JSON 格式
  const variablesJson = JSON.stringify(globalVariables.value, null, 2);

  // 打开编辑器模态框
  uiStore.openEditorPanelModal(
    "变量 JSON 编辑器",
    variablesJson,
    "json",
    (jsonContent: string) => {
      try {
        // 解析 JSON
        const parsed = JSON.parse(jsonContent);

        // 验证是否为数组
        if (!Array.isArray(parsed)) {
          message?.error("JSON 格式错误：必须是一个数组");
          return;
        }

        // 验证每个变量的结构
        for (const variable of parsed) {
          if (
            !variable ||
            typeof variable !== "object" ||
            !variable.key ||
            !variable.type ||
            !("value" in variable)
          ) {
            message?.error(
              `变量格式错误：每个变量必须包含 key、type 和 value 字段`
            );
            return;
          }

          // 验证类型
          const validTypes: GlobalVariableType[] = [
            "string",
            "number",
            "boolean",
            "object",
            "array",
          ];
          if (!validTypes.includes(variable.type)) {
            message?.error(
              `变量 "${variable.key}" 的类型无效：${variable.type}`
            );
            return;
          }
        }

        // 更新所有变量
        workflowStore.setGlobalVariables(parsed);
        message?.success("变量已更新");
      } catch (error) {
        message?.error(
          `JSON 解析失败：${
            error instanceof Error ? error.message : "未知错误"
          }`
        );
      }
    }
  );
}
</script>

<style scoped></style>
