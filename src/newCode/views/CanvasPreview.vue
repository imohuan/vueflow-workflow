<template>
  <n-message-provider>
    <n-dialog-provider>
      <CanvasView />
    </n-dialog-provider>
  </n-message-provider>
</template>

<script setup lang="ts">
import { NMessageProvider, NDialogProvider } from "naive-ui";
import CanvasView from "../features/canvas/CanvasView.vue";
</script>
