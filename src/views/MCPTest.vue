<template>
  <div class="h-full flex bg-gray-50">
    <!-- 左侧容器 -->
    <div class="w-96 bg-white border-r border-gray-200 flex flex-col">
      <!-- 上方：标题和初始化 -->
      <div class="shrink-0 border-b border-gray-200">
        <div class="p-4">
          <h1 class="text-xl font-bold text-gray-900 mb-3">MCP Client</h1>

          <!-- 状态信息 -->
          <div class="space-y-2 text-sm mb-3">
            <div class="flex items-center justify-between">
              <span class="text-gray-600">状态</span>
              <span
                :class="
                  status.isInitialized ? 'text-green-600' : 'text-red-600'
                "
                class="font-semibold"
              >
                {{ status.isInitialized ? "已就绪" : "未就绪" }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">请求</span>
              <span class="font-semibold text-gray-900">{{
                status.requestCount
              }}</span>
            </div>
          </div>

          <!-- 初始化/重置按钮 -->
          <button
            v-if="!status.isInitialized"
            @click="handleInitialize"
            :disabled="loading"
            class="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            初始化
          </button>
          <button
            v-else
            @click="handleReset"
            :disabled="loading"
            class="w-full px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            重置
          </button>
        </div>

        <!-- 通知区域 -->
        <div
          v-if="loading"
          class="mx-4 mb-4 bg-blue-50 border border-blue-200 rounded p-3"
        >
          <div class="flex items-center">
            <div
              class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"
            ></div>
            <span class="text-blue-700 text-sm">处理中...</span>
          </div>
        </div>

        <div
          v-if="error"
          class="mx-4 mb-4 bg-red-50 border border-red-200 rounded p-3"
        >
          <div class="flex items-center justify-between">
            <p class="text-red-600 text-xs flex-1">{{ error }}</p>
            <button
              @click="error = null"
              class="text-red-500 hover:text-red-700 ml-2"
            >
              <span class="text-lg">×</span>
            </button>
          </div>
        </div>

        <div
          v-if="success"
          class="mx-4 mb-4 bg-green-50 border border-green-200 rounded p-3"
        >
          <div class="flex items-center justify-between">
            <p class="text-green-600 text-xs flex-1">{{ success }}</p>
            <button
              @click="success = null"
              class="text-green-500 hover:text-green-700 ml-2"
            >
              <span class="text-lg">×</span>
            </button>
          </div>
        </div>

        <!-- 工具分类标签 -->
        <div class="px-4 pb-3">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="category in categories"
              :key="category.id"
              @click="activeCategory = category.id"
              :class="[
                'px-3 py-1 rounded-full text-xs transition-colors',
                activeCategory === category.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              ]"
            >
              {{ category.icon }} {{ category.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- 下方：工具列表（有滚动条） -->
      <div class="flex-1 overflow-y-auto">
        <div class="p-4 space-y-3">
          <div
            v-for="tool in currentTools"
            :key="tool.id"
            class="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
          >
            <h3 class="text-sm font-semibold text-gray-900 mb-1">
              {{ tool.name }}
            </h3>
            <p class="text-xs text-gray-600 mb-3">{{ tool.description }}</p>

            <!-- 工具表单 -->
            <component
              :is="getToolComponent(tool.id)"
              :client="client"
              @result="handleResult"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧：JSON 预览 -->
    <div class="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      <div class="shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">执行结果预览</h2>
          <button
            v-if="result"
            @click="result = null"
            class="text-gray-400 hover:text-gray-600"
          >
            <span class="text-xl">×</span>
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-auto">
        <!-- 空状态 -->
        <div v-if="!result" class="h-full flex items-center justify-center">
          <div class="text-center text-gray-400">
            <IconDocument class="mx-auto mb-4 text-gray-300" />
            <p class="text-sm">暂无执行结果</p>
            <p class="text-xs mt-1">执行工具后结果将显示在这里</p>
          </div>
        </div>

        <!-- JSON 格式化显示 -->
        <div v-else class="p-6">
          <!-- 工具列表特殊处理 -->
          <div v-if="isToolsListResult(result)" class="space-y-4">
            <div class="bg-white rounded-lg border border-gray-200 p-4">
              <h3 class="text-sm font-semibold text-gray-900 mb-3">
                可用工具列表
              </h3>
              <div class="space-y-2 max-h-[calc(100vh-250px)] overflow-auto">
                <div
                  v-for="(tool, index) in result._parsedContent?.tools ||
                  result.tools ||
                  []"
                  :key="index"
                  class="border border-gray-200 rounded p-3 hover:bg-gray-50"
                >
                  <div class="flex items-start justify-between mb-2">
                    <h4 class="font-semibold text-sm text-blue-600">
                      {{ tool.name }}
                    </h4>
                    <span
                      class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded"
                      >{{ index + 1 }}</span
                    >
                  </div>
                  <p class="text-xs text-gray-600 mb-2">
                    {{ tool.description }}
                  </p>
                  <details class="text-xs">
                    <summary
                      class="cursor-pointer text-gray-500 hover:text-gray-700"
                    >
                      参数详情
                    </summary>
                    <pre class="mt-2 bg-gray-50 p-2 rounded overflow-auto">{{
                      JSON.stringify(tool.inputSchema, null, 2)
                    }}</pre>
                  </details>
                </div>
              </div>
              <div class="mt-4 text-xs text-gray-500">
                共
                {{
                  (result._parsedContent?.tools || result.tools || []).length
                }}
                个工具
              </div>
            </div>
          </div>

          <!-- 截图特殊处理 -->
          <div v-else-if="isScreenshotResult(result)" class="space-y-4">
            <div class="bg-white rounded-lg border border-gray-200 p-4">
              <h3 class="text-sm font-semibold text-gray-900 mb-3">截图预览</h3>
              <img
                :src="getScreenshotSrc(result)"
                alt="截图"
                class="max-w-full border rounded shadow-sm"
              />
              <div
                v-if="result.width && result.height"
                class="text-xs text-gray-600 mt-2"
              >
                图片尺寸: {{ result.width }} x {{ result.height }}
              </div>
            </div>

            <!-- JSON 数据 -->
            <div class="bg-white rounded-lg border border-gray-200 p-4">
              <h3 class="text-sm font-semibold text-gray-900 mb-3">数据详情</h3>
              <pre
                class="json-highlight text-xs overflow-auto bg-gray-50 p-3 rounded max-h-96"
                v-html="highlightJSON(result)"
              ></pre>
            </div>
          </div>

          <!-- 常规 JSON 显示 -->
          <div v-else class="bg-white rounded-lg border border-gray-200 p-4">
            <h3 class="text-sm font-semibold text-gray-900 mb-3">数据详情</h3>
            <pre
              class="json-highlight text-xs overflow-auto select-text bg-gray-50 p-3 rounded max-h-[calc(100vh-200px)]"
              v-html="highlightJSON(result)"
            ></pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h, type Component } from "vue";
import type { MCPClient } from "workflow-browser-nodes";
import { createMCPClient } from "workflow-browser-nodes";
import IconDocument from "@/icons/IconDocument.vue";

// 创建 MCP 客户端实例
const client = createMCPClient({
  apiUrl: "/api/mcp",
  enableLog: true,
});

// 响应式状态
const loading = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const result = ref<any>(null);
const status = ref(client.getStatus());
const activeCategory = ref("system");

// 工具分类
const categories = [
  { id: "system", name: "系统工具", icon: "⚙️" },
  { id: "browser", name: "浏览器管理", icon: "🌐" },
  { id: "screenshot", name: "截图视觉", icon: "📸" },
  { id: "network", name: "网络监控", icon: "🌐" },
  { id: "content", name: "内容分析", icon: "📄" },
  { id: "interaction", name: "交互操作", icon: "🖱️" },
  { id: "data", name: "数据管理", icon: "💾" },
  { id: "advanced", name: "高级功能", icon: "⚙️" },
];

// 所有工具定义
const toolsConfig = {
  system: [
    {
      id: "listTools",
      name: "获取工具列表",
      description: "获取所有可用的 MCP 工具",
    },
  ],
  browser: [
    {
      id: "getWindowsAndTabs",
      name: "获取窗口标签",
      description: "获取所有打开的窗口和标签页",
    },
    { id: "navigate", name: "导航", description: "导航到指定的 URL" },
    {
      id: "closeTabs",
      name: "关闭标签",
      description: "关闭指定的标签页或窗口",
    },
    {
      id: "goBackOrForward",
      name: "前进后退",
      description: "浏览器历史前进或后退",
    },
  ],
  screenshot: [
    { id: "screenshot", name: "截图", description: "对当前页面进行截图" },
  ],
  network: [
    {
      id: "networkCaptureStart",
      name: "开始网络捕获",
      description: "开始捕获网络请求",
    },
    {
      id: "networkCaptureStop",
      name: "停止网络捕获",
      description: "停止网络捕获并返回数据",
    },
    {
      id: "networkDebuggerStart",
      name: "调试器捕获开始",
      description: "开始调试器网络捕获(含响应体)",
    },
    {
      id: "networkDebuggerStop",
      name: "调试器捕获停止",
      description: "停止调试器网络捕获",
    },
    {
      id: "networkRequest",
      name: "自定义请求",
      description: "发送自定义 HTTP 请求",
    },
  ],
  content: [
    {
      id: "searchTabsContent",
      name: "搜索标签内容",
      description: "跨标签页语义搜索",
    },
    {
      id: "getWebContent",
      name: "获取页面内容",
      description: "获取网页的文本和 HTML 内容",
    },
    {
      id: "getInteractiveElements",
      name: "获取交互元素",
      description: "获取页面上所有可交互元素",
    },
  ],
  interaction: [
    { id: "clickElement", name: "点击元素", description: "点击页面上的元素" },
    {
      id: "fillOrSelect",
      name: "填充表单",
      description: "填充输入框或选择下拉选项",
    },
    { id: "keyboard", name: "键盘输入", description: "模拟键盘按键" },
  ],
  data: [
    {
      id: "searchHistory",
      name: "搜索历史",
      description: "搜索浏览器历史记录",
    },
    { id: "searchBookmarks", name: "搜索书签", description: "搜索浏览器书签" },
    { id: "addBookmark", name: "添加书签", description: "添加新书签" },
    { id: "deleteBookmark", name: "删除书签", description: "删除指定书签" },
  ],
  advanced: [
    {
      id: "injectScript",
      name: "注入脚本",
      description: "向页面注入 JavaScript 代码",
    },
    {
      id: "sendCommandToInjectScript",
      name: "发送命令",
      description: "向注入的脚本发送命令",
    },
    {
      id: "captureConsole",
      name: "捕获控制台",
      description: "捕获浏览器控制台输出",
    },
  ],
};

// 当前分类的工具
const currentTools = computed(() => {
  return toolsConfig[activeCategory.value as keyof typeof toolsConfig] || [];
});

// 更新状态
const updateStatus = () => {
  status.value = client.getStatus();
};

// 初始化
const handleInitialize = async () => {
  loading.value = true;
  error.value = null;
  success.value = null;

  try {
    const initialized = await client.initialize();
    updateStatus();

    if (initialized) {
      success.value = "初始化成功！";
    } else {
      error.value = "初始化失败，请查看控制台";
    }
  } catch (err: any) {
    error.value = err.message || "初始化出错";
  } finally {
    loading.value = false;
  }
};

// 重置
const handleReset = () => {
  client.reset();
  updateStatus();
  error.value = null;
  success.value = null;
  result.value = null;
  success.value = "已重置！";
};

// 处理工具执行结果
const handleResult = (res: {
  success: boolean;
  result?: any;
  error?: any;
  message?: string;
}) => {
  updateStatus();

  if (res.success) {
    success.value = res.message || "执行成功！";
    result.value = res.result;
  } else {
    error.value = res.error?.message || res.message || "执行失败";
  }
};

// 解析 MCP content 中的 JSON 字符串
const parseMCPContent = (data: any): any => {
  // 如果没有 content 字段，直接返回
  if (!data || !data.content || !Array.isArray(data.content)) {
    return data;
  }

  // 尝试解析 content[0].text 中的 JSON
  if (data.content.length > 0 && data.content[0].type === "text") {
    try {
      const parsed = JSON.parse(data.content[0].text);
      // 返回解析后的数据，保留其他字段
      return {
        ...data,
        _parsedContent: parsed, // 添加解析后的内容
        content: data.content, // 保留原始 content
      };
    } catch (e) {
      // 解析失败，返回原始数据
      return data;
    }
  }

  return data;
};

// 判断是否为工具列表结果
const isToolsListResult = (data: any): boolean => {
  // 检查是否包含 tools 数组
  if (data && Array.isArray(data.tools)) {
    return true;
  }

  // 检查解析后的内容
  if (data && data._parsedContent && Array.isArray(data._parsedContent.tools)) {
    return true;
  }

  return false;
};

// 格式化 JSON
const formatJSON = (data: any): string => {
  try {
    // 先尝试解析 MCP content
    const parsed = parseMCPContent(data);

    // 如果有解析后的内容，优先显示解析后的内容
    if (parsed._parsedContent) {
      return JSON.stringify(parsed._parsedContent, null, 2);
    }

    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return String(data);
  }
};

// JSON 语法高亮（GitHub 风格）
const highlightJSON = (data: any): string => {
  try {
    const jsonString = formatJSON(data);

    // 对 JSON 字符串进行语法高亮
    return jsonString.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = "json-number";
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "json-key";
          } else {
            cls = "json-string";
          }
        } else if (/true|false/.test(match)) {
          cls = "json-boolean";
        } else if (/null/.test(match)) {
          cls = "json-null";
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  } catch (e) {
    return String(data);
  }
};

