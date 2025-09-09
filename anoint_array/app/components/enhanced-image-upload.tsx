
'use client';

import React, { useState } from 'react';
import { Upload, X, Check, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface ImageUploadSlotProps {
  index: number;
  imageUrl: string | null;
  isUploading: boolean;
  selectedFile: File | null;
  onFileSelect: (index: number, file: File | null) => void;
  onUpload: (index: number) => Promise<{ success: boolean; url?: string; error?: string }>;
  onDelete: (index: number) => void;
}

export function ImageUploadSlot({ 
  index, 
  imageUrl, 
  isUploading, 
  selectedFile, 
  onFileSelect, 
  onUpload, 
  onDelete 
}: ImageUploadSlotProps) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a valid image file (JPEG, PNG, WebP, GIF)');
        return;
      }
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error('Image must be smaller than 10MB');
        return;
      }

      onFileSelect(index, file);
      setUploadStatus('idle');
      setErrorMessage('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploadStatus('uploading');
    setErrorMessage('');
    
    try {
      const result = await onUpload(index);
      
      if (result.success) {
        setUploadStatus('success');
        toast.success(`Image ${index + 1} uploaded successfully!`);
      } else {
        setUploadStatus('error');
        setErrorMessage(result.error || 'Upload failed');
        toast.error(`Image ${index + 1}: ${result.error || 'Upload failed'}`);
      }
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage('Network error during upload');
      toast.error(`Image ${index + 1}: Network error`);
    }
  };

  const handleDelete = () => {
    onDelete(index);
    setUploadStatus('idle');
    setErrorMessage('');
  };

  return (
    <div className="relative border-2 border-dashed border-gray-600 rounded-lg overflow-hidden bg-gray-800">
      <div className="aspect-square relative">
        {imageUrl ? (
          <>
            <Image
              src={imageUrl}
              alt={`Product image ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute top-2 right-2 flex gap-1">
              <div className="bg-green-500 text-white p-1 rounded-full">
                <Check className="h-3 w-3" />
              </div>
              <button
                onClick={handleDelete}
                className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </>
        ) : selectedFile ? (
          <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 mb-2 rounded-full bg-gray-700 flex items-center justify-center">
              <Upload className="h-6 w-6 text-gray-300" />
            </div>
            <p className="text-sm text-gray-300 mb-2">
              {selectedFile.name.length > 20 
                ? `${selectedFile.name.substring(0, 20)}...` 
                : selectedFile.name
              }
            </p>
            <p className="text-xs text-gray-400 mb-3">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
            
            {uploadStatus === 'idle' && (
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors duration-200"
              >
                Upload
              </button>
            )}
            
            {uploadStatus === 'uploading' && (
              <div className="flex items-center text-yellow-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent mr-2"></div>
                <span className="text-xs">Uploading...</span>
              </div>
            )}
            
            {uploadStatus === 'success' && (
              <div className="flex items-center text-green-400">
                <Check className="h-4 w-4 mr-2" />
                <span className="text-xs">Uploaded!</span>
              </div>
            )}
            
            {uploadStatus === 'error' && (
              <div className="flex flex-col items-center text-red-400">
                <div className="flex items-center mb-1">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <span className="text-xs">Failed</span>
                </div>
                {errorMessage && (
                  <p className="text-xs text-red-300 text-center">{errorMessage}</p>
                )}
                <button
                  onClick={handleUpload}
                  className="mt-2 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors duration-200"
                >
                  Retry
                </button>
              </div>
            )}
            
            <button
              onClick={() => onFileSelect(index, null)}
              className="absolute top-2 right-2 bg-gray-600 text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <label className="absolute inset-0 cursor-pointer hover:bg-gray-700 transition-colors duration-200 flex flex-col items-center justify-center">
            <div className="w-12 h-12 mb-2 rounded-full bg-gray-700 flex items-center justify-center">
              <Upload className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-400 text-center px-2">
              Click to upload<br />image {index + 1}
            </p>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
            />
          </label>
        )}
      </div>
    </div>
  );
}
