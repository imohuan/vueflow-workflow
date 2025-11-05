<template>
  <n-message-provider></n-message-provider>
</template>

<script setup lang="ts">
import { provide } from "vue";
import { useMessage, useDialog } from "naive-ui";

// 提供全局的 message 和 dialog API
const message = useMessage();
const dialog = useDialog();

provide("message", message);
provide("dialog", dialog);
</script>