// 获取工具组件
const getToolComponent = (toolId: string): Component => {
  // 返回内联组件
  return {
    props: ["client"],
    emits: ["result"],
    setup(props: any, { emit }: any) {
      const executing = ref(false);
      const formData = ref<Record<string, any>>({});

      const execute = async (params: any = {}) => {
        if (executing.value) return;
        executing.value = true;

        try {
          let res;
          const mcpClient = props.client as MCPClient;

          // 根据不同的工具调用不同的方法
          switch (toolId) {
            case "listTools":
              res = await mcpClient.listTools();
              break;
            case "getWindowsAndTabs":
              res = await mcpClient.getWindowsAndTabs();
              break;
            case "navigate":
              res = await mcpClient.navigate(params.url, params);
              break;
            case "closeTabs":
              // 处理 tabIds 字符串，转换为数组
              const closeParams: any = { ...params };
              if (
                closeParams.tabIds &&
                typeof closeParams.tabIds === "string"
              ) {
                closeParams.tabIds = closeParams.tabIds
                  .split(",")
                  .map((id: string) => parseInt(id.trim()))
                  .filter((id: number) => !isNaN(id));
              }
              res = await mcpClient.closeTabs(closeParams);
              break;
            case "goBackOrForward":
              res = await mcpClient.goBackOrForward(params.isForward);
              break;
            case "screenshot":
              res = await mcpClient.screenshot(params);
              break;
            case "networkCaptureStart":
              res = await mcpClient.networkCaptureStart(params);
              break;
            case "networkCaptureStop":
              res = await mcpClient.networkCaptureStop();
              break;
            case "networkDebuggerStart":
              res = await mcpClient.networkDebuggerStart(params.url);
              break;
            case "networkDebuggerStop":
              res = await mcpClient.networkDebuggerStop();
              break;
            case "networkRequest":
              res = await mcpClient.networkRequest(params.url, params);
              break;
            case "searchTabsContent":
              res = await mcpClient.searchTabsContent(params.query);
              break;
            case "getWebContent":
              res = await mcpClient.getWebContent(params);
              break;
            case "getInteractiveElements":
              res = await mcpClient.getInteractiveElements(params);
              break;
            case "clickElement":
              res = await mcpClient.clickElement(params);
              break;
            case "fillOrSelect":
              res = await mcpClient.fillOrSelect(params.selector, params.value);
              break;
            case "keyboard":
              res = await mcpClient.keyboard(params.keys, params);
              break;
            case "searchHistory":
              res = await mcpClient.searchHistory(params);
              break;
            case "searchBookmarks":
              res = await mcpClient.searchBookmarks(params);
              break;
            case "addBookmark":
              res = await mcpClient.addBookmark(params);
              break;
            case "deleteBookmark":
              res = await mcpClient.deleteBookmark(params);
              break;
            case "injectScript":
              res = await mcpClient.injectScript(
                params.jsScript,
                params.type,
                params.url
              );
              break;
            case "sendCommandToInjectScript":
              res = await mcpClient.sendCommandToInjectScript(
                params.eventName,
                params.payload,
                params.tabId
              );
              break;
            case "captureConsole":
              res = await mcpClient.captureConsole(params);
              break;
            default:
              res = { success: false, error: { message: "未知工具" } };
          }

          emit("result", res);
        } catch (err: any) {
          emit("result", { success: false, error: { message: err.message } });
        } finally {
          executing.value = false;
        }
      };

      // 根据工具 ID 渲染不同的表单
      return () => renderToolForm(toolId, execute, executing.value, formData);
    },
  };
};

