<template>
  <div class="mb-6 space-y-4">
    <!-- 分组列表 -->
    <div class="space-y-2">
      <!-- 分组项 -->
      <div
        v-for="(group, idx) in groups"
        :key="idx"
        class="rounded-md border border-slate-200 bg-white overflow-hidden"
      >
        <!-- 分组头部：标题 + 类型 + 删除按钮 -->
        <div
          class="flex items-center justify-between gap-2 px-3 pr-2 py-2 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100"
          @dblclick="startEditingGroupName(idx)"
        >
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <!-- 标题（可双击编辑） -->
            <div
              v-show="!editingGroupIdx.includes(idx)"
              class="text-sm font-medium text-slate-700 truncate"
            >
              {{ group.name || `Group${idx + 1}` }}
            </div>
            <!-- 编辑模式 -->
            <n-input
              v-show="editingGroupIdx.includes(idx)"
              :ref="(el) => { editInputRefs[idx] = el as any; }"
              :value="group.name"
              size="small"
              class="flex-1"
              @update:value="group.name = $event"
              @blur="stopEditingGroupName(idx)"
              @keydown="handleGroupNameKeydown($event, idx)"
              @click.stop
            />
          </div>

          <!-- 删除按钮 -->
          <n-button
            text
            size="small"
            class="shrink-0"
            @click.stop="removeGroup(idx)"
          >
            <template #icon>
              <IconDelete class="h-4 w-4" />
            </template>
          </n-button>
        </div>

        <!-- 分组内容：数据项列表（可拖拽排序） -->
        <VueDraggable
          v-model="group.children"
          class="p-2 space-y-1"
          :options="dragOptions"
          :animation="150"
          @change="emitUpdate"
        >
          <!-- 数据项 -->
          <div
            v-for="(item, itemIdx) in group.children || []"
            :key="itemIdx"
            class="flex items-center gap-2"
          >
            <!-- 拖拽按钮 -->
            <div
              class="flex items-center justify-center w-6 h-8 text-slate-400 cursor-grab active:cursor-grabbing hover:text-slate-600 shrink-0"
            >
              <IconDrag class="h-4 w-4" />
            </div>

            <!-- 变量输入框 -->
            <VariableTextInput
              :model-value="item"
              placeholder="输入数据或变量"
              class="flex-1"
              :show-tip="false"
              @update:model-value="updateGroupItem(idx, itemIdx, $event)"
            />

            <!-- 删除按钮（仅当不是最后一项空白时显示） -->
            <n-button
              v-if="!isLastEmptyItem(idx, itemIdx)"
              text
              size="small"
              class="shrink-0 w-4! h-8"
              @click="removeGroupItem(idx, itemIdx)"
            >
              <template #icon>
                <IconDelete class="h-3.5 w-3.5" />
              </template>
            </n-button>
            <!-- 占位符（保持对齐） -->
            <div v-else class="w-4 h-8 shrink-0" />
          </div>
        </VueDraggable>
      </div>

      <!-- 添加分组按钮 -->
      <n-button type="primary" dashed block size="small" @click="addGroup">
        <template #icon>
          <IconPlus class="h-4 w-4" />
        </template>
        新增分组
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { NButton, NInput } from "naive-ui";
import { VueDraggable } from "vue-draggable-plus";
import IconPlus from "@/icons/IconPlus.vue";
import IconDelete from "@/icons/IconDelete.vue";
import IconDrag from "@/icons/IconDrag.vue";
import VariableTextInput from "@/v2/components/variables-inputs/VariableTextInput.vue";
import type { Node } from "@vue-flow/core";
import type { NodeConfigData } from "../types";

interface Group {
  name: string;
  children: string[];
}

interface Props {
  selectedNode: Node;
  nodeConfig: NodeConfigData;
}

