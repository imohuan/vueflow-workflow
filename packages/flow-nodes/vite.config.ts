import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      include: ["src/**/*"],
      outDir: "dist",
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        server: resolve(__dirname, "src/server/index.ts"),
      },
      name: "WorkflowFlowNodes",
      formats: ["es", "cjs"],
      fileName: (format, entryName) => {
        if (format === "es") return `${entryName}.js`;
        if (format === "cjs") return `${entryName}.cjs`;
        return `${entryName}.${format}.js`;
      },
    },
    sourcemap: true,
    target: "ES2020",
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      external: ["ws"], // WebSocket 库作为外部依赖
      output: {
        exports: "named",
      },
    },
  },
});
