/**
 * 历史记录插件
 * 支持撤销/重做操作
 * 所有历史记录相关的逻辑和数据都在此文件中
 */

import type { VueFlowPlugin, PluginContext } from "./types";
import { ref, watch, computed } from "vue";
import { useMagicKeys, whenever } from "@vueuse/core";
import type { Node, Edge } from "@vue-flow/core";

/**
 * 历史记录快照
 */
interface HistorySnapshot {
  nodes: Node[];
  edges: Edge[];
  timestamp: number;
}

/**
 * 检查当前是否在可编辑元素中
 */
function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  if (tagName === "INPUT" || tagName === "TEXTAREA") {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  const role = target.getAttribute("role");
  if (role === "textbox" || role === "combobox" || role === "searchbox") {
    return true;
  }

  return Boolean(target.closest('[contenteditable="true"]'));
}

/**
 * 检查快捷键是否可用
 */
function isShortcutAvailable(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) {
    return true;
  }
  return !isEditableElement(activeElement);
}

/**
 * 创建历史记录插件
 */
export function createHistoryPlugin(): VueFlowPlugin {
  // 历史记录数据（存储在插件内部）
  const history = ref<HistorySnapshot[]>([]);
  const historyIndex = ref(-1);
  const maxHistorySize = 50;

  // 标志位
  let isRestoring = false; // 正在恢复历史记录（防止循环保存）
  let saveHistoryTimer: number | null = null;

  // 计算属性
  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(() => historyIndex.value < history.value.length - 1);

  /**
   * 创建快照
   */
  function createSnapshot(nodes: Node[], edges: Edge[]): HistorySnapshot {
    return {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      timestamp: Date.now(),
    };
  }

  /**
   * 保存到历史记录
   */
  function saveToHistory(nodes: Node[], edges: Edge[]) {
    if (isRestoring) return;

    // 移除当前索引之后的所有历史记录
    history.value = history.value.slice(0, historyIndex.value + 1);

    // 添加新的快照
    const snapshot = createSnapshot(nodes, edges);
    history.value.push(snapshot);

    // 限制历史记录大小
    if (history.value.length > maxHistorySize) {
      history.value.shift();
    } else {
      historyIndex.value++;
    }

    console.log(
      `[History Plugin] 历史记录已保存 (${historyIndex.value + 1}/${
        history.value.length
      })`
    );
  }

  /**
   * 撤销
   */
  function undo(context: PluginContext) {
    if (!canUndo.value) {
      return;
    }

    historyIndex.value--;
    const snapshot = history.value[historyIndex.value];
    if (snapshot) {
      isRestoring = true;

      // 直接更新 VueFlow 的节点和边
      context.core.nodes.value = JSON.parse(JSON.stringify(snapshot.nodes));
      context.core.edges.value = JSON.parse(JSON.stringify(snapshot.edges));

      console.log(
        `[History Plugin] 撤销到历史记录 ${historyIndex.value + 1}/${
          history.value.length
        }`
      );

      // 延迟重置标志，确保 watch 不会触发
      setTimeout(() => {
        isRestoring = false;
      }, 100);
    }
  }

  /**
   * 重做
   */
  function redo(context: PluginContext) {
    if (!canRedo.value) {
      return;
    }

    historyIndex.value++;
    const snapshot = history.value[historyIndex.value];
    if (snapshot) {
      isRestoring = true;

      // 直接更新 VueFlow 的节点和边
      context.core.nodes.value = JSON.parse(JSON.stringify(snapshot.nodes));
      context.core.edges.value = JSON.parse(JSON.stringify(snapshot.edges));

      console.log(
        `[History Plugin] 重做到历史记录 ${historyIndex.value + 1}/${
          history.value.length
        }`
      );

      // 延迟重置标志，确保 watch 不会触发
      setTimeout(() => {
        isRestoring = false;
      }, 100);
    }
  }

  /**
   * 初始化历史记录
   */
  function initHistory(nodes: Node[], edges: Edge[]) {
    // 设置标志，防止初始化时触发保存
    isRestoring = true;

    const snapshot = createSnapshot(nodes, edges);
    history.value = [snapshot];
    historyIndex.value = 0;
    console.log("[History Plugin] 历史记录已初始化");

    // 延迟重置标志
    setTimeout(() => {
      isRestoring = false;
    }, 100);
  }

  return {
    config: {
      id: "history",
      name: "历史记录",
      description: "支持撤销/重做操作 (Ctrl+Z / Ctrl+Y)",
      enabled: true,
      version: "1.0.0",
    },

    shortcuts: [
      {
        key: "ctrl+z",
        description: "撤销上一步操作",
        handler: () => {},
      },
      {
        key: "ctrl+y",
        description: "重做操作",
        handler: () => {},
      },
      {
        key: "ctrl+shift+z",
        description: "重做操作（备用快捷键）",
        handler: () => {},
      },
    ],

    setup(context: PluginContext) {
      // 初始化历史记录
      initHistory(context.core.nodes.value, context.core.edges.value);

      // 使用 useMagicKeys 监听快捷键
      const keys = useMagicKeys();
      const ctrlZ = keys["Ctrl+Z"] as any;
      const ctrlY = keys["Ctrl+Y"] as any;
      const ctrlShiftZ = keys["Ctrl+Shift+Z"] as any;
      const shift = keys["Shift"] as any;

      // 撤销（排除 Shift 键被按下的情况，避免与 Ctrl+Shift+Z 冲突）
      const stopCtrlZ = whenever(ctrlZ, () => {
        if (shift.value) return; // 如果 Shift 键被按下，跳过
        if (!isShortcutAvailable()) return;
        if (canUndo.value) {
          undo(context);
        }
      });

      // 重做
      const stopCtrlY = whenever(ctrlY, () => {
        if (!isShortcutAvailable()) return;
        if (canRedo.value) {
          redo(context);
        }
      });

      // 重做（备用快捷键）
      const stopCtrlShiftZ = whenever(ctrlShiftZ, () => {
        if (!isShortcutAvailable()) return;
        if (canRedo.value) {
          redo(context);
        }
      });

      // 监听外部触发的撤销/重做事件
      if (context.core.events) {
        context.core.events.on("history:undo", () => {
          if (canUndo.value) {
            undo(context);
          }
        });

        context.core.events.on("history:redo", () => {
          if (canRedo.value) {
            redo(context);
          }
        });

        // 监听工作流切换事件
        context.core.events.on("workflow:switched", (payload) => {
          console.log(
            `[History Plugin] 工作流已切换：${payload.previousWorkflowId} → ${payload.workflowId}`
          );
          // 重新初始化历史记录
          initHistory(context.core.nodes.value, context.core.edges.value);
        });
      }

      // 监听节点和边的变化，自动保存历史记录
      // 使用防抖，300ms 内的多次变化只保存一次
      const saveHistoryDebounced = () => {
        if (isRestoring) return;

        if (saveHistoryTimer) {
          clearTimeout(saveHistoryTimer);
        }

        saveHistoryTimer = setTimeout(() => {
          saveToHistory(context.core.nodes.value, context.core.edges.value);
        }, 300);
      };

      // 监听节点和边变化
      const stopWatchNodes = watch(
        () => context.core.nodes.value.length,
        saveHistoryDebounced
      );

      const stopWatchEdges = watch(
        () => context.core.edges.value.length,
        saveHistoryDebounced
      );

      // 监听节点位置变化（深度监听，但只在拖拽结束时保存）
      const stopWatchNodePositions = watch(
        () =>
          context.core.nodes.value.map((n) => ({
            id: n.id,
            x: n.position.x,
            y: n.position.y,
          })),
        saveHistoryDebounced,
        { deep: true }
      );

      console.log("[History Plugin] 历史记录插件已启用");
      console.log(
        "[History Plugin] 快捷键: Ctrl+Z (撤销), Ctrl+Y (重做), Ctrl+Shift+Z (重做)"
      );

      // 暴露 canUndo 和 canRedo 给外部使用（通过事件）
      let stopWatchHistoryStatus: (() => void) | undefined;
      if (context.core.events) {
        // 发送历史记录状态
        const emitHistoryStatus = () => {
          context.core.events?.emit("history:status-changed" as any, {
            canUndo: canUndo.value,
            canRedo: canRedo.value,
            current: historyIndex.value + 1,
            total: history.value.length,
          });
        };

        // 初始发送一次
        emitHistoryStatus();

        // 监听历史索引变化，只在变化时发送事件
        stopWatchHistoryStatus = watch(
          [canUndo, canRedo, historyIndex, () => history.value.length],
          emitHistoryStatus
        );

        // 清理函数
        return () => {
          stopWatchHistoryStatus?.();
          stopCtrlZ();
          stopCtrlY();
          stopCtrlShiftZ();
          stopWatchNodes();
          stopWatchEdges();
          stopWatchNodePositions();
          if (saveHistoryTimer) {
            clearTimeout(saveHistoryTimer);
          }
        };
      }

      // 返回清理函数
      return () => {
        stopCtrlZ();
        stopCtrlY();
        stopCtrlShiftZ();
        stopWatchNodes();
        stopWatchEdges();
        stopWatchNodePositions();
        if (saveHistoryTimer) {
          clearTimeout(saveHistoryTimer);
        }
      };
    },

    cleanup() {
      // 清理历史记录数据
      history.value = [];
      historyIndex.value = -1;
      isRestoring = false;
      if (saveHistoryTimer) {
        clearTimeout(saveHistoryTimer);
        saveHistoryTimer = null;
      }
      console.log("[History Plugin] 历史记录插件已清理");
    },
  };
}
