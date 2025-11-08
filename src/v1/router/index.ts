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
      component: () => import("@/v1/views/NodeEditor.vue"),
    },
    {
      path: "/node-editor",
      name: "NodeEditor",
      component: () => import("@/v1/views/NodeEditor.vue"),
    },
    {
      path: "/mcp-test",
      name: "MCPTest",
      component: () => import("@/v1/views/MCPTest.vue"),
    },
    {
      path: "/server-mode",
      name: "ServerMode",
      component: () => import("@/v1/views/ServerModeDemo.vue"),
    },
    {
      path: "/code-editor-test",
      name: "CodeEditorTest",
      component: () => import("@/v1/views/CodeEditorTest.vue"),
    },
  ],
});

export default router;
