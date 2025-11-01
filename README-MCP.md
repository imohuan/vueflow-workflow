# MCP Client 使用文档

## 概述

`MCPClient` 是一个封装了 MCP (Model Context Protocol) 协议的客户端类，用于与 MCP 服务端进行通信。该类提供了简洁的 API 接口，支持工具调用、会话管理等功能。

## 特性

- ✅ 完整的类型支持（TypeScript）
- ✅ 自动会话管理（Session ID）
- ✅ 自动初始化检查
- ✅ 支持 SSE（Server-Sent Events）和 JSON 两种响应格式
- ✅ 详细的日志输出（可配置）
- ✅ 错误处理和状态管理
- ✅ 单例模式支持

## 快速开始

### 1. 基础使用

```typescript
import { createMCPClient } from "@browser-nodes/core";

// 创建客户端实例
const client = createMCPClient({
  apiUrl: "/api/mcp",
  enableLog: true,
});

// 初始化会话
await client.initialize();

// 调用工具
const result = await client.callTool("chrome_navigate", {
  url: "https://www.baidu.com",
});

if (result.success) {
  console.log("成功:", result.result);
} else {
  console.error("失败:", result.error?.message);
}
```

### 2. 在 Vue 组件中使用

```vue
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { createMCPClient } from "@browser-nodes/core";

const client = createMCPClient();
const loading = ref(false);

onMounted(async () => {
  await client.initialize();
});

async function navigate(url: string) {
  loading.value = true;

  const result = await client.callTool("chrome_navigate", { url });

  if (result.success) {
    console.log("导航成功");
  }

  loading.value = false;
}
</script>
```

## API 文档

### 构造函数

```typescript
new MCPClient(config?: MCPClientConfig)
```

#### 配置项

```typescript
interface MCPClientConfig {
  /** API 端点 URL，默认: '/api/mcp' */
  apiUrl?: string;

  /** 协议版本，默认: '2024-11-05' */
  protocolVersion?: string;

  /** 客户端信息 */
  clientInfo?: {
    name: string;
    version: string;
  };

  /** 是否启用日志，默认: true */
  enableLog?: boolean;
}
```

### 核心方法

#### `initialize(): Promise<boolean>`

初始化 MCP 会话。

```typescript
const success = await client.initialize();
```

#### `callTool<T>(toolName: string, args?: Record<string, any>): Promise<MCPResponse<T>>`

调用 MCP 工具。如果未初始化，会自动先初始化。

```typescript
const result = await client.callTool("chrome_navigate", {
  url: "https://www.example.com",
});
```

#### `request<T>(method: string, params?: Record<string, any>): Promise<MCPResponse<T>>`

发送自定义 MCP 请求。

```typescript
const result = await client.request("tools/list");
```

#### `listTools(): Promise<MCPResponse>`

获取可用工具列表。

```typescript
const tools = await client.listTools();
```

### 辅助方法

#### `reset(): void`

重置会话（清除 Session ID 和初始化状态）。

```typescript
client.reset();
```

#### `getStatus(): MCPClientStatus`

获取客户端当前状态。

```typescript
const status = client.getStatus();
console.log(status);
// {
//   sessionId: "xxx",
//   isInitialized: true,
//   requestCount: 5,
//   apiUrl: "/api/mcp"
// }
```

#### `isReady(): boolean`

检查客户端是否已准备好（已初始化且有 Session ID）。

```typescript
if (client.isReady()) {
  // 可以进行操作
}
```

## 常见工具调用

### 浏览器导航

```typescript
await client.callTool("chrome_navigate", {
  url: "https://www.example.com",
  newWindow: false,
});
```

### 截图

```typescript
await client.callTool("chrome_screenshot", {
  fullPage: true,
  storeBase64: true,
  savePng: false,
});
```

### 获取页面内容

```typescript
await client.callTool("chrome_get_web_content", {
  textContent: true,
});
```

### 点击元素

```typescript
await client.callTool("chrome_click_element", {
  selector: "button.submit",
  waitForNavigation: false,
});
```

### 填充表单

```typescript
await client.callTool("chrome_fill_or_select", {
  selector: 'input[name="username"]',
  value: "myusername",
});
```

## 高级用法

### 单例模式

```typescript
class MCPClientManager {
  private static instance: MCPClient | null = null;

  static getInstance(): MCPClient {
    if (!this.instance) {
      this.instance = createMCPClient();
    }
    return this.instance;
  }

  static async ensureInitialized(): Promise<boolean> {
    const client = this.getInstance();
    if (!client.isReady()) {
      return await client.initialize();
    }
    return true;
  }
}

// 使用
const client = MCPClientManager.getInstance();
await MCPClientManager.ensureInitialized();
```

### 错误处理

```typescript
const result = await client.callTool("chrome_navigate", { url: "xxx" });

if (result.success) {
  // 成功处理
  console.log(result.result);
} else {
  // 错误处理
  console.error("错误代码:", result.error?.code);
  console.error("错误信息:", result.error?.message);
}
```

### 禁用日志

```typescript
const client = createMCPClient({
  enableLog: false, // 生产环境建议禁用
});
```

## 响应格式

所有方法返回统一的响应格式：

```typescript
interface MCPResponse<T = any> {
  success: boolean; // 是否成功
  result?: T; // 结果数据（成功时）
  error?: {
    // 错误信息（失败时）
    code: number;
    message: string;
    data?: any;
  };
}
```

## 测试页面

项目提供了一个测试页面，位于 `src/views/MCPTest.vue`，可以用来测试 MCP 客户端的各项功能。

## 注意事项

1. **初始化检查**：`callTool` 方法会自动检查是否初始化，如果未初始化会自动调用 `initialize()`
2. **Session 管理**：Session ID 由服务端返回并自动保存，无需手动管理
3. **请求计数**：每次请求会自动递增请求 ID
4. **日志输出**：默认启用日志，可通过配置关闭
5. **错误处理**：所有方法都返回统一的响应格式，不会抛出异常（除非网络错误）

## 文件结构

```
src/
├── core/
│   ├── mcp-client.ts           # MCPClient 主类
│   ├── mcp-client.example.ts   # 使用示例
│   └── index.ts                # 统一导出
├── typings/
│   └── mcp.d.ts               # 类型定义
└── views/
    └── MCPTest.vue            # 测试页面
```

## 更多示例

请参考 `src/core/mcp-client.example.ts` 文件，其中包含了更多详细的使用示例。
