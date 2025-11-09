/**
 * 节点配置字段生成 Composable
 */
import { computed, type Ref } from "vue";
import type { Node } from "@vue-flow/core";
import type { ConfigField as ConfigFieldType } from "@/v2/typings/config";

/**
 * 节点类型到字段类型的映射
 */
function mapNodeTypeToFieldType(nodeType: string): ConfigFieldType["type"] {
  const typeMap: Record<string, ConfigFieldType["type"]> = {
    string: "input",
    number: "number",
    boolean: "switch",
    array: "json-editor",
    object: "json-editor",
    json: "json-editor",
    any: "textarea",
  };
  return typeMap[nodeType] || "input";
}

export function useNodeConfigFields(selectedNode: Ref<Node | undefined>) {
  /**
   * 节点类型特定配置
   * 根据节点的 inputs 定义动态生成配置字段
   */
  const nodeTypeConfig = computed<ConfigFieldType[]>(() => {
    if (!selectedNode.value) return [];

    // 获取节点的 inputs 配置
    const inputs = selectedNode.value.data?.inputs;
    if (!inputs || !Array.isArray(inputs)) return [];

    // 将 inputs 转换为配置字段
    return inputs.map((input) => {
      // 检查是否有选项
      const hasOptions = !!(input.options && input.options.length > 0);

      const field: ConfigFieldType = {
        key: input.name,
        label: input.description || input.name,
        // 如果有选项，使用 select 类型
        type: hasOptions ? "select" : mapNodeTypeToFieldType(input.type),
        default: input.defaultValue ?? "",
        placeholder: hasOptions
          ? ""
          : input.description
          ? `输入${input.description}...`
          : "",
        description: input.description,
        required: input.required,
        // 如果有选项，添加到字段
        ...(hasOptions && { options: input.options }),
      };

      return field;
    });
  });

  return {
    nodeTypeConfig,
  };
}
