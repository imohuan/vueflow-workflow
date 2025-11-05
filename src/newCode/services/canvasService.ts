import { reactive, shallowRef } from "vue";

export interface CanvasViewport {
  zoom: number;
  x: number;
  y: number;
}

export interface CanvasService {
  viewport: CanvasViewport;
  isMiniMapVisible: boolean;
  setViewport: (value: Partial<CanvasViewport>) => void;
  toggleMiniMap: () => void;
  registerCleanup: (cb: () => void) => void;
  dispose: () => void;
}

const cleanupHandlers = shallowRef<Set<() => void>>(new Set());

const viewportState = reactive<CanvasViewport>({
  zoom: 1,
  x: 0,
  y: 0,
});

const serviceState = reactive({
  isMiniMapVisible: true,
});

function setViewport(value: Partial<CanvasViewport>) {
  Object.assign(viewportState, value);
}

function toggleMiniMap() {
  serviceState.isMiniMapVisible = !serviceState.isMiniMapVisible;
}

function registerCleanup(cb: () => void) {
  cleanupHandlers.value.add(cb);
}

function dispose() {
  cleanupHandlers.value.forEach((fn) => fn());
  cleanupHandlers.value.clear();
}

const canvasService: CanvasService = {
  get viewport() {
    return viewportState;
  },
  get isMiniMapVisible() {
    return serviceState.isMiniMapVisible;
  },
  setViewport,
  toggleMiniMap,
  registerCleanup,
  dispose,
};

export function useCanvasService(): CanvasService {
  return canvasService;
}

