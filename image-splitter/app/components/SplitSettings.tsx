'use client';

import React, { useState, useEffect } from 'react';
import { ImageOrientation, LayoutMode, PresetScene, SplitConfig } from '../utils/types';

interface SplitSettingsProps {
  imageOrientation: ImageOrientation;
  onSettingsChange: (settings: SplitConfig) => void;
}

const SplitSettings: React.FC<SplitSettingsProps> = ({
  imageOrientation,
  onSettingsChange
}) => {
  // 场景预设
  const [selectedScene, setSelectedScene] = useState<PresetScene>('wechat');
  
  // 自定义比例
  const [customRatio, setCustomRatio] = useState({
    width: 1,
    height: 1
  });
  
  // 切割数量
  const [count, setCount] = useState(4);
  
  // 布局模式
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  
  // 预设场景配置
  const presetScenes = {
    wechat: { width: 1, height: 1, name: '朋友圈' },
    xiaohongshu: { width: 3, height: 4, name: '小红书' },
    custom: { width: customRatio.width, height: customRatio.height, name: '自定义' }
  };
  
  // 支持的切割数量
  const supportedCounts = [1, 2, 4, 6, 9];
  
  // 更新设置
  useEffect(() => {
    const currentRatio = selectedScene === 'custom'
      ? customRatio
      : presetScenes[selectedScene];
    
    // 根据布局模式和切割数量调整实际裁剪比例
    let adjustedWidth = currentRatio.width;
    let adjustedHeight = currentRatio.height;
    
    if (layoutMode === 'horizontal' && count > 1) {
      // 横向切割时，宽度需要乘以切割数量
      adjustedWidth = currentRatio.width * count;
      adjustedHeight = currentRatio.height;
    } else if (layoutMode === 'vertical' && count > 1) {
      // 纵向切割时，高度需要乘以切割数量
      adjustedWidth = currentRatio.width;
      adjustedHeight = currentRatio.height * count;
    } else if (layoutMode === 'grid' && count > 1) {
      // 网格模式下，根据网格布局调整比例
      const isLandscape = true; // 默认使用横版布局计算
      const { rows, cols } = calculateGridLayout(count, isLandscape);
      adjustedWidth = currentRatio.width * cols;
      adjustedHeight = currentRatio.height * rows;
    }
    
    onSettingsChange({
      count,
      aspectRatio: {
        width: adjustedWidth,
        height: adjustedHeight
      },
      layoutMode
    });
  }, [selectedScene, customRatio, count, layoutMode, onSettingsChange]);
  
  // 计算网格布局
  const calculateGridLayout = (count: number, isLandscape: boolean) => {
    if (count <= 1) return { rows: 1, cols: 1 };
    if (count === 2) return isLandscape ? { rows: 1, cols: 2 } : { rows: 2, cols: 1 };
    if (count === 4) return { rows: 2, cols: 2 };
    if (count === 6) return isLandscape ? { rows: 2, cols: 3 } : { rows: 3, cols: 2 };
    if (count === 9) return { rows: 3, cols: 3 };
    
    // 默认网格布局
    const sqrt = Math.sqrt(count);
    const cols = Math.ceil(sqrt);
    const rows = Math.ceil(count / cols);
    return { rows, cols };
  };
  
  // 处理自定义比例变更
  const handleCustomRatioChange = (dimension: 'width' | 'height', value: string) => {
    const numValue = parseInt(value, 10);
    
    if (numValue > 0 && numValue <= 99) {
      setCustomRatio(prev => ({
        ...prev,
        [dimension]: numValue
      }));
    }
  };
  
  // 根据图片方向推荐布局模式
  useEffect(() => {
    if (count === 1) {
      setLayoutMode('grid');
      return;
    }
    
    if (imageOrientation === 'landscape') {
      setLayoutMode(count <= 2 ? 'horizontal' : 'grid');
    } else if (imageOrientation === 'portrait') {
      setLayoutMode(count <= 2 ? 'vertical' : 'grid');
    } else {
      setLayoutMode('grid');
    }
  }, [imageOrientation, count]);
  
  return (
    <div className="bg-white rounded-lg shadow p-4 my-4">
      <h3 className="text-lg font-medium mb-4">切割设置</h3>
      
      {/* 场景选择 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择场景
        </label>
        <div className="flex gap-2">
          {Object.entries(presetScenes).map(([key, scene]) => (
            <button
              key={key}
              onClick={() => setSelectedScene(key as PresetScene)}
              className={`
                px-3 py-2 rounded-md text-sm 
                ${selectedScene === key 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}
              `}
            >
              {scene.name} ({scene.width}:{scene.height})
            </button>
          ))}
        </div>
      </div>
      
      {/* 自定义比例设置 */}
      {selectedScene === 'custom' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            自定义比例
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="99"
              value={customRatio.width}
              onChange={(e) => handleCustomRatioChange('width', e.target.value)}
              className="w-16 p-2 border border-gray-300 rounded"
            />
            <span className="text-gray-600">:</span>
            <input
              type="number"
              min="1"
              max="99"
              value={customRatio.height}
              onChange={(e) => handleCustomRatioChange('height', e.target.value)}
              className="w-16 p-2 border border-gray-300 rounded"
            />
          </div>
        </div>
      )}
      
      {/* 切割数量选择 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          切割数量
        </label>
        <div className="flex flex-wrap gap-2">
          {supportedCounts.map((num) => (
            <button
              key={num}
              onClick={() => setCount(num)}
              className={`
                px-3 py-2 rounded-md text-sm 
                ${count === num 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}
              `}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
      
      {/* 布局模式选择 */}
      {count > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            排列方式
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setLayoutMode('horizontal')}
              className={`
                px-3 py-2 rounded-md text-sm 
                ${layoutMode === 'horizontal' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}
              `}
            >
              横向排列
            </button>
            <button
              onClick={() => setLayoutMode('vertical')}
              className={`
                px-3 py-2 rounded-md text-sm 
                ${layoutMode === 'vertical' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}
              `}
            >
              纵向排列
            </button>
            <button
              onClick={() => setLayoutMode('grid')}
              className={`
                px-3 py-2 rounded-md text-sm 
                ${layoutMode === 'grid' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}
              `}
            >
              网格排列
            </button>
          </div>
        </div>
      )}
      
      {/* 当前设置摘要 */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm text-gray-700">
        <p>当前设置: </p>
        <p>
          场景: {presetScenes[selectedScene].name} 
          <span className="text-gray-500">
            (基础比例 {presetScenes[selectedScene].width}:{presetScenes[selectedScene].height})
          </span>
        </p>
        <p>切割数量: {count}</p>
        <p>
          排列方式: {
            layoutMode === 'horizontal' ? '横向排列' : 
            layoutMode === 'vertical' ? '纵向排列' : '网格排列'
          }
        </p>
        <p className="text-blue-600 mt-1">
          实际裁剪比例: {
            (() => {
              // 计算调整后的比例
              let adjWidth = presetScenes[selectedScene].width;
              let adjHeight = presetScenes[selectedScene].height;
              
              if (layoutMode === 'horizontal' && count > 1) {
                adjWidth = adjWidth * count;
              } else if (layoutMode === 'vertical' && count > 1) {
                adjHeight = adjHeight * count;
              } else if (layoutMode === 'grid' && count > 1) {
                const isLandscape = true;
                const { rows, cols } = calculateGridLayout(count, isLandscape);
                adjWidth = adjWidth * cols;
                adjHeight = adjHeight * rows;
              }
              
              return `${adjWidth}:${adjHeight}`;
            })()
          }
        </p>
      </div>
    </div>
  );
};

export default SplitSettings; 