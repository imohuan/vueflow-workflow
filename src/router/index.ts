/**
 * 路由配置
 */
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "Home",
      component: () => import("@/views/Home.vue"),
    },
    {
      path: "/node-editor",
      name: "NodeEditor",
      component: () => import("@/views/NodeEditor.vue"),
    },
    {
      path: "/mcp-test",
      name: "MCPTest",
      component: () => import("@/views/MCPTest.vue"),
    },
  ],
});

export default router;
