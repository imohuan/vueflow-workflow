<!-- 节点执行结果展示组件 -->
<template>
  <div
    v-if="result"
    class="border-t border-slate-200 p-3 bg-white w-full rounded-b-xl overflow-hidden"
    @wheel="handleWheel"
    @dblclick.stop
  >
    <button
      class="w-full flex items-center justify-between px-2 py-1.5 bg-slate-50 border border-slate-200 rounded cursor-pointer transition-all duration-200 text-xs text-slate-600 hover:bg-slate-100 hover:border-slate-300"
      @click="toggleExpanded"
    >
      <span class="flex items-center gap-2 min-w-0 shrink">
        <IconChevronRight
          :class="expanded ? 'rotate-90' : ''"
          class="shrink-0"
        />
        <span class="truncate">{{ expanded ? "收起结果" : "查看结果" }}</span>
      </span>
      <span
        :class="[
          'px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0',
          result.status === 'success'
            ? 'bg-green-100 text-green-600'
            : 'bg-red-100 text-red-600',
        ]"
      >
        {{ formatDuration(result.duration) }}
      </span>
    </button>

    <Transition name="slide-down">
      <div v-if="expanded" class="mt-2 w-full">
        <!-- 成功结果 -->
        <div
          v-if="result.status === 'success'"
          class="relative p-3 rounded-md text-xs bg-green-50 border border-green-200 w-full space-y-3"
        >
          <button
            class="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-md border border-green-200/80 bg-white/80 text-green-600 hover:bg-white transition"
            title="全屏查看"
            @click.stop="openFullScreen"
          >
            <IconFit class="w-3.5 h-3.5" />
          </button>

          <div class="flex items-center gap-1.5 font-medium text-slate-800">
            <span
              class="flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold bg-green-500 text-white shrink-0"
            >
              ✓
            </span>
            <span>执行成功</span>
          </div>

          <div
            v-if="branchInfo"
            class="flex items-center gap-2 px-2 py-1 rounded-md bg-white border border-green-100 text-[11px] text-green-700"
          >
            <span class="text-green-500 font-semibold">执行分支</span>
            <span class="font-medium">{{ branchInfo.label }}</span>
            <span class="text-green-400">({{ branchInfo.id }})</span>
          </div>

          <div v-if="hasIterations" class="space-y-3">
            <div
              class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-green-100 bg-white px-3 py-2"
            >
              <div class="text-[11px] text-slate-600">
                循环执行: 共 {{ totalIterations }} 次迭代
                <span
                  v-if="iterationSummary.success"
                  class="ml-2 text-green-500"
                  >成功 {{ iterationSummary.success }} 次</span
                >
                <span v-if="iterationSummary.error" class="ml-2 text-red-500"
                  >失败 {{ iterationSummary.error }} 次</span
                >
              </div>
              <div class="flex items-center gap-2 text-[11px]">
                <button
                  class="px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="currentIterationIndex === 0"
                  @click="prevIteration"
                >
                  ◀
                </button>
                <span>
                  第
                  {{ totalIterations === 0 ? 0 : currentIterationIndex + 1 }} /
                  {{ totalIterations }} 次
                </span>
                <button
                  class="px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="currentIterationIndex >= totalIterations - 1"
                  @click="nextIteration"
                >
                  ▶
                </button>
              </div>
            </div>

            <div class="flex flex-wrap gap-1">
              <button
                v-for="(_, idx) in iterationList"
                :key="idx"
                class="px-2 py-0.5 text-[10px] rounded border transition"
                :class="[
                  idx === currentIterationIndex
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'bg-white text-slate-500 border-slate-200',
                  iterationList[idx]?.status === 'error' &&
                  idx !== currentIterationIndex
                    ? 'border-red-300 text-red-500'
                    : '',
                ]"
                @click="gotoIteration(idx)"
              >
                {{ idx + 1 }}
              </button>
            </div>

            <div
              v-if="currentIteration"
              class="space-y-3 rounded-md border border-green-100 bg-white p-3"
            >
              <div
                class="flex items-center justify-between text-[11px] text-slate-500"
              >
                <span
                  >状态：
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                    :class="iterationStatusClass(currentIteration.status)"
                  >
                    {{ formatIterationStatus(currentIteration.status) }}
                  </span>
                </span>
                <span
                  >耗时：{{ formatDuration(currentIteration.duration) }}</span
                >
              </div>

              <div class="space-y-1">
                <div class="text-[11px] font-semibold text-slate-600">
                  迭代变量
                </div>
                <div class="grid gap-2">
                  <div
                    v-for="(value, key) in currentIteration.variables"
                    :key="key"
                    class="rounded border border-slate-200 bg-slate-50 p-2"
                  >
                    <div class="text-[10px] font-semibold text-slate-500">
                      {{ key }}
                    </div>
                    <div class="mt-1">
                      <JsonViewer :data="value" />
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="currentIterationNodes.length > 0" class="space-y-1">
                <div class="text-[11px] font-semibold text-slate-600">
                  容器节点执行结果
                </div>
                <div class="space-y-1.5">
                  <div
                    v-for="node in currentIterationNodes"
                    :key="node.nodeId"
                    class="flex items-center justify-between rounded border border-slate-200 bg-white px-2 py-1"
                  >
                    <span
                      class="text-[11px] font-mono text-slate-500 truncate mr-2"
                    >
                      {{ node.nodeId }}
                    </span>
                    <span class="flex items-center gap-2">
                      <span class="text-[10px] text-slate-400">
                        {{ formatDuration(node.result.duration) }}
                      </span>
                      <span
                        class="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        :class="iterationStatusClass(node.result.status)"
                      >
                        {{ formatIterationStatus(node.result.status) }}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="currentIterationOutput" class="space-y-1">
                <div class="text-[11px] font-semibold text-slate-600">
                  输出结果
                </div>
                <div
                  class="max-h-[220px] overflow-auto rounded border border-slate-200 bg-white p-2"
                >
                  <JsonViewer
                    :data="currentIterationOutput"
                    root-name="output"
                  />
                </div>
              </div>
            </div>
          </div>

          <div v-if="hasOutputs" class="space-y-2">
            <div
              v-for="output in displayOutputList"
              :key="output.id"
              class="bg-white border border-slate-200 rounded-md"
            >
              <div
                class="flex items-center justify-between px-2 py-1.5 border-b border-slate-100"
              >
                <span class="text-[11px] font-semibold text-slate-700">
                  {{ output.label }}
                </span>
                <span
                  class="px-2 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-600 font-medium"
                >
                  {{ output.type }}
                </span>
              </div>
              <div class="max-h-[220px] overflow-auto p-2">
                <JsonViewer :data="output.value" :root-name="output.id" />
              </div>
            </div>
          </div>

          <div
            v-else
            class="bg-white border border-slate-200 rounded-md max-h-[240px] overflow-auto p-2"
          >
            <JsonViewer :data="rawData" root-name="result" />
          </div>

          <div
            v-if="result.data.summary"
            class="text-[11px] text-slate-500 bg-white border border-slate-200 rounded px-2 py-1"
          >
            {{ result.data.summary }}
          </div>
        </div>

        <!-- 错误结果 -->
        <div
          v-else
          class="relative p-3 rounded-md text-xs bg-red-50 border border-red-200 w-full"
        >
          <button
            class="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-md border border-red-200/80 bg-white/80 text-red-600 hover:bg-white transition"
            title="全屏查看"
            @click.stop="openFullScreen"
          >
            <IconFit class="w-3.5 h-3.5" />
          </button>

          <div
            class="flex items-center gap-1.5 mb-2 font-medium text-slate-800"
          >
            <span
              class="flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold bg-red-500 text-white shrink-0"
            >
              ✗
            </span>
            <span>执行失败</span>
          </div>
          <p
            class="m-0 p-2 bg-white border border-red-200 rounded text-red-900 leading-relaxed break-all max-w-full overflow-auto"
          >
            {{ result.error }}
          </p>
        </div>

        <div
          class="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600"
        >
          <span>{{ formatTimestamp(result.timestamp) }}</span>
        </div>
      </div>
    </Transition>
  </div>

  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showFullScreen && result"
        class="fixed inset-0 z-999 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
        @click.self="closeFullScreen"
      >
        <div
          class="w-[92vw] max-w-5xl h-[85vh] bg-white rounded-md shadow-2xl overflow-hidden flex flex-col"
        >
          <div
            class="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200"
          >
            <div class="text-sm font-semibold text-slate-700">执行结果预览</div>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-slate-500 hover:text-slate-700 border border-slate-200/80 shadow-sm"
              title="关闭"
              @click="closeFullScreen"
            >
              ×
            </button>
          </div>
          <div
            class="flex items-center justify-between px-5 py-2 bg-slate-50 border-b border-slate-200"
          >
            <div class="flex items-center gap-3 text-xs text-slate-500">
              <span
                >状态: {{ result.status === "success" ? "成功" : "失败" }}</span
              >
              <span v-if="result.duration"
                >耗时: {{ formatDuration(result.duration) }}</span
              >
              <span>时间: {{ formatTimestamp(result.timestamp) }}</span>
            </div>
            <div class="flex items-center gap-2 text-[11px]">
              <button
                class="px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800 transition"
                @click="expandFirst"
              >
                展开首项
              </button>
              <button
                class="px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800 transition"
                @click="expandAll"
              >
                全部展开
              </button>
              <button
                class="px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800 transition"
                @click="collapseAll"
              >
                全部折叠
              </button>
            </div>
          </div>
          <div class="flex-1 overflow-auto bg-white p-5">
            <JsonViewer
              :data="fullScreenData"
              root-name="result"
              :expand-mode="viewerExpandMode"
              :expand-trigger="viewerExpandTrigger"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from "vue";
