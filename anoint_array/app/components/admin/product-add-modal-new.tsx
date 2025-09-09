
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X,
  Save,
  Type,
  DollarSign,
  Package,
  Tag,
  ToggleLeft,
  ToggleRight,
  ShoppingCart,
  Zap,
  Youtube,
  Camera,
  ExternalLink,
  AlertTriangle,
  FileText
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import CustomsCompliancePanel from './customs-compliance-panel';

interface Product {
  id: string;
  name: string;
  slug: string;
  teaserDescription?: string;
  fullDescription?: string;
  price: number;
  category: string;
  isVip: boolean;
  inStock: boolean;
  isPhysical: boolean;
  isDigital: boolean;
  featured: boolean;
  comingSoon: boolean;
  imageUrl?: string;
  imageGallery?: string[];
  videoEmbedCode?: string;
  inventory?: number;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  digitalFileUrl?: string;
  instructionManualUrl?: string;
  variants?: Array<{ id?: string; style: string; price: number; quantity: number; sku?: string }>;
  // Customs & Compliance Fields
  hsCode?: string;
  countryOfOrigin?: string;
  customsDescription?: string;
  defaultCustomsValueCad?: number;
  massGrams?: number;
  createdAt: string;
  updatedAt: string;
}

interface ImageOption {
  value: string;
  label: string;
  filename: string;
}