// 渲染工具表单
const renderToolForm = (
  toolId: string,
  execute: Function,
  executing: boolean,
  formData: any
) => {
  const createButton = (text: string = "执行") =>
    h(
      "button",
      {
        onClick: () => execute(formData.value),
        disabled: executing || !status.value.isInitialized,
        class:
          "w-full mt-2 px-3 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors",
      },
      executing ? "执行中..." : text
    );

  const createInput = (
    key: string,
    placeholder: string,
    type: string = "text"
  ) =>
    h("input", {
      value: formData.value[key] || "",
      onInput: (e: any) => {
        formData.value[key] = e.target.value;
      },
      placeholder,
      type,
      class:
        "w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500",
    });

  const createSelect = (
    key: string,
    options: { value: string; label: string }[]
  ) =>
    h(
      "select",
      {
        value: formData.value[key] || "",
        onChange: (e: any) => {
          formData.value[key] = e.target.value;
        },
        class:
          "w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500",
      },
      options.map((opt) => h("option", { value: opt.value }, opt.label))
    );

  const createCheckbox = (key: string, label: string) =>
    h("label", { class: "flex items-center space-x-2 text-xs" }, [
      h("input", {
        type: "checkbox",
        checked: formData.value[key] || false,
        onChange: (e: any) => {
          formData.value[key] = e.target.checked;
        },
        class: "rounded",
      }),
      h("span", label),
    ]);

  // 根据不同工具返回不同的表单
  switch (toolId) {
    case "navigate":
      return h("div", { class: "space-y-2" }, [
        createInput("url", "输入 URL（如：https://www.baidu.com）"),
        createCheckbox("newWindow", "在新窗口打开"),
        createCheckbox("waitForLoad", "等待页面加载完成"),
        createButton("导航"),
      ]);

    case "screenshot":
      return h("div", { class: "space-y-2" }, [
        createCheckbox("fullPage", "完整页面截图"),
        createCheckbox("storeBase64", "存储 Base64 数据"),
        createCheckbox("savePng", "保存为 PNG 文件"),
        createButton("截图"),
      ]);

    case "closeTabs":
      return h("div", { class: "space-y-2" }, [
        createInput("tabIds", "标签页 ID（多个用逗号分隔，可选）"),
        createInput("url", "URL（可选）"),
        createButton("关闭"),
      ]);

    case "goBackOrForward":
      return h("div", { class: "space-y-2" }, [
        h("div", { class: "space-y-1" }, [
          h("label", { class: "flex items-center space-x-2 text-xs" }, [
            h("input", {
              type: "radio",
              name: "direction",
              value: "false",
              checked:
                formData.value.isForward === false ||
                !formData.value.hasOwnProperty("isForward"),
              onChange: () => {
                formData.value.isForward = false;
              },
            }),
            h("span", "后退"),
          ]),
          h("label", { class: "flex items-center space-x-2 text-xs" }, [
            h("input", {
              type: "radio",
              name: "direction",
              value: "true",
              checked: formData.value.isForward === true,
              onChange: () => {
                formData.value.isForward = true;
              },
            }),
            h("span", "前进"),
          ]),
        ]),
        createButton("执行"),
      ]);

    case "getWebContent":
      return h("div", { class: "space-y-2" }, [
        createInput("url", "URL（可选，默认当前标签）"),
        createCheckbox("textContent", "获取文本内容"),
        createCheckbox("htmlContent", "获取 HTML 内容"),
        createInput("selector", "CSS 选择器（可选）"),
        createButton("获取"),
      ]);

    case "clickElement":
      return h("div", { class: "space-y-2" }, [
        createInput("selector", "CSS 选择器"),
        createCheckbox("waitForNavigation", "等待页面导航"),
        createInput("timeout", "超时时间（毫秒，默认 5000）", "number"),
        createButton("点击"),
      ]);

    case "fillOrSelect":
      return h("div", { class: "space-y-2" }, [
        createInput("selector", "CSS 选择器"),
        createInput("value", "填充的值"),
        createButton("填充"),
      ]);

    case "keyboard":
      return h("div", { class: "space-y-2" }, [
        createInput("keys", "按键（如：Ctrl+C、Enter）"),
        createInput("selector", "CSS 选择器（可选）"),
        createInput("delay", "按键延迟（毫秒，可选）", "number"),
        createButton("输入"),
      ]);

    case "searchTabsContent":
      return h("div", { class: "space-y-2" }, [
        createInput("query", "搜索关键词"),
        createButton("搜索"),
      ]);

    case "searchHistory":
      return h("div", { class: "space-y-2" }, [
        createInput("text", "搜索文本（可选）"),
        createInput("maxResults", "最大结果数", "number"),
        createButton("搜索"),
      ]);

    case "searchBookmarks":
      return h("div", { class: "space-y-2" }, [
        createInput("query", "搜索关键词（可选）"),
        createButton("搜索"),
      ]);

    case "addBookmark":
      return h("div", { class: "space-y-2" }, [
        createInput("title", "书签标题"),
        createInput("url", "书签 URL"),
        createButton("添加"),
      ]);

    case "deleteBookmark":
      return h("div", { class: "space-y-2" }, [
        createInput("id", "书签 ID"),
        createButton("删除"),
      ]);

    case "networkRequest":
      return h("div", { class: "space-y-2" }, [
        createInput("url", "请求 URL"),
        createSelect("method", [
          { value: "GET", label: "GET" },
          { value: "POST", label: "POST" },
          { value: "PUT", label: "PUT" },
          { value: "DELETE", label: "DELETE" },
        ]),
        createButton("发送"),
      ]);

    case "injectScript":
      return h("div", { class: "space-y-2" }, [
        h("textarea", {
          value: formData.value.jsScript || "",
          onInput: (e: any) => {
            formData.value.jsScript = e.target.value;
          },
          placeholder: "输入 JavaScript 代码",
          rows: 3,
          class:
            "w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500",
        }),
        createSelect("type", [
          { value: "ISOLATED", label: "ISOLATED" },
          { value: "MAIN", label: "MAIN" },
        ]),
        createInput("url", "URL（可选，默认当前标签）"),
        createButton("注入"),
      ]);

    case "sendCommandToInjectScript":
      return h("div", { class: "space-y-2" }, [
        createInput("eventName", "事件名称"),
        createInput("payload", "数据（JSON 字符串）"),
        createInput("tabId", "标签页 ID（可选）", "number"),
        createButton("发送"),
      ]);

    case "captureConsole":
      return h("div", { class: "space-y-2" }, [
        createInput("url", "URL（可选，默认当前标签）"),
        createCheckbox("includeExceptions", "包含异常信息"),
        createInput("maxMessages", "最大消息数（默认 100）", "number"),
        createButton("捕获控制台"),
      ]);

    case "getInteractiveElements":
      return h("div", { class: "space-y-2" }, [
        createInput("textQuery", "文本搜索（可选）"),
        createInput("selector", "CSS 选择器（可选）"),
        createCheckbox("includeCoordinates", "包含坐标信息"),
        createButton("获取"),
      ]);

    case "networkCaptureStart":
      return h("div", { class: "space-y-2" }, [
        createInput("url", "URL（可选，默认当前标签）"),
        createButton("开始"),
      ]);

    case "networkDebuggerStart":
      return h("div", { class: "space-y-2" }, [
        createInput("url", "导航 URL（可选）"),
        createButton("开始"),
      ]);

    // 无参数工具
    default:
      return h("div", [createButton()]);
  }
};

