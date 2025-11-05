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

    <!-- 节点分类列表 -->
    <div class="p-3">
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
import { ref, computed } from "vue";
import type { Component } from "vue";
import IconSearch from "@/icons/IconSearch.vue";
import IconWidget from "@/icons/IconWidget.vue";
import IconCode from "@/icons/IconCode.vue";
import IconServer from "@/icons/IconServer.vue";

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

// 节点分类数据（示例）
const nodeCategories = ref<NodeCategory[]>([
  {
    id: "browser",
    name: "浏览器操作",
    icon: IconWidget,
    color: "#3b82f6",
    nodes: [
      {
        id: "browser.open",
        name: "打开网页",
        description: "在浏览器中打开指定的 URL",
        category: "browser",
        tags: ["基础", "必备"],
      },
      {
        id: "browser.click",
        name: "点击元素",
        description: "点击页面上的指定元素",
        category: "browser",
        tags: ["交互"],
      },
      {
        id: "browser.input",
        name: "输入文本",
        description: "在输入框中输入文本内容",
        category: "browser",
        tags: ["交互", "表单"],
      },
      {
        id: "browser.screenshot",
        name: "截图",
        description: "对当前页面或指定元素截图",
        category: "browser",
        tags: ["工具"],
      },
      {
        id: "browser.getContent",
        name: "获取内容",
        description: "提取页面上的文本、HTML 或属性",
        category: "browser",
        tags: ["数据采集"],
      },
    ],
  },
  {
    id: "data",
    name: "数据处理",
    icon: IconCode,
    color: "#10b981",
    nodes: [
      {
        id: "data.transform",
        name: "数据转换",
        description: "对数据进行格式转换或映射",
        category: "data",
        tags: ["转换"],
      },
      {
        id: "data.filter",
        name: "数据过滤",
        description: "根据条件过滤数据集合",
        category: "data",
        tags: ["筛选"],
      },
      {
        id: "data.aggregate",
        name: "数据聚合",
        description: "对数据进行求和、平均、分组等操作",
        category: "data",
        tags: ["统计"],
      },
      {
        id: "data.parse",
        name: "数据解析",
        description: "解析 JSON、CSV、XML 等格式数据",
        category: "data",
        tags: ["解析"],
      },
      {
        id: "data.validate",
        name: "数据验证",
        description: "验证数据是否符合指定的规则",
        category: "data",
        tags: ["验证"],
      },
    ],
  },
  {
    id: "control",
    name: "流程控制",
    icon: IconServer,
    color: "#f59e0b",
    nodes: [
      {
        id: "control.if",
        name: "条件分支",
        description: "根据条件执行不同的分支",
        category: "control",
        tags: ["逻辑"],
      },
      {
        id: "control.loop",
        name: "循环",
        description: "重复执行一组节点",
        category: "control",
        tags: ["循环"],
      },
      {
        id: "control.wait",
        name: "等待",
        description: "暂停执行指定的时间",
        category: "control",
        tags: ["延迟"],
      },
      {
        id: "control.stop",
        name: "终止",
        description: "停止工作流执行",
        category: "control",
        tags: ["终止"],
      },
    ],
  },
]);

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
    event.dataTransfer.setData("application/node", JSON.stringify(node));
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
