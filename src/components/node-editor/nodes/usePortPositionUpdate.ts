/**
 * 端口位置更新 Hook
 * 用于监听节点端口变化并自动更新端口位置
 */
import { watch, nextTick, onMounted, type WatchSource } from "vue";
import { useVueFlow } from "@vue-flow/core";
import { useDebounceFn } from "@vueuse/core";

interface UsePortPositionUpdateOptions {
  /** 节点 ID */
  nodeId: string;
  /** 监听的响应式数据源（当它变化时更新端口位置） */
  watchSource: WatchSource | WatchSource[];
  /** 防抖延迟（毫秒），默认 100 */
  debounceDelay?: number;
}

export function usePortPositionUpdate(options: UsePortPositionUpdateOptions) {
  const { nodeId, watchSource, debounceDelay = 100 } = options;
  const { updateNodeInternals } = useVueFlow();

  /**
   * 更新节点内部状态（端口位置）
   */
  function updatePortPositions() {
    nextTick(() => {
      setTimeout(() => {
        updateNodeInternals([nodeId]);
        console.log("updatePortPositions", nodeId);
      }, 400);
    });
  }

  /**
   * 防抖版本的更新函数
   */
  const debouncedUpdatePortPositions = useDebounceFn(
    updatePortPositions,
    debounceDelay
  );

  // 监听数据源变化
  watch(
    watchSource,
    () => {
      debouncedUpdatePortPositions();
    },
    { deep: true, immediate: false }
  );

  // 组件挂载后初始化
  onMounted(() => {
    updatePortPositions();
  });

  return {
    /** 更新端口位置（立即执行） */
    updatePortPositions,
    /** 更新端口位置（防抖） */
    debouncedUpdatePortPositions,
  };
}
