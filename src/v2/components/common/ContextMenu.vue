<template>
  <div
    class="context-menu-trigger"
    @contextmenu.prevent="handleContextMenu"
  >
    <slot></slot>

    <!-- Dropdown Menu -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-show="isVisible"
          ref="menuRef"
          class="fixed rounded-lg border border-slate-200 bg-white shadow-xl z-10000 min-w-max"
          :style="menuStyle"
        >
          <div class="py-1">
            <div
              v-for="(item, index) in items"
              :key="index"
              class="px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors flex items-center gap-2 text-sm"
              @click="handleItemClick(item)"
            >
              <component :is="item.icon" v-if="item.icon" class="w-4 h-4 shrink-0" />
              <div class="flex flex-col gap-0.5 min-w-0">
                <div class="text-xs text-slate-500 font-medium">{{ item.label }}</div>
                <div
                  class="text-xs font-mono truncate"
                  :style="{ color: item.color }"
                >
                  {{ item.value }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Click outside listener -->
    <div
      v-if="isVisible"
      class="fixed inset-0"
      @click="close"
      @contextmenu.prevent="close"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useMessage } from "naive-ui";

interface MenuItem {
  label: string;
  value: string;
  color?: string;
  icon?: any;
  onClick: () => void;
}

interface Props {
  items: MenuItem[];
}

defineProps<Props>();

const isVisible = ref(false);
const menuRef = ref<HTMLElement | null>(null);
const menuStyle = ref({ top: "0px", left: "0px" });
const message = useMessage();

function handleContextMenu(event: MouseEvent) {
  event.preventDefault();
  
  const x = event.clientX;
  const y = event.clientY;
  
  isVisible.value = true;
  
  // Position menu at cursor
  menuStyle.value = {
    top: `${y}px`,
    left: `${x}px`,
  };
  
  // Adjust position if menu goes off-screen
  setTimeout(() => {
    if (menuRef.value) {
      const rect = menuRef.value.getBoundingClientRect();
      let top = y;
      let left = x;
      
      // Check right boundary
      if (rect.right > window.innerWidth - 10) {
        left = window.innerWidth - rect.width - 10;
      }
      
      // Check bottom boundary
      if (rect.bottom > window.innerHeight - 10) {
        top = window.innerHeight - rect.height - 10;
      }
      
      // Check left boundary
      if (left < 10) {
        left = 10;
      }
      
      // Check top boundary
      if (top < 10) {
        top = 10;
      }
      
      menuStyle.value = { top: `${top}px`, left: `${left}px` };
    }
  }, 0);
}

function close() {
  isVisible.value = false;
}

function handleItemClick(item: MenuItem) {
  item.onClick();
  close();
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    message.success("已复制到剪贴板");
  }).catch(() => {
    message.error("复制失败");
  });
}

// Close menu when clicking outside
function handleClickOutside(event: MouseEvent) {
  if (!isVisible.value) return;
  
  const target = event.target as Node;
  if (menuRef.value && !menuRef.value.contains(target)) {
    close();
  }
}

onMounted(() => {
  document.addEventListener("mousedown", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("mousedown", handleClickOutside);
});

defineExpose({
  copyToClipboard,
});
</script>

<style scoped>
.context-menu-trigger {
  display: contents;
}
</style>