import type { NodeResult, NodeResultOutput } from "@/typings/nodeEditor";
import IconChevronRight from "@/icons/IconChevronRight.vue";
import JsonViewer from "@/components/common/JsonViewer.vue";
import IconFit from "@/icons/IconFit.vue";

interface Props {
  result?: NodeResult;
  expanded?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  expanded: false,
});

const emit = defineEmits<{
  toggle: [value: boolean];
}>();

const expanded = ref(props.expanded);
const iterationList = computed(() => props.result?.iterations ?? []);
const hasIterations = computed(() => iterationList.value.length > 0);
const totalIterations = computed(() => iterationList.value.length);
const currentIterationIndex = ref(0);

const outputList = computed<NodeResultOutput[]>(() => {
  const outputs = props.result?.data?.outputs;
  if (!outputs) return [];
  return Object.values(outputs).filter(
    (output) => output && output.value !== undefined
  );
});

const displayOutputList = computed(() => {
  if (!hasIterations.value) {
    return outputList.value;
  }
  return outputList.value.filter((output) => output.id !== "loop");
});

const hasOutputs = computed(() => displayOutputList.value.length > 0);
const rawData = computed(() => props.result?.data?.raw);
const fullScreenData = computed(() => {
  if (!props.result) return null;
  return {
    status: props.result.status,
    duration: props.result.duration,
    timestamp: props.result.timestamp,
    error: props.result.error,
    data: props.result.data,
    iterations: props.result.iterations,
  };
});
const showFullScreen = ref(false);
const viewerExpandMode = ref<"none" | "first" | "all">("none");
const viewerExpandTrigger = ref(0);

