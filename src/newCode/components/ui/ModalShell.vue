<template>
  <Teleport to="body">
    <Transition :name="verticalAlign === 'top' ? 'slide-up' : 'fade'">
      <div
        v-if="modelValue"
        :style="{ zIndex: zIndex.toString() }"
        :class="[
          'fixed inset-0 flex justify-center bg-slate-900/40 backdrop-blur-sm transition',
          verticalAlign === 'center' ? 'items-center' : 'items-end',
        ]"
        @click.self="handleOverlayClick"
      >
        <div
          :class="[
            'modal-shell relative mx-auto flex w-full flex-col overflow-hidden border border-slate-200 bg-white text-slate-900 shadow-xl',
            widthClass,
            verticalAlign === 'center'
              ? 'my-auto max-h-[calc(100vh-4rem)] rounded-2xl'
              : 'max-h-[85vh] rounded-t-2xl',
          ]"
          role="dialog"
          aria-modal="true"
        >
          <header
            v-if="hasHeader"
            class="flex items-start gap-3 border-b border-slate-200 px-6 py-5"
          >
            <div v-if="$slots.icon" class="shrink-0 text-slate-500">
              <slot name="icon" />
            </div>
            <div class="flex-1 min-w-0">
              <h2
                v-if="title"
                class="text-base font-semibold leading-6 text-slate-900"
              >
                {{ title }}
              </h2>
              <p
                v-if="description"
                class="mt-1 text-sm leading-6 text-slate-500"
              >
                {{ description }}
              </p>
              <slot name="header" />
            </div>
            <div class="flex items-center gap-2">
              <slot name="actions" />
              <n-button
                v-if="closable"
                text
                class="h-10! w-10! min-w-0! p-0!"
                @click="close()"
              >
                <IconClose class="h-5 w-5" />
              </n-button>
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
    full: "max-w-6xl",
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
