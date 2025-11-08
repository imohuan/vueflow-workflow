<template>
  <div>
    <label class="mb-2 block text-sm font-medium text-slate-700">{{
      label
    }}</label>
    <div class="flex items-center gap-1">
      <!-- 左侧色块 -->
      <div
        class="h-7 w-7 shrink-0 rounded-md shadow-sm border border-slate-200"
        :style="{ backgroundColor: localValue }"
        @click="handleOpenColorPicker"
      ></div>

      <!-- NaiveUI 颜色选择器 -->
      <n-color-picker
        ref="colorPickerRef"
        v-model:show="showColorPicker"
        v-model:value="localValue"
        :show-preview="true"
        @update:value="handleColorChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NColorPicker } from "naive-ui";
import { ref, watch } from "vue";

const props = defineProps<{
  modelValue: string;
  label: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const showColorPicker = ref(false);
const localValue = ref(props.modelValue);

const colorPickerRef = ref<InstanceType<typeof NColorPicker>>();

watch(
  () => props.modelValue,
  (newValue) => {
    localValue.value = newValue;
  }
);

const handleColorChange = (value: string) => {
  emit("update:modelValue", value);
};

const handleOpenColorPicker = () => {
  if (!colorPickerRef.value) return;
  showColorPicker.value = true;
};
</script>
