<template>
  <div class="flex gap-3">
    <div
      v-for="type in edgeTypes"
      :key="type.value"
      :class="[
        'group flex-1 cursor-pointer rounded-lg border-2 p-3 transition-all',
        modelValue === type.value
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300',
      ]"
      @click="$emit('update:modelValue', type.value)"
    >
      <div class="mb-2 flex items-center justify-between">
        <span class="font-medium text-slate-800">{{ type.label }}</span>
        <div
          v-if="modelValue === type.value"
          class="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500"
        >
          <svg
            class="h-3 w-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>
      <!-- 预览示意图 -->
      <div
        class="flex h-16 items-center justify-center rounded bg-slate-50 p-2"
      >
        <svg viewBox="0 0 100 40" class="h-full w-full">
          <!-- 起点圆点 -->
          <circle cx="10" cy="20" r="3" fill="#64748b" />
          <!-- 终点圆点 -->
          <circle cx="90" cy="20" r="3" fill="#64748b" />
          <!-- 连接线 -->
          <path
            :d="type.path"
            fill="none"
            :stroke="modelValue === type.value ? '#3b82f6' : '#94a3b8'"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </div>
      <p class="mt-2 text-xs text-slate-500">{{ type.description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
}>();

defineEmits<{
  "update:modelValue": [value: string];
}>();

const edgeTypes = [
  {
    value: "default",
    label: "贝塞尔",
    description: "平滑的曲线连接",
    path: "M 13 20 C 40 5, 60 35, 87 20",
  },
  {
    value: "straight",
    label: "直线",
    description: "简单直接的连接",
    path: "M 13 20 L 87 20",
  },
  {
    value: "step",
    label: "阶梯线",
    description: "直角阶梯连接",
    path: "M 13 20 L 40 20 L 40 12 L 60 12 L 60 20 L 87 20",
  },
];
</script>
