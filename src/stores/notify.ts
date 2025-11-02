import { defineStore } from "pinia";
import { computed, ref } from "vue";

export type NotifyType = "info" | "success" | "warning" | "error";

export interface NotifyItem {
  id: string;
  type: NotifyType;
  title: string;
  message?: string;
  details?: string;
  createdAt: number;
  timeout?: number;
}

function generateId(): string {
  return `notify_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useNotifyStore = defineStore("notify", () => {
  const items = ref<NotifyItem[]>([]);

  function remove(id: string) {
    items.value = items.value.filter((item) => item.id !== id);
  }

  function push(item: Omit<NotifyItem, "id" | "createdAt">) {
    const id = generateId();
    const createdAt = Date.now();
    const notifyItem: NotifyItem = {
      id,
      createdAt,
      timeout: 5000,
      ...item,
    };

    items.value.push(notifyItem);

    if (notifyItem.timeout && notifyItem.timeout > 0) {
      window.setTimeout(() => remove(id), notifyItem.timeout);
    }

    return id;
  }

  function showError(title: string, message?: string, details?: string) {
    return push({ type: "error", title, message, details });
  }

  function showWarning(title: string, message?: string) {
    return push({ type: "warning", title, message });
  }

  function showSuccess(title: string, message?: string) {
    return push({ type: "success", title, message });
  }

  function showInfo(title: string, message?: string) {
    return push({ type: "info", title, message });
  }

  return {
    items: computed(() => items.value),
    push,
    remove,
    showError,
    showWarning,
    showSuccess,
    showInfo,
  };
});

