/**
 * v2 版本路由配置
 */
import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "Preview",
      component: () => import("@/v2/views/CanvasPreview.vue"),
    },
    {
      path: "/preview/ui-shell",
      name: "UiShellPreview",
      component: () => import("@/v2/views/UiShellPreview.vue"),
    },
    {
      path: "/preview/canvas",
      name: "CanvasPreview",
      component: () => import("@/v2/views/CanvasPreview.vue"),
    },
    {
      path: "/preview/code-editor",
      name: "CodeEditorPreview",
      component: () => import("@/v2/views/CodeEditorPreview.vue"),
    },
    {
      path: "/preview/json-editor",
      name: "JsonEditorPreview",
      component: () => import("@/v2/views/JsonEditorPreview.vue"),
    },
    {
      path: "/preview/json-tree",
      name: "JsonTreePreview",
      component: () => import("@/v2/views/JsonTreePreview.vue"),
    },
    {
      path: "/preview/split-layout",
      name: "SplitLayoutPreview",
      component: () => import("@/v2/views/SplitLayoutPreview.vue"),
    },
  ],
});

export default router;
