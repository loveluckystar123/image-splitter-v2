'use client';

import { useRef, useEffect, useState } from 'react';
import { FiRotateCw, FiRotateCcw } from 'react-icons/fi';
import { CropArea, ImageOrientation } from '../utils/types';
import { isLandscape, isPortrait } from '../utils/imageProcessing';
import CropBox from './CropBox';

interface ImagePreviewProps {
  imageUrl: string;
  rotationDegrees: number;
  aspectRatio: { width: number; height: number };
  onRotate: (degrees: number) => void;
  onOrientationChange: (orientation: ImageOrientation) => void;
  onCropChange: (crop: CropArea) => void;
  initialCropArea?: CropArea | null;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageUrl,
  rotationDegrees,
  aspectRatio,
  onRotate,
  onOrientationChange,
  onCropChange,
  initialCropArea = null
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [orientation, setOrientation] = useState<ImageOrientation>('square');
  const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);
  
  // 旋转图片
  const handleRotate = (direction: 'cw' | 'ccw') => {
    const newRotation = (rotationDegrees + (direction === 'cw' ? 90 : -90)) % 360;
    onRotate(newRotation >= 0 ? newRotation : newRotation + 360);
  };
  
  // 设置图片方向
  const handleOrientationChange = (newOrientation: ImageOrientation) => {
    setOrientation(newOrientation);
    onOrientationChange(newOrientation);
  };
  
  // 处理裁剪区域变化
  const handleCropChange = (crop: CropArea) => {
    if (!canvasRef.current) return;
    
    // 将裁剪区域从显示坐标转换为原始图像坐标
    const scaleX = imageSize.width / canvasRef.current.width;
    const scaleY = imageSize.height / canvasRef.current.height;
    
    // 保留两位小数，避免浮点数精度问题导致无限循环
    const originalCrop: CropArea = {
      x: Math.round(crop.x * scaleX * 100) / 100,
      y: Math.round(crop.y * scaleY * 100) / 100,
      width: Math.round(crop.width * scaleX * 100) / 100,
      height: Math.round(crop.height * scaleY * 100) / 100
    };
    
    // 比较前后值，只有真正变化时才更新
    if (!initialCropArea || 
        Math.abs(originalCrop.x - initialCropArea.x) > 0.1 ||
        Math.abs(originalCrop.y - initialCropArea.y) > 0.1 ||
        Math.abs(originalCrop.width - initialCropArea.width) > 0.1 ||
        Math.abs(originalCrop.height - initialCropArea.height) > 0.1) {
      onCropChange(originalCrop);
    }
  };
  
  // 绘制图片到Canvas
  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setLoading(true);
    
    const img = new Image();
    img.onload = () => {
      // 获取原始尺寸
      const { naturalWidth, naturalHeight } = img;
      setImageSize({ width: naturalWidth, height: naturalHeight });
      
      // 确定图片方向
      if (isLandscape(naturalWidth, naturalHeight)) {
        handleOrientationChange('landscape');
      } else if (isPortrait(naturalWidth, naturalHeight)) {
        handleOrientationChange('portrait');
      } else {
        handleOrientationChange('square');
      }
      
      // 调整Canvas尺寸
      let canvasWidth = 0;
      let canvasHeight = 0;
      const maxSize = 500; // 最大显示尺寸
      
      if (naturalWidth > naturalHeight) {
        canvasWidth = Math.min(naturalWidth, maxSize);
        canvasHeight = (naturalHeight / naturalWidth) * canvasWidth;
      } else {
        canvasHeight = Math.min(naturalHeight, maxSize);
        canvasWidth = (naturalWidth / naturalHeight) * canvasHeight;
      }
      
      // 取整避免小数点
      canvasWidth = Math.round(canvasWidth);
      canvasHeight = Math.round(canvasHeight);
      
      // 根据旋转角度可能需要交换宽高
      if (rotationDegrees === 90 || rotationDegrees === 270) {
        canvas.width = canvasHeight;
        canvas.height = canvasWidth;
      } else {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
      }
      
      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 设置变换
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotationDegrees * Math.PI) / 180);
      
      // 绘制图片
      let drawWidth = canvasWidth;
      let drawHeight = canvasHeight;
      
      if (rotationDegrees === 90 || rotationDegrees === 270) {
        drawWidth = canvasHeight;
        drawHeight = canvasWidth;
      }
      
      ctx.drawImage(
        img,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );
      
      ctx.restore();
      setLoading(false);
      
      // 获取canvas在DOM中的位置信息
      setCanvasRect(canvas.getBoundingClientRect());
    };
    
    img.onerror = () => {
      console.error('图片加载失败');
      setLoading(false);
    };
    
    img.src = imageUrl;
  }, [imageUrl, rotationDegrees]);
  
  return (
    <div className="tech-card p-6 my-4">
      <h3 className="text-lg font-medium mb-4 text-gray-800">图片预览</h3>
      
      <div className="flex flex-col">
        <div className="relative">
          <div 
            ref={containerRef} 
            className="relative overflow-hidden bg-gray-100 rounded-lg border border-gray-200"
            style={{ height: '450px' }}
          >
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            {imageUrl && (
              <canvas
                ref={canvasRef}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
            )}
            
            {!loading && canvasRef.current && imageUrl && (
              <CropBox 
                containerRef={containerRef}
                aspectRatio={aspectRatio.width / aspectRatio.height}
                onChange={handleCropChange}
                initialCropArea={initialCropArea && canvasRef.current && imageSize.width > 0 ? {
                  x: Math.round(initialCropArea.x / (imageSize.width / canvasRef.current.width)),
                  y: Math.round(initialCropArea.y / (imageSize.height / canvasRef.current.height)),
                  width: Math.round(initialCropArea.width / (imageSize.width / canvasRef.current.width)),
                  height: Math.round(initialCropArea.height / (imageSize.height / canvasRef.current.height))
                } : null}
                canvasRef={canvasRef}
              />
            )}
            
            {!imageUrl && (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <p>请先上传图片</p>
              </div>
            )}
          </div>
        </div>
        
        {imageUrl && (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="py-2 px-3 bg-gray-50 rounded-md flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">
                图片尺寸: {imageSize.width} x {imageSize.height} px
              </span>
            </div>
            
            <div className="py-2 px-3 bg-gray-50 rounded-md flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">
                识别方向: {orientation === 'landscape' ? '横向' : orientation === 'portrait' ? '纵向' : '方形'}
              </span>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center mt-4 gap-4">
        <button
          onClick={() => handleRotate('ccw')}
          className="tech-button flex items-center gap-1 px-3 py-2 text-sm"
          disabled={loading}
        >
          <FiRotateCcw className="w-4 h-4" />
          逆时针旋转
        </button>
        <button
          onClick={() => handleRotate('cw')}
          className="tech-button flex items-center gap-1 px-3 py-2 text-sm"
          disabled={loading}
        >
          <FiRotateCw className="w-4 h-4" />
          顺时针旋转
        </button>
      </div>
      
      <div className="text-xs text-gray-500 mt-2">
        <span className="text-blue-500">提示:</span> 拖动裁剪框可调整位置，右下角手柄可调整大小
      </div>
    </div>
  );
};

export default ImagePreview; 