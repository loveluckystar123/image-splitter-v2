'use client';

import { useRef, useEffect, useState } from 'react';
import { CropArea } from '../utils/types';

interface CropBoxProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  aspectRatio: number; // 宽高比
  onChange: (cropArea: CropArea) => void;
  initialCropArea?: CropArea | null;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

const CropBox: React.FC<CropBoxProps> = ({
  containerRef,
  aspectRatio,
  onChange,
  initialCropArea = null,
  canvasRef
}) => {
  const [crop, setCrop] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  const cropBoxRef = useRef<HTMLDivElement>(null);
  
  // 初始化裁剪框
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
    
    setContainerSize({ width: containerWidth, height: containerHeight });
    
    // 如果存在初始裁剪区域则使用它
    if (initialCropArea) {
      setCrop(initialCropArea);
      return;
    }
    
    // 计算裁剪框的初始大小和位置
    let cropWidth, cropHeight;
    
    // 使用canvas尺寸作为参考，如果有的话
    if (canvasRef?.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      
      if (canvasRect.width / canvasRect.height > aspectRatio) {
        // canvas较宽
        cropHeight = canvasRect.height * 0.9;
        cropWidth = cropHeight * aspectRatio;
      } else {
        // canvas较高
        cropWidth = canvasRect.width * 0.9;
        cropHeight = cropWidth / aspectRatio;
      }
      
      // 获取canvas相对于容器的位置
      const canvasLeft = canvasRect.left - container.getBoundingClientRect().left;
      const canvasTop = canvasRect.top - container.getBoundingClientRect().top;
      
      // 居中放置在canvas上
      const x = canvasLeft + (canvasRect.width - cropWidth) / 2;
      const y = canvasTop + (canvasRect.height - cropHeight) / 2;
      
      const newCrop = { 
        x, 
        y, 
        width: cropWidth,
        height: cropHeight
      };
      
      setCrop(newCrop);
      onChange(newCrop);
      return;
    }
    
    // 如果没有canvas参考，则使用容器尺寸
    if (containerWidth / containerHeight > aspectRatio) {
      // 容器较宽
      cropHeight = containerHeight * 0.8;
      cropWidth = cropHeight * aspectRatio;
    } else {
      // 容器较高
      cropWidth = containerWidth * 0.8;
      cropHeight = cropWidth / aspectRatio;
    }
    
    // 确保不超出边界
    if (cropWidth > containerWidth) {
      cropWidth = containerWidth * 0.9;
      cropHeight = cropWidth / aspectRatio;
    }
    
    if (cropHeight > containerHeight) {
      cropHeight = containerHeight * 0.9;
      cropWidth = cropHeight * aspectRatio;
    }
    
    // 居中放置
    const x = Math.max(0, (containerWidth - cropWidth) / 2);
    const y = Math.max(0, (containerHeight - cropHeight) / 2);
    
    const newCrop = { 
      x, 
      y, 
      width: Math.min(cropWidth, containerWidth), 
      height: Math.min(cropHeight, containerHeight) 
    };
    
    setCrop(newCrop);
    onChange(newCrop);
  }, [containerRef, canvasRef, aspectRatio, onChange, initialCropArea]);
  
  // 处理裁剪框拖动
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const { clientX, clientY } = e;
    setDragStart({ x: clientX, y: clientY });
    setIsDragging(true);
  };
  
  // 处理裁剪框调整大小
  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const { clientX, clientY } = e;
    setDragStart({ x: clientX, y: clientY });
    setIsResizing(true);
  };
  
  // 处理鼠标移动
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging && !isResizing) return;
      
      const { clientX, clientY } = e;
      const deltaX = clientX - dragStart.x;
      const deltaY = clientY - dragStart.y;
      
      // 只有移动超过1px才处理，避免微小移动触发过多更新
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
      
      if (isDragging) {
        // 拖动逻辑
        setCrop(prev => {
          // 计算新位置
          let newX = prev.x + deltaX;
          let newY = prev.y + deltaY;
          
          // 限制在容器内
          newX = Math.max(0, Math.min(newX, containerSize.width - prev.width));
          newY = Math.max(0, Math.min(newY, containerSize.height - prev.height));
          
          // 取整，避免小数位导致无限更新
          newX = Math.round(newX);
          newY = Math.round(newY);
          
          const newCrop = { ...prev, x: newX, y: newY };
          onChange(newCrop);
          return newCrop;
        });
        
        setDragStart({ x: clientX, y: clientY });
      } else if (isResizing) {
        // 调整大小逻辑（保持宽高比）
        setCrop(prev => {
          // 根据宽高比调整尺寸
          let newWidth = prev.width + deltaX;
          let newHeight = newWidth / aspectRatio;
          
          // 限制不小于最小尺寸
          const minSize = 50;
          if (newWidth < minSize) {
            newWidth = minSize;
            newHeight = newWidth / aspectRatio;
          }
          
          // 限制不超过容器
          if (prev.x + newWidth > containerSize.width) {
            newWidth = containerSize.width - prev.x;
            newHeight = newWidth / aspectRatio;
          }
          
          if (prev.y + newHeight > containerSize.height) {
            newHeight = containerSize.height - prev.y;
            newWidth = newHeight * aspectRatio;
          }
          
          // 取整，避免小数位导致无限更新
          newWidth = Math.round(newWidth);
          newHeight = Math.round(newHeight);
          
          const newCrop = { ...prev, width: newWidth, height: newHeight };
          onChange(newCrop);
          return newCrop;
        });
        
        setDragStart({ x: clientX, y: clientY });
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };
    
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, containerSize, aspectRatio, onChange]);
  
  // 当宽高比变化时更新裁剪框
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
    
    // 重新计算裁剪框的大小和位置（与初始化逻辑相似）
    let cropWidth, cropHeight;
    
    // 使用canvas尺寸作为参考，如果有的话
    if (canvasRef?.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      
      if (canvasRect.width / canvasRect.height > aspectRatio) {
        // canvas较宽
        cropHeight = canvasRect.height * 0.9;
        cropWidth = cropHeight * aspectRatio;
      } else {
        // canvas较高
        cropWidth = canvasRect.width * 0.9;
        cropHeight = cropWidth / aspectRatio;
      }
      
      // 获取canvas相对于容器的位置
      const canvasLeft = canvasRect.left - container.getBoundingClientRect().left;
      const canvasTop = canvasRect.top - container.getBoundingClientRect().top;
      
      // 居中放置在canvas上
      const x = canvasLeft + (canvasRect.width - cropWidth) / 2;
      const y = canvasTop + (canvasRect.height - cropHeight) / 2;
      
      const newCrop = { 
        x, 
        y, 
        width: cropWidth,
        height: cropHeight
      };
      
      setCrop(newCrop);
      onChange(newCrop);
      return;
    }
    
    // 如果没有canvas参考，则使用容器尺寸
    if (containerWidth / containerHeight > aspectRatio) {
      // 容器较宽
      cropHeight = containerHeight * 0.8;
      cropWidth = cropHeight * aspectRatio;
    } else {
      // 容器较高
      cropWidth = containerWidth * 0.8;
      cropHeight = cropWidth / aspectRatio;
    }
    
    // 确保不超出边界
    if (cropWidth > containerWidth) {
      cropWidth = containerWidth * 0.9;
      cropHeight = cropWidth / aspectRatio;
    }
    
    if (cropHeight > containerHeight) {
      cropHeight = containerHeight * 0.9;
      cropWidth = cropHeight * aspectRatio;
    }
    
    // 居中放置
    const x = Math.max(0, (containerWidth - cropWidth) / 2);
    const y = Math.max(0, (containerHeight - cropHeight) / 2);
    
    const newCrop = { 
      x, 
      y, 
      width: Math.min(cropWidth, containerWidth), 
      height: Math.min(cropHeight, containerHeight) 
    };
    
    setCrop(newCrop);
    onChange(newCrop);
  }, [aspectRatio, containerRef, canvasRef, onChange]);
  
  return (
    <div
      ref={cropBoxRef}
      className="absolute bg-transparent"
      style={{
        left: `${crop.x}px`,
        top: `${crop.y}px`,
        width: `${crop.width}px`,
        height: `${crop.height}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
        border: '2px solid rgba(59, 130, 246, 0.8)',
        zIndex: 10
      }}
      onMouseDown={handleMouseDown}
    >
      {/* 调整大小手柄 */}
      <div
        className="absolute w-5 h-5 -bottom-2.5 -right-2.5 cursor-se-resize
                   bg-white border-2 border-blue-500 rounded-full
                   flex items-center justify-center
                   hover:scale-110"
        onMouseDown={handleResizeMouseDown}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-blue-500">
          <path fillRule="evenodd" d="M4.5 2A2.5 2.5 0 002 4.5v11A2.5 2.5 0 004.5 18h11a2.5 2.5 0 002.5-2.5v-11A2.5 2.5 0 0015.5 2h-11zM8 8h4v4H8V8z" clipRule="evenodd" />
        </svg>
      </div>
      
      {/* 网格线 */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
        <div className="border-r border-white/40 col-start-1 row-span-3"></div>
        <div className="border-r border-white/40 col-start-2 row-span-3"></div>
        <div className="border-b border-white/40 row-start-1 col-span-3"></div>
        <div className="border-b border-white/40 row-start-2 col-span-3"></div>
      </div>
      
      {/* 四角装饰 */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-blue-400"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-blue-400"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-blue-400"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-blue-400"></div>
      
      {/* 裁剪尺寸标签 */}
      <div className="absolute -bottom-7 right-0 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
        {Math.round(crop.width)} × {Math.round(crop.height)}
      </div>
    </div>
  );
};

export default CropBox; 