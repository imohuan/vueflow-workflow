import { createApp } from "vue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import router from "./router";
import "./style.css";
import App from "./App.vue";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(PrimeVue, {
  unstyled: true,
});

app.mount("#app");
