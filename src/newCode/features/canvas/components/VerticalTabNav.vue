<template>
  <n-layout-sider
    bordered
    collapse-mode="width"
    :collapsed-width="64"
    :width="240"
    :collapsed="collapsed"
    class="h-full"
  >
    <div class="flex flex-col h-full">
      <!-- Logo -->
      <div
        class="flex items-center justify-center h-16 border-b border-slate-200"
      >
        <div
          class="flex h-11 w-11 items-center justify-center rounded-2xl text-blue-400"
        >
          <IconCanvas class="h-5 w-5" />
        </div>
      </div>

      <!-- Main Menu -->
      <n-menu
        :value="uiStore.activeTab"
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="mainMenuOptions"
        @update:value="handleMenuSelect"
        class="flex-1"
      />

      <!-- Settings Menu (Bottom) -->
      <n-menu
        :value="uiStore.activeTab"
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="bottomMenuOptions"
        @update:value="handleMenuSelect"
        class="border-t border-slate-200"
      />
    </div>
  </n-layout-sider>
</template>

<script setup lang="ts">
import { h, computed } from "vue";
import type { Component } from "vue";
import { NIcon } from "naive-ui";
import IconCanvas from "@/icons/IconCanvas.vue";
import { mainTabs, bottomTabs } from "@/newCode/config/tabs";
import { useUiStore } from "@/newCode/stores/ui";
import type { TabKey } from "@/newCode/stores/ui";

const uiStore = useUiStore();
const collapsed = true; // 始终折叠，只显示图标

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) });
}

// 转换主要菜单选项（动态过滤）
const mainMenuOptions = computed(() => {
  return mainTabs
    .filter((tab) => {
      // 如果是节点配置 tab，只在有节点被选中时显示
      if (tab.id === "node-config") {
        return !!uiStore.selectedNodeId;
      }

      return true;
    })
    .map((tab) => ({
      label: tab.label,
      key: tab.id,
      icon: renderIcon(tab.icon),
      disabled: tab.disabled,
    }));
});

// 转换底部菜单选项
const bottomMenuOptions = bottomTabs
  .filter((tab) => {
    // 过滤测试菜单（生产环境可以移除）
    if (tab.testOnly && import.meta.env.PROD) {
      return false;
    }
    return true;
  })
  .map((tab) => ({
    label: tab.label,
    key: tab.id,
    icon: renderIcon(tab.icon),
    disabled: tab.disabled,
  }));

/**
 * 处理菜单选择
 * 通过 UI Store 统一管理面板状态
 */
const handleMenuSelect = (key: string) => {
  uiStore.setActiveTab(key as TabKey);
};
</script>

<style scoped></style>
