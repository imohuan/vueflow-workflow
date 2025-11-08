import type { Ref } from "vue";

export interface CtrlConnectCandidateState {
  nodeId: string;
  handleId: string | null;
  handleType: "source" | "target";
  /** 吸附时用于预览连接线终点的画布坐标 */
  position: { x: number; y: number } | null;
  /** 该节点是否可作为当前连接的有效目标 */
  isValid: boolean;
}

export interface CtrlConnectContextValue {
  active: Ref<boolean>;
  candidate: Ref<CtrlConnectCandidateState | null>;
}

export const CTRL_CONNECT_CONTEXT_KEY = Symbol("CTRL_CONNECT_CONTEXT_KEY");
