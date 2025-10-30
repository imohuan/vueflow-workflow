<!-- 纯 Tailwind CSS 按钮组件 -->
<template>
  <button :class="buttonClasses" :disabled="disabled" v-bind="$attrs">
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  /** 按钮变体 */
  variant?: "filled" | "outlined" | "text";
  /** 按钮大小 */
  size?: "small" | "medium" | "large";
  /** 颜色主题 */
  severity?: "primary" | "secondary" | "success" | "danger" | "warning";
  /** 是否仅显示图标 */
  iconOnly?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "filled",
  size: "medium",
  severity: "primary",
  iconOnly: false,
  disabled: false,
});

const buttonClasses = computed(() => {
  const classes = [
    "inline-flex",
    "items-center",
    "justify-center",
    "gap-2",
    "font-medium",
    "rounded-md",
    "transition-all",
    "duration-200",
    "border",
    "cursor-pointer",
    "select-none",
    "focus-visible:outline-none",
    "focus-visible:ring-4",
  ];

  // 大小样式
  if (props.iconOnly) {
    if (props.size === "small") {
      classes.push("w-7", "h-7", "p-1");
    } else if (props.size === "large") {
      classes.push("w-11", "h-11", "p-2.5");
    } else {
      classes.push("w-9", "h-9", "p-2");
    }
  } else {
    if (props.size === "small") {
      classes.push("px-3", "py-1.5", "text-xs");
    } else if (props.size === "large") {
      classes.push("px-6", "py-3", "text-base");
    } else {
      classes.push("px-4", "py-2", "text-sm");
    }
  }

  // 禁用状态
  if (props.disabled) {
    classes.push("opacity-50", "cursor-not-allowed", "pointer-events-none");
  } else {
    classes.push("focus-visible:ring-purple-100");
  }

  // 变体和颜色主题
  if (props.variant === "filled") {
    if (props.severity === "primary") {
      classes.push(
        "bg-gradient-to-r",
        "from-purple-500",
        "to-purple-600",
        "border-transparent",
        "text-white",
        "shadow-md",
        "hover:shadow-lg",
        "hover:from-purple-500",
        "hover:to-purple-700",
        "active:shadow-inner"
      );
    } else if (props.severity === "secondary") {
      classes.push(
        "bg-slate-700",
        "border-transparent",
        "text-white",
        "hover:bg-slate-700",
        "hover:border-transparent",
        "active:bg-slate-800",
        "shadow-md",
        "hover:shadow-lg"
      );
    } else if (props.severity === "success") {
      classes.push(
        "bg-gradient-to-r",
        "from-emerald-500",
        "to-emerald-600",
        "border-transparent",
        "text-white",
        "shadow-md",
        "hover:shadow-lg",
        "active:shadow-inner"
      );
    } else if (props.severity === "danger") {
      classes.push(
        "bg-gradient-to-r",
        "from-rose-500",
        "to-rose-600",
        "border-transparent",
        "text-white",
        "shadow-md",
        "hover:shadow-lg",
        "active:shadow-inner"
      );
    } else if (props.severity === "warning") {
      classes.push(
        "bg-gradient-to-r",
        "from-amber-500",
        "to-amber-600",
        "border-transparent",
        "text-white",
        "shadow-md",
        "hover:shadow-lg",
        "active:shadow-inner"
      );
    }
  } else if (props.variant === "outlined") {
    if (props.severity === "primary") {
      classes.push(
        "bg-transparent",
        "border-purple-200",
        "text-purple-600",
        "hover:bg-purple-50",
        "hover:border-purple-300",
        "active:bg-purple-100"
      );
    } else if (props.severity === "secondary") {
      classes.push(
        "bg-transparent",
        "border-slate-200",
        "text-slate-600",
        "hover:bg-slate-50",
        "active:bg-slate-100"
      );
    } else if (props.severity === "success") {
      classes.push(
        "bg-transparent",
        "border-emerald-300",
        "text-emerald-600",
        "hover:bg-emerald-50",
        "active:bg-emerald-100"
      );
    } else if (props.severity === "danger") {
      classes.push(
        "bg-transparent",
        "border-rose-300",
        "text-rose-600",
        "hover:bg-rose-50",
        "active:bg-rose-100"
      );
    } else if (props.severity === "warning") {
      classes.push(
        "bg-transparent",
        "border-amber-300",
        "text-amber-600",
        "hover:bg-amber-50",
        "active:bg-amber-100"
      );
    }
  } else if (props.variant === "text") {
    classes.push("bg-transparent", "border-transparent");
    if (props.severity === "primary") {
      classes.push(
        "text-purple-600",
        "hover:bg-purple-50",
        "active:bg-purple-100"
      );
    } else if (props.severity === "secondary") {
      classes.push(
        "text-slate-600",
        "hover:bg-slate-50",
        "active:bg-slate-100"
      );
    } else if (props.severity === "success") {
      classes.push(
        "text-emerald-600",
        "hover:bg-emerald-50",
        "active:bg-emerald-100"
      );
    } else if (props.severity === "danger") {
      classes.push("text-rose-600", "hover:bg-rose-50", "active:bg-rose-100");
    } else if (props.severity === "warning") {
      classes.push(
        "text-amber-600",
        "hover:bg-amber-50",
        "active:bg-amber-100"
      );
    }
  }

  return classes.join(" ");
});
</script>