// 判断是否为截图结果
const isScreenshotResult = (data: any): boolean => {
  // 直接检查常见的截图字段
  if (
    data &&
    (data.screenshot ||
      data.screenshotBase64 ||
      data.base64Data ||
      data.base64 ||
      data.screenshotPath ||
      (data.image && typeof data.image === "string"))
  ) {
    return true;
  }

  // 检查 MCP content 格式
  if (data && Array.isArray(data.content) && data.content.length > 0) {
    const firstItem = data.content[0];
    if (firstItem.type === "text" && firstItem.text) {
      // 尝试解析 JSON
      try {
        const parsed = JSON.parse(firstItem.text);
        // 检查解析后的数据是否包含截图字段
        if (
          parsed.base64Data ||
          parsed.screenshot ||
          parsed.screenshotBase64 ||
          parsed.screenshotPath
        ) {
          return true;
        }
      } catch (e) {
        // 如果不是 JSON，检查文本是否包含 base64Data
        return firstItem.text.includes("base64Data");
      }
    }
  }

  return false;
};

// 获取截图的 base64 数据源
const getScreenshotSrc = (data: any): string => {
  let base64Data = "";

  // 直接检查顶层字段
  base64Data =
    data.screenshot ||
    data.screenshotBase64 ||
    data.base64Data ||
    data.base64 ||
    data.image ||
    "";

  // 如果没有直接字段，检查 MCP content 格式
  if (
    !base64Data &&
    data &&
    Array.isArray(data.content) &&
    data.content.length > 0
  ) {
    const firstItem = data.content[0];
    if (firstItem.type === "text" && firstItem.text) {
      try {
        // 尝试解析 JSON
        const parsed = JSON.parse(firstItem.text);
        base64Data =
          parsed.base64Data ||
          parsed.screenshot ||
          parsed.screenshotBase64 ||
          parsed.base64 ||
          parsed.image ||
          "";
      } catch (e) {
        console.error("解析截图数据失败:", e);
      }
    }
  }

  // 如果还是没有数据
  if (!base64Data) {
    console.warn("未找到截图数据");
    return "";
  }

  // 如果已经包含 data:image 前缀，直接返回
  if (base64Data.startsWith("data:image")) {
    return base64Data;
  }

  // 否则添加前缀
  return `data:image/png;base64,${base64Data}`;
};