interface ProductAddModalProps {
  onSave: (productData: Partial<Product>) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export default function ProductAddModalNew({ onSave, onCancel, isSaving }: ProductAddModalProps) {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    teaserDescription: '',
    fullDescription: '',
    price: 0,
    category: 'healing-cards',
    isVip: false,
    inStock: true,
    isPhysical: true,
    isDigital: false,
    featured: false,
    comingSoon: false,
    imageUrl: '',
    imageGallery: [],
    videoEmbedCode: '',
    inventory: 0,
    weight: 0,
    dimensions: { length: 0, width: 0, height: 0 },
    digitalFileUrl: '',
    instructionManualUrl: '',
    // Customs & Compliance Fields
    hsCode: '',
    countryOfOrigin: 'CA',
    customsDescription: '',
    defaultCustomsValueCad: 0,
    massGrams: 0,
  });

  const [availableImages, setAvailableImages] = useState<ImageOption[]>([]);
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>(['', '', '', '']);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [variants, setVariants] = useState<Array<{ id?: string; style: string; price: number; quantity: number; sku?: string }>>([]);

  const categories = ['healing-cards', 'crystals', 'jewelry', 'technology', 'meditation', 'oils', 'clothing'];

  // Load available images from File Manager
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch('/api/file-manager/images/list');
        if (response.ok) {
          const data = await response.json();
          setAvailableImages(data.options || []);
        }
      } catch (error) {
        console.error('Error loading images:', error);
        toast.error('Failed to load available images');
      } finally {
        setIsLoadingImages(false);
      }
    };

    fetchImages();
  }, []);

  const handleInputChange = (field: keyof Product, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDimensionChange = (dimension: 'length' | 'width' | 'height', value: number) => {
    setFormData(prev => ({
      ...prev,
      dimensions: {
        length: prev.dimensions?.length || 0,
        width: prev.dimensions?.width || 0,
        height: prev.dimensions?.height || 0,
        [dimension]: value
      }
    }));
  };

  const handleImageSelection = (index: number, imageUrl: string) => {
    const updatedUrls = [...selectedImageUrls];
    updatedUrls[index] = imageUrl;
    setSelectedImageUrls(updatedUrls);

    // Update form data
    const cleanedUrls = updatedUrls.filter(url => url && url.trim() !== '');
    handleInputChange('imageGallery', cleanedUrls);
    
    // Set primary image as first selected image
    if (cleanedUrls.length > 0) {
      handleInputChange('imageUrl', cleanedUrls[0]);
    }
  };

  const handleImageClear = (index: number) => {
    const updatedUrls = [...selectedImageUrls];
    updatedUrls[index] = '';
    setSelectedImageUrls(updatedUrls);

    // Update form data
    const cleanedUrls = updatedUrls.filter(url => url && url.trim() !== '');
    handleInputChange('imageGallery', cleanedUrls);
    
    // Update primary image
    if (cleanedUrls.length > 0) {
      handleInputChange('imageUrl', cleanedUrls[0]);
    } else {
      handleInputChange('imageUrl', '');
    }

    toast.success('Image removed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.teaserDescription || formData.price === undefined || formData.price === null) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.price <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }

    if (formData.teaserDescription && formData.teaserDescription.length > 500) {
      toast.error('Teaser description must be under 500 characters (100 words)');
      return;
    }

    // Validate digital product requirements
    if (formData.isDigital && (!formData.digitalFileUrl || !formData.digitalFileUrl.trim())) {
      toast.error('Digital products require a download URL');
      return;
    }

    // Video embed code validation is handled by the backend

    // Clean up imageGallery - remove empty strings and ensure it's an array
    const cleanedGallery = selectedImageUrls.filter(url => url && url.trim() !== '');

    const finalFormData = {
      ...formData,
      imageGallery: cleanedGallery,
      // Set primary image as first gallery image if no imageUrl is set
      imageUrl: formData.imageUrl || cleanedGallery[0] || '',
      variants: variants,
    };

    onSave(finalFormData);
  };

  const addVariant = () => {
    setVariants(prev => [...prev, { style: '', price: Number(formData.price || 0), quantity: 0 }]);
  };

  const updateVariant = (index: number, field: 'style' | 'price' | 'quantity' | 'sku', value: any) => {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: field === 'price' ? parseFloat(value || '0') : field === 'quantity' ? parseInt(value || '0', 10) : value } : v));
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'healing-cards': 'bg-purple-500/20 text-purple-400',
      'crystals': 'bg-teal-500/20 text-teal-400',
      'jewelry': 'bg-yellow-500/20 text-yellow-400',
      'technology': 'bg-blue-500/20 text-blue-400',
      'meditation': 'bg-green-500/20 text-green-400',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Add New Product</h2>
              <p className="text-gray-400">Create a new product for your store</p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Type className="h-5 w-5 mr-2" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    placeholder="Enter product name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Price *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price || ''}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category || 'healing-cards'}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category.split('-').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Short Description *
                </label>
                <textarea
                  value={formData.teaserDescription || ''}
                  onChange={(e) => handleInputChange('teaserDescription', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  rows={3}
                  placeholder="Brief description for product cards..."
                  required
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Description
                </label>
                <textarea
                  value={formData.fullDescription || ''}
                  onChange={(e) => handleInputChange('fullDescription', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  rows={5}
                  placeholder="Detailed product description..."
                />
              </div>
            </div>

            {/* Image Gallery */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Product Images (Select from File Manager)
              </h3>
              
              {isLoadingImages ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading available images...</p>
                </div>
              ) : availableImages.length === 0 ? (
                <div className="text-center py-8 bg-gray-700 rounded-lg">
                  <Camera className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                  <h4 className="text-lg font-medium text-gray-400 mb-2">No images available</h4>
                  <p className="text-gray-500 mb-4">Upload images in the File Manager first</p>
                  <a 
                    href="/admin/file-manager"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-purple-400 hover:text-purple-300 transition-colors duration-200"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open File Manager
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index} className="space-y-3">
                      <label className="block text-sm font-medium text-gray-300">
                        Image {index + 1} {index === 0 && '(Primary)'}
                      </label>
                      
                      <select
                        value={selectedImageUrls[index] || ''}
                        onChange={(e) => handleImageSelection(index, e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="">Select an image...</option>
                        {availableImages.map((image) => (
                          <option key={image.filename} value={image.value}>
                            {image.label}
                          </option>
                        ))}
                      </select>

                      {selectedImageUrls[index] && (
                        <div className="relative">
                          <div className="aspect-video bg-gray-700 rounded-lg overflow-hidden relative">
                            <Image
                              src={selectedImageUrls[index]}
                              alt={`Product image ${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 50vw"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleImageClear(index)}
                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors duration-200"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-blue-300">
                    <p className="font-medium mb-1">How to add images:</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-200">
                      <li>Upload images using the <a href="/admin/file-manager" target="_blank" className="underline">File Manager</a></li>
                      <li>Refresh this page to see new images in the dropdown</li>
                      <li>Select up to 4 images for your product</li>
                      <li>The first image will be used as the primary product image</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {/* Variants */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Variants
              </h3>
              <p className="text-gray-400 text-sm mb-4">Add variations like style, price, and quantity. Leave empty if product has no variants.</p>

              <div className="space-y-4">
                {variants.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-end bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                    <div className="col-span-5">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Style</label>
                      <input
                        type="text"
                        value={v.style || ''}
                        onChange={(e) => updateVariant(idx, 'style', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                        placeholder="e.g., Small / Gold / 16oz"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Price</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={v.price ?? 0}
                        onChange={(e) => updateVariant(idx, 'price', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="0"
                        value={v.quantity ?? 0}
                        onChange={(e) => updateVariant(idx, 'quantity', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button type="button" onClick={() => removeVariant(idx)} className="text-red-400 hover:text-red-300 px-2 py-2">Remove</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <button type="button" onClick={addVariant} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">+ Add Variant</button>
              </div>
            </div>

            {/* Product Type Selection */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Product Type
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Physical Product Toggle */}
                <div className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                  formData.isPhysical 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                }`}
                onClick={() => {
                  handleInputChange('isPhysical', true);
                  handleInputChange('isDigital', false);
                  // Clear digital fields when switching to physical
                  if (formData.isDigital) {
                    handleInputChange('digitalFileUrl', '');
                  }
                }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ShoppingCart className={`h-6 w-6 mr-3 ${
                        formData.isPhysical ? 'text-blue-400' : 'text-gray-400'
                      }`} />
                      <div>
                        <h4 className={`font-medium ${
                          formData.isPhysical ? 'text-blue-400' : 'text-gray-300'
                        }`}>
                          Physical Product
                        </h4>
                        <p className="text-sm text-gray-400">
                          Requires shipping & customs
                        </p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      formData.isPhysical 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-gray-400'
                    }`}>
                      {formData.isPhysical && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                  </div>
                </div>

                {/* Digital Product Toggle */}
                <div className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                  formData.isDigital 
                    ? 'border-purple-500 bg-purple-500/10' 
                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                }`}
                onClick={() => {
                  handleInputChange('isDigital', true);
                  handleInputChange('isPhysical', false);
                  // Clear physical-related customs fields when switching to digital
                  if (formData.isPhysical) {
                    handleInputChange('hsCode', '');
                    handleInputChange('customsDescription', '');
                    handleInputChange('defaultCustomsValueCad', 0);
                    handleInputChange('massGrams', 0);
                  }
                }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Zap className={`h-6 w-6 mr-3 ${
                        formData.isDigital ? 'text-purple-400' : 'text-gray-400'
                      }`} />
                      <div>
                        <h4 className={`font-medium ${
                          formData.isDigital ? 'text-purple-400' : 'text-gray-300'
                        }`}>
                          Digital Product
                        </h4>
                        <p className="text-sm text-gray-400">
                          Instant download
                        </p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      formData.isDigital 
                        ? 'border-purple-500 bg-purple-500' 
                        : 'border-gray-400'
                    }`}>
                      {formData.isDigital && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Digital Download URL - Only show for digital products */}
            {formData.isDigital && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Digital Download
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Download URL *
                  </label>
                  <input
                    type="url"
                    value={formData.digitalFileUrl || ''}
                    onChange={(e) => handleInputChange('digitalFileUrl', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    placeholder="https://your-download-link.com/file.pdf"
                    required={formData.isDigital}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Provide a secure download link for the digital product
                  </p>
                </div>
              </div>
            )}

            {/* Video Embed Code */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Youtube className="h-5 w-5 mr-2" />
                Video Embed Code (Optional)
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Video Embed Code
                </label>
                <textarea
                  rows={6}
                  value={formData.videoEmbedCode || ''}
                  onChange={(e) => handleInputChange('videoEmbedCode', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-vertical"
                  placeholder='<iframe width="560" height="315" src="https://www.youtube.com/embed/..." frameborder="0" allowfullscreen></iframe>'
                />
                <p className="text-xs text-gray-400 mt-1">
                  Paste your video embed code from YouTube, Vimeo, or any other video platform
                </p>
              </div>
            </div>

            {/* PDF Instruction Manual */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                PDF Instruction Manual (Optional)
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  PDF Manual URL
                </label>
                <input
                  type="url"
                  value={formData.instructionManualUrl || ''}
                  onChange={(e) => handleInputChange('instructionManualUrl', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  placeholder="https://your-site.com/manual.pdf"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Provide a direct link to a PDF instruction manual for this product
                </p>
              </div>
            </div>

            {/* Customs & Compliance - Only show for physical products */}
            {formData.isPhysical && (
              <CustomsCompliancePanel
                productData={{
                  hsCode: formData.hsCode || '',
                  countryOfOrigin: formData.countryOfOrigin || 'CA',
                  customsDescription: formData.customsDescription || '',
                  defaultCustomsValueCad: formData.defaultCustomsValueCad || 0,
                  massGrams: formData.massGrams || 0,
                }}
                isPhysical={formData.isPhysical || false}
                isDigital={formData.isDigital || false}
                productName={formData.name || 'New Product'}
                onChange={(customsData) => {
                  setFormData(prev => ({
                    ...prev,
                    hsCode: customsData.hsCode,
                    countryOfOrigin: customsData.countryOfOrigin,
                    customsDescription: customsData.customsDescription,
                    defaultCustomsValueCad: customsData.defaultCustomsValueCad,
                    massGrams: customsData.massGrams,
                  }));
                }}
              />
            )}

            {/* Product Settings */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Tag className="h-5 w-5 mr-2" />
                Product Settings
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {/* VIP Status */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">VIP Only</label>
                  <button
                    type="button"
                    onClick={() => handleInputChange('isVip', !formData.isVip)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none ${
                      formData.isVip ? 'bg-yellow-600' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                      formData.isVip ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* In Stock */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">In Stock</label>
                  <button
                    type="button"
                    onClick={() => handleInputChange('inStock', !formData.inStock)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none ${
                      formData.inStock ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                      formData.inStock ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Featured */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Featured</label>
                  <button
                    type="button"
                    onClick={() => handleInputChange('featured', !formData.featured)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none ${
                      formData.featured ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                      formData.featured ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Coming Soon */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">Coming Soon</label>
                  <button
                    type="button"
                    onClick={() => handleInputChange('comingSoon', !formData.comingSoon)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none ${
                      formData.comingSoon ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                      formData.comingSoon ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors duration-200 flex items-center"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Product
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
