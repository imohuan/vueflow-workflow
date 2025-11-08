<template>
  <div
    class="split-layout fixed inset-0 bg-black/30 backdrop-blur-sm overflow-hidden"
  >
    <!-- 左上角返回按钮 -->
    <button
      v-if="showBackButton"
      class="absolute left-5 top-0 z-50 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/90 hover:text-white"
      @click="handleBack"
    >
      <svg
        class="h-4 w-4"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M15 19l-7-7 7-7"
        />
      </svg>
      <span>{{ backText }}</span>
    </button>

    <!-- 三栏布局容器 -->
    <div
      class="flex h-full px-10 py-6"
      style="min-width: 0; max-width: 100vw; overflow: hidden"
    >
      <div ref="containerRef" class="flex w-full h-full">
        <!-- 左侧面板 -->
        <div
          ref="leftPanelRef"
          class="overflow-hidden bg-white border-r border-slate-200 my-6 rounded-l-lg shrink-0"
          :style="leftPanelStyle"
        >
          <div class="h-full overflow-auto variable-scroll">
            <slot name="left" />
          </div>
        </div>

        <!-- 中间面板 -->
        <div
          ref="centerPanelRef"
          class="relative flex flex-col h-full shrink-0 shadow-lg z-10"
          :style="centerPanelStyle"
          @mouseenter="showDragHandle = true"
          @mouseleave="showDragHandle = false"
        >
          <!-- 拖拽滑块容器 - 垂直居中 -->
          <div
            :class="[
              'absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 -z-5 transition-opacity duration-200',
              showDragHandle || isDragging ? 'opacity-100' : 'opacity-0',
            ]"
          >
            <!-- 中间滑块 -->
            <div
              ref="dragHandleRef"
              class="group cursor-col-resize flex items-center gap-2 pointer-events-auto"
              @mousedown="startDrag"
            >
              <!-- 左侧箭头 -->
              <div
                :class="[
                  'flex items-center transition-opacity duration-200 opacity-0 group-hover:opacity-100 -translate-y-2 scale-75',
                  isDragging && 'opacity-100',
                ]"
              >
                <IconChevronLeft class="w-4 h-4 text-white" />
              </div>

              <!-- 白色圆角矩形，包含拖拽图标 -->
              <div
                class="bg-white rounded-md px-3 py-1 flex items-center justify-center border border-slate-200"
              >
                <IconDragHandle
                  class="w-14 h-5 scale-110 -translate-y-0.5 text-slate-400"
                />
              </div>

              <!-- 右侧箭头 -->
              <div
                :class="[
                  'flex items-center transition-opacity duration-200 opacity-0 group-hover:opacity-100 -translate-y-2 scale-75',
                  isDragging && 'opacity-100',
                ]"
              >
                <IconChevronRight class="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <div class="w-full h-full rounded-lg overflow-hidden bg-white">
            <!-- 中间面板标题 -->
            <div
              v-if="centerTitle || $slots.centerHeader"
              class="shrink-0 border-b border-slate-200 bg-white px-6 py-3 rounded-t-lg"
            >
              <slot name="centerHeader">
                <h2
                  v-if="centerTitle"
                  class="text-base font-semibold text-slate-900"
                >
                  {{ centerTitle }}
                </h2>
              </slot>
            </div>

            <!-- 中间面板内容 -->
            <div class="flex-1 h-full overflow-auto variable-scroll">
              <slot name="center" />
            </div>
          </div>
        </div>

        <!-- 右侧面板 -->
        <div
          ref="rightPanelRef"
          class="overflow-hidden bg-white border-l border-slate-200 my-6 rounded-r-lg flex-1 min-w-0"
          :style="rightPanelStyle"
        >
          <div class="h-full overflow-auto variable-scroll">
            <slot name="right" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import IconDragHandle from "@/icons/IconDragHandle.vue";
import IconChevronLeft from "@/icons/IconChevronLeft.vue";
import IconChevronRight from "@/icons/IconChevronRight.vue";

