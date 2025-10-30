<script setup lang="ts">
/**
 * BoxLine 示例 - 父子节点端口连接演示
 *
 * 功能说明：
 * - 演示父节点（容器）与子节点之间的端口连接规则
 * - 父节点左右各有两个端口（输入+输出）
 * - 子节点左右各有一个端口（输入/输出）
 *
 * 开发注意事项：
 * 1. Handle 的 position 属性控制连接线的延伸方向，而非端口的视觉位置
 * 2. 端口的视觉位置通过 CSS（left/right + transform）控制
 * 3. 连接验证需要同时检查节点类型、端口类型和父子关系
 *
 * 移植注意事项：
 * 1. 确保安装了 @vue-flow/core、@vue-flow/background、@vue-flow/controls
 * 2. 需要导入 @vue-flow/core/dist/style.css 样式文件
 * 3. 自定义节点需要通过 template slot (#node-custom) 注册
 * 4. TypeScript 类型需要从 @vue-flow/core 导入
 *
 * 遇到的问题与解决方案：
 * 问题1: 连接线方向错误（从左侧触发而非右侧）
 * 解决: 父节点端口的 position 属性需要根据连接方向设置，而非视觉位置
 *      - 左侧输出端口：position="Right"（连接线向右延伸）
 *      - 右侧输入端口：position="Left"（连接线从左侧进入）
 *
 * 问题2: 使用 h() 函数渲染组件导致 Handle 无法正常工作
 * 解决: 改用标准的 Vue SFC 组件，通过 template slot 方式注册
 *
 * 问题3: TypeScript 类型错误 - label 类型不兼容
 * 解决: 使用 @ts-ignore 忽略类型检查，或定义更宽松的 Props 类型
 */

