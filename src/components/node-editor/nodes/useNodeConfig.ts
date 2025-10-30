import { useNodeEditorStore } from "@/stores/nodeEditor";
import type { NodeData } from "@/typings/nodeEditor";

interface NodeConfigProps {
  id: string;
  data: NodeData;
}

export function useNodeConfig(props: NodeConfigProps) {
  const store = useNodeEditorStore();

  function updateConfig(key: string, value: any) {
    const newConfig = { ...props.data.config, [key]: value };
    store.updateNodeData(props.id, { config: newConfig });
  }

  function formatJsonValue(value: any): string {
    if (value === undefined || value === null) {
      return "";
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  function updateJsonConfig(key: string, event: Event) {
    const target = event.target as HTMLTextAreaElement;
    const value = target.value;

    try {
      const parsed = value ? JSON.parse(value) : null;
      updateConfig(key, parsed);
    } catch (error) {
      // 解析失败时保持原值
      console.warn("JSON 格式错误:", error);
    }
  }

  function isVariableBound(value: unknown): boolean {
    if (typeof value === "string") {
      return /\{\{\s*[^{}]+\s*\}\}/.test(value);
    }
    return false;
  }

  function toggleBoolean(key: string, disabled: boolean) {
    if (disabled) return;
    const current = Boolean(props.data.config?.[key]);
    updateConfig(key, !current);
  }

  return {
    updateConfig,
    formatJsonValue,
    updateJsonConfig,
    isVariableBound,
    toggleBoolean,
  };
}
