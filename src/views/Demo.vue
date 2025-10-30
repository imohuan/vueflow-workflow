<script setup lang="ts">
import { VueFlow, useVueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { ref, computed } from "vue";
import { useMagicKeys } from "@vueuse/core";
import type { Node, GraphNode } from "@vue-flow/core";
import "@vue-flow/core/dist/style.css";

// 定义节点和边（响应式数据）
const nodes = ref<Node[]>([
  {
    id: "4",
    label: "parent node",
    position: { x: 320, y: 175 },
    style: {
      backgroundColor: "rgba(16, 185, 129, 0.5)",
      width: "400px",
      height: "300px",
    },
  },
  {
    id: "4a",
    label: "child node 1",
    position: { x: 15, y: 65 },
    parentNode: "4",
  },
  {
    id: "4b",
    label: "child node 2",
    position: { x: 220, y: 65 },
    parentNode: "4",
  },
]);

const edges = ref<any[]>([]);

const vueFlowRef = ref<InstanceType<typeof VueFlow>>();
const {
  onConnect,
  addEdges,
  getSelectedNodes,
  updateNode,
  onNodeDragStart,
  onNodeDrag,
  onNodeDragStop,
  findNode,
} = useVueFlow();

onConnect((params) => addEdges([params]));

// 监听 Ctrl 键的按下和松开
const { ctrl } = useMagicKeys({ passive: false });

// 记录当前正在拖拽的节点
const draggingNodes = ref<Node[]>([]);

// 容器内边距配置
const CONTAINER_PADDING = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20,
};

/**
 * 合并选中节点和拖拽节点，去重后返回所有需要处理的节点
 */
const allControlledNodes = computed(() => {
  const selectedNodes = getSelectedNodes.value;
  const uniqueDraggingNodes = draggingNodes.value.filter(
    (dn) => !selectedNodes.some((sn) => sn.id === dn.id)
  );
  return [...selectedNodes, ...uniqueDraggingNodes];
});

/**
 * 计算父节点所有子节点的边界（用于缩容）
 */
function calculateChildrenBounds(parentNode: GraphNode): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  const children = nodes.value.filter(
    (n) => n.parentNode === parentNode.id
  ) as any[];

  if (children.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  children.forEach((child) => {
    const childNode = findNode(child.id);
    if (!childNode) return;

    const childWidth = childNode.dimensions.width || 0;
    const childHeight = childNode.dimensions.height || 0;

    minX = Math.min(minX, childNode.position.x);
    minY = Math.min(minY, childNode.position.y);
    maxX = Math.max(maxX, childNode.position.x + childWidth);
    maxY = Math.max(maxY, childNode.position.y + childHeight);
  });

  return { minX, minY, maxX, maxY };
}

/**
 * 尝试缩容父节点到刚好容纳所有子节点的最小尺寸
 */
function tryToShrinkParent(parentNode: GraphNode): {
  shouldUpdate: boolean;
  updates?: {
    style?: Record<string, any>;
    dimensions?: { width: number; height: number };
  };
} {
  const bounds = calculateChildrenBounds(parentNode);
  if (!bounds) {
    return { shouldUpdate: false };
  }

  const parentWidth = parentNode.dimensions.width || 0;
  const parentHeight = parentNode.dimensions.height || 0;

  // 计算容纳所有子节点所需的最小尺寸（包含 padding）
  const requiredWidth = bounds.maxX + CONTAINER_PADDING.right;
  const requiredHeight = bounds.maxY + CONTAINER_PADDING.bottom;

  // 如果当前父节点比需要的尺寸大，则缩容
  if (requiredWidth < parentWidth || requiredHeight < parentHeight) {
    let parentStyles: Record<string, any> = {};
    if (typeof parentNode.style === "function") {
      parentStyles = { ...parentNode.style(parentNode) };
    } else if (parentNode.style) {
      parentStyles = { ...parentNode.style };
    }

    // 缩容到所需的最小尺寸
    parentStyles.width = `${requiredWidth}px`;
    parentStyles.height = `${requiredHeight}px`;

    return {
      shouldUpdate: true,
      updates: {
        style: parentStyles,
        dimensions: {
          width: requiredWidth,
          height: requiredHeight,
        },
      },
    };
  }

  return { shouldUpdate: false };
}

