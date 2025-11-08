<template>
  <n-config-provider class="h-full">
    <n-message-provider placement="bottom-right">
      <n-dialog-provider>
        <RouterView />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import { NConfigProvider, NMessageProvider, NDialogProvider } from "naive-ui";
</script>
