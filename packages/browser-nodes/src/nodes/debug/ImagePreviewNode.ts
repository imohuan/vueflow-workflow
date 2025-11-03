import { BaseNode } from "../base-node.ts";
import type { PortDefinition, WorkflowExecutionContext } from "../base-node.ts";

/**
 * 图片预览节点（调试用）
 * 用于预览图片 URL 或 Base64 数据
 */
export class ImagePreviewNode extends BaseNode {
  readonly type = "imagePreview";
  readonly label = "图片预览";
  readonly description = "预览图片，支持 URL 和 Base64";
  readonly category = "调试工具";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "imageUrl",
        name: "图片URL",
        type: "string",
        required: false,
        description: "图片的 URL 地址",
      },
      {
        id: "imageData",
        name: "图片数据",
        type: "string",
        required: false,
        description: "Base64 编码的图片数据或完整的 data URL",
      },
    ];
  }

  protected defineOutputs(): PortDefinition[] {
    return [
      {
        id: "imageUrl",
        name: "图片URL",
        type: "string",
        description: "处理后的图片地址",
      },
      {
        id: "imageInfo",
        name: "图片信息",
        type: "object",
        description: "图片的元数据信息",
      },
    ];
  }

  protected getDefaultConfig(): Record<string, any> {
    return {
      maxWidth: 400,
      maxHeight: 300,
      showDimensions: true,
      downloadable: true,
    };
  }

  /**
   * 自定义节点样式
   */
  protected getStyleConfig() {
    return {
      headerColor: { from: "#8b5cf6", to: "#7c3aed" }, // 紫色渐变
      showIcon: true,
      icon: "IconCanvas",
    };
  }

  async execute(
    config: Record<string, any>,
    inputs: Record<string, any>,
    _context: WorkflowExecutionContext
  ): Promise<any> {
    const imageUrl = inputs.imageUrl;
    const imageData = inputs.imageData;

    if (!imageUrl && !imageData) {
      throw new Error("请提供图片 URL 或图片数据");
    }

    // 确定最终的图片地址
    let finalImageUrl: string;
    let isDataUrl = false;

    if (imageData) {
      // 如果是 Base64 数据
      if (imageData.startsWith("data:image/")) {
        finalImageUrl = imageData;
        isDataUrl = true;
      } else {
        // 如果只是 Base64 编码，需要添加前缀
        finalImageUrl = `data:image/png;base64,${imageData}`;
        isDataUrl = true;
      }
    } else {
      finalImageUrl = imageUrl;
    }

    // 尝试获取图片尺寸（仅在浏览器环境）
    let imageInfo: any = {
      url: finalImageUrl,
      type: isDataUrl ? "data-url" : "url",
      size: isDataUrl ? Math.round(finalImageUrl.length / 1024) + "KB" : "未知",
    };

    try {
      // 在浏览器环境中，尝试加载图片获取尺寸
      if (typeof window !== "undefined" && "Image" in window) {
        const dimensions = await this.getImageDimensions(finalImageUrl);
        imageInfo = {
          ...imageInfo,
          width: dimensions.width,
          height: dimensions.height,
        };
      }
    } catch (error) {
      console.warn("无法获取图片尺寸:", error);
    }

    // 生成摘要
    let summary = "图片预览";
    if (imageInfo.width && imageInfo.height) {
      summary = `图片: ${imageInfo.width}x${imageInfo.height}`;
    }

    return {
      outputs: {
        imageUrl: finalImageUrl,
        imageInfo,
      },
      raw: {
        imageUrl: finalImageUrl,
        imageInfo,
      },
      summary,
      // 提供预览数据给 UI 使用
      preview: {
        type: "image",
        url: finalImageUrl,
        maxWidth: config.maxWidth || 400,
        maxHeight: config.maxHeight || 300,
      },
    };
  }

  /**
   * 获取图片尺寸
   */
  private getImageDimensions(
    url: string
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      // 使用 HTMLImageElement 类型
      const img = document.createElement("img") as HTMLImageElement;

      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };

      img.onerror = () => {
        reject(new Error("无法加载图片"));
      };

      img.src = url;

      // 设置超时
      setTimeout(() => {
        reject(new Error("加载图片超时"));
      }, 5000);
    });
  }
}
