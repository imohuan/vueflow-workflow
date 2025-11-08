<template>
  <div class="config-field mb-4">
    <!-- 字段标签 -->
    <label
      v-if="field.label"
      class="mb-2 block text-sm font-medium text-slate-700"
    >
      {{ field.label }}
      <span v-if="field.required" class="text-red-500">*</span>
    </label>

    <!-- 字段描述 -->
    <p v-if="field.description" class="mb-2 text-xs text-slate-500">
      {{ field.description }}
    </p>

    <!-- 根据字段类型渲染不同的输入组件 -->
    <div class="field-input">
      <!-- 文本输入 -->
      <n-input
        v-if="field.type === 'input'"
        :value="modelValue"
        :placeholder="field.placeholder"
        :disabled="field.disabled"
        @update:value="handleUpdate"
      />

      <!-- 多行文本 -->
      <n-input
        v-else-if="field.type === 'textarea'"
        type="textarea"
        :value="modelValue"
        :placeholder="field.placeholder"
        :disabled="field.disabled"
        :rows="4"
        @update:value="handleUpdate"
      />

      <!-- 数字输入 -->
      <n-input-number
        v-else-if="field.type === 'number'"
        :value="modelValue"
        :placeholder="field.placeholder"
        :disabled="field.disabled"
        :min="getValidationValue('min')"
        :max="getValidationValue('max')"
        :step="getValidationValue('step') || 1"
        class="w-full"
        @update:value="handleUpdate"
      />

      <!-- 下拉选择 -->
      <n-select
        v-else-if="field.type === 'select'"
        :value="modelValue"
        :options="field.options"
        :placeholder="field.placeholder"
        :disabled="field.disabled"
        @update:value="handleUpdate"
      />

      <!-- 开关 -->
      <n-switch
        v-else-if="field.type === 'switch'"
        :value="modelValue"
        :disabled="field.disabled"
        @update:value="handleUpdate"
      />

      <!-- 复选框 -->
      <n-checkbox-group
        v-else-if="field.type === 'checkbox'"
        :value="modelValue"
        :disabled="field.disabled"
        @update:value="handleUpdate"
      >
        <n-space vertical>
          <n-checkbox
            v-for="option in field.options"
            :key="option.value"
            :value="option.value"
            :label="option.label"
          />
        </n-space>
      </n-checkbox-group>

      <!-- 单选框 -->
      <n-radio-group
        v-else-if="field.type === 'radio'"
        :value="modelValue"
        :disabled="field.disabled"
        @update:value="handleUpdate"
      >
        <n-space vertical>
          <n-radio
            v-for="option in field.options"
            :key="option.value"
            :value="option.value"
            :label="option.label"
          />
        </n-space>
      </n-radio-group>

      <!-- 颜色选择器 -->
      <n-color-picker
        v-else-if="field.type === 'color'"
        :value="modelValue"
        :disabled="field.disabled"
        @update:value="handleUpdate"
      />

      <!-- 文件上传 -->
      <n-upload
        v-else-if="field.type === 'file'"
        :disabled="field.disabled"
        @change="handleFileChange"
      >
        <n-button secondary>选择文件</n-button>
      </n-upload>

      <!-- JSON 编辑器 -->
      <n-input
        v-else-if="field.type === 'json-editor'"
        type="textarea"
        :value="formatJson(modelValue)"
        :placeholder="field.placeholder || '输入 JSON 数据...'"
        :disabled="field.disabled"
        :rows="8"
        @update:value="handleJsonUpdate"
      />

      <!-- 代码编辑器 -->
      <n-input
        v-else-if="field.type === 'code-editor'"
        type="textarea"
        :value="modelValue"
        :placeholder="field.placeholder || '输入代码...'"
        :disabled="field.disabled"
        :rows="8"
        @update:value="handleUpdate"
      />

      <!-- 不支持的类型 -->
      <div v-else class="text-sm text-red-500">
        不支持的字段类型: {{ field.type }}
      </div>
    </div>

    <!-- 验证错误提示 -->
    <div v-if="validationError" class="mt-1 text-xs text-red-500">
      {{ validationError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { ConfigField } from "../../typings/config";

interface Props {
  field: ConfigField;
  modelValue: any;
}

interface Emits {
  (e: "update:modelValue", value: any): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const validationError = ref<string>("");

/**
 * 处理值更新
 */
function handleUpdate(value: any) {
  // 验证字段
  const error = validateField(value);
  validationError.value = error;

  // 如果验证通过，触发更新
  if (!error) {
    emit("update:modelValue", value);
  }
}

/**
 * 处理 JSON 更新
 */
function handleJsonUpdate(value: string) {
  try {
    const parsed = JSON.parse(value);
    validationError.value = "";
    emit("update:modelValue", parsed);
  } catch (error) {
    validationError.value = "JSON 格式错误";
  }
}

/**
 * 处理文件上传
 */
function handleFileChange(data: any) {
  const file = data.file;
  emit("update:modelValue", file);
}

/**
 * 格式化 JSON 显示
 */
function formatJson(value: any): string {
  if (!value) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * 获取验证规则的值
 */
function getValidationValue(type: string): number | undefined {
  const rule = props.field.validation?.find((r) => r.type === type);
  return rule?.value as number | undefined;
}

/**
 * 验证字段值
 */
function validateField(value: any): string {
  const { field } = props;

  // 必填验证
  if (
    field.required &&
    (value === null || value === undefined || value === "")
  ) {
    return `${field.label} 为必填项`;
  }

  // 自定义验证规则
  if (field.validation) {
    for (const rule of field.validation) {
      const error = applyValidationRule(rule, value);
      if (error) return error;
    }
  }

  return "";
}

/**
 * 应用验证规则
 */
function applyValidationRule(rule: any, value: any): string {
  switch (rule.type) {
    case "min":
      if (typeof value === "number" && value < rule.value) {
        return `最小值为 ${rule.value}`;
      }
      if (typeof value === "string" && value.length < rule.value) {
        return `最少输入 ${rule.value} 个字符`;
      }
      break;

    case "max":
      if (typeof value === "number" && value > rule.value) {
        return `最大值为 ${rule.value}`;
      }
      if (typeof value === "string" && value.length > rule.value) {
        return `最多输入 ${rule.value} 个字符`;
      }
      break;

    case "url":
      try {
        new URL(value);
      } catch {
        return "请输入有效的 URL";
      }
      break;

    case "email":
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return "请输入有效的邮箱地址";
      }
      break;

    case "pattern":
      if (rule.value && !new RegExp(rule.value).test(value)) {
        return rule.message || "格式不正确";
      }
      break;

    default:
      break;
  }

  return "";
}

// 监听 modelValue 变化，清除验证错误
watch(
  () => props.modelValue,
  () => {
    validationError.value = "";
  }
);
</script>

<style scoped>
.config-field {
  transition: all 0.2s ease;
}
</style>
