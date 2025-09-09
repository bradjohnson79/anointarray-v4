
'use client';

import { useState } from 'react';
import { Download, ExternalLink, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt: string;
  filename: string;
  className?: string;
}

export default function ImageViewer({ src, alt, filename, className = '' }: ImageViewerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [zoom, setZoom] = useState(1);

  const handleImageLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleImageError = () => {
    setHasError(true);
    setIsLoaded(false);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `${src}?action=download`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(src, '_blank');
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  if (hasError) {
    return (
      <div className={`bg-gray-800 rounded-lg p-8 flex flex-col items-center justify-center min-h-[400px] ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mb-4">
            <ExternalLink className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Image</h3>
          <p className="text-gray-400 text-center mb-6">
            The shipping label image could not be loaded. Try the options below:
          </p>
          <div className="flex space-x-4">
            <button
              onClick={handleOpenInNewTab}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Open in New Tab</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download Image</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg overflow-hidden ${className}`}>
      {/* Controls Header */}
      <div className="bg-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h4 className="text-white font-semibold">Shipping Label Preview</h4>
          {isLoaded && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-1 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-300 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="p-1 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1 text-gray-400 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenInNewTab}
            className="flex items-center space-x-1 text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Open</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-1 text-sm bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded transition-colors"
          >
            <Download className="h-3 w-3" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div className="bg-white p-4 min-h-[500px] flex items-center justify-center overflow-auto">
        {!isLoaded && !hasError && (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mb-4"></div>
            <p className="text-gray-600">Loading shipping label...</p>
          </div>
        )}
        
        <img
          src={src}
          alt={alt}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center',
            transition: 'transform 0.2s ease-in-out',
            maxWidth: zoom > 1 ? 'none' : '100%',
            height: 'auto',
            display: isLoaded ? 'block' : 'none'
          }}
          className="shadow-lg border border-gray-200 rounded"
        />
      </div>

      {/* Footer with additional options */}
      <div className="bg-gray-700 px-4 py-2 text-center">
        <p className="text-xs text-gray-400">
          PNG format - Universally compatible • No browser blocking • Perfect quality
        </p>
      </div>
    </div>
  );
}
