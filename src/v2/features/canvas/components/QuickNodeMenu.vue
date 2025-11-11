<template>
  <transition name="menu-fade">
    <n-card
      v-if="visible"
      ref="menuRef"
      tabindex="-1"
      @keydown.esc="handleEscape"
      @keydown.down.prevent="handleArrowDown"
      @keydown.up.prevent="handleArrowUp"
      @keydown.enter.prevent="handleEnterSelect"
      class="absolute outline-none shadow-2xl quick-node-menu"
      :style="menuStyle"
      size="small"
      :bordered="false"
      :content-style="{ padding: 0 }"
      :header-style="{ padding: '8px 12px' }"
      :footer-style="{ padding: '8px 12px' }"
      style="width: 260px"
    >
      <!-- 固定顶部搜索区 -->
      <template #header>
        <n-input
          ref="inputRef"
          v-model:value="searchKeyword"
          placeholder="搜索节点..."
          clearable
          size="small"
          @keydown.enter.stop.prevent="handleEnterSelect"
          @keydown.down.stop.prevent="handleArrowDown"
          @keydown.up.stop.prevent="handleArrowUp"
        >
          <template #prefix>
            <n-icon :component="SearchOutline" :size="16" />
          </template>
        </n-input>
      </template>

      <!-- 可滚动节点列表区 -->
      <n-scrollbar ref="scrollbarRef" style="max-height: 280px">
        <div ref="nodeListContainerRef" style="padding: 8px 4px">
          <n-text
            depth="3"
            style="
              font-size: 11px;
              padding-left: 8px;
              display: block;
              margin-bottom: 4px;
              font-weight: 600;
            "
          >
            快捷添加节点
          </n-text>

          <template v-if="filteredNodes.length > 0">
            <div class="node-list">
              <div
                v-for="(node, index) in filteredNodes"
                :key="node.id"
                :ref="(el) => setItemRef(el, index)"
                class="node-item"
                :class="{ 'node-item-selected': selectedIndex === index }"
                @click="handleNodeSelect(node)"
              >
                <n-icon :component="node.icon" :color="node.color" :size="16" />
                <div class="node-content">
                  <div class="node-name">{{ node.name }}</div>
                  <div class="node-desc">{{ node.description }}</div>
                </div>
              </div>
            </div>
          </template>

          <n-empty
            v-else
            description="未找到匹配的节点"
            size="small"
            class="py-6"
          />
        </div>
      </n-scrollbar>

      <!-- 底部提示 -->
      <template #footer>
        <n-text depth="3" style="font-size: 10px; line-height: 1.4">
          按 ↑↓ 切换，Enter 选择，Esc 关闭
        </n-text>
      </template>
    </n-card>
  </transition>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  nextTick,
  markRaw,
  type Component,
  onBeforeUpdate,
} from "vue";
import { onClickOutside } from "@vueuse/core";
import { NCard, NInput, NIcon, NScrollbar, NText, NEmpty } from "naive-ui";
import { SearchOutline } from "@vicons/ionicons5";
import IconCode from "@/icons/IconCode.vue";
import IconWidget from "@/icons/IconWidget.vue";
import IconServer from "@/icons/IconServer.vue";
import IconSettings from "@/icons/IconSettings.vue";
import { useCanvasStore } from "@/v2/stores/canvas";
import type { NodeMetadataItem } from "@/v2/features/vueflow/executor/types";

interface NodeInfo {
  id: string;
  name: string;
  description: string;
  icon: Component;
  color: string;
}

interface Props {
  visible: boolean;
  position: { x: number; y: number };
  /** 拖拽连接线的开始端口（由外部传入，用于在选择节点时回传） */
  startHandle?: { nodeId: string; handleId?: string | null; handleType?: "source" | "target" };
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "close"): void;
  (
    e: "selectNode",
    payload: {
      nodeId: string;
      startHandle?: { nodeId: string; handleId?: string | null; handleType?: "source" | "target" };
    }
  ): void;
}>();

const menuRef = ref<HTMLDivElement | null>(null);
const inputRef = ref<typeof NInput | null>(null);
const scrollbarRef = ref<InstanceType<typeof NScrollbar> | null>(null);
const nodeListContainerRef = ref<HTMLDivElement | null>(null);
const searchKeyword = ref("");
const selectedIndex = ref(0);
const itemRefs = ref<(HTMLDivElement | null)[]>([]);

// Canvas Store
const canvasStore = useCanvasStore();

// 设置节点项 ref
function setItemRef(el: any, index: number) {
  if (el && el instanceof HTMLElement) {
    itemRefs.value[index] = el as HTMLDivElement;
  }
}

// 在更新前清空 refs
onBeforeUpdate(() => {
  itemRefs.value = [];
});

// 分类图标和颜色映射
const categoryIconMap: Record<string, { icon: Component; color: string }> = {
  网络: { icon: markRaw(IconWidget), color: "#3b82f6" },
  数据处理: { icon: markRaw(IconCode), color: "#10b981" },
  文本工具: { icon: markRaw(IconServer), color: "#f59e0b" },
  工具: { icon: markRaw(IconSettings), color: "#8b5cf6" },
};

// 默认图标和颜色
const defaultIcon = markRaw(IconCode);
const defaultColor = "#6b7280";

