/**
 * VueFlow 事件 Hook
 * 提供组件内使用事件总线的便捷方法
 */

import { onUnmounted } from "vue";
import { eventBusUtils } from "./eventBus";
import type { VueFlowEventMap } from "./eventTypes";

/**
 * 在组件中使用 VueFlow 事件系统
 * 自动处理组件卸载时的清理工作
 */
export function useVueFlowEvents() {
  // 存储当前组件注册的事件监听器，用于自动清理
  const listeners = new Map<
    keyof VueFlowEventMap,
    Array<(data: any) => void>
  >();

  /**
   * 监听事件
   */
  function on<K extends keyof VueFlowEventMap>(
    event: K,
    handler: (data: VueFlowEventMap[K]) => void
  ): void {
    eventBusUtils.on(event, handler);

    // 记录监听器以便后续清理
    if (!listeners.has(event)) {
      listeners.set(event, []);
    }
    listeners.get(event)!.push(handler);
  }

  /**
   * 监听事件（仅一次）
   */
  function once<K extends keyof VueFlowEventMap>(
    event: K,
    handler: (data: VueFlowEventMap[K]) => void
  ): void {
    eventBusUtils.once(event, handler);
  }

  /**
   * 发送事件
   */
  function emit<K extends keyof VueFlowEventMap>(
    event: K,
    data: VueFlowEventMap[K]
  ): void {
    eventBusUtils.emit(event, data);
  }

  /**
   * 取消监听
   */
  function off<K extends keyof VueFlowEventMap>(
    event: K,
    handler?: (data: VueFlowEventMap[K]) => void
  ): void {
    eventBusUtils.off(event, handler);

    if (handler && listeners.has(event)) {
      const handlers = listeners.get(event)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 清理当前组件的所有事件监听器
   */
  function cleanup(): void {
    listeners.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        eventBusUtils.off(event, handler);
      });
    });
    listeners.clear();
  }

  // 组件卸载时自动清理
  onUnmounted(() => {
    cleanup();
  });

  return {
    on,
    once,
    emit,
    off,
    cleanup,
  };
}
