<template>
  <n-config-provider class="h-full">
    <n-message-provider>
      <n-dialog-provider>
        <RouterView />
        <Notify />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import { NConfigProvider, NMessageProvider, NDialogProvider } from "naive-ui";
import Notify from "@/v1/components/common/Notify.vue";
</script>
