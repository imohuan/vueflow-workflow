<!-- 纯 Tailwind CSS 手风琴内容组件 -->
<template>
  <Transition
    name="accordion"
    @enter="onEnter"
    @after-enter="onAfterEnter"
    @leave="onLeave"
    @after-leave="onAfterLeave"
  >
    <div v-show="isExpanded" class="overflow-hidden">
      <div class="p-2 pt-2">
        <slot />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { inject, computed } from "vue";

const accordion = inject<{
  togglePanel: (value: string) => void;
  isPanelExpanded: (value: string) => boolean;
}>("accordion");

const panelValue = inject<string>("accordionPanelValue", "");

const isExpanded = computed(() => {
  return accordion?.isPanelExpanded(panelValue) ?? false;
});

// 动画钩子
function onEnter(element: Element) {
  const el = element as HTMLElement;
  el.style.height = "0";
  // 强制浏览器重排以应用初始高度
  void el.offsetHeight;
  el.style.height = el.scrollHeight + "px";
}

function onAfterEnter(element: Element) {
  const el = element as HTMLElement;
  el.style.height = "auto";
}

function onLeave(element: Element) {
  const el = element as HTMLElement;
  el.style.height = el.scrollHeight + "px";
  // 强制浏览器重排
  void el.offsetHeight;
  el.style.height = "0";
}

function onAfterLeave(element: Element) {
  const el = element as HTMLElement;
  el.style.height = "";
}
</script>

<style scoped>
.accordion-enter-active,
.accordion-leave-active {
  transition: height 0.2s ease;
}
</style>
