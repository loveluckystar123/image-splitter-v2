// 图像处理工具函数

// 检查图片是否为横版（宽高比≥1.2）
export const isLandscape = (width: number, height: number): boolean => {
  return width / height >= 1.2;
};

// 检查图片是否为竖版（宽高比≤0.8）
export const isPortrait = (width: number, height: number): boolean => {
  return width / height <= 0.8;
};

// 计算切割网格布局
export const calculateGrid = (
  count: number,
  isLandscapeOrientation: boolean
): { rows: number; cols: number } => {
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
};

// 图片旋转
export const rotateImage = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  degrees: number
): void => {
  const radians = (degrees * Math.PI) / 180;
  const { width, height } = canvas;
  
  // 清除画布
  ctx.clearRect(0, 0, width, height);
  
  // 保存上下文
  ctx.save();
  
  // 设置旋转中心点
  ctx.translate(width / 2, height / 2);
  ctx.rotate(radians);
  
  // 根据旋转角度决定绘制位置和尺寸
  let drawWidth = width;
  let drawHeight = height;
  
  if (degrees === 90 || degrees === 270) {
    // 旋转90度或270度时，宽高需要互换
    if (width > height) {
      // 原始图片是横向的
      drawWidth = height;
      drawHeight = width;
    } else {
      // 原始图片是纵向的
      drawWidth = height;
      drawHeight = width;
    }
  }
  
  // 绘制旋转后的图片
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  
  // 恢复上下文
  ctx.restore();
};

// 将图片切割为指定数量的子图
export const splitImage = (
  canvas: HTMLCanvasElement,
  count: number,
  aspectRatio: { width: number; height: number },
  layoutMode: 'horizontal' | 'vertical' | 'grid'
): HTMLCanvasElement[] => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  
  const result: HTMLCanvasElement[] = [];
  const { width: canvasWidth, height: canvasHeight } = canvas;
  
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
  const sliceWidth = Math.floor(canvasWidth / cols);
  const sliceHeight = Math.floor(canvasHeight / rows);
  
  // 应用宽高比
  const targetRatio = aspectRatio.width / aspectRatio.height;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (row * cols + col >= count) break;
      
      try {
        // 创建子画布
        const sliceCanvas = document.createElement('canvas');
        const sliceCtx = sliceCanvas.getContext('2d');
        if (!sliceCtx) continue;
        
        // 根据宽高比计算实际输出尺寸
        let outputWidth = sliceWidth;
        let outputHeight = sliceHeight;
        
        const currentRatio = outputWidth / outputHeight;
        
        if (currentRatio > targetRatio) {
          // 当前比例过宽，按高度调整
          outputWidth = Math.floor(outputHeight * targetRatio);
        } else {
          // 当前比例过高，按宽度调整
          outputHeight = Math.floor(outputWidth / targetRatio);
        }
        
        // 确保尺寸至少为1像素
        outputWidth = Math.max(1, outputWidth);
        outputHeight = Math.max(1, outputHeight);
        
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
      } catch (error) {
        console.error('处理切片时出错:', error);
      }
    }
  }
  
  return result;
};

// 创建模糊背景填充
export const createBlurredBackground = (
  canvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement => {
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = targetWidth;
  bgCanvas.height = targetHeight;
  
  const bgCtx = bgCanvas.getContext('2d');
  if (!bgCtx) return bgCanvas;
  
  // 先将原图拉伸至目标尺寸
  bgCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
  
  // 应用模糊效果
  bgCtx.filter = 'blur(20px)';
  bgCtx.globalAlpha = 0.8;
  bgCtx.drawImage(bgCanvas, 0, 0);
  
  // 重置滤镜和透明度
  bgCtx.filter = 'none';
  bgCtx.globalAlpha = 1.0;
  
  return bgCanvas;
};

// 将Canvas转换为Blob
export const canvasToBlob = (canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas to Blob conversion failed'));
        }
      },
      mimeType,
      1.0 // 质量保持为100%
    );
  });
};

// 下载图片
export const downloadImage = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}; 