'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import ImageUploader from './components/ImageUploader';
import ImagePreview from './components/ImagePreview';
import SplitSettings from './components/SplitSettings';
import ResultPreview from './components/ResultPreview';

import { 
  AppState, 
  ImageOrientation, 
  ProcessedImage, 
  SplitConfig,
  CropArea
} from './utils/types';

import { 
  splitImage, 
  canvasToBlob, 
  rotateImage,
  createBlurredBackground,
  calculateGrid
} from './utils/imageProcessing';

import {
  createImageProcessingWorker,
  ImageProcessingWorkerMessage
} from './utils/imageWorker';

const initialState: AppState = {
  originalImage: null,
  imageUrl: null,
  imageOrientation: 'square',
  rotationDegrees: 0,
  presetScene: 'wechat',
  splitConfig: {
    count: 4,
    aspectRatio: { width: 1, height: 1 },
    layoutMode: 'grid'
  },
  customAspectRatio: { width: 1, height: 1 },
  cropArea: null,
  slicedImages: [],
  isProcessing: false,
  error: null
};

export default function Home() {
  const [state, setState] = useState<AppState>(initialState);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // 处理图片上传
  const handleImageUpload = useCallback((file: File) => {
    // 重置状态
    setState(prev => ({
      ...initialState,
      originalImage: file,
      imageUrl: URL.createObjectURL(file),
    }));
  }, []);
  
  // 处理图片旋转
  const handleRotate = useCallback((degrees: number) => {
    setState(prev => ({
      ...prev,
      rotationDegrees: degrees,
      slicedImages: [] // 清除之前的切割结果
    }));
  }, []);
  
  // 处理图片方向变更
  const handleOrientationChange = useCallback((orientation: ImageOrientation) => {
    setState(prev => ({
      ...prev,
      imageOrientation: orientation,
      slicedImages: [] // 清除之前的切割结果
    }));
  }, []);
  
  // 处理切割设置变更
  const handleSettingsChange = useCallback((settings: SplitConfig) => {
    setState(prev => ({
      ...prev,
      splitConfig: settings,
      slicedImages: [] // 清除之前的切割结果
    }));
  }, []);
  
  // 处理裁剪区域变更
  const handleCropChange = useCallback((cropArea: CropArea) => {
    // 使用函数式更新，避免重复读取旧state
    setState(prev => {
      // 如果裁剪区域没有实质性变化，不更新状态
      if (prev.cropArea && 
          Math.abs(prev.cropArea.x - cropArea.x) < 1 &&
          Math.abs(prev.cropArea.y - cropArea.y) < 1 &&
          Math.abs(prev.cropArea.width - cropArea.width) < 1 &&
          Math.abs(prev.cropArea.height - cropArea.height) < 1) {
        return prev; // 返回原始状态，不触发重渲染
      }
      
      return {
        ...prev,
        cropArea,
        slicedImages: [] // 清除之前的切割结果
      };
    });
  }, []);
  
  // 应用裁剪并绘制到临时Canvas
  const applyCrop = useCallback((sourceCanvas: HTMLCanvasElement, cropArea: CropArea): HTMLCanvasElement => {
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('无法创建临时画布上下文');
    }
    
    try {
      // 设置裁剪区域尺寸
      tempCanvas.width = cropArea.width;
      tempCanvas.height = cropArea.height;
      
      // 从原始画布裁剪指定区域
      ctx.drawImage(
        sourceCanvas,
        Math.max(0, cropArea.x), 
        Math.max(0, cropArea.y), 
        Math.min(cropArea.width, sourceCanvas.width - cropArea.x),
        Math.min(cropArea.height, sourceCanvas.height - cropArea.y),
        0, 0, cropArea.width, cropArea.height
      );
      
      return tempCanvas;
    } catch (error) {
      console.error('裁剪失败:', error);
      // 如果裁剪失败，返回原始画布
      return sourceCanvas;
    }
  }, []);
  
  // 处理图片切割
  const handleSplitImage = useCallback(async () => {
    if (!state.imageUrl || !canvasRef.current || !imageRef.current) {
      setState(prev => ({ ...prev, error: '请先上传图片' }));
      return;
    }
    
    setState(prev => ({ ...prev, isProcessing: true, error: null }));
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas上下文创建失败');
      }
      
      // 根据当前图片和旋转角度绘制到Canvas
      try {
        rotateImage(ctx, canvas, imageRef.current, state.rotationDegrees);
      } catch (rotateError) {
        console.error('图片旋转失败:', rotateError);
        throw new Error('图片旋转处理失败');
      }
      
      // 使用Web Worker进行切割处理
      const processedImages: ProcessedImage[] = [];
      
      // 如果有裁剪区域，应用裁剪
      let sourceCanvas = canvas;
      if (state.cropArea) {
        try {
          console.log('应用裁剪区域:', state.cropArea);
          sourceCanvas = applyCrop(canvas, state.cropArea);
        } catch (cropError) {
          console.error('应用裁剪区域失败:', cropError);
          // 继续使用原始画布
        }
      }
      
      // 根据配置切割图片
      let slicedCanvases;
      try {
        // 获取基础单个图片比例（不考虑数量）
        let baseAspectRatio = { ...state.splitConfig.aspectRatio };
        
        // 根据布局模式恢复单个图片的比例
        if (state.splitConfig.layoutMode === 'horizontal' && state.splitConfig.count > 1) {
          baseAspectRatio = {
            width: state.splitConfig.aspectRatio.width / state.splitConfig.count,
            height: state.splitConfig.aspectRatio.height
          };
        } else if (state.splitConfig.layoutMode === 'vertical' && state.splitConfig.count > 1) {
          baseAspectRatio = {
            width: state.splitConfig.aspectRatio.width,
            height: state.splitConfig.aspectRatio.height / state.splitConfig.count
          };
        } else if (state.splitConfig.layoutMode === 'grid' && state.splitConfig.count > 1) {
          // 计算网格布局
          const isLandscape = sourceCanvas.width > sourceCanvas.height;
          const grid = calculateGrid(state.splitConfig.count, isLandscape);
          baseAspectRatio = {
            width: state.splitConfig.aspectRatio.width / grid.cols,
            height: state.splitConfig.aspectRatio.height / grid.rows
          };
        }
        
        slicedCanvases = splitImage(
          sourceCanvas,
          state.splitConfig.count,
          baseAspectRatio, // 使用恢复后的单个图片比例
          state.splitConfig.layoutMode
        );
      } catch (splitError) {
        console.error('图片切割失败:', splitError);
        throw new Error('图片切割处理失败');
      }
      
      // 转换Canvas为Blob并创建URL
      for (const sliceCanvas of slicedCanvases) {
        try {
          // 获取原始图片的MIME类型
          const mimeType = state.originalImage?.type || 'image/jpeg';
          const blob = await canvasToBlob(sliceCanvas, mimeType);
          const url = URL.createObjectURL(blob);
          
          processedImages.push({
            imageUrl: url,
            blob
          });
        } catch (error) {
          console.error('切片处理失败:', error);
        }
      }
      
      if (processedImages.length === 0) {
        throw new Error('未能生成任何切片图片');
      }
      
      setState(prev => ({
        ...prev,
        slicedImages: processedImages,
        isProcessing: false
      }));
    } catch (error) {
      console.error('图片处理失败:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '图片处理失败，请重试',
        isProcessing: false
      }));
    }
  }, [state.imageUrl, state.rotationDegrees, state.splitConfig, state.originalImage, state.cropArea, applyCrop]);
  
  // 下载所有切割图片
  const handleDownloadAll = useCallback(() => {
    if (state.slicedImages.length === 0) return;
    
    // 获取原始文件名（不含扩展名）
    const originalFilename = state.originalImage?.name || 'image';
    const fileExt = originalFilename.split('.').pop() || 'jpg';
    const filenameBase = originalFilename.replace(`.${fileExt}`, '');
    
    // 逐一下载
    state.slicedImages.forEach((image, index) => {
      const filename = `${filenameBase}_${index + 1}.${fileExt}`;
      const url = URL.createObjectURL(image.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // 在短暂延迟后撤销URL（避免浏览器下载冲突）
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
    });
  }, [state.slicedImages, state.originalImage]);
  
  // 加载图片到隐藏的Image元素
  useEffect(() => {
    if (!state.imageUrl) return;
    
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      
      // 准备隐藏的Canvas
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        }
      }
    };
    
    img.src = state.imageUrl;
    
    // 清理函数
    return () => {
      // 释放图片URL
      if (state.imageUrl && state.imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(state.imageUrl);
      }
    };
  }, [state.imageUrl]);
  
  // 清理切割图片URL
  useEffect(() => {
    return () => {
      state.slicedImages.forEach(image => {
        if (image.imageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(image.imageUrl);
        }
      });
    };
  }, [state.slicedImages]);
  
  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-8">图片切割工具</h1>
      
      {/* 隐藏的Canvas用于图像处理 */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <canvas ref={cropCanvasRef} style={{ display: 'none' }} />
      
      {/* 图片上传区域 */}
      {!state.imageUrl && (
        <ImageUploader onImageUpload={handleImageUpload} />
      )}
      
      {/* 图片处理区域 */}
      {state.imageUrl && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/2">
              {/* 图片预览与旋转 */}
              <ImagePreview
                imageUrl={state.imageUrl}
                rotationDegrees={state.rotationDegrees}
                aspectRatio={state.splitConfig.aspectRatio}
                onRotate={handleRotate}
                onOrientationChange={handleOrientationChange}
                onCropChange={handleCropChange}
                initialCropArea={state.cropArea}
              />
              
              {/* 重新上传按钮 */}
              <div className="mt-4 text-center">
                <button
                  onClick={() => setState(initialState)}
                  className="text-blue-500 hover:text-blue-700 underline"
                >
                  重新上传图片
                </button>
              </div>
            </div>
            
            <div className="w-full md:w-1/2">
              {/* 切割设置 */}
              <SplitSettings
                imageOrientation={state.imageOrientation}
                onSettingsChange={handleSettingsChange}
              />
              
              {/* 执行切割按钮 */}
              <div className="mt-6 text-center">
                <button
                  onClick={handleSplitImage}
                  disabled={state.isProcessing}
                  className={`
                    w-full py-3 rounded-lg text-white font-medium 
                    ${state.isProcessing 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-500 hover:bg-blue-600'}
                  `}
                >
                  {state.isProcessing ? '正在处理...' : '开始切割'}
                </button>
                
                {state.error && (
                  <div className="mt-2 text-red-500">{state.error}</div>
                )}
              </div>
            </div>
          </div>
          
          {/* 切割结果展示 */}
          {state.slicedImages.length > 0 && (
            <ResultPreview
              slicedImages={state.slicedImages}
              originalFilename={state.originalImage?.name || 'image.jpg'}
              onDownloadAll={handleDownloadAll}
            />
          )}
        </div>
      )}
      
      {/* 页脚信息 */}
      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>图片切割工具 - 纯前端实现，所有处理在浏览器中完成</p>
        <p className="mt-1">支持JPG、PNG和WebP格式，大小不超过10MB</p>
      </footer>
    </main>
  );
}
