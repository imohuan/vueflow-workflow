<template>
  <div class="space-y-3">
    <div
      v-for="mode in modes"
      :key="mode.value"
      :class="[
        'group cursor-pointer rounded-xl border-2 p-4 transition-all',
        modelValue === mode.value
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
      ]"
      @click="$emit('update:modelValue', mode.value)"
    >
      <div class="flex items-start gap-4">
        <div
          :class="[
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all',
            modelValue === mode.value
              ? `${mode.activeBg} ${mode.activeText}`
              : `${mode.bg} ${mode.text} group-hover:${mode.activeBg}`,
          ]"
        >
          <component :is="mode.icon" class="h-6 w-6" />
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <h4 class="font-semibold text-slate-800">{{ mode.label }}</h4>
            <span
              v-if="mode.badge"
              :class="[
                'rounded px-1.5 py-0.5 text-xs font-medium',
                mode.badgeClass,
              ]"
            >
              {{ mode.badge }}
            </span>
          </div>
          <p class="mt-0.5 text-sm text-slate-600">{{ mode.description }}</p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span
              v-for="tag in mode.tags"
              :key="tag"
              class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {{ tag }}
            </span>
          </div>
        </div>
        <div
          v-if="modelValue === mode.value"
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500"
        >
          <svg
            class="h-4 w-4 text-white"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import IconWorker from "@/icons/IconWorker.vue";
import IconServer from "@/icons/IconServer.vue";

defineProps<{
  modelValue: string;
}>();

defineEmits<{
  "update:modelValue": [value: string];
}>();

const modes = [
  {
    value: "worker",
    label: "Worker 模式",
    description: "在浏览器中使用 Web Worker 离线运行工作流",
    icon: IconWorker,
    bg: "bg-blue-100",
    text: "text-blue-600",
    activeBg: "bg-blue-500",
    activeText: "text-white",
    badge: "推荐",
    badgeClass: "bg-blue-100 text-blue-700",
    tags: ["离线运行", "快速", "隐私保护"],
  },
  {
    value: "server",
    label: "Server 模式",
    description: "连接到远程服务器执行工作流，支持更复杂的任务",
    icon: IconServer,
    bg: "bg-green-100",
    text: "text-green-600",
    activeBg: "bg-green-500",
    activeText: "text-white",
    badge: "",
    badgeClass: "",
    tags: ["云端执行", "强大", "协作"],
  },
];
</script>