/**
 * 处理节点限制和父节点扩展/缩容
 * - 左上边界：限制在 padding 内（不能超出）
 * - 右下边界：可以扩展父节点
 * - 实时缩容：每次都检查是否可以缩容
 */
function handleNodeConstraintAndExpand(
  node: GraphNode,
  parentNode: GraphNode
): {
  nodePosition: { x: number; y: number };
  shouldUpdateParent: boolean;
  parentUpdates?: {
    position?: { x: number; y: number };
    style?: Record<string, any>;
    dimensions?: { width: number; height: number };
  };
} {
  const nodeWidth = node.dimensions.width || 0;
  const nodeHeight = node.dimensions.height || 0;
  const parentWidth = parentNode.dimensions.width || 0;
  const parentHeight = parentNode.dimensions.height || 0;

  let newNodeX = node.position.x;
  let newNodeY = node.position.y;
  let shouldUpdateParent = false;
  const parentUpdates: any = {};

  // 左边和上边：限制不能超出 padding
  if (newNodeX < CONTAINER_PADDING.left) {
    newNodeX = CONTAINER_PADDING.left;
  }
  if (newNodeY < CONTAINER_PADDING.top) {
    newNodeY = CONTAINER_PADDING.top;
  }

  // 右边和下边：检查是否需要扩展
  const rightEdge = newNodeX + nodeWidth + CONTAINER_PADDING.right;
  const bottomEdge = newNodeY + nodeHeight + CONTAINER_PADDING.bottom;
  const extendWidth = rightEdge - parentWidth;
  const extendHeight = bottomEdge - parentHeight;

  // 优先级1：如果超出边界，执行扩容
  if (extendWidth > 0 || extendHeight > 0) {
    shouldUpdateParent = true;

    // 获取父节点当前样式
    let parentStyles: Record<string, any> = {};
    if (typeof parentNode.style === "function") {
      parentStyles = { ...parentNode.style(parentNode) };
    } else if (parentNode.style) {
      parentStyles = { ...parentNode.style };
    }

    // 确保有初始宽高
    parentStyles.width = parentStyles.width ?? `${parentWidth}px`;
    parentStyles.height = parentStyles.height ?? `${parentHeight}px`;

    // 扩展宽度
    if (extendWidth > 0) {
      const currWidth =
        typeof parentStyles.width === "string"
          ? Number(parentStyles.width.replace("px", ""))
          : parentStyles.width;
      parentStyles.width = `${currWidth + extendWidth}px`;
    }

    // 扩展高度
    if (extendHeight > 0) {
      const currHeight =
        typeof parentStyles.height === "string"
          ? Number(parentStyles.height.replace("px", ""))
          : parentStyles.height;
      parentStyles.height = `${currHeight + extendHeight}px`;
    }

    parentUpdates.style = parentStyles;
    parentUpdates.dimensions = {
      width: Number(parentStyles.width.toString().replace("px", "")),
      height: Number(parentStyles.height.toString().replace("px", "")),
    };
  }
  // 优先级2：如果没有超出边界，检查是否可以缩容
  else {
    const shrinkResult = tryToShrinkParent(parentNode);
    if (shrinkResult.shouldUpdate && shrinkResult.updates) {
      shouldUpdateParent = true;
      parentUpdates.style = shrinkResult.updates.style;
      parentUpdates.dimensions = shrinkResult.updates.dimensions;
    }
  }

  return {
    nodePosition: { x: newNodeX, y: newNodeY },
    shouldUpdateParent,
    parentUpdates,
  };
}

