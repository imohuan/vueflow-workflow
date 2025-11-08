<template>
  <div class="config-renderer">
    <!-- 配置分组 -->
    <div
      v-for="section in schema.sections"
      :key="section.id"
      class="config-section mb-6"
    >
      <!-- 分组标题 -->
      <div class="section-header mb-4 border-b border-slate-200 pb-3">
        <div class="flex items-center gap-2">
          <component
            :is="section.icon"
            v-if="section.icon"
            class="h-5 w-5 text-slate-600"
          />
          <h3 class="text-base font-semibold text-slate-800">
            {{ section.title }}
          </h3>
        </div>
        <p v-if="section.description" class="mt-1 text-sm text-slate-500">
          {{ section.description }}
        </p>
      </div>

      <!-- 分组字段 -->
      <div class="section-fields space-y-4">
        <ConfigField
          v-for="field in section.fields"
          :key="field.key"
          :field="field"
          :model-value="config[field.key] ?? field.default"
          @update:model-value="updateConfig(field.key, $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import ConfigField from "./ConfigField.vue";
import type { ConfigSchema } from "../../typings/config";

interface Props {
  schema: ConfigSchema;
  modelValue?: Record<string, any>;
}

interface Emits {
  (e: "update:modelValue", value: Record<string, any>): void;
  (e: "change", key: string, value: any): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 内部配置状态
const config = ref<Record<string, any>>({});

/**
 * 初始化配置值
 */
function initConfig() {
  const initialConfig: Record<string, any> = {};

  // 使用默认值初始化
  props.schema.sections.forEach((section) => {
    section.fields.forEach((field) => {
      initialConfig[field.key] = field.default;
    });
  });

  // 合并用户提供的值
  if (props.modelValue) {
    Object.assign(initialConfig, props.modelValue);
  }

  config.value = initialConfig;
}

/**
 * 更新配置项
 */
function updateConfig(key: string, value: any) {
  config.value[key] = value;
  emit("update:modelValue", { ...config.value });
  emit("change", key, value);
}

// 监听 schema 和 modelValue 变化，重新初始化
watch(
  () => [props.schema, props.modelValue],
  () => {
    initConfig();
  },
  { immediate: true, deep: true }
);
</script>

<style scoped>
.config-renderer {
  padding: 1rem;
}

.config-section:last-child {
  margin-bottom: 0;
}
</style>
