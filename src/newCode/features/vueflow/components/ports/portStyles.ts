/**
 * 端口样式类型定义
 */
export const PORT_STYLE = {
  ellipse: "node-port--ellipse",
  circle: "node-port--circle",
} as const;

export type PortStyleKey = keyof typeof PORT_STYLE;

/**
 * 获取端口样式类名
 */
export function getPortStyle(key: PortStyleKey): string {
  return PORT_STYLE[key];
}
