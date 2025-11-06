/**
 * 配置同步插件
 * 监听编辑器配置变化，自动同步到画布元素
 */

import { watch } from "vue";
import type { VueFlowPlugin, PluginContext } from "./types";
import { useEditorConfigStore } from "@/newCode/stores/editorConfig";
import { storeToRefs } from "pinia";

/**
 * 创建配置同步插件
 */
export function createConfigSyncPlugin(): VueFlowPlugin {
  let stopWatchers: Array<() => void> = [];

  /**
   * 更新所有边的样式
   */
  function updateEdgesStyle(
    context: PluginContext,
    editorConfig: ReturnType<
      typeof storeToRefs<ReturnType<typeof useEditorConfigStore>>
    >["config"]
  ) {
    // 使用 context.core.updateEdges 方法批量更新边
    context.core.updateEdges((edges) =>
      edges.map((edge) => ({
        ...edge,
        type: "custom",
        edgeType: editorConfig.value.edgeType,
        animated: editorConfig.value.edgeAnimation,
        style: {
          ...edge.style,
          stroke: editorConfig.value.edgeColor,
          strokeWidth: editorConfig.value.edgeWidth,
        },
      }))
    );

    console.log("[ConfigSync Plugin] 边样式已更新");
  }

  return {
    config: {
      id: "config-sync",
      name: "配置同步插件",
      description: "监听编辑器配置变化，自动同步到画布元素",
      enabled: true,
      version: "1.0.0",
    },

    setup(context: PluginContext) {
      console.log("[ConfigSync Plugin] 插件已初始化");

      const editorConfigStore = useEditorConfigStore();
      const { config: editorConfig } = storeToRefs(editorConfigStore);

      // 监听边样式配置变化
      const stopEdgeStyleWatcher = watch(
        () => [
          editorConfig.value.edgeType,
          editorConfig.value.edgeWidth,
          editorConfig.value.edgeColor,
          editorConfig.value.edgeAnimation,
        ],
        () => {
          // 始终执行更新，updateEdges 内部会处理空数组的情况
          updateEdgesStyle(context, editorConfig);
        },
        { immediate: false }
      );

      stopWatchers.push(stopEdgeStyleWatcher);
    },

    cleanup() {
      console.log("[ConfigSync Plugin] 插件已清理");
      // 停止所有监听器
      stopWatchers.forEach((stop) => stop());
      stopWatchers = [];
    },
  };
}
