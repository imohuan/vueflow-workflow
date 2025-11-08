import { createApp } from "vue";
import { createPinia } from "pinia";
import naive from "naive-ui";
import router from "@/v2/router";
import "@/v2/style.css";
import App from "@/v2/App.vue";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(naive);

app.mount("#app");