import { VueFlow, useVueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { ref } from "vue";
import type { Node, Connection, Edge } from "@vue-flow/core";
// 导入自定义节点组件
import CustomNodeWithPorts from "./components/CustomNodeWithPorts.vue";
import ParentNodeWithPorts from "./components/ParentNodeWithPorts.vue";
import "@vue-flow/core/dist/style.css";

/**
 * 定义节点数据
 *
 * 注意事项：
 * 1. 父节点必须指定 type: "parent" 以使用 ParentNodeWithPorts 组件
 * 2. 子节点的 parentNode 属性指向父节点的 id
 * 3. 子节点的 position 是相对于父节点的相对位置
 * 4. 父节点需要设置固定的宽高（通过 style）
 */
const nodes = ref<Node[]>([
  {
    id: "4",
    type: "parent", // 指定节点类型为父节点
    label: "parent node",
    position: { x: 320, y: 175 }, // 父节点在画布上的绝对位置
    style: {
      backgroundColor: "rgba(16, 185, 129, 0.5)",
      width: "400px", // 必须设置固定宽度
      height: "300px", // 必须设置固定高度
    },
  },
  {
    id: "4a",
    type: "custom", // 指定节点类型为自定义节点
    label: "child node 1",
    position: { x: 15, y: 65 }, // 相对于父节点的位置
    parentNode: "4", // 指定父节点 ID
  },
  {
    id: "4b",
    type: "custom",
    label: "child node 2",
    position: { x: 220, y: 65 }, // 相对于父节点的位置
    parentNode: "4",
  },
]);

// 边数据（连接线）
const edges = ref<Edge[]>([]);

const vueFlowRef = ref<InstanceType<typeof VueFlow>>();
// 使用 VueFlow 提供的组合式函数
const { onConnect, addEdges, findNode } = useVueFlow();

/**
 * 连接验证函数
 *
 * 功能：验证两个节点之间的连接是否符合业务规则
 *
 * 连接规则：
 * 1. 父节点左侧输出 (left-out) → 子节点左侧输入 (left)
 * 2. 父节点右侧输出 (right-out) → 外部节点左侧输入 (left)
 * 3. 外部节点右侧输出 (right) → 父节点左侧输入 (left-in)
 * 4. 子节点右侧输出 (right) → 父节点右侧输入 (right-in)
 * 5. 同级节点：右侧输出 (right) → 左侧输入 (left)
 *
 * 注意事项：
 * - connection.source: 源节点ID
 * - connection.target: 目标节点ID
 * - connection.sourceHandle: 源端口ID
 * - connection.targetHandle: 目标端口ID
 * - 需要同时验证节点类型、端口类型和父子关系
 *
 * 移植时可能的修改：
 * - 根据实际业务需求调整连接规则
 * - 可以添加更多的验证条件（如节点状态、数据类型等）
 */
const isValidConnection = (connection: Connection): boolean => {
  const sourceNode = findNode(connection.source);
  const targetNode = findNode(connection.target);

  // 基础验证：节点必须存在
  if (!sourceNode || !targetNode) return false;

  // 获取源节点和目标节点的父节点ID
  const sourceParent = sourceNode.parentNode;
  const targetParent = targetNode.parentNode;

  // 规则1: 如果源节点是父节点（容器）
  if (sourceNode.type === "parent") {
    // 规则1.1: 父节点的左侧输出端口（left-out）只能连接到其子节点的左侧输入端口
    // 用途：容器向内部节点传递数据
    if (connection.sourceHandle === "left-out") {
      return (
        targetParent === sourceNode.id && // 目标节点必须是当前父节点的子节点
        connection.targetHandle === "left" // 连接到子节点的左侧输入端口
      );
    }

    // 规则1.2: 父节点的右侧输出端口（right-out）只能连接到外部节点的左侧输入端口
    // 用途：容器向外部节点传递数据
    if (connection.sourceHandle === "right-out") {
      return (
        connection.targetHandle === "left" && // 连接到目标节点的左侧输入端口
        targetParent !== sourceNode.id // 目标节点不能是当前父节点的子节点
      );
    }
  }

  // 规则2: 如果目标节点是父节点（容器）
  if (targetNode.type === "parent") {
    // 规则2.1: 父节点的左侧输入端口（left-in）可以接收外部节点右侧输出端口的连接
    // 用途：外部节点向容器传递数据
    if (connection.targetHandle === "left-in") {
      return (
        connection.sourceHandle === "right" && // 源节点使用右侧输出端口
        sourceParent !== targetNode.id // 源节点不能是当前父节点的子节点
      );
    }

    // 规则2.2: 父节点的右侧输入端口（right-in）只能接收其子节点右侧输出端口的连接
    // 用途：内部节点向容器传递数据
    if (connection.targetHandle === "right-in") {
      return (
        sourceParent === targetNode.id && // 源节点必须是当前父节点的子节点
        connection.sourceHandle === "right" // 源节点使用右侧输出端口
      );
    }
  }

  // 规则3: 普通节点之间的连接（同级节点）
  // 用途：普通数据流动，从右到左
  if (
    connection.sourceHandle === "right" &&
    connection.targetHandle === "left"
  ) {
    // 确保两个节点是同级的（有相同的父节点，或都没有父节点）
    return sourceParent === targetParent;
  }

  // 其他情况一律拒绝连接
  return false;
};

/**
 * 连接事件处理
 *
 * 当用户拖拽创建连接时触发
 *
 * 边的类型说明：
 * - "default": 标准贝塞尔曲线（当前使用）
 * - "simplebezier": 简单贝塞尔曲线
 * - "smoothstep": 平滑阶梯线
 * - "step": 直角阶梯线
 * - "straight": 直线
 *
 * 可选属性：
 * - animated: true - 添加流动动画效果
 * - style: {} - 自定义样式
 * - markerEnd: - 箭头标记
 */
onConnect((params) => {
  if (isValidConnection(params)) {
    // 添加边，使用贝塞尔曲线
    addEdges([
      {
        ...params,
        type: "default", // 使用贝塞尔曲线渲染连接线
        // animated: true, // 可选：添加流动动画效果
      },
    ]);
  } else {
    // 拒绝无效的连接
    console.log("无效的连接");
  }
});
</script>

<template>
  <VueFlow
    ref="vueFlowRef"
    v-model:nodes="nodes"
    v-model:edges="edges"
    :fit-view-on-init="true"
    :elevate-edges-on-select="true"
  >
    <Controls />
    <Background />

    <!-- 自定义节点 -->
    <template #node-custom="nodeProps">
      <!-- @ts-ignore -->
      <CustomNodeWithPorts v-bind="nodeProps" />
    </template>

    <!-- 父节点 -->
    <template #node-parent="nodeProps">
      <!-- @ts-ignore -->
      <ParentNodeWithPorts v-bind="nodeProps" />
    </template>
  </VueFlow>
</template>

<style>
.vue-flow__node {
  border: 1px solid rgb(207, 207, 207);
}
</style>
