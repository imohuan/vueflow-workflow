<!-- 纯 Tailwind CSS 手风琴头部组件 -->
<template>
  <button :class="headerClasses" @click="handleClick">
    <slot />
    <IconChevronDown
      :class="[
        'w-4 h-4 transition-transform duration-200 ml-auto shrink-0',
        isExpanded ? 'rotate-180' : '',
      ]"
    />
  </button>
</template>

<script setup lang="ts">
import { inject, computed } from "vue";
import IconChevronDown from "@/icons/IconChevronDown.vue";

const accordion = inject<{
  togglePanel: (value: string) => void;
  isPanelExpanded: (value: string) => boolean;
}>("accordion");

const panelValue = inject<string>("accordionPanelValue", "");

const isExpanded = computed(() => {
  return accordion?.isPanelExpanded(panelValue) ?? false;
});

const headerClasses = computed(() => {
  const classes = [
    "w-full",
    "flex",
    "items-center",
    "gap-2",
    "px-2",
    "py-2",
    "text-sm",
    "font-medium",
    "text-left",
    "text-slate-700",
    "bg-white",
    "border-none",
    "border-b",
    "border-slate-200",
    "outline-none",
    "cursor-pointer",
    "transition-all",
    "duration-200",
    "hover:bg-slate-50",
  ];

  if (isExpanded.value) {
    classes.push("bg-slate-50");
  }

  return classes.join(" ");
});

function handleClick() {
  accordion?.togglePanel(panelValue);
}
</script>
