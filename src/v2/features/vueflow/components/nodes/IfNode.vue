<template>
  <StandardNode :id="id" :data="standardNodeData" :selected="selected">
    <template #default>
      <div class="flex flex-col gap-1.5 py-1">
        <!-- 条件预览列表 -->
        <div
          v-for="(condition, condIndex) in conditions"
          :key="condIndex"
          class="px-1.5 py-1 bg-slate-50 border border-slate-200 rounded transition-all duration-200 hover:bg-slate-100"
          :ref="(el) => setConditionRef(el as HTMLElement, condIndex)"
        >
          <div class="flex items-center justify-between gap-1.5 mb-0.5">
            <span
              class="text-[9px] font-semibold text-slate-600 uppercase tracking-wide"
            >
              条件{{ condIndex + 1 }}
            </span>
            <span
              v-if="(condition.subConditions?.length ?? 0) > 1"
              class="py-0.5 px-1 text-[9px] font-medium bg-violet-200 text-violet-600 rounded"
            >
              {{ condition.logic === "and" ? "且" : "或" }}
            </span>
          </div>
          <div
            class="flex flex-wrap items-center gap-0.5 text-[10px] text-slate-500 leading-tight"
          >
            <template
              v-for="(part, idx) in getConditionSummaryParts(condition)"
              :key="idx"
            >
              <VariableBadge
                v-if="part.isVariable"
                :value="part.text"
                size="default"
              />
              <span v-else>{{ part.text }}</span>
            </template>
          </div>
        </div>

        <!-- else 预览 -->
        <div
          class="px-1.5 py-1 bg-orange-50 border border-orange-200 rounded transition-all duration-200 hover:bg-orange-100"
          ref="elsePreviewRef"
        >
          <div class="flex items-center justify-between gap-1.5 mb-0.5">
            <span
              class="text-[9px] font-semibold text-slate-600 uppercase tracking-wide"
            >
              否则
            </span>
          </div>
          <div class="text-[10px] text-slate-500 leading-tight wrap-break-word">
            所有条件都不满足时执行
          </div>
        </div>

        <div
          class="hidden mt-1 py-1.5 px-2 text-[10px] text-slate-400 text-center bg-slate-50 border border-dashed border-slate-300 rounded-md"
        >
          点击节点打开配置面板进行编辑
        </div>
      </div>
    </template>

    <!-- 自定义输出端口 -->
    <template #outputPorts="slotProps">
      <PortHandle
        v-for="(port, index) in outputPorts"
        :key="port.id"
        :id="port.id"
        :type="port.type"
        :position="slotProps.position"
        :node-id="slotProps.nodeId"
        :variant="port.variant"
        :style="getPortStyle(index)"
      />
    </template>
  </StandardNode>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch } from "vue";
import { Position, useVueFlow } from "@vue-flow/core";
import StandardNode from "./StandardNode.vue";
import { PortHandle } from "../ports";
import type { NodeStyleConfig, Condition, IfConfig } from "workflow-flow-nodes";
import { OPERATOR_LABELS } from "workflow-flow-nodes";
import VariableBadge from "@/v1/components/common/VariableBadge.vue";
import IconIf from "@/icons/IconIf.vue";

interface Props {
  id: string;
  data: {
    type?: string;
    label?: string;
    description?: string;
    status?: "pending" | "running" | "success" | "error";
    config?: IfConfig;
    [key: string]: any;
  };
  selected?: boolean;
}

interface SummaryPart {
  text: string;
  isVariable: boolean;
}

interface OutputPort {
  id: string;
  type: "source";
  position: Position;
  variant: "ellipse";
}

const props = defineProps<Props>();

// 获取 VueFlow 实例用于更新端口位置
const { updateNodeInternals } = useVueFlow();

// 获取条件列表（确保至少有1个条件，与 ConditionEditor 保持一致）
const conditions = computed(() => {
  const config = props.data.config as IfConfig | undefined;
  const configConditions = config?.conditions || [];

  // 如果条件少于1个，返回至少1个空条件（与 ConditionEditor 的默认行为一致）
  if (configConditions.length < 1) {
    return [
      {
        logic: "and" as const,
        subConditions: [
          {
            field: "",
            dataType: "string" as const,
            operator: "is equal to" as const,
            value: "",
          },
        ],
      },
    ];
  }

  return configConditions;
});

// 存储每个条件预览框的引用
const conditionRefs = ref<(HTMLElement | null)[]>([]);
const elsePreviewRef = ref<HTMLElement | null>(null);