// 监听拖拽开始，记录拖拽的节点
onNodeDragStart(({ nodes: dragNodes }) => {
  draggingNodes.value = dragNodes;
  console.log(
    "拖拽开始，节点:",
    dragNodes.map((n) => n.id)
  );
});

/**
 * 拖拽过程中，根据 Ctrl 键状态动态限制位置和扩展父节点
 */
onNodeDrag(({ nodes: dragNodes }) => {
  // 如果按住 Ctrl 键，允许自由拖拽，不做限制和扩展
  if (ctrl?.value) {
    return;
  }

  // 如果没按 Ctrl，需要限制左上边界并扩展右下边界
  dragNodes.forEach((node) => {
    if (!node.parentNode) return;

    const parentNode = findNode(node.parentNode);
    if (!parentNode) return;

    // 计算节点位置和父节点扩展
    const result = handleNodeConstraintAndExpand(node, parentNode);

    // 更新子节点位置
    if (
      node.position.x !== result.nodePosition.x ||
      node.position.y !== result.nodePosition.y
    ) {
      updateNode(node.id, {
        position: result.nodePosition,
      });
    }

    // 更新父节点（扩展）
    if (result.shouldUpdateParent && result.parentUpdates) {
      const updates: any = {};
      if (result.parentUpdates.style) {
        updates.style = result.parentUpdates.style;
      }
      if (result.parentUpdates.dimensions) {
        updates.dimensions = result.parentUpdates.dimensions;
      }
      if (result.parentUpdates.position) {
        updates.position = result.parentUpdates.position;
      }

      updateNode(parentNode.id, updates);
    }
  });
});

/**
 * 拖拽结束时，确保节点符合限制规则
 */
onNodeDragStop(({ nodes: dragNodes }) => {
  console.log("拖拽结束");

  // 拖拽结束后，应用限制和扩展规则
  dragNodes.forEach((node) => {
    if (!node.parentNode) return;

    const parentNode = findNode(node.parentNode);
    if (!parentNode) return;

    // 计算节点位置和父节点扩展
    const result = handleNodeConstraintAndExpand(node, parentNode);

    // 更新子节点位置
    updateNode(node.id, {
      position: result.nodePosition,
    });

    // 更新父节点（扩展）
    if (result.shouldUpdateParent && result.parentUpdates) {
      const updates: any = {};
      if (result.parentUpdates.style) {
        updates.style = result.parentUpdates.style;
      }
      if (result.parentUpdates.dimensions) {
        updates.dimensions = result.parentUpdates.dimensions;
      }
      if (result.parentUpdates.position) {
        updates.position = result.parentUpdates.position;
      }

      updateNode(parentNode.id, updates);
    }

    console.log(`拖拽结束，节点 ${node.id} 已应用限制和扩展规则`, result);
  });

  // 对所有涉及的父节点尝试缩容
  const parentNodeIds = new Set(
    dragNodes.map((n) => n.parentNode).filter((id): id is string => !!id)
  );

  parentNodeIds.forEach((parentId) => {
    const parentNode = findNode(parentId);
    if (!parentNode) return;

    // 尝试缩容父节点
    const shrinkResult = tryToShrinkParent(parentNode);
    if (shrinkResult.shouldUpdate && shrinkResult.updates) {
      updateNode(parentId, shrinkResult.updates);
      console.log(`父节点 ${parentId} 已缩容`, shrinkResult.updates);
    }
  });

  // 清除拖拽节点记录
  draggingNodes.value = [];
});

