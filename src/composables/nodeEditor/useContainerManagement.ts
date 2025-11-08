/**
 * 容器管理 Hook
 * 负责循环容器的布局、尺寸调整和子节点管理
 */
import type { Ref } from "vue";
import type { Node } from "@vue-flow/core";
import type { NodeData } from "../../typings/nodeEditor";
import type { ContainerVisualConfig } from "./types";
import {
  CONTAINER_DEFAULT_WIDTH,
  CONTAINER_DEFAULT_HEIGHT,
  CONTAINER_HEADER_HEIGHT,
  normalizePadding,
  getNodeApproxWidth,
  getNodeApproxHeight,
  notifyContainerInternals,
} from "./utils";

/** 跳过尺寸更新的节点集合 */
const skipDimensionUpdate = new Set<string>();

export function useContainerManagement(nodes: Ref<Node<NodeData>[]>) {
  /** 获取容器视觉配置 */
  function getContainerVisualConfig(
    node: Node<NodeData>
  ): ContainerVisualConfig {
    const data: any = node.data || {};
    const config: any = data.config || {};
    const style: any = node.style || {};

    const parseNumeric = (value: any): number | undefined => {
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    };

    const styleWidth = parseNumeric(style?.width);
    const styleHeight = parseNumeric(style?.height);
    const nodeWidth = parseNumeric((node as any).width);
    const nodeHeight = parseNumeric((node as any).height);
    const dimensionWidth = parseNumeric((node as any).dimensions?.width);
    const dimensionHeight = parseNumeric((node as any).dimensions?.height);

    return {
      width:
        data.width ??
        styleWidth ??
        nodeWidth ??
        dimensionWidth ??
        CONTAINER_DEFAULT_WIDTH,
      height:
        data.height ??
        styleHeight ??
        nodeHeight ??
        dimensionHeight ??
        CONTAINER_DEFAULT_HEIGHT,
      headerHeight: config.headerHeight ?? CONTAINER_HEADER_HEIGHT,
      padding: normalizePadding(config.padding),
    };
  }

  /** 规范化容器端口 */
  function normalizeContainerPorts(container: Node<NodeData>) {
    const data = container.data || {};

    const normalizedInputs = [
      {
        id: "loop-in",
        name: "循环入口",
        type: "any",
      },
      {
        id: "loop-right",
        name: "循环体出口",
        type: "any",
      },
    ];

    const normalizedOutputs = [
      {
        id: "loop-left",
        name: "循环体入口",
        type: "any",
      },
    ];

    container.data = {
      config: {},
      ...data,
      inputs: normalizedInputs,
      outputs: normalizedOutputs,
    };
  }

  /** 限制子节点位置在容器边界内 */
  function clampChildPosition(
    position: { x: number; y: number },
    config: ContainerVisualConfig,
    _child: Node<NodeData>
  ) {
    const minX = config.padding.left;
    const minY = config.headerHeight + config.padding.top;

    const x = Math.max(position.x, minX);
    const y = Math.max(position.y, minY);

    return { x, y };
  }

  /** 应用容器尺寸 */
  function applyContainerDimensions(
    container: Node<NodeData>,
    width: number,
    height: number
  ) {
    const normalizedWidth = Math.max(width, CONTAINER_DEFAULT_WIDTH);
    const normalizedHeight = Math.max(height, CONTAINER_DEFAULT_HEIGHT);

    const visualConfig = getContainerVisualConfig(container);
    const currentWidth =
      typeof container.width === "number"
        ? container.width
        : visualConfig.width;
    const currentHeight =
      typeof container.height === "number"
        ? container.height
        : visualConfig.height;

    const widthChanged = Math.abs(currentWidth - normalizedWidth) > 0.5;
    const heightChanged = Math.abs(currentHeight - normalizedHeight) > 0.5;

    if (widthChanged || heightChanged) {
      skipDimensionUpdate.add(container.id);
    }

    container.data = {
      ...container.data,
      config: container.data?.config || {},
      inputs: container.data?.inputs || [],
      outputs: container.data?.outputs || [],
      width: normalizedWidth,
      height: normalizedHeight,
    };
    container.width = normalizedWidth;
    container.height = normalizedHeight;
    container.style = {
      ...(container.style || {}),
      width: `${normalizedWidth}px`,
      height: `${normalizedHeight}px`,
    };
  }

  /** 确保容器有足够容量容纳子节点 */
  function ensureContainerCapacity(
    container: Node<NodeData>,
    child: Node<NodeData>,
    desiredPosition: { x: number; y: number }
  ): {
    config: ContainerVisualConfig;
    position: { x: number; y: number };
  } {
    const configBefore = getContainerVisualConfig(container);
    const padding = configBefore.padding;
    const baseTop = configBefore.headerHeight + padding.top;

    const childWidth = getNodeApproxWidth(child);
    const childHeight = getNodeApproxHeight(child);

    let shiftX = padding.left - desiredPosition.x;
    let shiftY = baseTop - desiredPosition.y;

    shiftX = shiftX > 0 ? shiftX : 0;
    shiftY = shiftY > 0 ? shiftY : 0;

    if (shiftX !== 0 || shiftY !== 0) {
      const siblings = nodes.value.filter(
        (item) => item.parentNode === container.id && item.id !== child.id
      );

      const ensurePosition = () => {
        if (!container.position) {
          container.position = { x: 0, y: 0 };
        }
      };

      if (shiftX !== 0) {
        ensurePosition();
        container.position!.x -= shiftX;
      }

      if (shiftY !== 0) {
        ensurePosition();
        container.position!.y -= shiftY;
      }

      if (siblings.length > 0) {
        siblings.forEach((sibling) => {
          const currentX = sibling.position?.x ?? 0;
          const currentY = sibling.position?.y ?? 0;
          sibling.position = {
            x: currentX + shiftX,
            y: currentY + shiftY,
          };
        });
      }
    }

    const adjustedPosition = {
      x: desiredPosition.x + shiftX,
      y: desiredPosition.y + shiftY,
    };

    let requiredWidth = Math.max(
      configBefore.width,
      adjustedPosition.x + childWidth + padding.right
    );
    let requiredHeight = Math.max(
      configBefore.height,
      adjustedPosition.y + childHeight + padding.bottom
    );

    applyContainerDimensions(container, requiredWidth, requiredHeight);

    const config = getContainerVisualConfig(container);

    return {
      config,
      position: adjustedPosition,
    };
  }

  /** 将子节点居中放置在容器中 */
  function centerChildInContainer(
    child: Node<NodeData>,
    container: Node<NodeData>
  ) {
    const estimatedWidth = getNodeApproxWidth(child);
    const configBefore = getContainerVisualConfig(container);
    const initialDesired = {
      x: Math.max(
        configBefore.padding.left,
        (configBefore.width - estimatedWidth) / 2
      ),
      y: configBefore.headerHeight + configBefore.padding.top,
    };
    const { config } = ensureContainerCapacity(
      container,
      child,
      initialDesired
    );
    const width = getNodeApproxWidth(child);

    const x = Math.max(config.padding.left, (config.width - width) / 2);
    const y = config.headerHeight + config.padding.top;

    child.position = {
      x,
      y,
    };
    updateContainerBounds(container);
  }

  /** 布局容器子节点 */
  function layoutContainerChildren(containerId: string) {
    const container = nodes.value.find((n) => n.id === containerId);
    if (!container) return;

    normalizeContainerPorts(container);

    const config = getContainerVisualConfig(container);
    const children = nodes.value.filter((n) => n.parentNode === containerId);

    if (children.length === 0) {
      const resetWidth = CONTAINER_DEFAULT_WIDTH;
      const resetHeight = CONTAINER_DEFAULT_HEIGHT;

      const currentWidth =
        typeof container.width === "number" ? container.width : config.width;
      const currentHeight =
        typeof container.height === "number" ? container.height : config.height;
      const widthChanged = Math.abs(currentWidth - resetWidth) > 0.5;
      const heightChanged = Math.abs(currentHeight - resetHeight) > 0.5;
      if (widthChanged || heightChanged) {
        skipDimensionUpdate.add(container.id);
      }

      container.data = {
        ...container.data,
        config: container.data?.config || {},
        inputs: container.data?.inputs || [],
        outputs: container.data?.outputs || [],
        width: resetWidth,
        height: resetHeight,
      };
      container.width = resetWidth;
      container.height = resetHeight;
      container.style = {
        ...(container.style || {}),
        width: `${resetWidth}px`,
        height: `${resetHeight}px`,
      };
      return;
    }

    if (children.length === 1 && children[0]) {
      centerChildInContainer(children[0], container);
      return;
    }

    const baseTop = config.headerHeight + config.padding.top;

    let maxRight = config.padding.left;
    let maxBottom = baseTop;

    children.forEach((child) => {
      const clamped = clampChildPosition(child.position, config, child);
      child.position = clamped;

      const childWidth = getNodeApproxWidth(child);
      const childHeight = getNodeApproxHeight(child);

      maxRight = Math.max(maxRight, clamped.x + childWidth);
      maxBottom = Math.max(maxBottom, clamped.y + childHeight);
    });

    const newWidth = Math.max(
      CONTAINER_DEFAULT_WIDTH,
      maxRight + config.padding.right
    );
    const newHeight = Math.max(
      CONTAINER_DEFAULT_HEIGHT,
      maxBottom + config.padding.bottom
    );

    const currentWidth =
      typeof container.width === "number" ? container.width : config.width;
    const currentHeight =
      typeof container.height === "number" ? container.height : config.height;
    const widthChanged = Math.abs(currentWidth - newWidth) > 0.5;
    const heightChanged = Math.abs(currentHeight - newHeight) > 0.5;
    if (widthChanged || heightChanged) {
      skipDimensionUpdate.add(container.id);
    }

    container.data = {
      ...container.data,
      config: container.data?.config || {},
      inputs: container.data?.inputs || [],
      outputs: container.data?.outputs || [],
      width: newWidth,
      height: newHeight,
    };
    container.width = newWidth;
    container.height = newHeight;
    container.style = {
      ...(container.style || {}),
      width: `${newWidth}px`,
      height: `${newHeight}px`,
    };
  }

  /** 更新容器边界 */
  function updateContainerBounds(container: Node<NodeData>) {
    const config = getContainerVisualConfig(container);
    const children = nodes.value.filter((n) => n.parentNode === container.id);

    if (children.length === 0) {
      const resetWidth = CONTAINER_DEFAULT_WIDTH;
      const resetHeight = CONTAINER_DEFAULT_HEIGHT;

      const currentWidth =
        typeof container.width === "number" ? container.width : config.width;
      const currentHeight =
        typeof container.height === "number" ? container.height : config.height;
      const widthChanged = Math.abs(currentWidth - resetWidth) > 0.5;
      const heightChanged = Math.abs(currentHeight - resetHeight) > 0.5;

      if (widthChanged || heightChanged) {
        skipDimensionUpdate.add(container.id);
      }

      container.data = {
        ...container.data,
        config: container.data?.config || {},
        inputs: container.data?.inputs || [],
        outputs: container.data?.outputs || [],
        width: resetWidth,
        height: resetHeight,
      };
      container.width = resetWidth;
      container.height = resetHeight;
      container.style = {
        ...(container.style || {}),
        width: `${resetWidth}px`,
        height: `${resetHeight}px`,
      };
      return;
    }

    let maxRight = config.padding.left;
    let maxBottom = config.headerHeight + config.padding.top;

    children.forEach((child) => {
      const childWidth = getNodeApproxWidth(child);
      const childHeight = getNodeApproxHeight(child);
      const left = child.position.x;
      const top = child.position.y;

      maxRight = Math.max(maxRight, left + childWidth);
      maxBottom = Math.max(maxBottom, top + childHeight);
    });

    const newWidth = Math.max(
      CONTAINER_DEFAULT_WIDTH,
      maxRight + config.padding.right
    );
    const newHeight = Math.max(
      CONTAINER_DEFAULT_HEIGHT,
      maxBottom + config.padding.bottom
    );

    const currentWidth =
      typeof container.width === "number" ? container.width : config.width;
    const currentHeight =
      typeof container.height === "number" ? container.height : config.height;
    const widthChanged = Math.abs(currentWidth - newWidth) > 0.5;
    const heightChanged = Math.abs(currentHeight - newHeight) > 0.5;

    if (widthChanged || heightChanged) {
      skipDimensionUpdate.add(container.id);

      container.data = {
        ...container.data,
        config: container.data?.config || {},
        inputs: container.data?.inputs || [],
        outputs: container.data?.outputs || [],
        width: newWidth,
        height: newHeight,
      };
      container.width = newWidth;
      container.height = newHeight;
      container.style = {
        ...(container.style || {}),
        width: `${newWidth}px`,
        height: `${newHeight}px`,
      };

      notifyContainerInternals(container.id);
    }
  }

  /** 设置容器高亮状态 */
  function setContainerHighlight(
    containerId: string,
    highlight: boolean,
    type: "normal" | "warning" = "normal"
  ) {
    const container = nodes.value.find((n) => n.id === containerId);
    if (container && container.data) {
      (container.data as any).isHighlighted = highlight;
      (container.data as any).highlightType = highlight ? type : undefined;
    }
  }

  return {
    getContainerVisualConfig,
    layoutContainerChildren,
    updateContainerBounds,
    ensureContainerCapacity,
    clampChildPosition,
    setContainerHighlight,
    skipDimensionUpdate,
  };
}
