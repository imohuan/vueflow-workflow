<template>
  <div class="h-full overflow-y-auto bg-white">
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
                v-model:value="nodeConfig.label"
                placeholder="输入节点名称..."
                size="small"
                @update:value="handleConfigChange"
              />
            </div>

            <!-- 节点描述 -->
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700">
                节点描述
              </label>
              <n-input
                v-model:value="nodeConfig.description"
                type="textarea"
                placeholder="输入节点描述..."
                :rows="3"
                size="small"
                @update:value="handleConfigChange"
              />
            </div>

            <!-- 节点颜色 -->
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700">
                节点颜色
              </label>
              <n-color-picker
                v-model:value="nodeConfig.color"
                :show-alpha="false"
                :modes="['hex']"
                @update:value="handleConfigChange"
              />
            </div>
          </div>
        </div>

        <!-- 节点类型特定配置 -->
        <div v-if="nodeTypeConfig && nodeTypeConfig.length > 0" class="mb-6">
          <h4
            class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"
          >
            <IconCode class="h-4 w-4" />
            节点参数
          </h4>

          <div class="space-y-4">
            <ConfigField
              v-for="field in nodeTypeConfig"
              :key="field.key"
              :field="field"
              :model-value="nodeConfig.params?.[field.key] ?? field.default"
              @update:model-value="(val) => handleParamChange(field.key, val)"
            />
          </div>
        </div>

        <!-- 高级配置 -->
        <div class="mb-6">
          <n-collapse>
            <n-collapse-item title="高级配置" name="advanced">
              <div class="space-y-4">
                <!-- 节点类型（只读） -->
                <div>
                  <label class="mb-2 block text-sm font-medium text-slate-700">
                    节点类型
                  </label>
                  <n-input
                    :value="selectedNode.data.type || '未设置'"
                    size="small"
                    disabled
                  />
                </div>

                <!-- 节点位置 -->
                <div>
                  <label class="mb-2 block text-sm font-medium text-slate-700">
                    节点位置
                  </label>
                  <n-space>
                    <n-input-number
                      :value="selectedNode.position.x"
                      size="small"
                      placeholder="X"
                      :step="10"
                      @update:value="(val: number | null) => handlePositionChange('x', val)"
                    >
                      <template #prefix>X:</template>
                    </n-input-number>
                    <n-input-number
                      :value="selectedNode.position.y"
                      size="small"
                      placeholder="Y"
                      :step="10"
                      @update:value="(val: number | null) => handlePositionChange('y', val)"
                    >
                      <template #prefix>Y:</template>
                    </n-input-number>
                  </n-space>
                </div>
              </div>
            </n-collapse-item>
          </n-collapse>
        </div>

        <!-- 操作按钮 -->
        <div class="flex gap-2 border-t border-slate-200 pt-4">
          <n-button size="small" @click="handleReset">
            <template #icon>
              <n-icon :component="IconReset" />
            </template>
            重置
          </n-button>
          <n-button
            type="error"
            size="small"
            secondary
            @click="handleDeleteNode"
          >
            <template #icon>
              <n-icon :component="IconTrash" />
            </template>
            删除节点
          </n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { Node } from "@vue-flow/core";
import { useVueFlow } from "@vue-flow/core";
import { useMessage } from "naive-ui";
import { useUiStore } from "@/newCode/stores/ui";
import { ConfigField } from "@/newCode/components/ui";
import type { ConfigField as ConfigFieldType } from "@/newCode/typings/config";
import IconConfig from "@/icons/IconConfig.vue";
import IconWidget from "@/icons/IconWidget.vue";
import IconSettings from "@/icons/IconSettings.vue";
import IconCode from "@/icons/IconCode.vue";
import IconReset from "@/icons/IconReset.vue";
import IconTrash from "@/icons/IconTrash.vue";

const uiStore = useUiStore();
const message = useMessage();
const { findNode, updateNode, removeNodes } = useVueFlow();

/** 当前选中的节点 */
const selectedNode = computed<Node | undefined>(() => {
  if (!uiStore.selectedNodeId) return undefined;
  return findNode(uiStore.selectedNodeId);
});

/** 节点颜色 */
const nodeColor = computed(() => {
  return selectedNode.value?.data?.color || "#3b82f6";
});

/** 节点配置表单数据 */
const nodeConfig = ref<{
  label: string;
  description?: string;
  color?: string;
  noInputs?: boolean;
  noOutputs?: boolean;
  params?: Record<string, any>;
}>({
  label: "",
  description: "",
  color: "#3b82f6",
  noInputs: false,
  noOutputs: false,
  params: {},
});

/**
 * 节点类型特定配置
 * TODO: 根据节点类型从配置中心获取配置字段
 */
const nodeTypeConfig = computed<ConfigFieldType[]>(() => {
  if (!selectedNode.value?.data?.type) return [];

  // 这里应该根据节点类型动态获取配置
  // 目前返回一个示例配置
  return [
    {
      key: "url",
      label: "URL 地址",
      type: "input",
      default: "",
      placeholder: "输入 URL...",
      description: "请求的 URL 地址",
    },
    {
      key: "method",
      label: "请求方法",
      type: "select",
      default: "GET",
      options: [
        { label: "GET", value: "GET" },
        { label: "POST", value: "POST" },
        { label: "PUT", value: "PUT" },
        { label: "DELETE", value: "DELETE" },
      ],
      description: "HTTP 请求方法",
    },
    {
      key: "timeout",
      label: "超时时间",
      type: "number",
      default: 5000,
      placeholder: "毫秒",
      description: "请求超时时间（毫秒）",
    },
  ];
});

/**
 * 监听选中节点变化，更新配置表单
 */
watch(
  selectedNode,
  (node) => {
    if (node) {
      nodeConfig.value = {
        label: node.data.label || "",
        description: node.data.description || "",
        color: node.data.color || "#3b82f6",
        noInputs: node.data.noInputs || false,
        noOutputs: node.data.noOutputs || false,
        params: node.data.params || {},
      };
    }
  },
  { immediate: true }
);

/**
 * 处理配置变更
 */
function handleConfigChange() {
  // 实时更新节点数据
  if (selectedNode.value) {
    updateNode(selectedNode.value.id, {
      data: {
        ...selectedNode.value.data,
        ...nodeConfig.value,
      },
    });
  }
}

/**
 * 处理参数变更
 */
function handleParamChange(key: string, value: any) {
  if (!nodeConfig.value.params) {
    nodeConfig.value.params = {};
  }
  nodeConfig.value.params[key] = value;
  handleConfigChange();
}

/**
 * 处理位置变更
 */
function handlePositionChange(axis: "x" | "y", value: number | null) {
  if (selectedNode.value && value !== null) {
    updateNode(selectedNode.value.id, {
      position: {
        ...selectedNode.value.position,
        [axis]: value,
      },
    });
  }
}

/**
 * 重置配置
 */
function handleReset() {
  if (selectedNode.value) {
    nodeConfig.value = {
      label: selectedNode.value.data.label || "",
      description: selectedNode.value.data.description || "",
      color: selectedNode.value.data.color || "#3b82f6",
      noInputs: selectedNode.value.data.noInputs || false,
      noOutputs: selectedNode.value.data.noOutputs || false,
      params: selectedNode.value.data.params || {},
    };
  }
  message.info("已重置为当前保存的配置");
}
  
/**
 * 删除节点
 */
function handleDeleteNode() {
  if (!selectedNode.value) return;

  removeNodes([selectedNode.value.id]);
  uiStore.clearNodeSelection();
  message.success("节点已删除");
}

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

<style scoped>
/* 自定义样式 */
</style>