/**
 * ==================== 开发注意事项 ====================
 *
 * ## 1. 核心问题与解决方案
 *
 * ### 问题1: extent 属性在拖拽开始时被固化
 * ❌ 错误尝试：通过 watch 监听 Ctrl 键来修改 node.extent 属性
 * ✅ 正确方案：不使用 extent，改用 onNodeDrag 事件手动实现位置限制
 *
 * 原因：Vue Flow 的 getDragItems() 会在拖拽开始时固化 extent 值到 dragItems 数组
 *      之后拖拽过程中使用的都是这个固化值，中途修改 node.extent 无法生效
 * 参考：vue-flow/packages/core/src/composables/useDrag.ts:175
 *
 * ### 问题2: 缩容逻辑无法生效
 * ❌ 错误代码：parentStyles.width = `${Math.max(requiredWidth, parentWidth)}px`
 * ✅ 正确代码：parentStyles.width = `${requiredWidth}px`
 *
 * 原因：Math.max() 会保留较大的值，导致容器永远无法缩小
 *
 * ### 问题3: 缩容灵敏度低（罢工）
 * ❌ 错误方案：基于移动方向判断是否缩容
 *    const isMovingOutward = startPos && (newNodeX > startPos.x || newNodeY > startPos.y)
 *    只在 !isMovingOutward 时缩容
 *
 * ✅ 正确方案：激进策略 - 每次拖拽都检查缩容
 *    if (超出边界) { 扩容 } else { 始终尝试缩容 }
 *
 * 原因：移动方向判断过于严格，导致很多应该缩容的场景被忽略
 *
 *
 * ## 2. 架构设计
 *
 * ### 核心流程
 * 1. onNodeDragStart: 记录拖拽节点
 * 2. onNodeDrag: 实时应用限制、扩容、缩容（高频调用）
 * 3. onNodeDragStop: 最终确认限制和缩容（兜底）
 *
 * ### 优先级策略
 * - 优先级1：左上限制（硬限制，不能超出 padding）
 * - 优先级2：右下扩容（检测到超出立即扩容）
 * - 优先级3：实时缩容（没超出时始终尝试缩容）
 *
 * ### 关键函数
 * - calculateChildrenBounds(): 计算所有子节点的实际边界
 * - tryToShrinkParent(): 专门负责缩容逻辑，可复用
 * - handleNodeConstraintAndExpand(): 综合处理限制、扩容、缩容
 *
 *
 * ## 3. 移植注意事项
 *
 * ### 必须保留的部分
 * ✅ onNodeDrag 事件监听（实时限制和扩缩容的核心）
 * ✅ onNodeDragStop 事件监听（最终兜底确认）
 * ✅ findNode() 方法（从 useVueFlow 获取）
 * ✅ updateNode() 方法（从 useVueFlow 获取）
 * ✅ v-model:nodes 双向绑定（确保响应式）
 *
 * ### 可配置的参数
 * - CONTAINER_PADDING: 容器内边距配置（默认 20px）
 * - 左上限制逻辑（可改为四边都限制）
 * - 缩容灵敏度（当前是激进策略，可调整为按需缩容）
 *
 * ### Ctrl 键自由模式（可选功能）
 * - 使用 useMagicKeys({ passive: false }) 监听键盘
 * - 在 onNodeDrag 开头检查 ctrl?.value，如果为 true 则直接 return
 * - 注意：需要安装 @vueuse/core 依赖
 *
 * ### 性能优化建议
 * - calculateChildrenBounds() 在大量子节点时可能较慢
 * - 可以添加节流（throttle）到 onNodeDrag
 * - 可以缓存边界计算结果，避免重复计算
 *
 *
 * ## 4. 类型安全
 *
 * ### 必须导入的类型
 * import type { Node, GraphNode } from "@vue-flow/core"
 *
 * ### 注意事项
 * - Node 类型没有 dimensions 属性（仅用于初始化）
 * - GraphNode 类型有 dimensions 属性（运行时内部节点类型）
 * - findNode() 返回的是 GraphNode 类型
 * - 使用 as const 确保 extent: "parent" 的类型正确
 *
 *
 * ## 5. 常见陷阱
 *
 * ### 陷阱1: 不要尝试修改 extent 属性实现动态限制
 * 原因：extent 在拖拽开始时已被固化
 *
 * ### 陷阱2: 不要在缩容时使用 Math.max/Math.min 保护
 * 原因：会导致无法缩小或无法扩大
 *
 * ### 陷阱3: 不要过度依赖移动方向判断
 * 原因：方向判断复杂且容易遗漏边界情况
 *
 * ### 陷阱4: 不要在 onNodeDragStop 中修改位置
 * 原因：可能与 Vue Flow 内部逻辑冲突，应在 onNodeDrag 中实时处理
 *
 * ### 陷阱5: 注意父节点 style 可能是函数
 * 正确处理：
 * if (typeof parentNode.style === "function") {
 *   parentStyles = { ...parentNode.style(parentNode) }
 * }
 *
 *
 * ## 6. 测试建议
 *
 * ### 必测场景
 * 1. 拖动子节点到左上角 → 应被限制在 padding 边界
 * 2. 拖动子节点到右下角 → 父容器应自动扩大
 * 3. 把扩大的容器缩回去 → 父容器应自动缩小
 * 4. 按住 Ctrl 拖动 → 应完全自由，不限制不扩缩容
 * 5. 多个子节点同时拖动 → 所有节点都应正确处理
 * 6. 快速连续拖动 → 不应有抖动或延迟
 *
 * ### 边界测试
 * - 只有一个子节点
 * - 子节点完全重叠
 * - 父容器非常小
 * - 父容器非常大
 *
 *
 * ## 7. 已知限制
 *
 * - 当前只支持左上限制 + 右下扩展，如需四边限制需修改逻辑
 * - padding 是固定值，不支持动态配置（可改为 props）
 * - 缩容是激进策略，可能在某些场景下过于频繁
 * - 不支持动画过渡（扩缩容是瞬时的）
 *
 * ======================================================
 */
