/**
 * 路由配置
 */
import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "Home",
      component: () => import("@/views/NodeEditor.vue"),
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
    {
      path: "/server-mode",
      name: "ServerMode",
      component: () => import("@/views/ServerModeDemo.vue"),
    },
  ],
});

export default router;
