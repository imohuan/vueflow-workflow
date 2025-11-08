/**
 * VueFlow 事件总线
 * 基于 mitt 实现的轻量级事件系统
 */

import mitt from "mitt";
import type { VueFlowEventMap } from "./eventTypes";

/**
 * 创建全局事件总线实例
 */
export const vueflowEventBus = mitt<Record<string, any>>();

/**
 * 事件总线工具函数
 */
export const eventBusUtils = {
  /**
   * 发送事件
   */
  emit<K extends keyof VueFlowEventMap>(
    event: K,
    data: VueFlowEventMap[K]
  ): void {
    vueflowEventBus.emit(event, data);
  },

  /**
   * 监听事件
   */
  on<K extends keyof VueFlowEventMap>(
    event: K,
    handler: (data: VueFlowEventMap[K]) => void
  ): void {
    vueflowEventBus.on(event, handler);
  },

  /**
   * 监听事件（仅一次）
   */
  once<K extends keyof VueFlowEventMap>(
    event: K,
    handler: (data: VueFlowEventMap[K]) => void
  ): void {
    const wrappedHandler = (data: VueFlowEventMap[K]) => {
      handler(data);
      vueflowEventBus.off(event, wrappedHandler);
    };
    vueflowEventBus.on(event, wrappedHandler);
  },

  /**
   * 取消监听事件
   */
  off<K extends keyof VueFlowEventMap>(
    event: K,
    handler?: (data: VueFlowEventMap[K]) => void
  ): void {
    if (handler) {
      vueflowEventBus.off(event, handler);
    } else {
      vueflowEventBus.off(event);
    }
  },

  /**
   * 清空所有监听器
   */
  clear(): void {
    vueflowEventBus.all.clear();
  },
};
