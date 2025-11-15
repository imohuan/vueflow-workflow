import { ref, onMounted, onBeforeUnmount } from "vue";
import { eventBusUtils } from "@/v2/features/vueflow/events";
import type { VariableDragEvents } from "@/v2/features/vueflow/events/eventTypes";

/**
 * 变量拖拽状态管理 hooks
 * 监听变量拖拽事件，提供 isDraggingVariable 状态
 */
export function useVariableDrag() {
  const isDraggingVariable = ref(false);

  function handleVariableDragStart(
    _event: VariableDragEvents["variable:drag-start"]
  ) {
    isDraggingVariable.value = true;
  }

  function handleVariableDragEnd(
    _event: VariableDragEvents["variable:drag-end"]
  ) {
    isDraggingVariable.value = false;
  }

  onMounted(() => {
    eventBusUtils.on("variable:drag-start", handleVariableDragStart);
    eventBusUtils.on("variable:drag-end", handleVariableDragEnd);
  });

  onBeforeUnmount(() => {
    eventBusUtils.off("variable:drag-start", handleVariableDragStart);
    eventBusUtils.off("variable:drag-end", handleVariableDragEnd);
  });

  return {
    isDraggingVariable,
  };
}