const branchInfo = computed(() => {
  const result = props.result;
  if (!result) return null;

  const raw = result.data?.raw;
  let branchId: string | null = null;
  if (raw && typeof raw === "object" && raw !== null) {
    const candidate = (raw as Record<string, unknown>).branch;
    if (typeof candidate === "string" && candidate.trim()) {
      branchId = candidate;
    }
  }

  if (!branchId) {
    const activeOutput = displayOutputList.value.find(
      (output) => output?.value && typeof output.value === "object"
    );
    if (activeOutput) {
      branchId = activeOutput.id;
    }
  }

  if (!branchId) {
    return null;
  }

  const outputs = result.data?.outputs ?? {};
  const matched = outputs[branchId];

  return {
    id: branchId,
    label: matched?.label || branchId,
  };
});

const currentIteration = computed(() => {
  if (!hasIterations.value) return null;
  return iterationList.value[currentIterationIndex.value] ?? null;
});

const currentIterationNodes = computed(() => {
  if (!currentIteration.value) {
    return [] as Array<{ nodeId: string; result: NodeResult }>;
  }
  const nodeResults = currentIteration.value.nodeResults ?? {};
  return Object.entries(nodeResults).map(([nodeId, result]) => ({
    nodeId,
    result,
  }));
});

const currentIterationOutput = computed(() => {
  if (!currentIteration.value) return null;
  const nodeResults = currentIteration.value.nodeResults ?? {};
  const results = Object.values(nodeResults);
  if (results.length === 0) {
    return null;
  }
  const last = results[results.length - 1];
  return last?.data ?? null;
});

