import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [],
  build: {
    lib: {
      entry: resolve(__dirname, "src/server/index.ts"),
      name: "WorkflowFlowNodesServer",
      formats: ["es", "cjs"],
      fileName: (format) => {
        if (format === "es") return "index.js";
        if (format === "cjs") return "index.cjs";
        return `index.${format}.js`;
      },
    },
    sourcemap: true,
    target: "node18",
    outDir: "dist/server",
    emptyOutDir: true, // 不清空 dist，因为主配置已经构建了
    rollupOptions: {
      external: ["ws"], // WebSocket 库作为外部依赖
      output: {
        exports: "named",
      },
    },
  },
});
