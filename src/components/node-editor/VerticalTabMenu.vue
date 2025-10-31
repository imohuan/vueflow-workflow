<!-- 纵向菜单栏组件 - 用于切换不同的侧边栏面板 -->
<template>
  <div class="vertical-tab-menu">
    <!-- 上部：功能按钮区 -->
    <div class="menu-top">
      <!-- 文件夹按钮 -->
      <button
        :class="['menu-btn', { active: activeTab === 'folders' }]"
        @click="$emit('tab-change', 'folders')"
        title="工作流文件夹"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      </button>

      <!-- 节点列表按钮 -->
      <button
        :class="['menu-btn', { active: activeTab === 'nodes' }]"
        @click="$emit('tab-change', 'nodes')"
        title="节点列表"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      </button>
    </div>

    <!-- 下部：设置按钮 -->
    <div class="menu-bottom">
      <button
        :class="['menu-btn', { active: activeTab === 'settings' }]"
        @click="$emit('tab-change', 'settings')"
        title="设置"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d="M12 1v6m0 6v6m9-9h-6m-6 0H3M19.778 4.222l-4.242 4.242m-7.072 7.072L4.222 19.778m15.556 0l-4.242-4.242m-7.072-7.072L4.222 4.222"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  activeTab: "folders" | "nodes" | "settings" | null;
}>();

defineEmits<{
  (e: "tab-change", tab: "folders" | "nodes" | "settings"): void;
}>();
</script>

<style scoped>
.vertical-tab-menu {
  width: 52px;
  height: 100%;
  background: white;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px 0;
  flex-shrink: 0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}

.menu-top,
.menu-bottom {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 6px;
}

.menu-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.menu-btn:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.menu-btn.active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
}

.menu-btn.active::before {
  content: "";
  position: absolute;
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: #3b82f6;
  border-radius: 0 2px 2px 0;
}
</style>
