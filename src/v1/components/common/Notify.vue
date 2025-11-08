<template>
  <div class="notify-container" aria-live="assertive">
    <TransitionGroup name="notify-slide" tag="div" class="notify-list">
      <div
        v-for="item in visibleItems"
        :key="item.id"
        class="notify-item"
        :class="[`notify-${item.type}`]"
        role="alert"
      >
        <div class="notify-content">
          <div class="notify-icon" aria-hidden="true">
            <component :is="iconMap[item.type]" />
          </div>
          <div class="notify-text">
            <p class="notify-title">{{ item.title }}</p>
            <p v-if="item.message" class="notify-message">{{ item.message }}</p>
            <pre v-if="item.details" class="notify-details">{{
              item.details
            }}</pre>
          </div>
          <button
            class="notify-close"
            type="button"
            aria-label="关闭通知"
            @click="close(item.id)"
          >
            <IconClose />
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNotifyStore } from "../../stores/notify";
import IconError from "@/icons/IconError.vue";
import IconSuccess from "@/icons/IconSuccess.vue";
import IconWarning from "@/icons/IconWarning.vue";
import IconInfo from "@/icons/IconInfo.vue";
import IconClose from "@/icons/IconClose.vue";

const store = useNotifyStore();
const visibleItems = computed(() => store.items);

const iconMap = {
  error: IconError,
  success: IconSuccess,
  warning: IconWarning,
  info: IconInfo,
} as const;

function close(id: string) {
  store.remove(id);
}
</script>

<style scoped>
.notify-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
}

.notify-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notify-item {
  width: 320px;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.18);
  background: #fff;
  color: #1f2937;
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.notify-error {
  border-color: rgba(239, 68, 68, 0.4);
  background: #fff5f5;
  color: #b91c1c;
}

.notify-success {
  border-color: rgba(34, 197, 94, 0.4);
  background: #f0fdf4;
  color: #15803d;
}

.notify-warning {
  border-color: rgba(245, 158, 11, 0.4);
  background: #fffbeb;
  color: #b45309;
}

.notify-info {
  border-color: rgba(59, 130, 246, 0.4);
  background: #eef5ff;
  color: #1d4ed8;
}

.notify-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.notify-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}

.notify-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notify-title {
  margin: 0;
  font-weight: 600;
  font-size: 14px;
}

.notify-message {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: rgba(31, 41, 55, 0.85);
}

.notify-details {
  margin: 8px 0 0;
  padding: 8px;
  background: rgba(15, 23, 42, 0.05);
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(15, 23, 42, 0.75);
  max-height: 160px;
  overflow: auto;
}

.notify-close {
  background: transparent;
  border: none;
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  line-height: 1;
}

.notify-close:hover {
  color: rgba(15, 23, 42, 0.6);
}

.notify-slide-enter-active,
.notify-slide-leave-active {
  transition: all 0.25s ease;
}

.notify-slide-enter-from,
.notify-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
