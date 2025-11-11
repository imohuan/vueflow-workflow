<template>
  <StandardNode :id="id" :data="standardNodeData" :selected="selected">
    <template #default>
      <StandardNodeContent :data="data" />

      <div class="hidden flex flex-col gap-2 py-1.5">
        <!-- 配置预览 -->
        <div class="p-2 bg-slate-50 border border-slate-200 rounded-md">
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <span
              class="text-[10px] font-semibold text-slate-600 uppercase tracking-wide"
            >
              {{ modeName }}
            </span>
            <span class="text-[9px] text-slate-400 font-mono">
              {{ config.itemName }}, {{ config.indexName }}
            </span>
          </div>

          <div
            class="flex flex-wrap items-center gap-1 text-[11px] text-slate-500"
          >
            <template v-if="config.mode === 'variable'">
              <span v-if="!config.variable" class="text-slate-400 italic">
                请配置变量
              </span>
              <template v-else>
                <span>循环</span>
                <VariableBadge :value="config.variable" size="default" />
              </template>
            </template>

            <template v-else-if="config.mode === 'range'">
              <span>范围:</span>
              <VariableBadge
                v-if="isVariableValue(config.range?.start)"
                :value="String(config.range?.start ?? 0)"
                size="default"
              />
              <span v-else class="font-mono font-semibold text-slate-700">
                {{ config.range?.start ?? 0 }}
              </span>

              <span>~</span>

              <VariableBadge
                v-if="isVariableValue(config.range?.end)"
                :value="String(config.range?.end ?? 10)"
                size="default"
              />
              <span v-else class="font-mono font-semibold text-slate-700">
                {{ config.range?.end ?? 10 }}
              </span>

              <span
                v-if="(config.range?.step ?? 1) !== 1"
                class="text-slate-400"
              >
                (步长: {{ config.range?.step }})
              </span>
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- 自定义输出端口 -->
    <template #outputPorts="slotProps">
      <!-- 右侧标准输出端口（循环结束） -->
      <PortHandle
        id="next"
        :type="'source'"
        :position="Position.Right"
        :node-id="slotProps.nodeId"
        :variant="'ellipse'"
        :style="slotProps.defaultPort.style"
      />

      <!-- 底部中央循环端口 -->
      <PortHandle
        id="loop"
        :type="'source'"
        :position="Position.Bottom"
        :node-id="slotProps.nodeId"
        :variant="'circle'"
        :is-connectable="false"
        :class="'for-node-loop'"
        :style="{
          left: '50%',
          bottom: '-8px',
          top: 'auto',
          transform: 'translateX(-50%)',
        }"
      />
    </template>
  </StandardNode>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Position } from "@vue-flow/core";
import StandardNode from "./StandardNode.vue";
import { PortHandle } from "../ports";
import type { NodeStyleConfig } from "workflow-flow-nodes";
import VariableBadge from "@/v1/components/common/VariableBadge.vue";
import IconRepeat from "@/icons/IconRepeat.vue";
import StandardNodeContent from "./StandardNodeContent.vue";

interface ForConfig {
  /** 数据来源模式 */
  mode: "variable" | "range";
  /** 变量模式：变量引用（如 {{ 节点.result.list }}） */
  variable?: string;
  /** 范围模式配置 */
  range?: {
    /** 起始值（支持变量，如 {{ 节点.start }}） */
    start: number | string;
    /** 结束值（支持变量，如 {{ 节点.end }}） */
    end: number | string;
    /** 步长 */
    step: number;
  };
  /** 迭代变量名 */
  itemName: string;
  /** 索引变量名 */
  indexName: string;
  /** 循环体容器 ID（由编辑器自动填充） */
  containerId?: string | null;
  /** 错误处理策略 */
  errorHandling?: {
    /** 迭代失败时是否继续执行后续迭代 */
    continueOnError: boolean;
    /** 最大允许错误次数 */
    maxErrors?: number;
  };
}

interface Props {
  id: string;
  data: {
    type?: string;
    label?: string;
    description?: string;
    status?: "pending" | "running" | "success" | "error";
    config?: ForConfig;
    [key: string]: any;
  };
  selected?: boolean;
}

const props = defineProps<Props>();

// 获取配置
const config = computed(() => {
  const cfg = props.data.config as ForConfig | undefined;
  return (
    cfg || {
      mode: "variable" as const,
      variable: "",
      range: { start: 0, end: 10, step: 1 },
      itemName: "item",
      indexName: "index",
    }
  );
});

// 模式名称
const modeName = computed(() => {
  return config.value.mode === "variable" ? "变量循环" : "范围循环";
});

/**
 * 检测值是否为变量引用
 */
function isVariableValue(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  return /^\{\{.+\}\}$/.test(value.trim());
}

// 将 ForNode 的 data 转换为 StandardNode 的 data 格式
const standardNodeData = computed(() => {
  const style: NodeStyleConfig = {
    // 使用橙色渐变作为标题栏颜色
    headerColor: ["#f97316", "#ea580c"],
    // 使用循环图标组件
    icon: IconRepeat as any,
    showIcon: true,
  };

  return {
    ...props.data,
    label: props.data.label || "批处理",
    noInputs: false, // For 节点有输入端口
    noOutputs: false, // 使用自定义输出端口，隐藏默认输出端口
    style,
  };
});
</script>

<style scoped>
/* For 循环节点特定样式 */
:deep(.for-node-loop) {
  /* 底部中央循环端口样式 */
  bottom: -8px !important;
  top: auto !important;
}
</style>
