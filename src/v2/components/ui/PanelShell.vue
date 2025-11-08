<template>
  <section
    :class="[
      'panel-shell flex flex-col rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm transition-shadow duration-200',
      elevated ? 'shadow-lg' : 'shadow-sm',
      sizeClass,
    ]"
  >
    <header
      v-if="hasHeader"
      :class="[
        'flex items-center gap-3 border-b border-slate-200 px-4',
        description ? 'items-start py-3' : 'items-center py-2',
        headerSticky
          ? 'sticky top-0 z-10 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80'
          : '',
      ]"
    >
      <div v-if="$slots.icon" class="shrink-0 text-slate-500">
        <slot name="icon" />
      </div>
      <div class="flex-1 min-w-0">
        <h2 v-if="title" class="text-sm font-semibold leading-6 text-slate-900">
          {{ title }}
        </h2>
        <p v-if="description" class="mt-1 text-xs leading-5 text-slate-500">
          {{ description }}
        </p>
        <slot name="header" />
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <slot name="actions" />
        <n-button
          v-if="closable"
          text
          class="h-9! w-9! min-w-0! p-0!"
          @click="emit('close')"
        >
          <IconClose class="h-4 w-4" />
        </n-button>
      </div>
    </header>

    <div :class="['flex-1 overflow-auto', bodyPaddingClass]">
      <slot />
    </div>

    <footer
      v-if="$slots.footer"
      :class="[
        'border-t border-slate-200 px-5 py-3',
        footerSticky
          ? 'sticky bottom-0 z-10 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80'
          : '',
      ]"
    >
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, toRefs, useSlots } from "vue";
import IconClose from "@/icons/IconClose.vue";

interface Props {
  title?: string;
  description?: string;
  closable?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  padding?: "none" | "xs" | "sm" | "md" | "lg";
  elevated?: boolean;
  headerSticky?: boolean;
  footerSticky?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  description: undefined,
  closable: false,
  size: "md",
  padding: "md",
  elevated: false,
  headerSticky: false,
  footerSticky: false,
});

const emit = defineEmits<{ (event: "close"): void }>();

const slots = useSlots();

const sizeClass = computed(() => {
  type PanelSize = NonNullable<Props["size"]>;
  const map: Record<PanelSize, string> = {
    sm: "w-72",
    md: "w-80",
    lg: "w-96",
    xl: "w-[28rem]",
    full: "w-full",
  };
  return map[props.size];
});

const bodyPaddingClass = computed(() => {
  type PanelPadding = NonNullable<Props["padding"]>;
  const map: Record<PanelPadding, string> = {
    none: "p-0",
    xs: "px-4 py-3",
    sm: "px-4 py-4",
    md: "px-5 py-5",
    lg: "px-6 py-6",
  };
  return map[props.padding];
});

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

const { headerSticky, footerSticky, elevated } = toRefs(props);
</script>

<style scoped>
.panel-shell {
  max-height: 100%;
}
</style>
