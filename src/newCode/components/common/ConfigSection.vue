<template>
  <div class="mb-5">
    <div class="mb-3">
      <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
      <p v-if="description" class="mt-0.5 text-xs text-slate-500">
        {{ description }}
      </p>
    </div>
    <div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  description?: string;
}

defineProps<Props>();
</script>

<style scoped></style>
