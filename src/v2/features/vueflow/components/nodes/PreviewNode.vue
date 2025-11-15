<template>
  <div
    ref="nodeRef"
    :style="nodeStyle"
    class="relative bg-slate-50 border-2 border-indigo-200 rounded-lg shadow-sm flex flex-col items-center justify-center"
    :class="{
      'border-indigo-500 shadow-md': selected,
      'bg-indigo-50': isLoading,
      'bg-red-50 border-red-300': hasError,
      'transition-all duration-200': !isResizing,
    }"
  >
    <!-- 输入端口 -->
    <PortHandle
      id="input"
      type="target"
      :position="Position.Left"
      :node-id="id"
      variant="ellipse"
      class="absolute left-0 top-1/2 -translate-y-1/2"
    />

    <!-- 执行状态徽章 -->
    <NodeExecutionBadge :node-id="id" />

    <!-- 加载状态 -->
    <div
      v-if="isLoading"
      class="flex flex-col items-center justify-center gap-3 p-5"
    >
      <div
        class="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"
      ></div>
      <span class="text-sm text-indigo-600">加载中...</span>
    </div>

    <!-- 错误状态 -->
    <div
      v-else-if="hasError"
      class="flex flex-col items-center justify-center gap-2 p-5 w-full h-full text-center"
    >
      <div class="text-3xl">⚠️</div>
      <div class="text-xs text-red-600 leading-relaxed">{{ errorMessage }}</div>
    </div>

    <div class="w-full h-full rounded-lg overflow-hidden">
      <!-- 图片显示 -->
      <img
        v-if="imageUrl && isImage"
        :src="imageUrl"
        :alt="imageAlt"
        class="w-full h-full object-contain"
        @load="handleImageLoad"
        @error="handleImageError"
      />

      <!-- 视频显示 -->
      <video
        v-else-if="imageUrl && isVideo"
        class="w-full h-full object-contain bg-black"
        controls
        @loadedmetadata="handleVideoLoad"
        @error="handleVideoError"
      >
        <source :src="imageUrl" />
        您的浏览器不支持视频播放
      </video>

      <!-- 空状态 -->
      <div
        v-else
        class="flex flex-col items-center justify-center gap-2 p-5 w-full h-full text-center"
      >
        <div class="text-4xl opacity-60">🖼️</div>
        <div class="text-xs text-gray-400 leading-relaxed">等待媒体 URL</div>
      </div>
    </div>

    <!-- 右下角调整大小手柄 -->
    <ResizeHandle
      ref="resizeHandleRef"
      :node-data="props.data"
      :resize-options="{
        initialWidth: 300,
        initialHeight: 200,
        minWidth: 200,
        minHeight: 150,
      }"
      :selected="selected"
      @update:node-style="handleNodeStyleUpdate"
      @update:is-resizing="handleIsResizingUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type Ref, onMounted, watch } from "vue";
import { type NodeProps, Position } from "@vue-flow/core";
import { useCanvasStore } from "@/v2/stores/canvas";
import { NodeExecutionBadge } from "../widgets";
import PortHandle from "../ports/PortHandle.vue";
import ResizeHandle from "../widgets/ResizeHandle.vue";

interface ImagePreviewNodeData {
  imageUrl?: string;
  baseUrl?: string;
  width?: number;
  height?: number;
  imageInfo?: {
    width?: number;
    height?: number;
    url?: string;
    type?: string;
  };
}

type Props = NodeProps<ImagePreviewNodeData>;

const props = defineProps<Props>();

// 获取 stores
const canvasStore = useCanvasStore();

// 状态
const isLoading = ref(false);
const hasError = ref(false);
const errorMessage = ref("");
const mediaType = ref<"image" | "video" | "unknown">("unknown");

// 从执行结果中获取 imageUrl 和 imageInfo（响应式）
const imageUrl = computed(() => {
  const executionStatus = canvasStore.getNodeExecutionStatus(props.id);
  if (executionStatus?.result?.imageUrl) {
    return executionStatus.result.imageUrl;
  }
  return props.data.imageUrl || "";
});

const imageInfo = computed(() => {
  const executionStatus = canvasStore.getNodeExecutionStatus(props.id);
  if (executionStatus?.result?.imageInfo) {
    return executionStatus.result.imageInfo;
  }
  return props.data.imageInfo;
});

// 检测媒体类型（通过扩展名）
function detectMediaTypeByExtension(
  url: string
): "image" | "video" | "unknown" {
  const urlLower = url.toLowerCase();

  // 检查 data URL
  if (urlLower.startsWith("data:image/")) return "image";
  if (urlLower.startsWith("data:video/")) return "video";

  // 检查文件扩展名
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg|ico|tiff)($|\?)/i;
  const videoExtensions =
    /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|m3u8|ts|mts|m2ts|mxf)($|\?)/i;

  if (imageExtensions.test(urlLower)) return "image";
  if (videoExtensions.test(urlLower)) return "video";

  return "unknown";
}

