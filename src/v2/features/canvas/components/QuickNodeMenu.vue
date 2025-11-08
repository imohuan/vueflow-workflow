<template>
  <transition name="menu-fade">
    <n-card
      v-if="visible"
      ref="menuRef"
      tabindex="-1"
      @keydown.esc="handleEscape"
      class="absolute outline-none shadow-2xl quick-node-menu"
      :style="menuStyle"
      size="small"
      :bordered="true"
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
          @keydown.enter="handleEnterSelect"
        >
          <template #prefix>
            <n-icon :component="SearchOutline" :size="16" />
          </template>
        </n-input>
      </template>

      <!-- 可滚动节点列表区 -->
      <n-scrollbar style="max-height: 280px">
        <div style="padding: 8px 4px">
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
                v-for="node in filteredNodes"
                :key="node.id"
                class="node-item"
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
          重构阶段占位内容，后续接入真实节点数据。
        </n-text>
      </template>
    </n-card>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, type Component } from "vue";
import { onClickOutside } from "@vueuse/core";
import { NCard, NInput, NIcon, NScrollbar, NText, NEmpty } from "naive-ui";
import {
  SearchOutline,
  PlayCircleOutline,
  GitNetworkOutline,
  GitCompareOutline,
  RefreshCircleOutline,
  CreateOutline,
  ConstructOutline,
  BarChartOutline,
} from "@vicons/ionicons5";

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
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "selectNode", nodeId: string): void;
}>();

const menuRef = ref<HTMLDivElement | null>(null);
const inputRef = ref<typeof NInput | null>(null);
const searchKeyword = ref("");

// 节点数据
const nodeList: NodeInfo[] = [
  {
    id: "start",
    name: "开始节点",
    description: "工作流的起始节点",
    icon: PlayCircleOutline,
    color: "#18a058",
  },
  {
    id: "http",
    name: "HTTP 请求",
    description: "发送 HTTP 请求获取数据",
    icon: GitNetworkOutline,
    color: "#2080f0",
  },
  {
    id: "condition",
    name: "条件判断",
    description: "根据条件分支执行",
    icon: GitCompareOutline,
    color: "#f0a020",
  },
  {
    id: "for-loop",
    name: "For 循环",
    description: "遍历数组或对象",
    icon: RefreshCircleOutline,
    color: "#d03050",
  },
  {
    id: "variable",
    name: "变量赋值",
    description: "创建或修改变量",
    icon: CreateOutline,
    color: "#7c3aed",
  },
  {
    id: "transform",
    name: "数据转换",
    description: "转换数据格式",
    icon: ConstructOutline,
    color: "#0ea5e9",
  },
  {
    id: "log",
    name: "日志输出",
    description: "输出调试信息",
    icon: BarChartOutline,
    color: "#64748b",
  },
];

const menuStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`,
  zIndex: 1000,
}));

// 过滤节点
const filteredNodes = computed(() => {
  if (!searchKeyword.value.trim()) {
    return nodeList;
  }
  const keyword = searchKeyword.value.toLowerCase();
  return nodeList.filter(
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
      nextTick(() => {
        inputRef.value?.focus();
      });
    }
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
  emit("selectNode", node.id);
  emit("close");
}

function handleEnterSelect() {
  const firstNode = filteredNodes.value[0];
  if (firstNode) {
    handleNodeSelect(firstNode);
  }
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