interface Props {
  /** 左侧面板宽度（像素或百分比，<=1 表示百分比），默认自动计算居中 */
  leftWidth?: number;
  /** 右侧面板宽度（像素或百分比，<=1 表示百分比），默认自动计算居中 */
  rightWidth?: number;
  /** 中间面板宽度（像素或百分比，<=1 表示百分比） */
  centerWidth?: number;
  /** 左侧面板最低宽度（像素或百分比，<=1 表示百分比） */
  minLeftWidth?: number;
  /** 右侧面板最低宽度（像素或百分比，<=1 表示百分比） */
  minRightWidth?: number;
  /** 中间面板标题 */
  centerTitle?: string;
  /** 是否显示返回按钮 */
  showBackButton?: boolean;
  /** 返回按钮文本 */
  backText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  leftWidth: undefined,
  rightWidth: undefined,
  centerWidth: 400,
  minLeftWidth: 200,
  minRightWidth: 200,
  centerTitle: undefined,
  showBackButton: true,
  backText: "Back to canvas",
});

const emit = defineEmits<{
  (event: "back"): void;
  (event: "resize", data: { leftWidth: number; rightWidth: number }): void;
}>();

const leftPanelRef = ref<HTMLElement>();
const rightPanelRef = ref<HTMLElement>();
const centerPanelRef = ref<HTMLElement>();
const dragHandleRef = ref<HTMLElement>();
const containerRef = ref<HTMLElement>();

// 计算容器的可用宽度（clientWidth 已经减去了 padding）
const getAvailableWidth = (): number => {
  if (!containerRef.value) {
    // 如果容器还没有渲染，使用视口宽度减去 px-10 的 padding (40px * 2 = 80px)
    return window.innerWidth - 80;
  }
  // clientWidth 已经自动减去了 padding，所以直接使用
  return containerRef.value.clientWidth;
};

// 判断是否为百分比值（value <= 1 表示百分比）
const isPercentage = (value: number): boolean => {
  return value <= 1;
};

// 将宽度值转换为像素值（支持百分比和像素）
const toPixels = (value: number, containerWidth: number): number => {
  if (isPercentage(value)) {
    return containerWidth * value;
  }
  return value;
};

// 计算中间面板的实际宽度（像素）
const getCenterWidthPx = (): number => {
  const containerWidth = getAvailableWidth();
  return toPixels(props.centerWidth, containerWidth);
};

// 计算左侧最小宽度的实际像素值
const getMinLeftWidthPx = (): number => {
  const containerWidth = getAvailableWidth();
  const centerWidthPx = getCenterWidthPx();
  const availableWidth = containerWidth - centerWidthPx;
  return toPixels(props.minLeftWidth, availableWidth);
};

// 计算右侧最小宽度的实际像素值
const getMinRightWidthPx = (): number => {
  const containerWidth = getAvailableWidth();
  const centerWidthPx = getCenterWidthPx();
  const availableWidth = containerWidth - centerWidthPx;
  return toPixels(props.minRightWidth, availableWidth);
};

// 计算初始宽度，使中间面板居中
const calculateInitialWidths = (): { left: number; right: number } => {
  const containerWidth = getAvailableWidth();
  const centerWidthPx = getCenterWidthPx();
  const availableWidth = containerWidth - centerWidthPx;

  if (props.leftWidth !== undefined && props.rightWidth !== undefined) {
    // 如果指定了宽度，转换为像素值
    const leftPx = toPixels(props.leftWidth, availableWidth);
    const rightPx = toPixels(props.rightWidth, availableWidth);
    return {
      left: leftPx,
      right: rightPx,
    };
  }

  // 否则计算居中布局
  const minLeftWidthPx = getMinLeftWidthPx();
  const initialWidth = Math.max(minLeftWidthPx, Math.floor(availableWidth / 2));

  return {
    left: initialWidth,
    right: availableWidth - initialWidth,
  };
};

