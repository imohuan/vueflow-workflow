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
          class="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
        >
          <IconCanvas class="h-5 w-5" />
        </div>
      </div>

      <!-- Main Menu -->
      <n-menu
        :value="selectedKey"
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="mainMenuOptions"
        @update:value="handleMenuSelect"
        class="flex-1"
      />

      <!-- Settings Menu (Bottom) -->
      <n-menu
        :value="selectedKey"
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="settingsMenuOptions"
        @update:value="handleMenuSelect"
        class="border-t border-slate-200"
      />
    </div>
  </n-layout-sider>
</template>

<script setup lang="ts">
import { h, ref } from "vue";
import type { Component } from "vue";
import { NIcon } from "naive-ui";
import IconCanvas from "@/icons/IconCanvas.vue";
import IconNodeEditor from "@/icons/IconNodeEditor.vue";
import IconWidget from "@/icons/IconWidget.vue";
import IconServer from "@/icons/IconServer.vue";
import IconSettings from "@/icons/IconSettings.vue";

const collapsed = ref(true);
const selectedKey = ref<string>("workflows");

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) });
}

const mainMenuOptions = [
  {
    label: "工作流",
    key: "workflows",
    icon: renderIcon(IconNodeEditor),
  },
  {
    label: "节点列表",
    key: "node-library",
    icon: renderIcon(IconWidget),
  },
  {
    label: "执行记录",
    key: "execution-history",
    icon: renderIcon(IconServer),
  },
];

const settingsMenuOptions = [
  {
    label: "设置",
    key: "settings",
    icon: renderIcon(IconSettings),
  },
];

const handleMenuSelect = (key: string) => {
  selectedKey.value = key;
  console.log("Selected menu:", key);
};
</script>

<style scoped></style>
