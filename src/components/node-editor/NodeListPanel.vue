<!-- 节点列表面板 -->
<template>
  <div class="node-list-panel">
    <!-- 面板头部 -->
    <div class="panel-header">
      <h2 class="panel-title">节点列表</h2>
      <button @click="emit('close')" class="close-btn">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- 搜索框 -->
    <div class="px-4 py-3 border-b border-slate-200">
      <InputText
        v-model="searchQuery"
        placeholder="搜索节点..."
        class="w-full text-sm"
      />
    </div>

    <!-- 节点列表 -->
    <div class="flex-1 overflow-y-auto px-4 py-3 space-y-2">
      <Accordion v-model:value="expandedCategories" multiple>
        <AccordionPanel
          v-for="(nodeList, category) in filteredNodesByCategory"
          :key="category"
          :value="category"
        >
          <AccordionHeader>
            {{ category }}
            <span class="text-xs text-slate-400">({{ nodeList.length }})</span>
          </AccordionHeader>
          <AccordionContent>
            <div class="space-y-1">
              <div
                v-for="node in nodeList"
                :key="node.type"
                :draggable="true"
                @dragstart="onDragStart($event, node)"
                @dragend="onDragEnd"
                class="px-2 py-1.5 rounded hover:bg-slate-50 cursor-move transition-colors group"
              >
                <div class="flex items-start gap-2">
                  <!-- 拖拽图标 -->
                  <div
                    class="mt-0.5 transition-colors"
                    :style="{
                      color: getCategoryColor(category).icon,
                    }"
                  >
                    <IconMap class="w-3.5 h-3.5" />
                  </div>

                  <!-- 节点信息 -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 mb-0.5">
                      <div
                        class="text-[11px] font-medium text-slate-700 truncate"
                      >
                        {{ node.label }}
                      </div>
                      <span
                        class="px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0"
                        :style="{
                          backgroundColor: getCategoryColor(category).tagBg,
                          color: getCategoryColor(category).tagText,
                        }"
                      >
                        {{ category }}
                      </span>
                    </div>
                    <div
                      class="text-[10px] text-slate-400 line-clamp-2 leading-relaxed"
                    >
                      {{ node.description }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>

      <!-- 无结果提示 -->
      <div
        v-if="Object.keys(filteredNodesByCategory).length === 0"
        class="flex flex-col items-center justify-center py-12 text-slate-400"
      >
        <IconEmptyNode class="w-12 h-12 mb-2 opacity-50" />
        <div class="text-sm">未找到匹配的节点</div>
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="panel-footer">拖拽节点到画布以添加</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeRegistry } from "@/composables/useNodeRegistry";
import type { NodeMetadata } from "@/composables/useNodeRegistry";
import Accordion from "@/components/common/Accordion.vue";
import AccordionPanel from "@/components/common/AccordionPanel.vue";
import AccordionHeader from "@/components/common/AccordionHeader.vue";
import AccordionContent from "@/components/common/AccordionContent.vue";
import InputText from "@/components/common/InputText.vue";
import IconMap from "@/icons/IconMap.vue";
import IconEmptyNode from "@/icons/IconEmptyNode.vue";

interface Emits {
  (e: "close"): void;
  (e: "dragStart", node: NodeMetadata): void;
  (e: "dragEnd"): void;
}

const emit = defineEmits<Emits>();

const searchQuery = ref("");

// 使用节点注册表 hooks
const nodeRegistry = useNodeRegistry();

/** 所有节点按分类 */
const nodesByCategory = computed(() => {
  return nodeRegistry.getNodesByCategory.value;
});

// 默认展开所有分类
const expandedCategories = ref<string[] | undefined>(
  Object.keys(nodesByCategory.value)
);

/** 过滤后的节点列表 */
const filteredNodesByCategory = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();

  if (!query) {
    return nodesByCategory.value;
  }

  const result: Record<string, NodeMetadata[]> = {};
  const searchResults = nodeRegistry.searchNodes(query);

  // 按分类组织搜索结果
  searchResults.forEach((node) => {
    const category = node.category;
    if (!result[category]) {
      result[category] = [];
    }
    result[category]!.push(node);
  });

  return result;
});

/**
 * 拖拽开始
 */
function onDragStart(event: DragEvent, nodeMetadata: NodeMetadata) {
  if (!event.dataTransfer) return;

  // 设置拖拽数据
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData(
    "application/vueflow",
    JSON.stringify({
      type: nodeMetadata.type,
      label: nodeMetadata.label,
    })
  );

  // 设置拖拽样式
  if (event.target instanceof HTMLElement) {
    event.target.style.opacity = "0.5";
  }

  emit("dragStart", nodeMetadata);
}

/**
 * 拖拽结束
 */
function onDragEnd(event: DragEvent) {
  if (event.target instanceof HTMLElement) {
    event.target.style.opacity = "1";
  }

  emit("dragEnd");
}

/**
 * 获取分类颜色
 */
function getCategoryColor(category: string) {
  const colors: Record<
    string,
    {
      bg: string;
      text: string;
      border: string;
      icon: string;
      tagBg: string;
      tagText: string;
    }
  > = {
    浏览器管理: {
      bg: "#ede9fe",
      text: "#6b21a8",
      border: "#d8b4fe",
      icon: "#a855f7",
      tagBg: "#f3e8ff",
      tagText: "#7c3aed",
    },
    截图和视觉: {
      bg: "#dbeafe",
      text: "#1e40af",
      border: "#bfdbfe",
      icon: "#3b82f6",
      tagBg: "#eff6ff",
      tagText: "#2563eb",
    },
    网络监控: {
      bg: "#d1fae5",
      text: "#065f46",
      border: "#a7f3d0",
      icon: "#10b981",
      tagBg: "#ecfdf5",
      tagText: "#059669",
    },
    内容分析: {
      bg: "#fef3c7",
      text: "#92400e",
      border: "#fde68a",
      icon: "#f59e0b",
      tagBg: "#fffbeb",
      tagText: "#d97706",
    },
    交互操作: {
      bg: "#fce7f3",
      text: "#9f1239",
      border: "#fbcfe8",
      icon: "#ec4899",
      tagBg: "#fdf2f8",
      tagText: "#db2777",
    },
    数据管理: {
      bg: "#e0e7ff",
      text: "#3730a3",
      border: "#c7d2fe",
      icon: "#6366f1",
      tagBg: "#eef2ff",
      tagText: "#4f46e5",
    },
    高级功能: {
      bg: "#ffe4e6",
      text: "#881337",
      border: "#fecdd3",
      icon: "#f43f5e",
      tagBg: "#fff1f2",
      tagText: "#e11d48",
    },
    流程控制: {
      bg: "#fef3c7",
      text: "#78350f",
      border: "#fde68a",
      icon: "#f59e0b",
      tagBg: "#fffbeb",
      tagText: "#d97706",
    },
    数据处理: {
      bg: "#ddd6fe",
      text: "#5b21b6",
      border: "#c4b5fd",
      icon: "#8b5cf6",
      tagBg: "#f5f3ff",
      tagText: "#7c3aed",
    },
  };

  return (
    colors[category] || {
      bg: "#f1f5f9",
      text: "#475569",
      border: "#e2e8f0",
      icon: "#64748b",
      tagBg: "#f8fafc",
      tagText: "#64748b",
    }
  );
}
</script>

<style scoped>
.node-list-panel {
  width: 280px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-right: 1px solid #e5e7eb;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.08);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.close-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #6b7280;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.panel-footer {
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  background: white;
  font-size: 12px;
  color: #6b7280;
}

/* 行截断样式 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
