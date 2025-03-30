// 应用类型定义

// 预设场景类型
export type PresetScene = 'wechat' | 'xiaohongshu' | 'custom';

// 切割布局模式
export type LayoutMode = 'horizontal' | 'vertical' | 'grid';

// 图片方向
export type ImageOrientation = 'landscape' | 'portrait' | 'square';

// 支持的图片格式
export type SupportedImageType = 'image/jpeg' | 'image/png' | 'image/webp';

// 裁剪区域
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 切割参数
export interface SplitConfig {
  count: number;
  aspectRatio: {
    width: number;
    height: number;
  };
  layoutMode: LayoutMode;
}

// 应用状态
export interface AppState {
  originalImage: File | null;
  imageUrl: string | null;
  imageOrientation: ImageOrientation;
  rotationDegrees: number;
  presetScene: PresetScene;
  splitConfig: SplitConfig;
  customAspectRatio: {
    width: number;
    height: number;
  };
  cropArea: CropArea | null;
  slicedImages: {
    imageUrl: string;
    blob: Blob;
  }[];
  isProcessing: boolean;
  error: string | null;
}

// 图片处理结果
export interface ProcessedImage {
  imageUrl: string;
  blob: Blob;
} 