import { BaseNode } from "../base-node.ts";
import type { PortDefinition, WorkflowExecutionContext } from "../base-node.ts";

/**
 * 图片预览节点（调试用）
 * 用于预览图片 URL 或通过 baseUrl + path 拼接的图片
 * 注：禁止使用 basedata 等大数据，仅支持 URL 和 baseUrl+path 方式
 */
export class ImagePreviewNode extends BaseNode {
  readonly type = "imagePreview";
  readonly label = "图片预览";
  readonly description = "预览图片，支持 URL 和 baseUrl+path 拼接";
  readonly category = "调试工具";

  protected defineInputs(): PortDefinition[] {
    return [
      {
        id: "imageUrl",
        name: "图片URL",
        type: "string",
        required: false,
        description: "完整的图片 URL 地址",
      },
      {
        id: "baseUrl",
        name: "基础URL",
        type: "string",
        required: false,
        description: "基础 URL，如 http://localhost:3000/static/images",
      },
      {
        id: "path",
        name: "图片路径",
        type: "string",
        required: false,
        description: "相对路径，如 data/1.png。若以 http:// 或 https:// 开头则直接使用",
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
    const baseUrl = inputs.baseUrl;
    const path = inputs.path;

    // 确定最终的图片地址
    let finalImageUrl: string;
    let isDataUrl = false;

    if (imageUrl) {
      // 如果提供了完整的 URL
      finalImageUrl = imageUrl;
    } else if (baseUrl && path) {
      // 如果提供了 baseUrl 和 path，进行拼接
      finalImageUrl = this.concatenateUrl(baseUrl, path);
    } else {
      throw new Error(
        "请提供以下任一选项：1) 完整的图片 URL，或 2) baseUrl + path"
      );
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
   * 拼接 URL
   * 如果 path 以 http:// 或 https:// 开头，则直接返回 path
   * 否则，将 baseUrl 和 path 拼接
   */
  private concatenateUrl(baseUrl: string, path: string): string {
    // 检测 path 是否已经是完整的 URL
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    // 移除 baseUrl 末尾的斜杠
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    // 移除 path 开头的斜杠
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;

    return `${cleanBaseUrl}/${cleanPath}`;
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
