<template>
  <Transition name="fade">
    <div v-if="visible" class="absolute z-50" :style="wrapperStyle">
      <div
        ref="menuRef"
        class="w-72 bg-white border border-slate-200 rounded-xl shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
      >
        <div class="p-3 border-b border-slate-100">
          <InputText
            v-model="searchQuery"
            placeholder="搜索节点..."
            class="h-9 text-sm"
            autofocus
          />
        </div>
        <div class="max-h-72 overflow-y-auto variable-scroll">
          <template v-if="filteredNodes.length > 0">
            <button
              v-for="node in filteredNodes"
              :key="node.type"
              type="button"
              class="w-full px-4 py-2.5 text-left transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-100"
              @click="handleSelect(node.type)"
            >
              <div class="flex items-start gap-3">
                <div
                  class="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-[11px] font-semibold text-slate-500"
                >
                  {{ getCategoryBadge(node.category) }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-medium text-slate-800 truncate">
                      {{ node.label }}
                    </span>
                    <span class="ml-3 text-[11px] text-slate-400 truncate">
                      {{ node.type }}
                    </span>
                  </div>
                  <p class="mt-1 text-xs text-slate-500 line-clamp-2">
                    {{ node.description }}
                  </p>
                </div>
              </div>
            </button>
          </template>
          <div
            v-else
            class="flex h-32 flex-col items-center justify-center gap-2 text-slate-400"
          >
            <IconEmptyNode class="h-10 w-10 opacity-60" />
            <span class="text-sm">未找到匹配的节点</span>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import InputText from "../common/InputText.vue";
import IconEmptyNode from "@/icons/IconEmptyNode.vue";
import { useNodeRegistry } from "../../composables/useNodeRegistry";
import type { NodeMetadata } from "../../composables/useNodeRegistry";

interface Position {
  x: number;
  y: number;
}

type HandleType = "source" | "target" | null;

interface Props {
  position: Position;
  visible: boolean;
  handleType: HandleType;
}

interface Emits {
  (e: "select", type: string): void;
  (e: "close"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const menuRef = ref<HTMLElement | null>(null);
const searchQuery = ref("");

const nodeRegistry = useNodeRegistry();

const allNodes = computed(() => nodeRegistry.getAllNodeMetadata.value);

function hasAvailableInputs(node: NodeMetadata): boolean {
  if (!Array.isArray(node.inputs)) {
    return false;
  }
  return node.inputs.some((port) => port?.isPort === true);
}

function hasAvailableOutputs(node: NodeMetadata): boolean {
  if (!Array.isArray(node.outputs)) {
    return false;
  }
  return node.outputs.some((port) => port?.isPort === true);
}

const filteredNodes = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const candidates = query ? nodeRegistry.searchNodes(query) : allNodes.value;

  const filtered = candidates.filter((node) => {
    if (props.handleType === "source") {
      return hasAvailableInputs(node);
    }

    if (props.handleType === "target") {
      return hasAvailableOutputs(node);
    }

    return hasAvailableInputs(node) || hasAvailableOutputs(node);
  });

  return filtered.slice(0, 30);
});

const wrapperStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`,
}));

function handleSelect(type: string) {
  emit("select", type);
}

function getCategoryBadge(category: string): string {
  if (!category) return "节点";
  return category.length > 2 ? category.slice(0, 2) : category;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    emit("close");
  }
}

function handleClick(event: MouseEvent) {
  if (!props.visible) {
    return;
  }
  const target = event.target as Node | null;
  if (!target) {
    return;
  }
  if (menuRef.value && !menuRef.value.contains(target as Node)) {
    emit("close");
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("mousedown", handleClick);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("mousedown", handleClick);
});

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      searchQuery.value = "";
      requestAnimationFrame(() => {
        if (menuRef.value) {
          const input = menuRef.value.querySelector("input");
          input?.focus();
        }
      });
    }
  }
);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