// 将 NodeMetadataItem 转换为 NodeInfo
function convertNodeMetadataToNodeInfo(node: NodeMetadataItem): NodeInfo {
  const category = node.category || "其他";
  const categoryInfo = categoryIconMap[category] || {
    icon: defaultIcon,
    color: defaultColor,
  };

  return {
    id: node.type,
    name: node.label,
    description: node.description || "",
    icon: categoryInfo.icon,
    color: categoryInfo.color,
  };
}

// 节点列表（从 Store 获取）
const nodeList = computed<NodeInfo[]>(() => {
  return canvasStore.availableNodes.map(convertNodeMetadataToNodeInfo);
});

const menuStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`,
  zIndex: 1000,
}));

// 过滤节点
const filteredNodes = computed(() => {
  let nodes = nodeList.value;
  
  // 过滤掉开始节点和结束节点
  nodes = nodes.filter(node => {
    return node.id !== 'start' && node.id !== 'end';
  });
  
  if (!searchKeyword.value.trim()) {
    return nodes;
  }
  const keyword = searchKeyword.value.toLowerCase();
  return nodes.filter(
    (node) =>
      node.name.toLowerCase().includes(keyword) ||
      node.description.toLowerCase().includes(keyword)
  );
});

// 监听 visible 变化，自动聚焦输入框并重置搜索
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      searchKeyword.value = "";
      selectedIndex.value = 0;
      nextTick(() => {
        inputRef.value?.focus();
        scrollToSelectedItem();
      });
    }
  }
);

// 监听过滤后的节点列表变化，重置选中索引
watch(
  () => filteredNodes.value,
  () => {
    selectedIndex.value = 0;
    nextTick(() => {
      scrollToSelectedItem();
    });
  }
);

// 使用 VueUse 的 onClickOutside 检测外部点击
onClickOutside(menuRef, () => {
  if (props.visible) {
    emit("close");
  }
});

function handleEscape() {
  emit("close");
}

function handleNodeSelect(node: NodeInfo) {
  emit("selectNode", { nodeId: node.id, startHandle: props.startHandle });
  emit("close");
}

function handleEnterSelect() {
  const selectedNode = filteredNodes.value[selectedIndex.value];
  if (selectedNode) {
    handleNodeSelect(selectedNode);
  }
}

function handleArrowDown() {
  if (filteredNodes.value.length === 0) return;
  selectedIndex.value = (selectedIndex.value + 1) % filteredNodes.value.length;
  scrollToSelectedItem();
}

function handleArrowUp() {
  if (filteredNodes.value.length === 0) return;
  selectedIndex.value =
    selectedIndex.value === 0
      ? filteredNodes.value.length - 1
      : selectedIndex.value - 1;
  scrollToSelectedItem();
}

// 滚动到选中的项目
function scrollToSelectedItem() {
  nextTick(() => {
    const selectedItem = itemRefs.value[selectedIndex.value];
    if (!selectedItem || !scrollbarRef.value || !nodeListContainerRef.value)
      return;

    try {
      // 获取滚动容器的 DOM 元素
      // naive-ui 的 n-scrollbar 组件结构：.n-scrollbar > .n-scrollbar-container
      const scrollbarEl = (scrollbarRef.value as any).$el as HTMLElement;
      if (!scrollbarEl) return;

      const scrollContainer = scrollbarEl.querySelector(
        ".n-scrollbar-container"
      ) as HTMLElement;
      if (!scrollContainer) return;

      // 获取选中项相对于滚动容器的位置
      const containerRect = scrollContainer.getBoundingClientRect();
      const itemRect = selectedItem.getBoundingClientRect();

      const itemTop =
        itemRect.top - containerRect.top + scrollContainer.scrollTop;
      const itemHeight = itemRect.height;
      const containerHeight = containerRect.height;
      const scrollTop = scrollContainer.scrollTop;

      // 如果选中的项目在可视区域上方，滚动到项目顶部
      if (itemTop < scrollTop) {
        scrollContainer.scrollTo({
          top: Math.max(0, itemTop - 8), // 留一点间距，确保不小于 0
          behavior: "auto",
        });
      }
      // 如果选中的项目在可视区域下方，滚动到项目底部可见
      else if (itemTop + itemHeight > scrollTop + containerHeight) {
        scrollContainer.scrollTo({
          top: itemTop + itemHeight - containerHeight + 8, // 留一点间距
          behavior: "auto",
        });
      }
    } catch (error) {
      // 如果滚动失败，使用 scrollIntoView 作为后备方案
      console.warn("[QuickNodeMenu] 滚动失败，使用 scrollIntoView:", error);
      selectedItem.scrollIntoView({
        behavior: "auto",
        block: "nearest",
      });
    }
  });
}

defineExpose({
  focus: () => {
    inputRef.value?.focus();
  },
});
</script>

<style scoped>
/* 节点列表样式 */
.node-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.node-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.node-item:hover {
  background-color: rgba(24, 160, 88, 0.08);
}

.node-item-selected {
  background-color: rgba(24, 160, 88, 0.12) !important;
}

.node-content {
  flex: 1;
  min-width: 0;
}

.node-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  line-height: 1.4;
  margin-bottom: 2px;
}

.node-desc {
  font-size: 11px;
  color: #666;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 菜单过渡动画 */
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}

.menu-fade-enter-to,
.menu-fade-leave-from {
  opacity: 1;
  transform: scale(1) translateY(0);
}
</style>
