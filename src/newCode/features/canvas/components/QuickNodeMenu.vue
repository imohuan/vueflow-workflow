<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="absolute min-w-48 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl ring-1 ring-slate-900/5"
      :style="menuStyle"
    >
      <p class="text-sm font-semibold text-slate-800">快捷添加节点</p>
      <ul class="mt-2 space-y-1 text-xs text-slate-600">
        <li class="rounded-lg px-2 py-1 hover:bg-slate-100">开始节点</li>
        <li class="rounded-lg px-2 py-1 hover:bg-slate-100">HTTP 请求</li>
        <li class="rounded-lg px-2 py-1 hover:bg-slate-100">条件判断</li>
        <li class="rounded-lg px-2 py-1 hover:bg-slate-100">For 循环</li>
      </ul>
      <p class="mt-3 text-[11px] text-slate-400">
        重构阶段占位内容，后续接入真实节点数据。
      </p>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  visible: boolean;
  position: { x: number; y: number };
}

const props = defineProps<Props>();

const menuStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`,
}));
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
