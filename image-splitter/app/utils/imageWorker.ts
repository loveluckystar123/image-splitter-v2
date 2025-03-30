// 图像处理Web Worker

// 此文件用于创建Web Worker处理图像切割，以避免主线程阻塞
export const createImageProcessingWorker = () => {
  const workerCode = `
    self.onmessage = function(e) {
      const { imageData, count, aspectRatio, layoutMode } = e.data;
      
      // 创建离屏Canvas
      const canvas = new OffscreenCanvas(imageData.width, imageData.height);
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        self.postMessage({ success: false, error: 'Failed to create canvas context' });
        return;
      }
      
      // 绘制图像数据
      ctx.putImageData(imageData, 0, 0);
      
      // 切割图像
      const result = splitImage(canvas, count, aspectRatio, layoutMode);
      
      // 将结果发送回主线程
      self.postMessage({ 
        success: true, 
        slices: result.map(slice => slice.transferToImageBitmap())
      }, result.map(slice => slice.transferToImageBitmap()));
    };
    
    // 切割图像的实现
    function splitImage(canvas, count, aspectRatio, layoutMode) {
      const { width: canvasWidth, height: canvasHeight } = canvas;
      const result = [];
      
      // 根据布局模式计算切割方式
      let rows = 1;
      let cols = 1;
      
      const isLandscapeImg = canvasWidth > canvasHeight;
      
      if (layoutMode === 'horizontal') {
        rows = 1;
        cols = count;
      } else if (layoutMode === 'vertical') {
        rows = count;
        cols = 1;
      } else {
        // 网格模式
        const grid = calculateGrid(count, isLandscapeImg);
        rows = grid.rows;
        cols = grid.cols;
      }
      
      // 计算每个子图的尺寸
      const sliceWidth = canvasWidth / cols;
      const sliceHeight = canvasHeight / rows;
      
      // 应用宽高比
      const targetRatio = aspectRatio.width / aspectRatio.height;
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (row * cols + col >= count) break;
          
          // 创建子画布
          const sliceCanvas = new OffscreenCanvas(sliceWidth, sliceHeight);
          const sliceCtx = sliceCanvas.getContext('2d');
          if (!sliceCtx) continue;
          
          // 根据宽高比计算实际输出尺寸
          let outputWidth = sliceWidth;
          let outputHeight = sliceHeight;
          
          const currentRatio = outputWidth / outputHeight;
          
          if (currentRatio > targetRatio) {
            // 当前比例过宽，按高度调整
            outputWidth = outputHeight * targetRatio;
          } else {
            // 当前比例过高，按宽度调整
            outputHeight = outputWidth / targetRatio;
          }
          
          sliceCanvas.width = outputWidth;
          sliceCanvas.height = outputHeight;
          
          // 计算裁剪区域
          const sourceX = col * sliceWidth;
          const sourceY = row * sliceHeight;
          
          // 绘制到子画布
          sliceCtx.drawImage(
            canvas,
            sourceX, sourceY, sliceWidth, sliceHeight,
            0, 0, outputWidth, outputHeight
          );
          
          result.push(sliceCanvas);
        }
      }
      
      return result;
    }
    
    // 计算网格布局
    function calculateGrid(count, isLandscapeOrientation) {
      if (count <= 1) return { rows: 1, cols: 1 };
      if (count === 2) return isLandscapeOrientation ? { rows: 1, cols: 2 } : { rows: 2, cols: 1 };
      if (count === 4) return { rows: 2, cols: 2 };
      if (count === 6) return isLandscapeOrientation ? { rows: 2, cols: 3 } : { rows: 3, cols: 2 };
      if (count === 9) return { rows: 3, cols: 3 };
      
      // 默认网格布局
      const sqrt = Math.sqrt(count);
      const cols = Math.ceil(sqrt);
      const rows = Math.ceil(count / cols);
      return { rows, cols };
    }
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  
  return new Worker(url);
};

// 类型定义
export interface ImageProcessingWorkerMessage {
  imageData: ImageData;
  count: number;
  aspectRatio: { width: number; height: number };
  layoutMode: 'horizontal' | 'vertical' | 'grid';
}

export interface ImageProcessingWorkerResult {
  success: boolean;
  slices?: ImageBitmap[];
  error?: string;
} 