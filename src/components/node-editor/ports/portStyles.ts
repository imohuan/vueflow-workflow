export const PORT_STYLE = {
  ellipse: "node-port--ellipse",
  circle: "node-port--circle",
} as const;

export type PortStyleKey = keyof typeof PORT_STYLE;

export function getPortStyle(key: PortStyleKey): string {
  return PORT_STYLE[key];
}
