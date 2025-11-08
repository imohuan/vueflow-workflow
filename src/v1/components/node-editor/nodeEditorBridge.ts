import type { InjectionKey } from "vue";

export interface NodeEditorBridge {
  checkPortValidity(targetNodeId: string, targetHandleId: string): boolean;
  isConnecting(): boolean;
  updateNodeInternals(id: string): void;
}

export const NODE_EDITOR_BRIDGE_KEY: InjectionKey<NodeEditorBridge> = Symbol(
  "NODE_EDITOR_BRIDGE_KEY"
);

let currentBridge: NodeEditorBridge | null = null;

export function registerNodeEditorBridge(bridge: NodeEditorBridge): void {
  currentBridge = bridge;
}

export function unregisterNodeEditorBridge(): void {
  currentBridge = null;
}

export function getNodeEditorBridge(): NodeEditorBridge | null {
  return currentBridge;
}
