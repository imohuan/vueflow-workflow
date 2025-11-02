<template>
  <RouterView />
  <Notify />
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import Notify from "@/components/common/Notify.vue";
</script>