const iterationSummary = computed(() => {
  if (!hasIterations.value) {
    return { success: 0, error: 0 };
  }
  const success = iterationList.value.filter(
    (item) => item.status === "success"
  ).length;
  const error = iterationList.value.filter(
    (item) => item.status === "error"
  ).length;
  return { success, error };
});

watch(
  () => props.expanded,
  (value) => {
    expanded.value = value;
  }
);

watch(
  () => props.result?.iterations,
  () => {
    currentIterationIndex.value = 0;
  }
);

watch(totalIterations, (count) => {
  if (count === 0) {
    currentIterationIndex.value = 0;
    return;
  }
  if (currentIterationIndex.value > count - 1) {
    currentIterationIndex.value = count - 1;
  }
});

function toggleExpanded() {
  expanded.value = !expanded.value;
  emit("toggle", expanded.value);
}

function openFullScreen() {
  showFullScreen.value = true;
  nextTick(() => {
    expandFirst();
  });
}

function closeFullScreen() {
  showFullScreen.value = false;
  viewerExpandMode.value = "none";
}

function triggerViewerExpand(mode: "none" | "first" | "all") {
  viewerExpandMode.value = mode;
  viewerExpandTrigger.value++;
}

function expandFirst() {
  triggerViewerExpand("first");
}

function expandAll() {
  triggerViewerExpand("all");
}

function collapseAll() {
  triggerViewerExpand("none");
}

function prevIteration() {
  if (currentIterationIndex.value > 0) {
    currentIterationIndex.value -= 1;
  }
}

function nextIteration() {
  if (currentIterationIndex.value < totalIterations.value - 1) {
    currentIterationIndex.value += 1;
  }
}

function gotoIteration(index: number) {
  if (index >= 0 && index < totalIterations.value) {
    currentIterationIndex.value = index;
  }
}

function formatIterationStatus(status: string): string {
  return status === "success" ? "成功" : status === "error" ? "失败" : status;
}

function iterationStatusClass(status: string): string {
  if (status === "success") {
    return "bg-green-100 text-green-600";
  }
  if (status === "error") {
    return "bg-red-100 text-red-600";
  }
  return "bg-slate-100 text-slate-500";
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN");
}

/**
 * 处理滚轮事件，防止滚动内容时缩放画布
 */
function handleWheel(event: WheelEvent) {
  const path = event.composedPath() as HTMLElement[];

  for (const element of path) {
    if (!(element instanceof HTMLElement)) continue;

    const { scrollTop, scrollHeight, clientHeight, scrollWidth, clientWidth } =
      element;

    const hasVerticalScroll = scrollHeight > clientHeight;
    const hasHorizontalScroll = scrollWidth > clientWidth;

    if (!hasVerticalScroll && !hasHorizontalScroll) continue;

    const isScrollingDown = event.deltaY > 0;
    const isScrollingUp = event.deltaY < 0;
    const canScrollDown =
      hasVerticalScroll && scrollTop < scrollHeight - clientHeight - 1;
    const canScrollUp = hasVerticalScroll && scrollTop > 1;

    if ((isScrollingDown && canScrollDown) || (isScrollingUp && canScrollUp)) {
      event.stopPropagation();
      return;
    }
  }
}
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
  max-height: 500px;
  opacity: 1;
}

/* 确保 pre 不会撑开容器 */
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  word-break: break-all;
  overflow-wrap: break-word;
}

/* 滚动条样式 */
pre::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

pre::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

pre::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

pre::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
