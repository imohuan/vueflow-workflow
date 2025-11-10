/**
 * 节点标签工具函数
 */

import type { Node } from "@vue-flow/core";

/**
 * 生成唯一的节点标签
 * 如果标签已存在，则在后面添加数字：名称、名称_1、名称_2...
 * 
 * @param baseName 基础名称
 * @param existingNodes 现有节点列表
 * @param excludeNodeId 要排除的节点ID（用于重命名时排除自己）
 * @returns 唯一的标签名称
 */
export function generateUniqueLabel(
  baseName: string,
  existingNodes: Node[],
  excludeNodeId?: string
): string {
  // 清除输入名称中的所有空格
  const cleanedName = baseName.replace(/\s+/g, "");
  
  // 收集所有已存在的标签（排除指定节点）
  const existingLabels = new Set(
    existingNodes
      .filter((n) => !excludeNodeId || n.id !== excludeNodeId)
      .map((n) => n.data?.label)
      .filter((label): label is string => Boolean(label))
  );

  // 检查清理后的名称是否以数字结尾（例如：名称_1）
  const numberSuffixPattern = /^(.+?)_(\d+)$/;
  const match = cleanedName.match(numberSuffixPattern);
  
  let baseNameWithoutNumber: string;
  let startNumber: number;
  
  if (match) {
    // 名称末尾有数字，提取基础名称和起始数字
    baseNameWithoutNumber = match[1]!;
    startNumber = parseInt(match[2]!, 10);
  } else {
    // 名称末尾没有数字
    baseNameWithoutNumber = cleanedName;
    startNumber = 0;
  }

  // 如果清理后的名称不存在，直接返回
  if (!existingLabels.has(cleanedName)) {
    return cleanedName;
  }

  // 查找所有相同基础名称的标签，找到最大数字
  const escapedBaseName = baseNameWithoutNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escapedBaseName}_?(\\d+)?$`);
  let maxNumber = startNumber;

  existingLabels.forEach((label) => {
    const labelMatch = label.match(pattern);
    if (labelMatch) {
      if (label === baseNameWithoutNumber) {
        // 如果存在纯基础名称，至少从 1 开始
        maxNumber = Math.max(maxNumber, 0);
      } else if (labelMatch[1]) {
        // 提取数字后缀
        const num = parseInt(labelMatch[1], 10);
        maxNumber = Math.max(maxNumber, num);
      }
    }
  });

  // 返回新的唯一名称（使用下划线连接）
  return `${baseNameWithoutNumber}_${maxNumber + 1}`;
}

/**
 * 验证标签是否唯一
 * 
 * @param label 要验证的标签
 * @param existingNodes 现有节点列表
 * @param excludeNodeId 要排除的节点ID（用于重命名时排除自己）
 * @returns 是否唯一
 */
export function isLabelUnique(
  label: string,
  existingNodes: Node[],
  excludeNodeId?: string
): boolean {
  return !existingNodes.some(
    (n) => n.id !== excludeNodeId && n.data?.label === label
  );
}
