import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      include: ["src/**/*"],
      // exclude: ["src/server/**/*"],
      outDir: "dist",
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "WorkflowFlowNodes",
      formats: ["es", "cjs"],
      fileName: (format) => {
        if (format === "es") return "index.js";
        if (format === "cjs") return "index.cjs";
        return `index.${format}.js`;
      },
    },
    sourcemap: true,
    target: "ES2020",
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        exports: "named",
        // 内联所有动态导入，禁止代码分割
        inlineDynamicImports: true,
      },
      // 保留副作用代码
      treeshake: {
        moduleSideEffects: true,
      },
    },
  },
});
