/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  GlobalContext,
  WorkflowContextApi,
  ConfigContextApi,
} from "./types";

/**
 * 通用的后端调用函数
 * @param channel 事件通道，例如 'workflow:get'
 * @param args 参数
 */
async function invoke<T>(channel: string, ...args: any[]): Promise<T> {
  // 这里的实现假设全局有一个通用的 HTTP 调用函数，或者直接使用 fetch
  // 这部分逻辑与 cache-handler-client.ts 类似
  const response = await fetch("/api/invoke", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel, args }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `HTTP error for channel ${channel}: ${response.status} ${errorText}`
    );
  }

  const result = await response.json();
  if (result.success) {
    return result.value;
  } else {
    throw new Error(result.error || "Unknown error from server");
  }
}

// --- Workflow API Implementation ---
const createWorkflowApi = (): WorkflowContextApi => ({
  getList: () => invoke("workflow:getList"),
  get: (id) => invoke("workflow:get", id),
  create: (data) => invoke("workflow:create", data),
  save: (workflow) => invoke("workflow:save", workflow),
  delete: (id) => invoke("workflow:delete", id),
});

// --- Config API Implementation ---
const createConfigApi = (): ConfigContextApi => ({
  get: (key) => invoke("config:get", key),
  set: (key, value) => invoke("config:set", key, value),
  delete: (key) => invoke("config:delete", key),
  list: () => invoke("config:list"),
});

/**
 * Creates a GlobalContext that operates over HTTP.
 */
export function createHttpContext(): GlobalContext {
  return {
    workflow: createWorkflowApi(),
    config: createConfigApi(),
  };
}
