<template>
  <ModalShell
    v-model="infoModalVisible"
    :title="uiStore.infoModalContent.title"
    width="md"
    @close="uiStore.closeInfoModal"
  >
    <!-- 图标（根据类型显示不同颜色） -->
    <div class="mb-4 flex justify-center">
      <div
        class="flex h-16 w-16 items-center justify-center rounded-full"
        :class="iconBgClass"
      >
        <component :is="icon" class="h-8 w-8" :class="iconColorClass" />
      </div>
    </div>

    <!-- 内容 -->
    <div class="mb-6 whitespace-pre-wrap text-center text-slate-600">
      {{ uiStore.infoModalContent.content }}
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="flex justify-center">
        <n-button type="primary" @click="uiStore.closeInfoModal">
          知道了
        </n-button>
      </div>
    </template>
  </ModalShell>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import ModalShell from "../ui/ModalShell.vue";
import { useUiStore } from "../../stores/ui";
import IconInfo from "@/icons/IconInfo.vue";
import IconCheck from "@/icons/IconCheck.vue";
import IconAlert from "@/icons/IconAlert.vue";
import IconError from "@/icons/IconError.vue";

const uiStore = useUiStore();
const { infoModalVisible } = storeToRefs(uiStore);

/** 图标组件 */
const icon = computed(() => {
  const typeMap = {
    info: IconInfo,
    success: IconCheck,
    warning: IconAlert,
    error: IconError,
  };
  return typeMap[uiStore.infoModalContent.type] || IconInfo;
});

/** 图标背景颜色 */
const iconBgClass = computed(() => {
  const typeMap = {
    info: "bg-blue-100",
    success: "bg-green-100",
    warning: "bg-yellow-100",
    error: "bg-red-100",
  };
  return typeMap[uiStore.infoModalContent.type] || "bg-blue-100";
});

/** 图标颜色 */
const iconColorClass = computed(() => {
  const typeMap = {
    info: "text-blue-600",
    success: "text-green-600",
    warning: "text-yellow-600",
    error: "text-red-600",
  };
  return typeMap[uiStore.infoModalContent.type] || "text-blue-600";
});
</script>

<style scoped></style>
