<template>
  <StandardNode :id="id" :data="standardNodeData" :selected="selected">
    <template #default>
      <div class="flex flex-col gap-2 py-1.5">
        <!-- 条件预览列表 -->
        <div
          v-for="(condition, condIndex) in conditions"
          :key="condIndex"
          class="p-2 bg-slate-50 border border-slate-200 rounded-md transition-all duration-200 hover:bg-slate-100"
          :ref="(el) => setConditionRef(el as HTMLElement, condIndex)"
        >
          <div class="flex items-center justify-between gap-2 mb-1">
            <span
              class="text-[10px] font-semibold text-slate-600 uppercase tracking-wide"
            >
              条件{{ condIndex + 1 }}
            </span>
            <span
              v-if="(condition.subConditions?.length ?? 0) > 1"
              class="py-0.5 px-1.5 text-[10px] font-medium bg-violet-200 text-violet-600 rounded"
            >
              {{ condition.logic === "and" ? "且" : "或" }}
            </span>
          </div>
          <div
            class="flex flex-wrap items-center gap-1 text-[11px] text-slate-500 leading-snug"
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
          class="p-2 bg-orange-50 border border-orange-200 rounded-md transition-all duration-200 hover:bg-orange-100"
          ref="elsePreviewRef"
        >
          <div class="flex items-center justify-between gap-2 mb-1">
            <span
              class="text-[10px] font-semibold text-slate-600 uppercase tracking-wide"
            >
              否则
            </span>
          </div>
          <div class="text-[11px] text-slate-500 leading-snug wrap-break-word">
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
import { Position } from "@vue-flow/core";
import StandardNode from "./StandardNode.vue";
import { PortHandle } from "../ports";
import type { NodeStyleConfig } from "workflow-flow-nodes";
import type { Condition, IfConfig } from "../../../../../workflow/nodes";
import { OPERATOR_LABELS } from "../../../../../workflow/nodes";
import VariableBadge from "../../../../../components/common/VariableBadge.vue";

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

// 获取条件列表
const conditions = computed(() => {
  const config = props.data.config as IfConfig | undefined;
  return config?.conditions || [];
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
  // 每个条件预览框大约 60px 高，间距 8px（gap-2）
  const CONDITION_ITEM_HEIGHT = 60;
  const GAP = 8;
  const HEADER_HEIGHT = 40;
  const PADDING_TOP = 12; // py-1.5

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
    // 使用条件判断图标
    icon: "❓",
    showIcon: true,
  };

  return {
    ...props.data,
    label: props.data.label || "条件判断",
    noInputs: false, // If 节点有输入端口
    noOutputs: true, // 使用自定义输出端口，隐藏默认输出端口
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

    const field = String(sub.field || "输入值");
    const operator = OPERATOR_LABELS[sub.operator] || sub.operator;
    const value = String(sub.value ?? "''");

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

    if (index > 0) {
      allParts.push({ text: logicText, isVariable: false });
    }

    const field = String(sub.field || "输入值");
    const operator = OPERATOR_LABELS[sub.operator] || sub.operator;
    const value = String(sub.value ?? "''");

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
