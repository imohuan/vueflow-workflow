<!-- 自定义下拉框组件 - 基于 NaiveUI -->
<template>
  <n-select
    v-model:value="selectedValue"
    :options="formattedOptions"
    :placeholder="placeholder"
    :disabled="disabled"
    :size="size"
    :consistent-menu-width="false"
    @update:value="handleChange"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </n-select>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NSelect } from "naive-ui";

interface Props {
  /** v-model 绑定值 */
  modelValue?: any;
  /** 选项数组 */
  options?: any[];
  /** 选项标签字段名 */
  optionLabel?: string;
  /** 选项值字段名 */
  optionValue?: string;
  /** 占位符 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 尺寸 */
  size?: "small" | "medium" | "large";
}

interface Emits {
  (e: "update:modelValue", value: any): void;
  (e: "change", value: any): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  options: () => [],
  optionLabel: "label",
  optionValue: "value",
  placeholder: "",
  disabled: false,
  size: "medium",
});

const emit = defineEmits<Emits>();

// 双向绑定值
const selectedValue = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

// 格式化选项为 NaiveUI 需要的格式
const formattedOptions = computed(() => {
  return props.options.map((option) => {
    if (typeof option === "object" && option !== null) {
      return {
        label: option[props.optionLabel],
        value: option[props.optionValue],
      };
    }
    return {
      label: option,
      value: option,
    };
  });
});

// 处理 change 事件
function handleChange(value: any) {
  emit("change", value);
}
</script>
