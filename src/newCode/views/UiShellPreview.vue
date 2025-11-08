<template>
  <div class="min-h-screen bg-slate-100 p-6">
    <div class="mx-auto max-w-6xl space-y-8">
      <header class="space-y-2">
        <h1 class="text-2xl font-semibold text-slate-900">UI Shell 预览</h1>
        <p class="text-sm text-slate-500">
          基础面板与模态组件的预览页面，可用于设计联调与手动测试。
        </p>
      </header>

      <div class="grid gap-6 lg:grid-cols-2">
        <PanelShell
          title="默认面板"
          description="用于侧栏或信息面板的基础外壳"
          :closable="true"
        >
          <template #actions>
            <n-button size="small" secondary> 动作 </n-button>
          </template>
          <div class="space-y-4 text-sm leading-6 text-slate-600">
            <p>
              这是一个示例内容区域。通过设置 <code>padding</code>、<code
                >size</code
              >
              等属性可以快速适配不同场景。
            </p>
            <ul class="list-disc space-y-1 pl-5">
              <li>支持自定义头部、动作区、底部。</li>
              <li>支持可选关闭按钮与粘性头尾。</li>
              <li>默认提供响应式圆角与阴影处理。</li>
            </ul>
          </div>
          <template #footer>
            <div class="flex justify-end gap-2">
              <n-button size="small" secondary> 取消 </n-button>
              <n-button size="small" type="primary"> 保存 </n-button>
            </div>
          </template>
        </PanelShell>

        <PanelShell
          title="紧凑面板"
          description="展示粘性头部与自定义宽度"
          size="lg"
          padding="sm"
          :header-sticky="true"
          :footer-sticky="true"
        >
          <div class="space-y-4 text-sm text-slate-600">
            <p>
              粘性头部与底部适合用于列表高度大于屏幕时仍需固定操作区的场景。滚动查看效果。
            </p>
            <div class="space-y-3">
              <div
                v-for="item in 12"
                :key="item"
                class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              >
                <h3 class="text-sm font-medium text-slate-800">
                  示例条目 {{ item }}
                </h3>
                <p class="mt-1 text-xs text-slate-500">
                  这里是用于占位的描述文本，可替换为实际数据。
                </p>
              </div>
            </div>
          </div>
          <template #footer>
            <div
              class="flex items-center justify-between text-xs text-slate-500"
            >
              <span>共 12 条数据</span>
              <n-space>
                <n-button size="small" secondary>上一页</n-button>
                <n-button size="small" secondary>下一页</n-button>
              </n-space>
            </div>
          </template>
        </PanelShell>
      </div>

      <div
        class="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 shadow-inner"
      >
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">模态窗口示例</h2>
            <p class="text-sm text-slate-500">点击按钮预览 ModalShell 行为。</p>
          </div>
          <n-space>
            <n-button type="primary" @click="modalVisible = true">
              居中模态框
            </n-button>
            <n-button secondary @click="bottomModalVisible = true">
              底部模态框
            </n-button>
          </n-space>
        </div>
      </div>

      <ModalShell
        v-model="modalVisible"
        title="示例模态窗口"
        description="ModalShell 用于统一模态交互表现"
        width="xl"
      >
        <div class="space-y-4 text-sm leading-6 text-slate-600">
          <p>
            支持自定义头部、内容和底部区域，内置
            ESC/遮罩关闭逻辑，可通过属性开关控制。
          </p>
          <p>
            同时会在打开时为 <code>body</code> 添加
            <code>overflow-hidden</code>，避免背景滚动。
          </p>
        </div>
        <template #footer>
          <n-space justify="end">
            <n-button size="small" secondary @click="modalVisible = false">
              知道了
            </n-button>
            <n-button size="small" type="primary" @click="modalVisible = false">
              继续
            </n-button>
          </n-space>
        </template>
      </ModalShell>

      <ModalShell
        v-model="bottomModalVisible"
        title="底部对齐模态框"
        description="适用于移动端或底部操作面板"
        width="lg"
        vertical-align="top"
      >
        <div class="space-y-4 text-sm leading-6 text-slate-600">
          <p>
            这个模态框使用
            <code>vertical-align="top"</code> 属性，配合自定义样式从底部弹出。
          </p>
          <p>适合用于移动端操作面板、分享菜单等场景。</p>
        </div>
        <template #footer>
          <n-space justify="end">
            <n-button
              size="small"
              secondary
              @click="bottomModalVisible = false"
            >
              关闭
            </n-button>
          </n-space>
        </template>
      </ModalShell>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ModalShell, PanelShell } from "../components/ui";

const modalVisible = ref(false);
const bottomModalVisible = ref(false);
</script>