// 通过 HTTP HEAD 请求检测媒体类型
async function detectMediaTypeByContentType(
  url: string
): Promise<"image" | "video" | "unknown"> {
  try {
    // 尝试 HEAD 请求（不发送 body）
    const response = await fetch(url, {
      method: "HEAD",
      mode: "cors",
      credentials: "omit",
    });

    const contentType =
      response.headers.get("content-type")?.toLowerCase() || "";

    if (contentType.startsWith("image/")) return "image";
    if (contentType.startsWith("video/")) return "video";

    return "unknown";
  } catch (error) {
    console.warn("[PreviewNode] HEAD 请求失败，尝试 GET 请求:", error);

    // HEAD 请求失败时，尝试 GET 请求但只获取部分内容
    try {
      const response = await fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        headers: {
          Range: "bytes=0-1", // 只获取前 1 字节
        },
      });

      const contentType =
        response.headers.get("content-type")?.toLowerCase() || "";

      if (contentType.startsWith("image/")) return "image";
      if (contentType.startsWith("video/")) return "video";

      return "unknown";
    } catch (getError) {
      console.warn("[PreviewNode] GET 请求也失败，无法检测媒体类型:", getError);
      return "unknown";
    }
  }
}

// 媒体类型检测
const isImage = computed(() => {
  return mediaType.value === "image";
});

const isVideo = computed(() => {
  return mediaType.value === "video";
});

// 元素引用
const nodeRef: Ref<HTMLElement | null> = ref(null);
const resizeHandleRef = ref<InstanceType<typeof ResizeHandle> | null>(null);

// 节点样式状态（由 ResizeHandle 内部管理，通过事件同步）
const nodeStyleState = ref<{ width: string; height: string }>({
  width: `${props.data.width || 300}px`,
  height: `${props.data.height || 200}px`,
});

const isResizingState = ref(false);

// 计算样式（合并状态）
const nodeStyle = computed(() => nodeStyleState.value);

// 计算 isResizing
const isResizing = computed(() => isResizingState.value);

// 处理 nodeStyle 更新（通过事件同步）
function handleNodeStyleUpdate(style: { width: string; height: string }) {
  nodeStyleState.value = style;
}

// 处理 isResizing 更新
function handleIsResizingUpdate(value: boolean) {
  isResizingState.value = value;
}

// 媒体 alt 文本
const imageAlt = computed(() => {
  if (imageInfo.value?.width && imageInfo.value?.height) {
    return `${imageInfo.value.width}×${imageInfo.value.height}`;
  }
  return isVideo.value ? "预览视频" : "预览图片";
});

// 通过尝试加载来检测媒体类型（备用方案）
async function detectMediaTypeByLoading(
  url: string
): Promise<"image" | "video" | "unknown"> {
  return new Promise((resolve) => {
    // 尝试作为图片加载
    const img = new Image();
    const video = document.createElement("video");
    let resolved = false;

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
      video.onloadedmetadata = null;
      video.onerror = null;
    };

    const resolve_once = (type: "image" | "video" | "unknown") => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(type);
      }
    };

    // 设置超时（5秒）
    const timeout = setTimeout(() => {
      resolve_once("unknown");
    }, 5000);

    // 尝试加载为图片
    img.onload = () => {
      clearTimeout(timeout);
      resolve_once("image");
    };

    img.onerror = () => {
      // 图片加载失败，尝试作为视频
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve_once("video");
      };

      video.onerror = () => {
        clearTimeout(timeout);
        resolve_once("unknown");
      };

      video.src = url;
    };

    img.src = url;
  });
}

// 自动检测媒体类型
async function autoDetectMediaType(url: string) {
  if (!url) {
    mediaType.value = "unknown";
    return;
  }

  // 首先尝试通过扩展名检测
  const extensionType = detectMediaTypeByExtension(url);
  if (extensionType !== "unknown") {
    mediaType.value = extensionType;
    return;
  }

  // 如果扩展名检测失败，尝试通过 Content-Type 检测
  isLoading.value = true;
  const contentType = await detectMediaTypeByContentType(url);

  if (contentType !== "unknown") {
    mediaType.value = contentType;
    isLoading.value = false;
    return;
  }

  // 如果 HTTP 检测也失败，尝试通过加载来检测（备用方案）
  console.warn("[PreviewNode] HTTP 检测失败，尝试加载检测:", url);
  const loadingType = await detectMediaTypeByLoading(url);
  mediaType.value = loadingType;
  isLoading.value = false;
}

// 监听 imageUrl 变化，自动检测媒体类型
watch(imageUrl, (newUrl) => {
  if (newUrl) {
    hasError.value = false;
    errorMessage.value = "";
    autoDetectMediaType(newUrl);
  }
});

// ResizeHandle 内部已经处理了尺寸同步，不需要额外的 watch

// 初始化媒体类型检测
onMounted(() => {
  if (imageUrl.value) {
    autoDetectMediaType(imageUrl.value);
  }
});

// ResizeHandle 内部已经处理了鼠标移动和尺寸更新，不需要 watchEffect

// 处理图片加载成功
function handleImageLoad(event: Event) {
  isLoading.value = false;
  hasError.value = false;
  const img = event.target as HTMLImageElement;
  if (props.data) {
    if (!props.data.imageInfo) {
      props.data.imageInfo = {};
    }
    props.data.imageInfo.width = img.naturalWidth;
    props.data.imageInfo.height = img.naturalHeight;
  }
}

// 处理图片加载失败
function handleImageError() {
  isLoading.value = false;
  hasError.value = true;
  errorMessage.value = "图片加载失败";
}

// 处理视频加载成功
function handleVideoLoad(event: Event) {
  isLoading.value = false;
  hasError.value = false;
  const video = event.target as HTMLVideoElement;
  if (props.data) {
    if (!props.data.imageInfo) {
      props.data.imageInfo = {};
    }
    props.data.imageInfo.width = video.videoWidth;
    props.data.imageInfo.height = video.videoHeight;
  }
}

// 处理视频加载失败
function handleVideoError() {
  isLoading.value = false;
  hasError.value = true;
  errorMessage.value = "视频加载失败";
}
</script>
