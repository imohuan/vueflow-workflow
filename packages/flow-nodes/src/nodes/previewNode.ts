import {
  BaseFlowNode,
  type PortConfig,
  type NodeStyleConfig,
  type NodeExecutionContext,
  type NodeExecutionResult,
} from "../BaseFlowNode";

/**
 * 图片预览节点（调试用）
 * 用于预览图片 URL 或通过 baseUrl 补全相对路径
 * 注：禁止使用 basedata 等大数据，仅支持 URL 方式
 */
export class ImagePreviewNode extends BaseFlowNode {
  readonly type = "preview";
  readonly label = "图片预览";
  readonly description = "预览图片，支持完整 URL 或相对路径";
  readonly category = "工具";

  protected defineInputs(): PortConfig[] {
    return [
      {
        name: "imageUrl",
        type: "string",
        description: "图片 URL",
        required: false,
      },
      {
        name: "baseUrl",
        type: "string",
        description: "基础 URL",
        required: false,
      },
    ];
  }

  protected defineOutputs(): PortConfig[] {
    return [
      {
        name: "imageUrl",
        type: "string",
        description: "处理后的图片地址",
      },
      {
        name: "imageInfo",
        type: "object",
        description: "图片的元数据信息",
      },
    ];
  }

  protected getStyleConfig(): NodeStyleConfig {
    return {
      headerColor: ["#8b5cf6", "#7c3aed"], // 紫色渐变
      icon: "image",
      showIcon: true,
      bodyStyle: {
        minWidth: "300px",
        minHeight: "200px",
      },
    };
  }

  async execute(
    inputs: Record<string, any>,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      const imageUrl = this.getInput<string>(inputs, "imageUrl", "");
      const baseUrl = this.getInput<string>(inputs, "baseUrl", "");

      // 确定最终的图片地址
      let finalImageUrl: string;

      if (!imageUrl) {
        return this.createError("请提供图片 URL 或相对路径");
      }

      // 检查是否为完整 URL
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        // 完整 URL，直接使用
        finalImageUrl = imageUrl;
      } else {
        // 相对路径，需要拼接 baseUrl
        if (!baseUrl) {
          return this.createError("相对路径需要提供 baseUrl");
        }
        finalImageUrl = this.concatenateUrl(baseUrl, imageUrl);
      }

      // 尝试获取图片尺寸（仅在浏览器环境）
      let imageInfo: any = {
        url: finalImageUrl,
        type: "url",
        size: "未知",
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

      return this.createOutput(
        {
          imageUrl: finalImageUrl,
          imageInfo,
        },
        summary
      );
    } catch (error) {
      return this.createError(error as Error);
    }
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
