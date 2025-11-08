<template>
  <n-config-provider class="h-full">
    <n-message-provider>
      <n-dialog-provider>
        <MessageContainer />
        <RouterView />
        <Notify />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import { NConfigProvider, NMessageProvider, NDialogProvider } from "naive-ui";
import Notify from "./components/common/Notify.vue";
import MessageContainer from "./newCode/components/common/MessageContainer.vue";
</script>