// 组件挂载时更新状态
onMounted(() => {
  handleInitialize();
  updateStatus();
});
</script>

<style scoped>
/* GitHub 风格的 JSON 语法高亮 */
.json-highlight {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
    "Liberation Mono", monospace;
  line-height: 1.6;
  color: #24292f;
}

/* JSON 键名 - 蓝色 */
.json-highlight :deep(.json-key) {
  color: #0550ae;
  font-weight: 500;
}

/* JSON 字符串值 - 绿色 */
.json-highlight :deep(.json-string) {
  color: #0a3069;
}

/* JSON 数字 - 紫色 */
.json-highlight :deep(.json-number) {
  color: #8250df;
}

/* JSON 布尔值 - 橙色 */
.json-highlight :deep(.json-boolean) {
  color: #cf222e;
  font-weight: 500;
}

/* JSON null - 灰色 */
.json-highlight :deep(.json-null) {
  color: #57606a;
  font-style: italic;
}

/* 暗色模式适配 */
@media (prefers-color-scheme: dark) {
  .json-highlight {
    color: #c9d1d9;
  }

  .json-highlight :deep(.json-key) {
    color: #79c0ff;
  }

  .json-highlight :deep(.json-string) {
    color: #a5d6ff;
  }

  .json-highlight :deep(.json-number) {
    color: #d2a8ff;
  }

  .json-highlight :deep(.json-boolean) {
    color: #ff7b72;
  }

  .json-highlight :deep(.json-null) {
    color: #8b949e;
  }
}
</style>
