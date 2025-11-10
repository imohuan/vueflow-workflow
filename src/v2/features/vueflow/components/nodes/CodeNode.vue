<template>
  <StandardNode :id="id" :data="standardNodeData" :selected="selected">
    <template #default>
      <div class="flex flex-col gap-2 py-1.5">
        <!-- 参数映射预览 -->
        <div class="p-2 bg-slate-50 border border-slate-200 rounded-md">
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <span
              class="text-[10px] font-semibold text-slate-600 uppercase tracking-wide"
            >
              参数映射 (params)
            </span>
            <span
              class="text-[9px] text-slate-400 font-mono"
              v-if="paramItems.length > 0"
            >
              {{ paramItems.length }} 个参数
            </span>
          </div>

          <div
            v-if="paramItems.length === 0"
            class="text-[10px] text-slate-400 italic"
          >
            未配置参数
          </div>

          <div v-else class="flex flex-col gap-1.5">
            <div
              v-for="item in paramItems"
              :key="item.id"
              class="flex items-center justify-between gap-2 px-2 py-1 bg-white border border-slate-200 rounded"
            >
              <span class="text-[10px] font-semibold text-slate-700 truncate">
                {{ item.key }}
              </span>
              <span
                class="text-[9px] font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded"
              >
                params.{{ item.key }}
              </span>
            </div>
          </div>
        </div>

        <!-- 代码预览 -->
        <div class="p-2 bg-slate-50 border border-slate-200 rounded-md">
          <div
            class="text-[10px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5"
          >
            代码预览
          </div>
          <pre
            class="text-[9px] font-mono text-slate-600 overflow-hidden"
            style="max-height: 80px; line-height: 1.4"
            >{{ codePreview }}</pre
          >
        </div>
      </div>
    </template>
  </StandardNode>
</template>

<script setup lang="ts">
import { computed } from "vue";
import StandardNode from "./StandardNode.vue";
import type { NodeStyleConfig } from "workflow-flow-nodes";
import IconCode from "@/icons/IconCode.vue";

interface CodeNodeDataItem {
  key: string;
  value: unknown;
}

interface CodeNodeConfig {
  code?: string;
  dataItems?: CodeNodeDataItem[];
  typeDeclarations?: string;
}

interface ParamItem {
  id: string;
  key: string;
  preview: string;
}

interface Props {
  id: string;
  data: {
    type?: string;
    label?: string;
    description?: string;
    status?: "pending" | "running" | "success" | "error";
    config?: CodeNodeConfig;
    [key: string]: any;
  };
  selected?: boolean;
}

const props = defineProps<Props>();

// 获取配置
const config = computed(() => {
  return (
    props.data.config || {
      code: "",
      dataItems: [],
      typeDeclarations: "",
    }
  );
});

// 参数项列表
const paramItems = computed<ParamItem[]>(() => {
  const raw = config.value.dataItems;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item, index) => {
      const key = typeof item?.key === "string" ? item.key.trim() : "";
      if (!key) {
        return null;
      }

      const value = item?.value;
      let preview = "(未配置)";

      if (typeof value === "string" && value.trim()) {
        preview = value.trim();
      } else if (value !== undefined && value !== null) {
        try {
          preview = JSON.stringify(value);
        } catch {
          preview = String(value);
        }
      }

      return {
        id: `${props.id}-${index}`,
        key,
        preview,
      } satisfies ParamItem;
    })
    .filter((item): item is ParamItem => Boolean(item));
});

// 代码预览
const codePreview = computed(() => {
  const code = config.value.code || "";
  const lines = code.split("\n");
  if (lines.length > 6) {
    return lines.slice(0, 6).join("\n") + "\n...";
  }
  return code || "// 请在配置面板中编写代码";
});

// 将 CodeNode 的 data 转换为 StandardNode 的 data 格式
const standardNodeData = computed(() => {
  const style: NodeStyleConfig = {
    // 使用紫色渐变作为标题栏颜色
    headerColor: ["#8b5cf6", "#7c3aed"],
    // 使用代码图标组件
    icon: IconCode as any,
    showIcon: true,
  };

  return {
    ...props.data,
    label: props.data.label || "代码执行",
    noInputs: false,
    noOutputs: false,
    style,
  };
});
</script>

<style scoped>
/* 代码执行节点特定样式 */
pre {
  white-space: pre;
  word-wrap: normal;
  overflow-x: hidden;
  text-overflow: ellipsis;
}
</style>
