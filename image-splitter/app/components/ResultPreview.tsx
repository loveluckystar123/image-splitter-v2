'use client';

import { useState } from 'react';
import { FiDownload, FiZoomIn, FiX } from 'react-icons/fi';

interface ResultPreviewProps {
  slicedImages: Array<{
    imageUrl: string;
    blob: Blob;
  }>;
  originalFilename: string;
  onDownloadAll: () => void;
}

const ResultPreview: React.FC<ResultPreviewProps> = ({
  slicedImages,
  originalFilename,
  onDownloadAll
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // 下载单个图片
  const handleDownload = (index: number) => {
    if (!slicedImages[index]) return;
    
    const url = URL.createObjectURL(slicedImages[index].blob);
    const a = document.createElement('a');
    const fileExt = originalFilename.split('.').pop() || 'jpg';
    const filename = `${originalFilename.replace(`.${fileExt}`, '')}_${index + 1}.${fileExt}`;
    
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // 预览大图
  const handlePreview = (url: string) => {
    setPreviewImage(url);
  };
  
  // 关闭预览
  const closePreview = () => {
    setPreviewImage(null);
  };
  
  if (slicedImages.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">切割结果</h3>
        <button
          onClick={onDownloadAll}
          className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
        >
          <FiDownload />
          下载全部
        </button>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {slicedImages.map((image, index) => (
          <div key={index} className="relative group">
            <div className="relative rounded-lg overflow-hidden shadow bg-gray-100">
              <img 
                src={image.imageUrl} 
                alt={`分割图片 ${index + 1}`} 
                className="w-full h-auto object-contain" 
              />
              
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePreview(image.imageUrl)}
                    className="p-2 rounded-full bg-white text-gray-800 hover:bg-gray-200"
                    title="预览大图"
                  >
                    <FiZoomIn />
                  </button>
                  <button
                    onClick={() => handleDownload(index)}
                    className="p-2 rounded-full bg-white text-gray-800 hover:bg-gray-200"
                    title="下载"
                  >
                    <FiDownload />
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-1 text-center text-sm text-gray-600">
              图片 {index + 1}
            </div>
          </div>
        ))}
      </div>
      
      {/* 大图预览模态框 */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" onClick={closePreview}>
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={closePreview}
              className="absolute top-2 right-2 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70"
            >
              <FiX />
            </button>
            <img 
              src={previewImage} 
              alt="预览图片" 
              className="max-w-full max-h-[90vh] object-contain" 
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultPreview; 