function setConditionRef(el: HTMLElement | null, index: number) {
  if (el) {
    conditionRefs.value[index] = el;
  }
}

// 计算输出端口列表
const outputPorts = computed<OutputPort[]>(() => {
  const ports: OutputPort[] = [];
  const conditionsCount = conditions.value.length;

  // 为每个条件创建一个输出端口
  for (let i = 0; i < conditionsCount; i++) {
    ports.push({
      id: `condition-${i}`,
      type: "source",
      position: Position.Right,
      variant: "ellipse",
    });
  }

  // 添加 else 端口
  ports.push({
    id: "else",
    type: "source",
    position: Position.Right,
    variant: "ellipse",
  });

  return ports;
});

// 监听条件变化，更新端口位置
watch(
  () => conditions.value.length,
  async () => {
    // 等待 DOM 更新完成后刷新端口位置
    await nextTick();
    updateNodeInternals([props.id]);
  },
  { immediate: true }
);

// 监听端口变化，确保位置更新
watch(
  outputPorts,
  async () => {
    await nextTick();
    // 延迟一帧确保 DOM 完全渲染
    requestAnimationFrame(() => {
      updateNodeInternals([props.id]);
    });
  },
  { deep: true }
);

// 计算端口样式（对齐到对应的条件预览框）
function getPortStyle(index: number): Record<string, string> {
  const conditionsCount = conditions.value.length;

  // 如果是 else 端口（最后一个）
  if (index === conditionsCount) {
    const elseEl = elsePreviewRef.value;
    if (elseEl && elseEl.offsetParent && elseEl.offsetTop > 0) {
      // 计算 else 预览框中心点相对于父容器的位置
      const offsetTop = elseEl.offsetTop + elseEl.offsetHeight / 2;
      return {
        top: `${offsetTop}px !important`,
      };
    }
  } else {
    // 条件端口
    const conditionEl = conditionRefs.value[index];
    if (conditionEl && conditionEl.offsetParent && conditionEl.offsetTop > 0) {
      // 计算条件预览框中心点相对于父容器的位置
      const offsetTop = conditionEl.offsetTop + conditionEl.offsetHeight / 2;
      return {
        top: `${offsetTop}px !important`,
      };
    }
  }

  // 初始渲染时的估算位置（避免位置错误）
  // 每个条件预览框大约 40px 高，间距 6px（gap-1.5）
  const CONDITION_ITEM_HEIGHT = 40;
  const GAP = 6;
  const HEADER_HEIGHT = 40;
  const PADDING_TOP = 8; // py-1

  if (index === conditionsCount) {
    // else 端口位置 = header + padding + (条件数量 * (高度 + 间距)) + else框高度的一半
    const estimatedTop =
      HEADER_HEIGHT +
      PADDING_TOP +
      conditionsCount * (CONDITION_ITEM_HEIGHT + GAP) +
      CONDITION_ITEM_HEIGHT / 2;
    return {
      top: `${estimatedTop}px !important`,
    };
  } else {
    // 条件端口位置 = header + padding + (当前索引 * (高度 + 间距)) + 条件框高度的一半
    const estimatedTop =
      HEADER_HEIGHT +
      PADDING_TOP +
      index * (CONDITION_ITEM_HEIGHT + GAP) +
      CONDITION_ITEM_HEIGHT / 2;
    return {
      top: `${estimatedTop}px !important`,
    };
  }
}

// 将 IfNode 的 data 转换为 StandardNode 的 data 格式
const standardNodeData = computed(() => {
  const style: NodeStyleConfig = {
    // 使用紫色渐变作为标题栏颜色
    headerColor: ["#8b5cf6", "#7c3aed"],
    // 使用条件判断SVG图标
    icon: IconIf as any,
    showIcon: true,
  };

  return {
    ...props.data,
    label: props.data.label || "条件判断",
    noInputs: false, // If 节点有输入端口
    noOutputs: false,
    style,
  };
});

/**
 * 检测字符串是否为变量引用
 */
function isVariableReference(text: string): boolean {
  return /^\{\{.+\}\}$/.test(text.trim());
}

/**
 * 将文本拆分为变量和普通文本部分
 */
