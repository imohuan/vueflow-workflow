<template>
  <div class="w-full h-screen flex flex-col bg-gray-50">
    <!-- VueFlow 画布 -->
    <div class="flex-1">
      <VueFlow
        v-model:nodes="nodes"
        v-model:edges="edges"
        class="vue-flow-basic"
        :default-viewport="{ zoom: 1 }"
        :min-zoom="0.2"
        :max-zoom="4"
        :connection-radius="r"
        :edges-updatable="true"
        :edge-updater-radius="1000"
        @edge-update="onEdgeUpdate"
        @connect="onConnect"
      >
        <Background pattern-color="#aaa" :gap="16" />
        <Controls />

        <!-- 注册自定义节点 -->
        <template #node-normal="nodeProps">
          <NormalNode v-bind="nodeProps" />
        </template>

        <!-- 注册自定义边 -->
        <template #edge-custom="edgeProps">
          <CustomEdge v-bind="edgeProps" />
        </template>

        <!-- 注册自定义连接线（拖拽时显示） -->
        <template #connection-line="connectionLineProps">
          <CustomConnectionLine v-bind="connectionLineProps" />
        </template>
      </VueFlow>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { VueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import type { Node, Edge, Connection, EdgeUpdateEvent } from "@vue-flow/core";
import NormalNode from "./NormalNode.vue";
import CustomEdge from "./CustomEdge.vue";
import CustomConnectionLine from "./CustomConnectionLine.vue";
import { useMagicKeys } from "@vueuse/core";

// 引入 VueFlow 样式
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";

// 节点和边的数据
const nodes = ref<Node[]>([
  {
    id: "normal-1",
    type: "normal",
    position: { x: 100, y: 200 },
    data: { label: "普通节点 1" },
  },
  {
    id: "normal-2",
    type: "normal",
    position: { x: 400, y: 200 },
    data: { label: "普通节点 2" },
  },
]);

const edges = ref<Edge[]>([]);

const { ctrl } = useMagicKeys({ passive: false });
const r = computed(() => (ctrl?.value ? 100 : 0));

const onConnect = (connection: Connection) => {
  const exists = edges.value.some(
    (edge) =>
      edge.source === connection.source &&
      edge.target === connection.target &&
      edge.sourceHandle === connection.sourceHandle &&
      edge.targetHandle === connection.targetHandle
  );

  if (exists) {
    return;
  }

  edges.value = [
    ...edges.value,
    {
      id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
      type: "custom",
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
    },
  ];
};

// 拖拽连线更新连接
const onEdgeUpdate = ({ edge, connection }: EdgeUpdateEvent) => {
  // 检查新连接是否已存在
  const exists = edges.value.some(
    (e) =>
      e.id !== edge.id &&
      e.source === connection.source &&
      e.target === connection.target &&
      e.sourceHandle === connection.sourceHandle &&
      e.targetHandle === connection.targetHandle
  );

  if (exists) {
    return;
  }

  // 更新边的连接信息
  edges.value = edges.value.map((e) =>
    e.id === edge.id
      ? {
          ...e,
          type: "custom",
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
        }
      : e
  );
};
</script>

<style scoped>
.vue-flow-basic {
  background: #f8fafc;
}
</style>
