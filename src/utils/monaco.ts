import { loader } from "@guolao/vue-monaco-editor";

import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

type MonacoModule = typeof import("monaco-editor");

let configured = false;

// 配置 MonacoEnvironment（按照官方文档）
if (typeof self !== "undefined") {
  self.MonacoEnvironment = {
    getWorker(_, label) {
      if (label === "json") {
        return new jsonWorker();
      }
      if (label === "css" || label === "scss" || label === "less") {
        return new cssWorker();
      }
      if (label === "html" || label === "handlebars" || label === "razor") {
        return new htmlWorker();
      }
      if (label === "typescript" || label === "javascript") {
        return new tsWorker();
      }
      return new editorWorker();
    },
  };
}

// 配置 loader 从 node_modules 加载
loader.config({ monaco });

async function configureMonaco(monaco: MonacoModule) {
  if (configured) {
    return;
  }

  configured = true;

  console.log("🔧 开始配置 Monaco Editor（根据官方文档）...");

  // TypeScript 配置
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    esModuleInterop: true,
    allowJs: true,
    typeRoots: ["node_modules/@types"],
  });

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

  // JavaScript 配置 - 根据官方文档配置
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: true, // 启用类型检查
  });

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

  console.log("✅ Monaco Editor 配置完成");
  console.log("✅ TypeScript 服务配置: checkJs=true, EagerModelSync=true");
}

export async function loadMonaco(): Promise<MonacoModule> {
  await configureMonaco(monaco);
  return monaco;
}

export type MonacoInstance = MonacoModule;