function splitTextParts(text: string): SummaryPart[] {
  const parts: SummaryPart[] = [];
  const regex = /(\{\{[^{}]+\}\})/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // 添加变量前的普通文本
    if (match.index > lastIndex) {
      const plainText = text.slice(lastIndex, match.index);
      if (plainText) {
        parts.push({ text: plainText, isVariable: false });
      }
    }

    // 添加变量
    parts.push({ text: match[0], isVariable: true });
    lastIndex = regex.lastIndex;
  }

  // 添加最后剩余的普通文本
  if (lastIndex < text.length) {
    const plainText = text.slice(lastIndex);
    if (plainText) {
      parts.push({ text: plainText, isVariable: false });
    }
  }

  return parts;
}

/**
 * 获取条件摘要的各个部分
 */
function getConditionSummaryParts(condition: Condition): SummaryPart[] {
  const subConditions = condition.subConditions || [];

  if (subConditions.length === 0) {
    return [{ text: "未配置子条件", isVariable: false }];
  }

  if (subConditions.length === 1) {
    const sub = subConditions[0];
    if (!sub) return [{ text: "未配置子条件", isVariable: false }];

    // 检查是否为空条件（未配置）
    const hasField = sub.field && String(sub.field).trim() !== "";
    const hasValue =
      sub.value !== null &&
      sub.value !== undefined &&
      String(sub.value).trim() !== "";

    // 如果字段和值都为空，显示未配置提示
    if (!hasField && !hasValue) {
      return [{ text: "未配置条件", isVariable: false }];
    }

    const field = String(sub.field || "字段");
    const operator = OPERATOR_LABELS[sub.operator] || sub.operator;
    const value = String(sub.value ?? "值");

    // 不需要值的操作符
    if (
      [
        "exists",
        "does not exist",
        "is empty",
        "is not empty",
        "is true",
        "is false",
      ].includes(sub.operator)
    ) {
      const parts: SummaryPart[] = [];

      if (isVariableReference(field)) {
        parts.push({ text: field, isVariable: true });
      } else {
        parts.push(...splitTextParts(field));
      }

      parts.push({ text: " " + operator, isVariable: false });
      return parts;
    }

    // 需要值的操作符
    const parts: SummaryPart[] = [];

    if (isVariableReference(field)) {
      parts.push({ text: field, isVariable: true });
    } else {
      parts.push(...splitTextParts(field));
    }

    parts.push({ text: " " + operator + " ", isVariable: false });

    if (isVariableReference(value)) {
      parts.push({ text: value, isVariable: true });
    } else {
      parts.push(...splitTextParts(truncate(value, 20)));
    }

    return parts;
  }

  // 多个子条件
  const logicText = condition.logic === "and" ? " 且 " : " 或 ";
  const allParts: SummaryPart[] = [];

  subConditions.forEach((sub, index) => {
    if (!sub) return;

    // 检查是否为空条件
    const hasField = sub.field && String(sub.field).trim() !== "";
    const hasValue =
      sub.value !== null &&
      sub.value !== undefined &&
      String(sub.value).trim() !== "";

    // 跳过完全空的子条件（但保留显示）
    if (!hasField && !hasValue) {
      if (index > 0) {
        allParts.push({ text: logicText, isVariable: false });
      }
      allParts.push({ text: "未配置", isVariable: false });
      return;
    }

    if (index > 0) {
      allParts.push({ text: logicText, isVariable: false });
    }

    const field = String(sub.field || "字段");
    const operator = OPERATOR_LABELS[sub.operator] || sub.operator;
    const value = String(sub.value ?? "值");

    if (
      [
        "exists",
        "does not exist",
        "is empty",
        "is not empty",
        "is true",
        "is false",
      ].includes(sub.operator)
    ) {
      if (isVariableReference(field)) {
        allParts.push({ text: field, isVariable: true });
      } else {
        allParts.push(...splitTextParts(field));
      }
      allParts.push({ text: " " + operator, isVariable: false });
    } else {
      if (isVariableReference(field)) {
        allParts.push({ text: field, isVariable: true });
      } else {
        allParts.push(...splitTextParts(field));
      }

      allParts.push({ text: " " + operator + " ", isVariable: false });

      if (isVariableReference(value)) {
        allParts.push({ text: value, isVariable: true });
      } else {
        allParts.push(...splitTextParts(truncate(value, 15)));
      }
    }
  });

  return allParts;
}

function truncate(text: string, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

// 监听条件变化，更新引用数组大小
watch(
  conditions,
  (newConditions) => {
    // 确保引用数组大小匹配条件数量
    nextTick(() => {
      conditionRefs.value = new Array(newConditions.length).fill(null);
    });
  },
  { immediate: true }
);
</script>
