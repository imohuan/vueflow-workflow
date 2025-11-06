<template>
  <div class="h-full overflow-y-auto bg-white">
    <!-- 顶部搜索栏 -->
    <div class="border-b border-slate-200 bg-white p-3">
      <n-input
        v-model:value="searchQuery"
        placeholder="搜索节点..."
        size="small"
        clearable
      >
        <template #prefix>
          <n-icon :component="IconSearch" />
        </template>
      </n-input>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center p-8">
      <n-spin size="medium" />
    </div>

    <!-- 节点分类列表 -->
    <div v-else class="p-3">
      <n-collapse :default-expanded-names="expandedCategories">
        <n-collapse-item
          v-for="category in filteredCategories"
          :key="category.id"
          :name="category.id"
        >
          <!-- 分类标题 -->
          <template #header>
            <div class="flex items-center gap-2">
              <component
                :is="category.icon"
                class="h-4 w-4"
                :style="{ color: category.color }"
              />
              <span class="font-medium">{{ category.name }}</span>
              <span class="text-xs text-slate-400"
                >({{ category.nodes.length }})</span
              >
            </div>
          </template>

          <!-- 节点列表 -->
          <div class="space-y-2">
            <div
              v-for="node in category.nodes"
              :key="node.id"
              class="cursor-pointer rounded border border-slate-200 bg-white p-3 transition-all hover:border-blue-400 hover:shadow-sm"
              draggable="true"
              @dragstart="handleDragStart(node, $event)"
              @click="handleNodeClick(node)"
            >
              <div class="flex items-start gap-2">
                <!-- 节点图标 -->
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded"
                  :style="{ backgroundColor: category.color + '20' }"
                >
                  <component
                    :is="node.icon || category.icon"
                    class="h-4 w-4"
                    :style="{ color: category.color }"
                  />
                </div>

                <!-- 节点信息 -->
                <div class="flex-1 overflow-hidden">
                  <div class="font-medium text-slate-800">{{ node.name }}</div>
                  <div class="mt-1 text-xs text-slate-500 line-clamp-2">
                    {{ node.description }}
                  </div>

                  <!-- 标签 -->
                  <div
                    v-if="node.tags && node.tags.length > 0"
                    class="mt-2 flex flex-wrap gap-1"
                  >
                    <n-tag
                      v-for="tag in node.tags"
                      :key="tag"
                      size="tiny"
                      type="info"
                    >
                      {{ tag }}
                    </n-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </n-collapse-item>
      </n-collapse>

      <!-- 空状态 -->
      <n-empty
        v-if="filteredCategories.length === 0"
        description="未找到匹配的节点"
        class="mt-8"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, markRaw, onMounted } from "vue";
import type { Component } from "vue";
import IconSearch from "@/icons/IconSearch.vue";
import IconWidget from "@/icons/IconWidget.vue";
import IconCode from "@/icons/IconCode.vue";
import IconServer from "@/icons/IconServer.vue";
import { useVueFlowExecution } from "@/newCode/features/vueflow/executor";
import type { NodeMetadataItem } from "@/newCode/features/vueflow/executor/types";

// 节点分类接口
interface NodeCategory {
  id: string;
  name: string;
  icon: Component;
  color: string;
  nodes: NodeDefinition[];
}

// 节点定义接口
interface NodeDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: Component;
  tags?: string[];
}

// 搜索关键词
const searchQuery = ref("");

// 默认展开的分类
const expandedCategories = ref(["browser", "data", "control"]);

// 执行器实例
const executionManager = useVueFlowExecution();

// 是否正在加载
const loading = ref(true);

// 节点分类数据
const nodeCategories = ref<NodeCategory[]>([]);

// 分类图标和颜色映射
const categoryIconMap: Record<string, { icon: Component; color: string }> = {
  网络: { icon: markRaw(IconWidget), color: "#3b82f6" },
  数据处理: { icon: markRaw(IconCode), color: "#10b981" },
  文本工具: { icon: markRaw(IconServer), color: "#f59e0b" },
};

// 从执行器获取节点列表
async function loadNodeList() {
  try {
    loading.value = true;
    const nodes = await executionManager.getNodeList();

    // 按分类分组节点
    const categoryMap = new Map<string, NodeMetadataItem[]>();
    nodes.forEach((node) => {
      const category = node.category || "其他";
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(node);
    });

    // 转换为 NodeCategory 格式
    nodeCategories.value = Array.from(categoryMap.entries()).map(
      ([categoryName, categoryNodes]) => {
        const categoryInfo = categoryIconMap[categoryName] || {
          icon: markRaw(IconCode),
          color: "#6b7280",
        };

        return {
          id: categoryName.toLowerCase().replace(/\s+/g, "-"),
          name: categoryName,
          icon: categoryInfo.icon,
          color: categoryInfo.color,
          nodes: categoryNodes.map((node) => ({
            id: node.type,
            name: node.label,
            description: node.description || "",
            category: categoryName,
            icon: node.icon ? undefined : categoryInfo.icon,
            tags: node.tags || [],
          })),
        };
      }
    );

    // 默认展开所有分类
    expandedCategories.value = nodeCategories.value.map((cat) => cat.id);

    console.log("节点列表加载成功:", nodes.length, "个节点");
  } catch (error) {
    console.error("加载节点列表失败:", error);
  } finally {
    loading.value = false;
  }
}

// 组件挂载时加载节点列表
onMounted(() => {
  loadNodeList();
});

// 过滤后的分类
const filteredCategories = computed(() => {
  if (!searchQuery.value) return nodeCategories.value;

  return nodeCategories.value
    .map((category) => {
      const filteredNodes = category.nodes.filter((node) => {
        const searchLower = searchQuery.value.toLowerCase();
        return (
          node.name.toLowerCase().includes(searchLower) ||
          node.description.toLowerCase().includes(searchLower) ||
          node.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
        );
      });

      if (filteredNodes.length > 0) {
        return { ...category, nodes: filteredNodes };
      }
      return null;
    })
    .filter((category): category is NodeCategory => category !== null);
});

/**
 * 处理拖拽开始
 */
function handleDragStart(node: NodeDefinition, event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "copy";
    // 使用 application/vueflow 数据类型以匹配画布的 drop 处理
    event.dataTransfer.setData("application/vueflow", JSON.stringify(node));
  }
  console.log("开始拖拽节点:", node);
}

/**
 * 处理节点点击
 */
function handleNodeClick(node: NodeDefinition) {
  console.log("点击节点:", node);
  // 可以在这里显示节点详情或其他操作
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
