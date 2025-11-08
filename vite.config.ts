import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // 配置条件导出，优先使用 development 条件（指向 TypeScript 源文件）
    conditions: ["development", "import", "module", "browser", "default"],
  },
  build: {
    rollupOptions: {
      input: {
        v1: path.resolve(__dirname, "index-v1.html"),
        v2: path.resolve(__dirname, "index-v2.html"),
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      // 代理 MCP API 请求
      "/api/mcp": {
        target: "http://127.0.0.1:12306",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/mcp/, "/mcp"),
        headers: {
          Connection: "keep-alive",
        },
        configure: (proxy) => {
          proxy.on("error", (err) => {
            console.log("❌ Proxy error:", err);
          });
          proxy.on("proxyReq", (proxyReq, req) => {
            console.log("📤 Sending Request:", req.method, req.url);
            console.log("   Headers:", proxyReq.getHeaders());
          });
          proxy.on("proxyRes", (proxyRes, req) => {
            console.log("📥 Received Response:", proxyRes.statusCode, req.url);
            console.log("   Response Headers:", proxyRes.headers);
          });
        },
      },
    },
  },
});
