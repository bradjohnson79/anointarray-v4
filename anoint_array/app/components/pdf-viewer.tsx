
'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, AlertCircle } from 'lucide-react';

interface PDFViewerProps {
  url: string;
  filename: string;
  className?: string;
}

export default function PDFViewer({ url, filename, className = '' }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [useDataUrl, setUseDataUrl] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    // Reset states when URL changes
    setIsLoading(true);
    setHasError(false);
    setUseDataUrl(false);
    setDataUrl(null);
    
    // Check if we're in Chrome and try alternative loading
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    
    if (isChrome) {
      // For Chrome, try to load as data URL first
      loadAsDataUrl();
    }
  }, [url]);

  const loadAsDataUrl = async () => {
    try {
      const response = await fetch(`${url}?action=base64`);
      if (response.ok) {
        const data = await response.json();
        setDataUrl(data.dataUrl);
        setUseDataUrl(true);
        setIsLoading(false);
      } else {
        setHasError(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to load PDF as data URL:', error);
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    console.warn('Iframe failed to load PDF, trying alternative method...');
    setHasError(true);
    loadAsDataUrl();
  };

  const handleDirectDownload = () => {
    const link = document.createElement('a');
    link.href = `${url}?action=download`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInTab = () => {
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-8 flex flex-col items-center justify-center ${className}`}>
        <FileText className="h-12 w-12 text-gray-400 animate-pulse mb-4" />
        <p className="text-gray-400">Loading PDF preview...</p>
      </div>
    );
  }

  if (hasError && !dataUrl) {
    return (
      <div className={`bg-gray-800 rounded-lg p-8 flex flex-col items-center justify-center ${className}`}>
        <AlertCircle className="h-12 w-12 text-yellow-400 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">PDF Preview Unavailable</h3>
        <p className="text-gray-400 text-center mb-6">
          Your browser is blocking the PDF preview. Use the options below to view the shipping label:
        </p>
        <div className="flex space-x-4">
          <button
            onClick={handleOpenInTab}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Open in New Tab</span>
          </button>
          <button
            onClick={handleDirectDownload}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      {useDataUrl && dataUrl ? (
        <iframe
          src={dataUrl}
          className="w-full h-[600px] border border-gray-700 rounded"
          title="Shipping Label Preview"
        />
      ) : (
        <iframe
          src={url}
          className="w-full h-[600px] border border-gray-700 rounded"
          title="Shipping Label Preview"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      )}
      
      <div className="mt-4 flex justify-center space-x-4">
        <button
          onClick={handleOpenInTab}
          className="flex items-center space-x-1 text-sm text-blue-400 hover:text-blue-300 underline"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Open in New Tab</span>
        </button>
        <button
          onClick={handleDirectDownload}
          className="flex items-center space-x-1 text-sm text-green-400 hover:text-green-300 underline"
        >
          <Download className="h-4 w-4" />
          <span>Download PDF</span>
        </button>
      </div>
    </div>
  );
}
