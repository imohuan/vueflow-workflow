import { ref, computed, type Ref } from "vue";
import { eventBusUtils } from "../features/vueflow/events";

/**
 * 拖拽目标状态
 */
export type DropTargetState = "default" | "empty" | "hasContent";

/**
 * 拖拽配置选项
 */
export interface UseEditableDragOptions<T = unknown> {
  /** 拖拽阈值（像素），默认 5 */
  dragThreshold?: number;
  /** 拖拽事件名称，默认 'editable-drop' */
  eventName?: string;
  /** 是否支持高亮状态，默认 false */
  enableHighlight?: boolean;
  /** 拖拽开始时的回调 */
  onDragStart?: (data: T) => void;
  /** 拖拽结束时的回调 */
  onDragEnd?: (data: T | null) => void;
}

/**
 * 拖拽到可编辑元素的 Hook
 *
 * @param options 配置选项
 * @returns 拖拽相关的状态和方法
 */
export function useEditableDrag<T = unknown>(
  options: UseEditableDragOptions<T> = {}
) {
  const {
    dragThreshold = 5,
    eventName = "editable-drop",
    enableHighlight = false,
    onDragStart,
    onDragEnd,
  } = options;

  // 拖拽状态
  const isDragging = ref(false);
  const showDragFollower = ref(false);
  const dragPosition = ref({ x: 0, y: 0 });
  const initialMousePosition = ref({ x: 0, y: 0 });
  const dropTargetState = ref<DropTargetState>("default");
  const currentEditableElement = ref<HTMLElement | null>(null);
  const isHighlighted = ref(false);

  // 拖拽数据
  let draggedData: T | null = null;

  /**
   * 获取元素的纯文本内容
   */
  function getPlainTextContent(element: HTMLElement): string {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      return element.value;
    }
    return (
      element.textContent?.replace(/\u00a0/g, " ").replace(/\u200B/g, "") || ""
    );
  }

  const setBorderClassDoms: Element[] = [];
  const borderClassName = "border-green-600!";

  /**
   * 清除所有 border 样式
   */
  const clearBorder = () => {
    setBorderClassDoms.forEach((dom) => {
      dom.classList.remove(borderClassName);
    });
    setBorderClassDoms.length = 0;
  };

  /**
   * 设置元素的 border 样式
   */
  const setBorder = (element: HTMLElement) => {
    // editable 元素向上查询 class包含 variable-text-input 的元素
    const variableTextInput = element.closest(".variable-text-input");
    // 先清除所有 border
    clearBorder();
    // 如果有目标元素，添加 border（去重）
    if (variableTextInput && !setBorderClassDoms.includes(variableTextInput)) {
      setBorderClassDoms.push(variableTextInput);
      variableTextInput.classList.add(borderClassName);
    }
  };

  /**
   * 计算拖拽跟随元素的样式
   */
  const dragFollowerStyle = computed(() => {
    const editable = currentEditableElement.value;

    // 空输入框：吸附到左侧
    if (editable && dropTargetState.value === "empty") {
      setBorder(editable);
      const rect = editable.getBoundingClientRect();
      return {
        left: rect.left - 8 + "px",
        top: rect.top + rect.height / 2 + "px",
        transform: "translate(12px, -50%)",
      };
    }

    // 有内容的输入框：跟随鼠标
    if (editable && dropTargetState.value === "hasContent") {
      setBorder(editable);
      return {
        left: dragPosition.value.x + "px",
        top: dragPosition.value.y + "px",
      };
    }

    // 默认状态：清除 border，跟随鼠标，显示在鼠标上方
    clearBorder();
    return {
      left: dragPosition.value.x + "px",
      top: dragPosition.value.y + "px",
      transform: "translate(-50%, -100%)",
    };
  });

  /**
   * 处理鼠标移动
   */
  function handleMouseMove(event: MouseEvent) {
    if (!isDragging.value) return;

    // 更新当前鼠标位置
    dragPosition.value = {
      x: event.clientX,
      y: event.clientY,
    };

    // 计算移动距离
    const deltaX = event.clientX - initialMousePosition.value.x;
    const deltaY = event.clientY - initialMousePosition.value.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 只有移动超过阈值才显示拖拽跟随元素
    if (distance > dragThreshold) {
      if (!showDragFollower.value) {
        showDragFollower.value = true;
        document.body.style.cursor = "grabbing";
        // 发送变量拖拽开始事件
        if (draggedData) {
          eventBusUtils.emit("variable:drag-start", {
            data: draggedData,
            position: dragPosition.value,
          });
        }
      } else {
        // 发送变量拖拽移动事件
        if (draggedData) {
          eventBusUtils.emit("variable:drag-move", {
            data: draggedData,
            position: dragPosition.value,
          });
        }
      }
    } else {
      // 如果距离不够，不显示拖拽跟随元素，也不检测目标元素
      return;
    }

    // 检测鼠标下方的元素
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target) {
      dropTargetState.value = "default";
      currentEditableElement.value = null;
      return;
    }

    // 检查是否是可编辑的元素（contenteditable 或 input/textarea）
    const isEditable =
      target.getAttribute("contenteditable") === "true" ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement;

    let editableElement: HTMLElement | null = null;

    if (!isEditable) {
      // 检查父元素是否可编辑
      const editableParent = target.closest("[contenteditable='true']");
      if (!editableParent) {
        dropTargetState.value = "default";
        currentEditableElement.value = null;
        return;
      }
      editableElement = editableParent as HTMLElement;
    } else {
      editableElement = target as HTMLElement;
    }

    // 更新当前可编辑元素
    currentEditableElement.value = editableElement;

    // 检查可编辑元素是否有内容
    const content = getPlainTextContent(editableElement);
    dropTargetState.value = content.trim() === "" ? "empty" : "hasContent";
  }

  /**
   * 处理鼠标抬起
   */
  function handleMouseUp(event: MouseEvent) {
    if (!isDragging.value) return;

    const finalPosition = {
      x: event.clientX,
      y: event.clientY,
    };

    // 发送变量拖拽结束事件
    eventBusUtils.emit("variable:drag-end", {
      data: draggedData,
      position: finalPosition,
    });

    // 清除 border 样式
    clearBorder();

    isDragging.value = false;
    showDragFollower.value = false;
    dropTargetState.value = "default";
    currentEditableElement.value = null;
    if (enableHighlight) {
      isHighlighted.value = false;
    }

    // 恢复鼠标样式
    document.body.style.cursor = "";

    // 移除全局事件监听
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);

    // 触发 drop 事件到鼠标位置的元素
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (target && draggedData) {
      const dropEvent = new CustomEvent(eventName, {
        bubbles: true,
        detail: draggedData,
      });
      target.dispatchEvent(dropEvent);
    }

    // 调用结束回调
    if (onDragEnd) {
      onDragEnd(draggedData);
    }

    // 清理拖拽数据
    draggedData = null;
  }

  /**
   * 开始拖拽
   *
   * @param event 鼠标事件
   * @param data 拖拽数据
   */
  function startDrag(event: MouseEvent, data: T) {
    event.preventDefault();
    event.stopPropagation();

    isDragging.value = true;
    showDragFollower.value = false;
    dropTargetState.value = "default";
    currentEditableElement.value = null;
    if (enableHighlight) {
      isHighlighted.value = true;
    }

    // 记录初始鼠标位置
    initialMousePosition.value = {
      x: event.clientX,
      y: event.clientY,
    };

    dragPosition.value = {
      x: event.clientX,
      y: event.clientY,
    };

    // 存储拖拽数据
    draggedData = data;

    // 调用开始回调
    if (onDragStart) {
      onDragStart(data);
    }

    // 绑定全局事件
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  /**
   * 重置所有状态
   */
  function reset() {
    // 清除 border 样式
    clearBorder();

    isDragging.value = false;
    showDragFollower.value = false;
    dropTargetState.value = "default";
    currentEditableElement.value = null;
    if (enableHighlight) {
      isHighlighted.value = false;
    }
    draggedData = null;
    document.body.style.cursor = "";
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }

  return {
    // 状态
    isDragging: isDragging as Readonly<Ref<boolean>>,
    showDragFollower: showDragFollower as Readonly<Ref<boolean>>,
    dragPosition: dragPosition as Readonly<Ref<{ x: number; y: number }>>,
    dropTargetState: dropTargetState as Readonly<Ref<DropTargetState>>,
    currentEditableElement: currentEditableElement as Readonly<
      Ref<HTMLElement | null>
    >,
    isHighlighted: enableHighlight
      ? (isHighlighted as Readonly<Ref<boolean>>)
      : undefined,

    // 计算属性
    dragFollowerStyle,

    // 方法
    startDrag,
    reset,
  };
}
