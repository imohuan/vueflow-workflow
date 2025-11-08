<template>
  <NodeWrapper v-bind="props">
    <template #default>
      <div class="flex flex-col gap-3">
        <section class="space-y-2">
          <header class="flex items-center justify-between">
            <div>
              <div
                class="text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              >
                参数映射 (params)
              </div>
              <p class="text-[10px] text-slate-400 mt-0.5">
                以下变量将在运行时传入
                <span class="font-mono text-emerald-600">main(params)</span>
              </p>
            </div>
          </header>

          <div
            v-if="paramItems.length === 0"
            class="rounded-md border border-dashed border-slate-300 bg-slate-50/60 px-3 py-3 text-[10px] text-slate-400"
          >
            暂未配置任何参数，请在右侧配置面板中添加映射。
          </div>

          <ul v-else class="space-y-2">
            <li
              v-for="item in paramItems"
              :key="item.id"
              class="rounded-md border border-slate-200 bg-white px-3 py-2"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-[11px] font-semibold text-slate-700 truncate">
                  {{ item.key }}
                </span>
                <span
                  class="text-[10px] font-mono text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full"
                >
                  params.{{ item.key }}
                </span>
              </div>
              <!-- <p class="mt-1 text-[10px] text-slate-500 wrap-break-word">
                <span class="font-mono text-emerald-600">来源:</span>
                {{ item.preview }}
              </p> -->
            </li>
          </ul>
        </section>

        <!-- <section v-if="typeDeclarationPreview" class="space-y-1.5">
          <header class="flex items-center gap-2">
            <div
              class="text-[10px] font-semibold uppercase tracking-wide text-slate-500"
            >
              类型声明概览
            </div>
          </header>
          <pre
            class="max-h-32 overflow-y-auto variable-scroll rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-mono leading-relaxed text-slate-600"
            >{{ typeDeclarationPreview }}</pre
          >
        </section> -->
      </div>
    </template>
  </NodeWrapper>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { NodeData } from "../../../typings/nodeEditor";
import NodeWrapper from "./NodeWrapper.vue";

interface Props {
  id: string;
  data: NodeData;
  selected?: boolean;
}

interface ParamItem {
  id: string;
  key: string;
  preview: string;
}

const props = defineProps<Props>();

const paramItems = computed<ParamItem[]>(() => {
  const raw = props.data.config?.dataItems;
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

// 暂时未使用，保留以备将来使用
// const typeDeclarationPreview = computed(() => {
//   const content = props.data.config?.typeDeclarations;
//   if (typeof content !== "string") {
//     return "";
//   }
//   const trimmed = content.trim();
//   if (!trimmed) {
//     return "";
//   }
//   const lines = trimmed.split("\n");
//   return lines.length > 10 ? `${lines.slice(0, 10).join("\n")}\n...` : trimmed;
// });
</script>