const leftWidth = ref(0);
const rightWidth = ref(0);
const showDragHandle = ref(false);
const maxLeftWidth = ref(0);

// 更新最大宽度
const updateMaxLeftWidth = () => {
  if (!containerRef.value) return;

  // clientWidth 已经减去了 padding，所以直接使用
  const containerContentWidth = containerRef.value.clientWidth;
  const centerWidthPx = getCenterWidthPx();
  const availableWidth = containerContentWidth - centerWidthPx;
  const minLeftWidthPx = getMinLeftWidthPx();
  const minRightWidthPx = getMinRightWidthPx();

  maxLeftWidth.value = Math.max(
    minLeftWidthPx,
    availableWidth - minRightWidthPx
  );
};

// 初始化宽度
const initializeWidths = () => {
  const initial = calculateInitialWidths();
  leftWidth.value = initial.left;
  rightWidth.value = initial.right;
  updateMaxLeftWidth();
};

// 计算面板样式
const leftPanelStyle = computed(() => {
  const minLeftWidthPx = getMinLeftWidthPx();
  // 确保宽度不超过最大值
  const width = Math.max(
    minLeftWidthPx,
    Math.min(leftWidth.value, maxLeftWidth.value)
  );
  return {
    width: `${width}px`,
    minWidth: `${minLeftWidthPx}px`,
    maxWidth: `${maxLeftWidth.value}px`,
  };
});

const centerPanelStyle = computed(() => {
  const centerWidthPx = getCenterWidthPx();
  return {
    width: `${centerWidthPx}px`,
    minWidth: `${centerWidthPx}px`,
    maxWidth: `${centerWidthPx}px`,
  };
});

const rightPanelStyle = computed(() => {
  const minRightWidthPx = getMinRightWidthPx();
  return {
    minWidth: `${minRightWidthPx}px`,
  };
});

const isDragging = ref(false);
let dragStartX = 0;
let dragStartLeftWidth = 0;
let dragStartRightWidth = 0;

const startDrag = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();

  // 更新最大宽度，确保拖拽时限制正确
  updateMaxLeftWidth();

  isDragging.value = true;
  dragStartX = e.clientX;
  dragStartLeftWidth = leftWidth.value;
  dragStartRightWidth = rightWidth.value;

  document.addEventListener("mousemove", handleDrag);
  document.addEventListener("mouseup", stopDrag);
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
};

const handleDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;

  e.preventDefault();
  e.stopPropagation();

  if (!containerRef.value) return;

  const deltaX = e.clientX - dragStartX;
  const containerContentWidth = containerRef.value.clientWidth;
  const centerWidthPx = getCenterWidthPx();
  const maxAvailableWidth = containerContentWidth - centerWidthPx;

  // 计算新宽度
  let newLeftWidth = dragStartLeftWidth + deltaX;
  let newRightWidth = dragStartRightWidth - deltaX;

  // 获取最小宽度（像素值）
  const minLeftWidthPx = getMinLeftWidthPx();
  const minRightWidthPx = getMinRightWidthPx();

  // 限制在最小和最大范围内（使用存储的最大宽度值）
  newLeftWidth = Math.max(
    minLeftWidthPx,
    Math.min(maxLeftWidth.value, newLeftWidth)
  );

  const maxRightWidth = maxAvailableWidth - minLeftWidthPx;
  newRightWidth = Math.max(
    minRightWidthPx,
    Math.min(maxRightWidth, newRightWidth)
  );

  // 确保总宽度不超过可用空间
  const totalWidth = newLeftWidth + newRightWidth;
  if (totalWidth > maxAvailableWidth) {
    // 如果超出，调整右侧宽度
    newRightWidth = maxAvailableWidth - newLeftWidth;
    if (newRightWidth < minRightWidthPx) {
      newRightWidth = minRightWidthPx;
      newLeftWidth = Math.max(
        minLeftWidthPx,
        maxAvailableWidth - newRightWidth
      );
    }
  }

  leftWidth.value = Math.round(newLeftWidth);
  rightWidth.value = Math.round(newRightWidth);

  emit("resize", {
    leftWidth: leftWidth.value,
    rightWidth: rightWidth.value,
  });
};