interface Emits {
  (e: "update:params", params: Record<string, any>): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 分组列表
const groups = ref<Group[]>([]);

// 正在编辑的分组索引
const editingGroupIdx = ref<number[]>([]);

// 编辑输入框 refs（按索引存储）
const editInputRefs = ref<Record<number, InstanceType<typeof NInput> | null>>(
  {}
);

// 拖拽配置
const dragOptions = {
  animation: 200,
  group: "items",
  disabled: false,
  ghostClass: "ghost",
};

// 初始化分组数据
function initializeGroups() {
  const params = props.nodeConfig.params || {};
  const groupsData = params.data || [];

  if (Array.isArray(groupsData) && groupsData.length > 0) {
    groups.value = groupsData.map((g: any) => ({
      name: g.name || "",
      children: Array.isArray(g.children) ? [...g.children] : [],
    }));
  } else {
    // 初始化两个默认分组
    groups.value = [{ name: "Group1", children: [""] }];
  }
  editingGroupIdx.value = [];
}

// 监听 nodeConfig 变化
watch(
  () => props.nodeConfig,
  () => {
    initializeGroups();
  },
  { deep: true }
);

// 初始化
initializeGroups();

// 开始编辑分组名称
function startEditingGroupName(idx: number) {
  if (!editingGroupIdx.value.includes(idx)) {
    editingGroupIdx.value.push(idx);
    // 等待 DOM 更新后聚焦输入框
    nextTick(() => {
      const inputRef = editInputRefs.value[idx];
      if (inputRef) {
        inputRef.focus();
        inputRef.select();
      }
    });
  }
}

// 处理分组名称输入框的键盘事件
function handleGroupNameKeydown(event: KeyboardEvent, idx: number) {
  if (event.key === "Enter") {
    event.preventDefault();
    stopEditingGroupName(idx);
  } else if (event.key === "Escape") {
    event.preventDefault();
    stopEditingGroupName(idx);
  }
}

// 停止编辑分组名称
function stopEditingGroupName(idx: number) {
  editingGroupIdx.value = editingGroupIdx.value.filter((i) => i !== idx);
  // 退出编辑模式时保存更新
  emitUpdate();
}

// 添加分组
function addGroup() {
  const newGroupName = `Group${groups.value.length + 1}`;
  groups.value.push({
    name: newGroupName,
    children: [""],
  });
  emitUpdate();
}

// 删除分组
function removeGroup(idx: number) {
  groups.value.splice(idx, 1);
  editingGroupIdx.value = editingGroupIdx.value.filter((i) => i !== idx);
  emitUpdate();
}

// 更新分组字段
function updateGroupField(idx: number, field: string, value: any) {
  if (groups.value[idx]) {
    (groups.value[idx] as any)[field] = value;
    emitUpdate();
  }
}

// 更新分组数据项
function updateGroupItem(groupIdx: number, itemIdx: number, value: string) {
  if (groups.value[groupIdx]?.children[itemIdx] !== undefined) {
    groups.value[groupIdx].children[itemIdx] = value;

    // 检测最后一项是否有数据，如果有则自动添加新行
    const children = groups.value[groupIdx].children;
    if (itemIdx === children.length - 1 && value.trim() !== "") {
      children.push("");
    }

    emitUpdate();
  }
}

// 删除分组数据项
function removeGroupItem(groupIdx: number, itemIdx: number) {
  if (groups.value[groupIdx]) {
    groups.value[groupIdx].children.splice(itemIdx, 1);
    emitUpdate();
  }
}

// 判断是否为最后一项空白
function isLastEmptyItem(groupIdx: number, itemIdx: number): boolean {
  const children = groups.value[groupIdx]?.children || [];
  return itemIdx === children.length - 1 && children[itemIdx]?.trim() === "";
}

// 发送更新事件
function emitUpdate() {
  // 将分组数据转换为后端期望的格式
  const data = groups.value.map((group) => ({
    name: group.name,
    children: group.children,
  }));

  emit("update:params", {
    data,
  });
}
</script>

<style scoped>
/* 自定义样式 */
</style>
