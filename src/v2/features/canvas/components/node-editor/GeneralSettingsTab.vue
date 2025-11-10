<template>
  <div class="h-full overflow-y-auto variable-scroll">
    <!-- 未选中节点时的提示 -->
    <div
      v-if="!selectedNode"
      class="flex h-full items-center justify-center text-slate-400"
    >
      <div class="text-center">
        <IconConfig class="mx-auto mb-3 h-12 w-12 opacity-50" />
        <p class="text-sm">请在画布中选择一个节点</p>
        <p class="mt-1 text-xs text-slate-500">点击节点即可进行配置</p>
      </div>
    </div>

    <!-- 选中节点时显示配置表单 -->
    <div v-else>
      <!-- 节点基本信息 -->
      <div class="border-b border-slate-200 bg-slate-50 p-4">
        <div class="flex items-start gap-3">
          <!-- 节点图标 -->
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            :style="{ backgroundColor: nodeColor + '20' }"
          >
            <component
              :is="selectedNode.data.icon"
              v-if="selectedNode.data.icon"
              class="h-5 w-5"
              :style="{ color: nodeColor }"
            />
            <IconWidget v-else class="h-5 w-5" :style="{ color: nodeColor }" />
          </div>

          <!-- 节点信息 -->
          <div class="flex-1 overflow-hidden">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-slate-800">
                {{ selectedNode.data.label }}
              </h3>
              <n-tag
                v-if="selectedNode.data.status"
                :type="getStatusType(selectedNode.data.status)"
                size="small"
              >
                {{ getStatusLabel(selectedNode.data.status) }}
              </n-tag>
            </div>
            <p class="mt-1 text-xs text-slate-500">
              {{ selectedNode.data.description || "暂无描述" }}
            </p>
            <p class="mt-1 text-xs text-slate-400">ID: {{ selectedNode.id }}</p>
          </div>
        </div>
      </div>

      <!-- 配置表单区域 -->
      <div class="p-4">
        <!-- 基础配置 -->
        <div class="mb-6">
          <h4
            class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"
          >
            <IconSettings class="h-4 w-4" />
            基础配置
          </h4>

          <div class="space-y-4">
            <!-- 节点名称 -->
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700">
                节点名称
                <span class="text-red-500">*</span>
              </label>
              <n-input
                :value="nodeConfig.label"
                placeholder="输入节点名称..."
                size="small"
                @update:value="(val: string) => emit('update:label', val)"
              />
            </div>

            <!-- 节点描述 -->
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700">
                节点描述
              </label>
              <n-input
                :value="nodeConfig.description"
                type="textarea"
                placeholder="输入节点描述..."
                :rows="3"
                size="small"
                @update:value="(val: string) => emit('update:description', val)"
              />
            </div>

            <!-- 节点颜色 -->
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700">
                节点颜色
              </label>
              <n-color-picker
                :value="nodeConfig.color"
                :show-alpha="false"
                :modes="['hex']"
                @update:value="(val: string) => emit('update:color', val)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Node } from "@vue-flow/core";
import IconConfig from "@/icons/IconConfig.vue";
import IconWidget from "@/icons/IconWidget.vue";
import IconSettings from "@/icons/IconSettings.vue";
import type { NodeConfigData } from "./types";

interface Props {
  selectedNode: Node | undefined;
  nodeConfig: NodeConfigData;
  nodeColor: string;
}

interface Emits {
  (e: "update:label", value: string): void;
  (e: "update:description", value: string): void;
  (e: "update:color", value: string): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

/**
 * 获取状态标签
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "等待中",
    running: "运行中",
    success: "成功",
    error: "错误",
  };
  return labels[status] || status;
}

/**
 * 获取状态类型
 */
function getStatusType(
  status: string
): "default" | "success" | "warning" | "error" | "info" {
  const types: Record<string, any> = {
    pending: "default",
    running: "warning",
    success: "success",
    error: "error",
  };
  return types[status] || "default";
}
</script>
