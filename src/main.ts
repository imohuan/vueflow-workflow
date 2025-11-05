import { createApp } from "vue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import mitt from "mitt";
import router from "./router";
import "./style.css";
import App from "./App.vue";
import type { WorkflowEvents } from "./typings/workflowExecution";

// NaiveUI 配置（用于 newCode 模块）
import naive from "naive-ui";

// 创建类型化的 mitt 实例用于工作流执行事件
export const workflowEmitter = mitt<WorkflowEvents>();

const app = createApp(App);

// 将 workflowEmitter 提供给整个应用
app.provide("workflowEmitter", workflowEmitter);

app.use(createPinia());
app.use(router);
app.use(PrimeVue, {
  unstyled: true,
});
app.use(naive);

// 开发环境下打印所有 workflow 事件
if (import.meta.env.DEV) {
  workflowEmitter.on("*", (type, payload) => {
    console.log(`[Workflow Event] ${String(type)}`, payload);
  });
}

app.mount("#app");
