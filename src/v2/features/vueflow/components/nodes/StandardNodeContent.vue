<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-center gap-2">
      <div class="rounded-md text-gray-600 text-[10px] w-8 text-right">
        输入
      </div>
      <div class="flex-1 flex items-center gap-2 overflow-hidden">
        <div v-for="input in data.inputs.slice(0, 3)" :key="input.name"
          class="rounded-xs px-0.5 text-[8px] py-0.5 font-mono bg-orange-200 text-orange-500" style="line-height: 8px">
          <span class="text-[6px] text-orange-300 italic font-bold" style="margin-right: 1px">str.</span>
          <span>{{ input.name }}</span>
        </div>
        <span v-if="data.inputs.length > 3">...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ data: any }>();
</script>
