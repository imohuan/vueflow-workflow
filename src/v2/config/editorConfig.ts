import type { ConfigSchema } from "../typings/config";
import IconSettings from "@/icons/IconSettings.vue";
import IconCode from "@/icons/IconCode.vue";
import IconServer from "@/icons/IconServer.vue";

/**
 * 编辑器配置 Schema
 * 用于演示配置系统的使用
 */
export const editorConfigSchema: ConfigSchema = {
  sections: [
    {
      id: "general",
      title: "常规设置",
      description: "编辑器基础配置",
      icon: IconSettings,
      fields: [
        {
          key: "theme",
          label: "主题",
          type: "select",
          default: "light",
          description: "选择编辑器主题",
          options: [
            { label: "亮色", value: "light" },
            { label: "暗色", value: "dark" },
            { label: "自动", value: "auto" },
          ],
        },
        {
          key: "autoSave",
          label: "自动保存",
          type: "switch",
          default: true,
          description: "自动保存工作流更改",
        },
        {
          key: "gridSize",
          label: "网格大小",
          type: "number",
          default: 20,
          description: "画布网格尺寸（像素）",
          validation: [
            { type: "min", value: 10 },
            { type: "max", value: 50 },
          ],
        },
        {
          key: "snapToGrid",
          label: "对齐到网格",
          type: "switch",
          default: true,
          description: "拖拽节点时自动对齐到网格",
        },
        {
          key: "language",
          label: "界面语言",
          type: "select",
          default: "zh-CN",
          options: [
            { label: "简体中文", value: "zh-CN" },
            { label: "English", value: "en-US" },
          ],
        },
      ],
    },
    {
      id: "execution",
      title: "执行设置",
      description: "工作流执行相关配置",
      icon: IconCode,
      fields: [
        {
          key: "executionMode",
          label: "执行模式",
          type: "radio",
          default: "worker",
          description: "选择工作流执行环境",
          options: [
            { label: "Worker 模式（浏览器内）", value: "worker" },
            { label: "Server 模式（远程服务器）", value: "server" },
          ],
        },
        {
          key: "maxConcurrentNodes",
          label: "最大并发节点数",
          type: "number",
          default: 5,
          description: "同时执行的最大节点数量",
          validation: [
            { type: "min", value: 1 },
            { type: "max", value: 20 },
          ],
        },
        {
          key: "defaultTimeout",
          label: "默认超时时间（秒）",
          type: "number",
          default: 30,
          description: "节点执行的默认超时时间",
          validation: [
            { type: "min", value: 5 },
            { type: "max", value: 300 },
          ],
        },
        {
          key: "retryOnError",
          label: "错误重试",
          type: "switch",
          default: false,
          description: "节点执行失败时自动重试",
        },
        {
          key: "maxRetries",
          label: "最大重试次数",
          type: "number",
          default: 3,
          description: "节点失败后的最大重试次数",
          validation: [
            { type: "min", value: 1 },
            { type: "max", value: 10 },
          ],
        },
      ],
    },
    {
      id: "server",
      title: "Server 配置",
      description: "远程服务器相关配置",
      icon: IconServer,
      fields: [
        {
          key: "serverUrl",
          label: "Server 地址",
          type: "input",
          default: "http://localhost:3000",
          placeholder: "输入服务器地址",
          description: "远程执行服务器的 URL",
          validation: [{ type: "url" }],
        },
        {
          key: "apiKey",
          label: "API Key",
          type: "input",
          default: "",
          placeholder: "输入 API Key（可选）",
          description: "用于身份验证的 API 密钥",
        },
        {
          key: "useSSL",
          label: "使用 SSL",
          type: "switch",
          default: true,
          description: "使用安全连接（HTTPS）",
        },
      ],
    },
    {
      id: "advanced",
      title: "高级设置",
      description: "高级功能和调试选项",
      icon: IconCode,
      fields: [
        {
          key: "enableDebugMode",
          label: "调试模式",
          type: "switch",
          default: false,
          description: "启用详细的调试日志",
        },
        {
          key: "logLevel",
          label: "日志级别",
          type: "select",
          default: "info",
          options: [
            { label: "Debug", value: "debug" },
            { label: "Info", value: "info" },
            { label: "Warning", value: "warning" },
            { label: "Error", value: "error" },
          ],
        },
        {
          key: "enableAnalytics",
          label: "启用数据分析",
          type: "switch",
          default: true,
          description: "帮助我们改进产品",
        },
        {
          key: "customConfig",
          label: "自定义配置",
          type: "json-editor",
          default: {},
          placeholder: '{"key": "value"}',
          description: "JSON 格式的自定义配置",
        },
      ],
    },
  ],
} as const;