const stopDrag = (e?: MouseEvent) => {
  if (!isDragging.value) return;

  isDragging.value = false;
  document.removeEventListener("mousemove", handleDrag);
  document.removeEventListener("mouseup", stopDrag);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";

  if (e && centerPanelRef.value) {
    const rect = centerPanelRef.value.getBoundingClientRect();
    const mouseY = e.clientY;
    if (mouseY >= rect.top && mouseY <= rect.top + 50) {
      showDragHandle.value = true;
    }
  }
};

const handleBack = () => {
  emit("back");
};

let resizeHandler: (() => void) | null = null;
let originalOverflow = "";

onMounted(async () => {
  // 防止 body 出现滚动条
  originalOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  // 等待 DOM 渲染完成
  await nextTick();

  // 初始化最大宽度
  updateMaxLeftWidth();

  // 如果 props 中指定了宽度，转换为像素值
  if (props.leftWidth !== undefined && props.rightWidth !== undefined) {
    const containerWidth = getAvailableWidth();
    const centerWidthPx = getCenterWidthPx();
    const availableWidth = containerWidth - centerWidthPx;
    leftWidth.value = toPixels(props.leftWidth, availableWidth);
    rightWidth.value = toPixels(props.rightWidth, availableWidth);
  } else {
    // 否则初始化居中布局
    initializeWidths();
  }

  // 监听窗口大小变化，重新计算宽度
  resizeHandler = () => {
    updateMaxLeftWidth();

    // 如果使用百分比，需要重新计算宽度
    if (props.leftWidth !== undefined && props.rightWidth !== undefined) {
      const containerWidth = getAvailableWidth();
      const centerWidthPx = getCenterWidthPx();
      const availableWidth = containerWidth - centerWidthPx;

      // 如果是百分比，重新计算像素值
      if (isPercentage(props.leftWidth) || isPercentage(props.rightWidth)) {
        leftWidth.value = toPixels(props.leftWidth, availableWidth);
        rightWidth.value = toPixels(props.rightWidth, availableWidth);
      } else {
        // 如果是像素值，检查是否需要调整
        const minLeftWidthPx = getMinLeftWidthPx();
        const minRightWidthPx = getMinRightWidthPx();
        const totalCurrentWidth = leftWidth.value + rightWidth.value;
        if (totalCurrentWidth > availableWidth) {
          const scale = availableWidth / totalCurrentWidth;
          leftWidth.value = Math.max(
            minLeftWidthPx,
            Math.min(maxLeftWidth.value, Math.round(leftWidth.value * scale))
          );
          rightWidth.value = Math.max(
            minRightWidthPx,
            Math.round(rightWidth.value * scale)
          );
        }
      }
    } else {
      // 自动布局模式，检查是否需要调整
      const containerWidth = getAvailableWidth();
      const centerWidthPx = getCenterWidthPx();
      const availableWidth = containerWidth - centerWidthPx;
      const totalCurrentWidth = leftWidth.value + rightWidth.value;

      // 如果当前总宽度超过可用空间，按比例缩小
      const minLeftWidthPx = getMinLeftWidthPx();
      const minRightWidthPx = getMinRightWidthPx();
      if (totalCurrentWidth > availableWidth) {
        const scale = availableWidth / totalCurrentWidth;
        leftWidth.value = Math.max(
          minLeftWidthPx,
          Math.min(maxLeftWidth.value, Math.round(leftWidth.value * scale))
        );
        rightWidth.value = Math.max(
          minRightWidthPx,
          Math.round(rightWidth.value * scale)
        );
      }
    }
  };

  window.addEventListener("resize", resizeHandler);
});

onBeforeUnmount(() => {
  stopDrag();
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
  }
  document.body.style.overflow = originalOverflow;
});
</script>