</script>

<template>
  <!-- 状态面板 -->
  <div
    class="absolute top-4 left-4 z-10 px-4 py-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 font-mono text-xs"
  >
    <div class="space-y-2">
      <div class="flex items-center gap-3">
        <span class="text-gray-600">Ctrl 键:</span>
        <span
          :class="ctrl ? 'text-green-600 font-semibold' : 'text-gray-400'"
          class="transition-colors"
        >
          {{ ctrl ? "✓ 按下" : "松开" }}
        </span>
      </div>
      <!-- <div class="flex items-center gap-3">
        <span class="text-gray-600">选中节点:</span>
        <span class="text-blue-600 font-semibold">
          {{ getSelectedNodes.length }} 个
        </span>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-gray-600">拖拽节点:</span>
        <span class="text-purple-600 font-semibold">
          {{ draggingNodes.length }} 个
        </span>
      </div> -->
      <div class="flex items-center gap-3">
        <span class="text-gray-600">待处理:</span>
        <span class="text-orange-600 font-semibold">
          {{ allControlledNodes.length }} 个
        </span>
      </div>
      <div
        class="text-gray-500 text-[10px] mt-2 pt-2 border-t border-gray-200 space-y-1"
      >
        <div>💡 <strong>左上限制</strong>：不能超出父节点 padding (20px)</div>
        <div>📏 <strong>右下扩展</strong>：向外移动时自动扩展父节点</div>
        <div>📉 <strong>自动缩容</strong>：向内移动时自动收缩到最小尺寸</div>
        <div>
          ⌨️ <strong>Ctrl 键</strong>：按住可完全自由拖拽（无限制无扩展）
        </div>
      </div>
    </div>
  </div>

  <VueFlow
    ref="vueFlowRef"
    v-model:nodes="nodes"
    v-model:edges="edges"
    :fit-view-on-init="true"
    :elevate-edges-on-select="true"
  >
    <Controls />
    <Background />
  </VueFlow>
</template>

<style>
.vue-flow__node {
  border: 1px solid rgb(207, 207, 207);
}
</style>
