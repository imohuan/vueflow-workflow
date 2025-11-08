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
  ],
});

export default router;
