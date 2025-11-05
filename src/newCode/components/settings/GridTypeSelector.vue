<template>
  <div class="flex gap-3">
    <div
      v-for="type in gridTypes"
      :key="type.value"
      :class="[
        'group flex-1 cursor-pointer rounded-lg border-2 p-3 transition-all',
        modelValue === type.value
          ? 'border-blue-500 bg-blue-50'
          : 'border-slate-200 bg-white hover:border-slate-300',
      ]"
      @click="$emit('update:modelValue', type.value)"
    >
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium text-slate-800">{{ type.label }}</span>
        <div
          v-if="modelValue === type.value"
          class="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500"
        >
          <svg
            class="h-2.5 w-2.5 text-white"
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
      <!-- 预览网格 -->
      <div class="flex h-20 items-center justify-center rounded bg-slate-50">
        <svg viewBox="0 0 60 60" class="h-full w-full">
          <defs>
            <pattern
              :id="`grid-${type.value}`"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <component :is="type.pattern" />
            </pattern>
          </defs>
          <rect width="60" height="60" :fill="`url(#grid-${type.value})`" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from "vue";

defineProps<{
  modelValue: string;
}>();

defineEmits<{
  "update:modelValue": [value: string];
}>();

const gridTypes = [
  {
    value: "dots",
    label: "点状",
    pattern: () => h("circle", { cx: 5, cy: 5, r: 1, fill: "#94a3b8" }),
  },
  {
    value: "lines",
    label: "线条",
    pattern: () => [
      h("path", {
        d: "M 10 0 L 0 0 0 10",
        fill: "none",
        stroke: "#94a3b8",
        "stroke-width": 0.5,
      }),
    ],
  },
];
</script>
