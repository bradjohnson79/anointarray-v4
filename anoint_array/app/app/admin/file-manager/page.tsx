
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Download, 
  Eye, 
  X,
  Plus,
  Folder,
  Check,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import AdminLayout from '@/components/admin/admin-layout';
import Image from 'next/image';
import { toast } from 'sonner';

interface UploadedImage {
  filename: string;
  url: string;
  size: number;
  uploadedAt: string;
  originalName: string;
}

interface UploadProgress {
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface FileWithName {
  file: File;
  customName: string;
}

export default function FileManager() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<FileWithName[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load existing images
  const fetchImages = useCallback(async () => {
    try {
      const response = await fetch('/api/file-manager/images');
      if (response.ok) {
        const data = await response.json();
        setImages(data.images || []);
      } else {
        console.error('Failed to fetch images');
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Handle file selection
  const handleFileSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Validate files and create FileWithName objects
    const validFilesWithNames: FileWithName[] = [];
    
    for (const file of fileArray) {
      // Check file type
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        toast.error(`${file.name}: Only JPG and PNG files are allowed`);
        continue;
      }
      
      // Check file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`${file.name}: File too large. Maximum size is 5MB`);
        continue;
      }
      
      // Create FileWithName object with sanitized default name
      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      const sanitizedName = nameWithoutExt
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      const defaultCustomName = `${sanitizedName}.${extension}`;
      
      validFilesWithNames.push({
        file,
        customName: defaultCustomName
      });
    }

    // Check total file count (max 10)
    if (selectedFiles.length + validFilesWithNames.length > 10) {
      toast.error('Maximum 10 files allowed at once');
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFilesWithNames]);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileSelect(files);
  };

  // Remove selected file
  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Update custom name for a file
  const updateCustomName = (index: number, newName: string) => {
    // Sanitize the filename
    const extension = newName.split('.').pop()?.toLowerCase() || 'png';
    const nameWithoutExt = newName.replace(/\.[^/.]+$/, "");
    const sanitizedName = nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const sanitizedFullName = `${sanitizedName}.${extension}`;
    
    setSelectedFiles(prev => prev.map((fileWithName, i) => 
      i === index ? { ...fileWithName, customName: sanitizedFullName } : fileWithName
    ));
  };

  // Upload files
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    const progressArray: UploadProgress[] = selectedFiles.map(fileWithName => ({
      filename: fileWithName.customName,
      progress: 0,
      status: 'pending' as const
    }));
    setUploadProgress(progressArray);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const fileWithName = selectedFiles[i];
      
      // Update progress to uploading
      setUploadProgress(prev => prev.map((p, idx) => 
        idx === i ? { ...p, status: 'uploading' as const, progress: 0 } : p
      ));

      try {
        const formData = new FormData();
        formData.append('file', fileWithName.file);
        formData.append('customName', fileWithName.customName);
        formData.append('type', 'product-image');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          
          // Update progress to success
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, status: 'success' as const, progress: 100 } : p
          ));
          
          successCount++;
        } else {
          const error = await response.json();
          
          // Update progress to error
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { 
              ...p, 
              status: 'error' as const, 
              progress: 0, 
              error: error.error || 'Upload failed' 
            } : p
          ));
          
          errorCount++;
        }
      } catch (error) {
        // Update progress to error
        setUploadProgress(prev => prev.map((p, idx) => 
          idx === i ? { 
            ...p, 
            status: 'error' as const, 
            progress: 0, 
            error: 'Network error' 
          } : p
        ));
        
        errorCount++;
      }
    }

    // Show results
    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded successfully!`);
      await fetchImages(); // Refresh the image list
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} file(s) failed to upload`);
    }

    // Clear selected files and progress after 3 seconds
    setTimeout(() => {
      setSelectedFiles([]);
      setUploadProgress([]);
      setIsUploading(false);
    }, 3000);
  };

  // Delete image
  const handleDeleteImage = async (image: UploadedImage) => {
    if (!confirm(`Are you sure you want to delete "${image.originalName}"?`)) return;

    try {
      const response = await fetch(`/api/file-manager/images/${image.filename}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Image deleted successfully');
        await fetchImages();
      } else {
        toast.error('Failed to delete image');
      }
    } catch (error) {
      toast.error('Error deleting image');
      console.error('Delete error:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <ImageIcon className="h-8 w-8 mr-3 text-purple-400" />
            File Manager
          </h1>
          <p className="text-gray-400">
            Upload and manage product images. Upload up to 10 images at once (JPG/PNG only, max 5MB each).
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Upload Images
          </h2>

          {/* Drag and Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
              isDragOver
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-gray-600 hover:border-purple-500/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                Drop images here or click to select
              </h3>
              <p className="text-gray-400 mb-4">
                Maximum 10 files • JPG, PNG only • Max 5MB each
              </p>
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png"
                className="hidden"
                id="file-input"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              />
              <label
                htmlFor="file-input"
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors duration-200 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Select Files
              </label>
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">
                  Selected Files ({selectedFiles.length}/10)
                </h3>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload All
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {selectedFiles.map((fileWithName, index) => {
                  const progress = uploadProgress.find(p => p.filename === fileWithName.customName);
                  return (
                    <div key={index} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-white text-sm font-medium truncate mr-2">
                              Original: {fileWithName.file.name}
                            </p>
                            {!isUploading && (
                              <button
                                onClick={() => removeSelectedFile(index)}
                                className="text-red-400 hover:text-red-300 flex-shrink-0"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          
                          <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-300 mb-1">
                              Custom Filename:
                            </label>
                            <input
                              type="text"
                              value={fileWithName.customName}
                              onChange={(e) => updateCustomName(index, e.target.value)}
                              disabled={isUploading}
                              className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50"
                              placeholder="Enter filename..."
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              Only letters, numbers, hyphens and underscores allowed
                            </p>
                          </div>

                          <p className="text-gray-400 text-xs mb-3">
                            Size: {formatFileSize(fileWithName.file.size)}
                          </p>

                          {progress && (
                            <div className="space-y-2">
                              <div className="flex items-center text-xs">
                                {progress.status === 'pending' && (
                                  <span className="text-gray-400">Pending...</span>
                                )}
                                {progress.status === 'uploading' && (
                                  <span className="text-blue-400">Uploading...</span>
                                )}
                                {progress.status === 'success' && (
                                  <span className="text-green-400 flex items-center">
                                    <Check className="h-3 w-3 mr-1" />
                                    Success
                                  </span>
                                )}
                                {progress.status === 'error' && (
                                  <span className="text-red-400 flex items-center">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Error: {progress.error}
                                  </span>
                                )}
                              </div>
                              {progress.status === 'uploading' && (
                                <div className="w-full bg-gray-600 rounded-full h-2">
                                  <div 
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: '50%' }}
                                  ></div>
                                </div>
                              )}
                              {progress.status === 'success' && (
                                <div className="w-full bg-green-500 rounded-full h-2"></div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Image Gallery */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <Folder className="h-5 w-5 mr-2" />
              Image Gallery ({images.length})
            </h2>
            <button
              onClick={() => fetchImages()}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors duration-200 flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 mx-auto text-gray-400 animate-spin mb-4" />
              <p className="text-gray-400">Loading images...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No images found</h3>
              <p className="text-gray-500">Upload some images to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {images.map((image) => (
                <motion.div
                  key={image.filename}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gray-700 rounded-lg overflow-hidden group hover:bg-gray-600 transition-colors duration-200"
                >
                  <div className="aspect-square relative">
                    <Image
                      src={image.url}
                      alt={image.originalName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedImage(image)}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors duration-200"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteImage(image)}
                          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-white text-sm font-medium truncate" title={image.originalName}>
                      {image.originalName}
                    </p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-400">
                        {formatFileSize(image.size)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(image.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Image Preview Modal */}
        {selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-lg font-medium text-white">
                  {selectedImage.originalName}
                </h3>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="p-4">
                <div className="relative max-w-full max-h-[70vh]">
                  <Image
                    src={selectedImage.url}
                    alt={selectedImage.originalName}
                    width={800}
                    height={600}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
                  <span>Size: {formatFileSize(selectedImage.size)}</span>
                  <span>Uploaded: {new Date(selectedImage.uploadedAt).toLocaleString()}</span>
                  <span>Filename: {selectedImage.filename}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
