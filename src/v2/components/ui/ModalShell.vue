<template>
  <Teleport to="body">
    <Transition :name="verticalAlign === 'top' ? 'slide-up' : 'fade'">
      <div
        v-if="modelValue"
        :style="{ zIndex: zIndex.toString() }"
        :class="[
          'fixed inset-0 flex justify-center bg-black/10 backdrop-blur-sm transition',
          verticalAlign === 'center' ? 'items-center' : 'items-end',
        ]"
        @click.self="handleOverlayClick"
      >
        <div
          :class="[
            'modal-shell relative mx-auto flex w-10/12 flex-col overflow-hidden bg-[#fafafa] text-slate-900 shadow-[0_8px_40px_rgba(0,0,0,0.08)]',
            widthClass,
            verticalAlign === 'center'
              ? props.width === 'full'
                ? 'rounded-md border border-slate-200'
                : 'my-auto max-h-[calc(100vh-4rem)] rounded-md border border-slate-200'
              : 'max-h-[85vh] rounded-t-2xl',
          ]"
          role="dialog"
          aria-modal="true"
        >
          <header
            v-if="hasHeader"
            class="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 shrink-0"
          >
            <div class="flex items-center gap-3">
              <div
                v-if="$slots.icon"
                class="flex items-center justify-center w-7 h-7 rounded-lg bg-linear-to-br from-purple-500 to-purple-700 text-white transition-transform duration-200 hover:scale-105"
              >
                <slot name="icon" />
              </div>
              <div
                v-else-if="title"
                class="flex items-center justify-center w-7 h-7 rounded-lg bg-linear-to-br from-purple-500 to-purple-700 text-white transition-transform duration-200 hover:scale-105"
              >
                <IconCog class="w-4 h-4" />
              </div>
              <div class="flex-1 min-w-0">
                <h2
                  v-if="title"
                  class="text-[15px] font-medium text-[#1a1a1a] tracking-tight"
                >
                  {{ title }}
                </h2>
                <p v-if="description" class="mt-1 text-sm text-slate-500">
                  {{ description }}
                </p>
                <slot name="header" />
              </div>
            </div>
            <div class="flex items-center gap-2">
              <slot name="actions" />
              <button
                v-if="closable"
                class="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700"
                @click="close()"
              >
                <IconClose class="w-4 h-4" />
              </button>
            </div>
          </header>

          <div :class="['flex-1 overflow-auto', bodyPaddingClass]">
            <slot />
          </div>

          <footer
            v-if="$slots.footer"
            class="border-t border-slate-200 px-6 py-4"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {
  watch,
  computed,
  onBeforeUnmount,
  onMounted,
  toRefs,
  useSlots,
} from "vue";
import IconClose from "@/icons/IconClose.vue";
import IconCog from "@/icons/IconCog.vue";

interface Props {
  modelValue: boolean;
  title?: string;
  description?: string;
  width?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
  closable?: boolean;
  closeOnOverlay?: boolean;
  closeOnEsc?: boolean;
  verticalAlign?: "top" | "center";
  zIndex?: number;
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  description: undefined,
  width: "lg",
  padding: "md",
  closable: true,
  closeOnOverlay: true,
  closeOnEsc: true,
  verticalAlign: "center",
  zIndex: 60,
});

const emit = defineEmits<{
  (event: "update:modelValue", value: boolean): void;
  (event: "close"): void;
}>();

const slots = useSlots();

const { modelValue, closeOnEsc, verticalAlign } = toRefs(props);

const hasHeader = computed(() =>
  Boolean(
    props.title ||
      props.description ||
      slots.header ||
      slots.icon ||
      slots.actions ||
      props.closable
  )
);

const widthClass = computed(() => {
  type ModalWidth = NonNullable<Props["width"]>;
  const map: Record<ModalWidth, string> = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-3xl",
    xl: "max-w-4xl",
    "2xl": "max-w-5xl",
    full: "w-[95vw] h-[95vh]",
  };
  return map[props.width];
});

const bodyPaddingClass = computed(() => {
  type ModalPadding = NonNullable<Props["padding"]>;
  const map: Record<ModalPadding, string> = {
    none: "p-0",
    sm: "px-5 py-5",
    md: "px-6 py-6",
    lg: "px-8 py-8",
  };
  return map[props.padding];
});

const close = () => {
  emit("update:modelValue", false);
  emit("close");
};

const handleOverlayClick = () => {
  if (!props.closeOnOverlay) return;
  close();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!modelValue.value) return;
  if (!closeOnEsc.value) return;
  if (event.key === "Escape") {
    close();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
  if (modelValue.value) {
    document.body.classList.add("overflow-hidden");
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
  document.body.classList.remove("overflow-hidden");
});

watch(
  () => modelValue.value,
  (visible) => {
    if (visible) {
      document.body.classList.add("overflow-hidden");
      return;
    }
    document.body.classList.remove("overflow-hidden");
  }
);

const { zIndex, closable } = toRefs(props);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
}
.slide-up-enter-from .modal-shell,
.slide-up-leave-to .modal-shell {
  transform: translateY(100%);
}
</style>
