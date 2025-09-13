
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, FileImage, Calendar, ExternalLink } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/dashboard-layout';

interface DownloadableItem {
  id: string;
  name: string;
  type: 'array' | 'guide' | 'meditation';
  date: string;
  size: string;
  downloadUrl: string;
  thumbnail?: string;
}

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadableItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // TODO: Wire to real downloads API when available
    setIsLoading(false);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'array':
        return FileImage;
      case 'guide':
        return Download;
      case 'meditation':
        return ExternalLink;
      default:
        return Download;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'array':
        return 'text-purple-400 bg-purple-400/20';
      case 'guide':
        return 'text-teal-400 bg-teal-400/20';
      case 'meditation':
        return 'text-yellow-400 bg-yellow-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  const handleDownload = (item: DownloadableItem) => {
    // TODO: Implement actual download logic
    const link = document.createElement('a');
    link.href = item.downloadUrl;
    link.download = item.name;
    link.click();
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="aurora-text text-xl font-semibold">Loading downloads...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mystical-card p-6 rounded-lg"
        >
          <h1 className="text-2xl font-bold text-white mb-2">Downloads</h1>
          <p className="text-gray-300">
            Access your purchased healing arrays, guides, and meditation resources
          </p>
        </motion.div>

        {/* Downloads Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {downloads.length === 0 ? (
            <div className="col-span-full">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mystical-card p-8 rounded-lg text-center"
              >
                <Download className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Downloads Available</h3>
                <p className="text-gray-400 mb-4">
                  Purchase products or generate arrays to access downloadable content
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a
                    href="/#products"
                    className="aurora-gradient text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300"
                  >
                    Browse Products
                  </a>
                  <a
                    href="/dashboard/array-generator"
                    className="border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 px-6 py-3 rounded-lg transition-all duration-300"
                  >
                    Generate Array
                  </a>
                </div>
              </motion.div>
            </div>
          ) : (
            downloads.map((item, index) => {
              const TypeIcon = getTypeIcon(item.type);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="mystical-card rounded-lg overflow-hidden"
                >
                  {/* Thumbnail */}
                  {item.thumbnail ? (
                    <div className="aspect-video relative bg-gray-800">
                      <img
                        src={item.thumbnail}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                          {item.type}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-800 flex items-center justify-center">
                      <TypeIcon className="h-12 w-12 text-gray-600" />
                      <span className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                        {item.type}
                      </span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-2 line-clamp-2">
                      {item.name}
                    </h3>
                    
                    <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                      <span>{item.size}</span>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleDownload(item)}
                      className="w-full flex items-center justify-center space-x-2 aurora-gradient text-white py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </motion.button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
