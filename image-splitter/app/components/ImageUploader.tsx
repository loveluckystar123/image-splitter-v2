'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { SupportedImageType } from '../utils/types';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  maxSize?: number; // 单位: MB
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onImageUpload, 
  maxSize = 10 // 默认10MB
}) => {
  const [error, setError] = useState<string | null>(null);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    
    if (acceptedFiles.length === 0) {
      return;
    }
    
    const file = acceptedFiles[0];
    
    // 检查文件类型
    const validTypes: SupportedImageType[] = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type as SupportedImageType)) {
      setError('只支持JPG、PNG和WebP格式的图片');
      return;
    }
    
    // 检查文件大小
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`图片大小不能超过${maxSize}MB`);
      return;
    }
    
    onImageUpload(file);
  }, [onImageUpload, maxSize]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxFiles: 1
  });
  
  return (
    <div className="w-full my-4">
      <div 
        {...getRootProps()} 
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
          }
        `}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-lg text-blue-600">放开鼠标上传图片</p>
        ) : (
          <div>
            <p className="text-lg">将图片拖到此处，或点击上传</p>
            <p className="text-sm text-gray-500 mt-1">
              支持JPG、PNG和WebP格式，大小不超过{maxSize}MB
            </p>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-2 text-red-500">{error}</div>
      )}
    </div>
  );
};

export default ImageUploader; 