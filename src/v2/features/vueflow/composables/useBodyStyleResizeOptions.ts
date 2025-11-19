import { computed, type ComputedRef } from "vue";

export interface ResizeDefaults {
  minWidth: number;
  minHeight: number;
}

type BodyStyleResolver = () => Record<string, any> | undefined;

function parseSizeValue(value?: string | number): number | undefined {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/**
 * 根据 bodyStyle 中配置的 minWidth/minHeight 动态生成 Resize 组件需要的限制，
 * 如果缺失则回落到组件层传入的默认值，保证两端约束一致。
 */
export function useBodyStyleResizeOptions(
  getBodyStyle: BodyStyleResolver,
  defaults: ResizeDefaults
): ComputedRef<{ minWidth: number; minHeight: number }> {
  return computed(() => {
    const bodyStyle = getBodyStyle() ?? {};

    return {
      minWidth: parseSizeValue(bodyStyle.minWidth) ?? defaults.minWidth,
      minHeight: parseSizeValue(bodyStyle.minHeight) ?? defaults.minHeight,
    };
  });
}
