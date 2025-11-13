/**
 * 双击检测 Composable
 * 用于在 pane 点击事件中检测单击和双击
 */

import { ref, onUnmounted } from 'vue';

export interface UseDoubleClickOptions {
  /** 双击时间间隔（毫秒），默认 300ms */
  delay?: number;
  /** 单击回调函数 */
  onSingleClick?: (event: MouseEvent) => void;
  /** 双击回调函数 */
  onDoubleClick?: (event: MouseEvent) => void;
}

export interface UseDoubleClickReturn {
  /** 处理点击事件的函数 */
  handleClick: (event: MouseEvent) => void;
  /** 清理计时器 */
  cleanup: () => void;
}

/**
 * 使用双击检测
 * @param options 配置选项
 * @returns 返回处理点击的函数和清理函数
 */
export function useDoubleClick(options: UseDoubleClickOptions = {}): UseDoubleClickReturn {
  const {
    delay = 300,
    onSingleClick,
    onDoubleClick,
  } = options;

  const lastClickTime = ref<number>(0);
  let clickTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 处理点击事件
   */
  function handleClick(event: MouseEvent) {
    const currentTime = Date.now();
    const timeSinceLastClick = currentTime - lastClickTime.value;

    // 清除之前的计时器
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
    }

    // 检查是否是双击
    if (timeSinceLastClick < delay) {
      // 双击事件
      console.log('[useDoubleClick] 双击事件:', event);
      onDoubleClick?.(event);
      lastClickTime.value = 0; // 重置计时器，防止三击被识别为双击
    } else {
      // 单击事件
      lastClickTime.value = currentTime;

      // 延迟发送单击事件，以便检测双击
      clickTimer = setTimeout(() => {
        console.log('[useDoubleClick] 单击事件:', event);
        onSingleClick?.(event);
        clickTimer = null;
      }, delay);
    }
  }

  /**
   * 清理计时器
   */
  function cleanup() {
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
    }
  }

  // 组件卸载时清理
  onUnmounted(() => {
    cleanup();
  });

  return {
    handleClick,
    cleanup,
  };
}
