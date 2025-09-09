
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  DollarSign,
  Star,
  Crown,
  X,
  Save,
  Upload,
  Image as ImageIcon,
  Type,
  Tag,
  ToggleLeft,
  ToggleRight,
  ShoppingCart,
  Zap,
  Youtube,
  ExternalLink,
  Camera,
  Loader2
} from 'lucide-react';
import AdminLayout from '@/components/admin/admin-layout';
import { toast } from 'sonner';
import { uploadImageWithVerification, verifyImageGallery, confirmProductSavedWithImages } from '@/lib/image-upload-utils';
import ProductAddModalNew from '@/components/admin/product-add-modal-new';
import ProductEditModalNew from '@/components/admin/product-edit-modal-new';

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
  youtubeUrl?: string;
  inventory?: number;
  weight?: number;
  dimensions?: any;
  digitalFileUrl?: string;
  createdAt: string;
  updatedAt: string;
  variants?: Array<{ id?: string; style: string; price: number; quantity: number; sku?: string }>;
}

export default function ProductManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const categories = ['ALL', 'healing-cards', 'crystals', 'jewelry', 'technology', 'meditation', 'oils', 'clothing'];

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?admin=true');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.teaserDescription && product.teaserDescription.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (product.fullDescription && product.fullDescription.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'ALL' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  const handlePreviewProduct = (product: Product) => {
    // Open product in a new window for preview
    const previewUrl = `/products/${product.slug || product.id}`;
    window.open(previewUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    if (!editingProduct) return;
    
    console.log('🚀 Starting enhanced product update with image verification');
    console.log('📋 Product data to update:', {
      id: editingProduct.id,
      name: productData.name,
      imageUrl: productData.imageUrl,
      imageGallery: productData.imageGallery?.length
    });
    
    setIsSaving(true);
    try {
      // Step 1: Verify all images are accessible before saving
      const imageUrls = [
        productData.imageUrl,
        ...(productData.imageGallery || [])
      ].filter((url): url is string => url != null && url.trim() !== '');

      if (imageUrls.length > 0) {
        console.log('🔍 Verifying images before product update:', imageUrls);
        toast.loading('Verifying images...', { id: 'image-verify' });
        
        const verification = await verifyImageGallery(imageUrls);
        if (!verification.valid) {
          toast.error(`Image verification failed: ${verification.errors.join(', ')}`, { id: 'image-verify' });
          console.error('❌ Image verification failed before product update:', verification.errors);
          return;
        }
        
        toast.success('Images verified successfully!', { id: 'image-verify' });
        console.log('✅ All images verified accessible before product update');
      }

      // Step 2: Update the product
      console.log('💾 Updating product in database...');
      toast.loading('Updating product...', { id: 'product-update' });
      
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to update product', { id: 'product-update' });
        console.error('❌ Product update failed:', error);
        return;
      }

      const updatedProduct = await response.json();
      console.log('✅ Product updated successfully:', updatedProduct.id);

      // Step 3: Verify the product was saved with images intact
      if (imageUrls.length > 0) {
        console.log('🔍 Verifying product updated with images in database...');
        toast.loading('Verifying product update...', { id: 'product-update' });
        
        const confirmation = await confirmProductSavedWithImages(updatedProduct.id);
        if (!confirmation.success) {
          toast.error(`Product updated but image verification failed: ${confirmation.error}`, { id: 'product-update' });
          console.error('❌ Product update verification failed:', confirmation.error);
          // Still show the updated product in the UI, but with a warning
        } else {
          console.log('✅ Product confirmed updated with all images accessible');
        }
      }

      // Step 4: Update UI
      setProducts(prev => prev.map(product => 
        product.id === editingProduct.id ? updatedProduct : product
      ));
      setShowEditModal(false);
      setEditingProduct(null);
      toast.success('Product updated successfully!', { id: 'product-update' });
      
      console.log('🎉 Product update completed successfully');

    } catch (error) {
      toast.error('Error updating product', { id: 'product-update' });
      console.error('❌ Error updating product:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProduct = async (productData: Partial<Product>) => {
    console.log('🚀 Starting enhanced product creation with image verification');
    console.log('📋 Product data to save:', {
      name: productData.name,
      imageUrl: productData.imageUrl,
      imageGallery: productData.imageGallery?.length
    });
    
    setIsSaving(true);
    try {
      // Step 1: Verify all images are accessible before saving
      const imageUrls = [
        productData.imageUrl,
        ...(productData.imageGallery || [])
      ].filter((url): url is string => url != null && url.trim() !== '');

      if (imageUrls.length > 0) {
        console.log('🔍 Verifying images before product creation:', imageUrls);
        toast.loading('Verifying images...', { id: 'image-verify' });
        
        const verification = await verifyImageGallery(imageUrls);
        if (!verification.valid) {
          toast.error(`Image verification failed: ${verification.errors.join(', ')}`, { id: 'image-verify' });
          console.error('❌ Image verification failed before product creation:', verification.errors);
          return;
        }
        
        toast.success('Images verified successfully!', { id: 'image-verify' });
        console.log('✅ All images verified accessible before product creation');
      }

      // Step 2: Create the product
      console.log('💾 Creating product in database...');
      toast.loading('Creating product...', { id: 'product-create' });
      
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to create product', { id: 'product-create' });
        console.error('❌ Product creation failed:', error);
        return;
      }

      const newProduct = await response.json();
      console.log('✅ Product created successfully:', newProduct.id);

      // Step 3: Verify the product was saved with images intact
      if (imageUrls.length > 0) {
        console.log('🔍 Verifying product saved with images in database...');
        toast.loading('Verifying product save...', { id: 'product-create' });
        
        const confirmation = await confirmProductSavedWithImages(newProduct.id);
        if (!confirmation.success) {
          toast.error(`Product created but image verification failed: ${confirmation.error}`, { id: 'product-create' });
          console.error('❌ Product save verification failed:', confirmation.error);
          // Still show the product in the UI, but with a warning
        } else {
          console.log('✅ Product confirmed saved with all images accessible');
        }
      }

      // Step 4: Update UI
      setProducts(prev => [newProduct, ...prev]);
      setShowAddModal(false);
      toast.success('Product created successfully!', { id: 'product-create' });
      
      console.log('🎉 Product creation completed successfully');

    } catch (error) {
      toast.error('Error creating product', { id: 'product-create' });
      console.error('❌ Error creating product:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProducts(prev => prev.filter(product => product.id !== productId));
        toast.success('Product deleted successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete product');
      }
    } catch (error) {
      toast.error('Error deleting product');
    }
  };

  const toggleProductFeature = async (productId: string, featured: boolean) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured }),
      });

      if (response.ok) {
        setProducts(prev => prev.map(product => 
          product.id === productId ? { ...product, featured } : product
        ));
        toast.success(`Product ${featured ? 'featured' : 'unfeatured'} successfully`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update product');
      }
    } catch (error) {
      toast.error('Error updating product');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'healing-cards': 'bg-purple-500/20 text-purple-400',
      'crystals': 'bg-teal-500/20 text-teal-400',
      'jewelry': 'bg-yellow-500/20 text-yellow-400',
      'technology': 'bg-blue-500/20 text-blue-400',
      'meditation': 'bg-green-500/20 text-green-400',
      'oils': 'bg-amber-500/20 text-amber-400',
      'clothing': 'bg-pink-500/20 text-pink-400',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500/20 text-gray-400';
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="aurora-text text-xl font-semibold">Loading products...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mystical-card p-6 rounded-lg"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Product Management</h1>
              <p className="text-gray-300">
                Manage your sacred healing product collection
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-400">
                Total Products: <span className="text-white font-semibold">{products.length}</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 aurora-gradient text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-300"
              >
                <Plus className="h-4 w-4" />
                <span>Add Product</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mystical-card p-4 rounded-lg"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'ALL' ? 'All Categories' : category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="mystical-card rounded-lg overflow-hidden"
            >
              {/* Product Image */}
              <div className="aspect-video relative bg-gray-800">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="h-16 w-16 text-gray-600" />
                  </div>
                )}
                
                {/* Status Badges */}
                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                  {product.featured && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium flex items-center">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </span>
                  )}
                  {product.isVip && (
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium flex items-center">
                      <Crown className="h-3 w-3 mr-1" />
                      VIP
                    </span>
                  )}
                  {product.comingSoon && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                      Coming Soon
                    </span>
                  )}
                  {!product.inStock && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                      Out of Stock
                    </span>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-white text-sm line-clamp-2">
                    {product.name}
                  </h3>
                  <span className="text-lg font-bold text-purple-400 flex items-center">
                    <DollarSign className="h-4 w-4" />
                    {product.price.toFixed(2)}
                  </span>
                </div>

                <p className="text-gray-400 text-xs mb-3 line-clamp-2">
                  {product.teaserDescription || product.fullDescription || 'No description available'}
                </p>

                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(product.category)}`}>
                    {product.category.replace('-', ' ')}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => toggleProductFeature(product.id, !product.featured)}
                    className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200 ${
                      product.featured
                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Star className="h-3 w-3" />
                    <span>{product.featured ? 'Unfeature' : 'Feature'}</span>
                  </button>
                  
                  <button
                    onClick={() => handlePreviewProduct(product)}
                    className="p-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg transition-colors duration-200"
                    title="Preview Product"
                  >
                    <ExternalLink className="h-3 w-3 text-green-400" />
                  </button>
                  
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="p-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg transition-colors duration-200"
                    title="Edit Product"
                  >
                    <Edit3 className="h-3 w-3 text-purple-400" />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="p-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg transition-colors duration-200"
                    title="Delete Product"
                  >
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mystical-card p-8 rounded-lg text-center"
          >
            <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Products Found</h3>
            <p className="text-gray-400 mb-4">
              {searchTerm || selectedCategory !== 'ALL' 
                ? 'Try adjusting your search or filter criteria'
                : 'No products have been added yet'
              }
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddModal(true)}
              className="aurora-gradient text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300"
            >
              Add First Product
            </motion.button>
          </motion.div>
        )}

        {/* Product Editor Modal */}
        {showEditModal && editingProduct && (
          <ProductEditModalNew
            product={editingProduct}
            onSave={handleSaveProduct}
            onCancel={() => {
              setShowEditModal(false);
              setEditingProduct(null);
            }}
            isSaving={isSaving}
          />
        )}

        {/* Product Add Modal */}
        {showAddModal && (
          <ProductAddModalNew
            onSave={handleAddProduct}
            onCancel={() => setShowAddModal(false)}
            isSaving={isSaving}
          />
        )}
      </div>
    </AdminLayout>
  );
}

// Product Editor Component
interface ProductEditorProps {
  product: Product;
  onSave: (productData: Partial<Product>) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function ProductEditor({ product, onSave, onCancel, isSaving }: ProductEditorProps) {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: product.name,
    teaserDescription: product.teaserDescription || '',
    fullDescription: product.fullDescription || '',
    price: product.price,
    category: product.category,
    isVip: product.isVip,
    inStock: product.inStock,
    isPhysical: product.isPhysical,
    isDigital: product.isDigital,
    featured: product.featured,
    comingSoon: product.comingSoon,
    imageUrl: product.imageUrl || '',
    imageGallery: product.imageGallery || [],
    youtubeUrl: product.youtubeUrl || '',
    inventory: product.inventory || 0,
    weight: product.weight || 0,
    dimensions: product.dimensions || { length: 0, width: 0, height: 0 },
    digitalFileUrl: product.digitalFileUrl || '',
  });

  const [uploadingImages, setUploadingImages] = useState<boolean[]>([false, false, false, false]);
  const [selectedImageFiles, setSelectedImageFiles] = useState<(File | null)[]>([null, null, null, null]);
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null, null]);

  const categories = ['healing-cards', 'crystals', 'jewelry', 'technology', 'meditation', 'oils', 'clothing'];

  const handleInputChange = (field: keyof Product, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDimensionChange = (dimension: 'length' | 'width' | 'height', value: number) => {
    setFormData(prev => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [dimension]: value
      }
    }));
  };

  // Initialize gallery with existing images
  useEffect(() => {
    const gallery = product.imageGallery || [];
    const updatedImagePreviews = [...imagePreviews];
    gallery.forEach((imageUrl, index) => {
      if (index < 4) {
        updatedImagePreviews[index] = imageUrl;
      }
    });
    setImagePreviews(updatedImagePreviews);
  }, []);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const updatedFiles = [...selectedImageFiles];
      const updatedPreviews = [...imagePreviews];
      
      updatedFiles[index] = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        updatedPreviews[index] = e.target?.result as string;
        setImagePreviews(updatedPreviews);
      };
      reader.readAsDataURL(file);
      
      setSelectedImageFiles(updatedFiles);
    }
  };

  const handleImageUpload = async (index: number) => {
    const file = selectedImageFiles[index];
    if (!file) return;

    const updatedUploading = [...uploadingImages];
    updatedUploading[index] = true;
    setUploadingImages(updatedUploading);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', 'product-image');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update the gallery
        const currentGallery = [...(formData.imageGallery || [])];
        currentGallery[index] = data.url;
        
        // Filter out undefined and empty values before setting
    const cleanedGallery = currentGallery.filter(url => url && typeof url === 'string' && url.trim() !== '');
    handleInputChange('imageGallery', cleanedGallery);
        
        // Clear the selected file and preview for this index
        const updatedFiles = [...selectedImageFiles];
        updatedFiles[index] = null;
        setSelectedImageFiles(updatedFiles);
        
        toast.success('Image uploaded successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to upload image');
      }
    } catch (error) {
      toast.error('Error uploading image');
    } finally {
      const updatedUploading = [...uploadingImages];
      updatedUploading[index] = false;
      setUploadingImages(updatedUploading);
    }
  };

  const handleImageDelete = (index: number) => {
    const currentGallery = [...(formData.imageGallery || [])];
    const updatedPreviews = [...imagePreviews];
    const updatedFiles = [...selectedImageFiles];
    
    // Remove from gallery
    currentGallery[index] = '';
    
    // Clear preview and selected file
    updatedPreviews[index] = null;
    updatedFiles[index] = null;
    
    // Filter out undefined and empty values before setting
    const cleanedGallery = currentGallery.filter(url => url && typeof url === 'string' && url.trim() !== '');
    handleInputChange('imageGallery', cleanedGallery);
    setImagePreviews(updatedPreviews);
    setSelectedImageFiles(updatedFiles);
    
    toast.success('Image removed');
  };

  const getImageUrl = (index: number): string | null => {
    // Priority: uploaded image > existing gallery image > preview
    const gallery = formData.imageGallery || [];
    return gallery[index] || imagePreviews[index];
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

    // Validate YouTube URL if provided
    if (formData.youtubeUrl && formData.youtubeUrl.trim()) {
      const youtubeRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/)?([a-zA-Z0-9_-]{11})/;
      if (!youtubeRegex.test(formData.youtubeUrl.trim())) {
        toast.error('Please enter a valid YouTube URL');
        return;
      }
    }

    // Upload any pending images
    const pendingUploads = selectedImageFiles
      .map((file, index) => file ? index : null)
      .filter(index => index !== null) as number[];

    for (const index of pendingUploads) {
      if (!uploadingImages[index]) {
        await handleImageUpload(index);
      }
    }

    // Clean up imageGallery - remove empty strings and ensure it's an array
    const cleanedGallery = (formData.imageGallery || [])
      .filter(url => url && url.trim() !== '');

    const finalFormData = {
      ...formData,
      imageGallery: cleanedGallery,
      // Set primary image as first gallery image if no imageUrl is set
      imageUrl: formData.imageUrl || cleanedGallery[0] || '',
    };

    onSave(finalFormData);
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
              <h2 className="text-2xl font-bold text-white">Edit Product</h2>
              <p className="text-gray-400">Update product information and settings</p>
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
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Teaser Description * (Under 100 words)
                </label>
                <textarea
                  value={formData.teaserDescription || ''}
                  onChange={(e) => handleInputChange('teaserDescription', e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="Brief product description for product cards (max 500 characters)"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(formData.teaserDescription || '').length}/500 characters
                </p>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Description
                </label>
                <textarea
                  value={formData.fullDescription || ''}
                  onChange={(e) => handleInputChange('fullDescription', e.target.value)}
                  rows={5}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="Detailed product description for product pages"
                />
              </div>
            </div>

            {/* Image Gallery */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Product Images (Up to 4)
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((index) => {
                  const imageUrl = getImageUrl(index);
                  const isUploading = uploadingImages[index];
                  const hasSelectedFile = selectedImageFiles[index] !== null;
                  
                  return (
                    <div key={index} className="relative">
                      <div className="aspect-square bg-gray-700 rounded-lg border-2 border-dashed border-gray-600 hover:border-gray-500 transition-colors duration-200">
                        {imageUrl ? (
                          <div className="relative w-full h-full">
                            <img
                              src={imageUrl}
                              alt={`Product image ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => handleImageDelete(index)}
                              className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold transition-colors duration-200"
                              title="Delete image"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageFileChange(e, index)}
                              className="hidden"
                              disabled={isUploading}
                            />
                            {isUploading ? (
                              <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                            ) : (
                              <>
                                <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                                <span className="text-xs text-gray-400 text-center">
                                  Click to upload<br />image {index + 1}
                                </span>
                              </>
                            )}
                          </label>
                        )}
                      </div>
                      
                      {hasSelectedFile && !imageUrl && (
                        <button
                          type="button"
                          onClick={() => handleImageUpload(index)}
                          disabled={isUploading}
                          className="mt-2 w-full px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors duration-200 flex items-center justify-center space-x-1"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-3 w-3" />
                              <span>Upload</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <p className="text-xs text-gray-500 mt-4">
                Upload up to 4 product images. The first image will be used as the main product image.
                Supported formats: JPG, PNG, WebP. Max file size: 10MB.
              </p>
            </div>

            {/* YouTube Video */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Youtube className="h-5 w-5 mr-2" />
                YouTube Video (Optional)
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  YouTube URL
                </label>
                <input
                  type="url"
                  value={formData.youtubeUrl || ''}
                  onChange={(e) => handleInputChange('youtubeUrl', e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Add a YouTube video to showcase your product. Supports youtube.com and youtu.be URLs.
                </p>
              </div>
            </div>

            {/* Category & Settings */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Tag className="h-5 w-5 mr-2" />
                Category & Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category || ''}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(formData.category || '')}`}>
                      {(formData.category || '').replace('-', ' ')}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Inventory Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.inventory || ''}
                    onChange={(e) => handleInputChange('inventory', parseInt(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    placeholder="Available stock"
                  />
                </div>
              </div>
            </div>

            {/* Product Type & Properties */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Product Type & Properties
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <span className="text-white text-sm">Physical Product</span>
                  <button
                    type="button"
                    onClick={() => handleInputChange('isPhysical', !formData.isPhysical)}
                    className={`${formData.isPhysical ? 'text-green-400' : 'text-gray-500'} transition-colors duration-200`}
                  >
                    {formData.isPhysical ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <span className="text-white text-sm">Digital Product</span>
                  <button
                    type="button"
                    onClick={() => handleInputChange('isDigital', !formData.isDigital)}
                    className={`${formData.isDigital ? 'text-green-400' : 'text-gray-500'} transition-colors duration-200`}
                  >
                    {formData.isDigital ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <span className="text-white text-sm">In Stock</span>
                  <button
                    type="button"
                    onClick={() => handleInputChange('inStock', !formData.inStock)}
                    className={`${formData.inStock ? 'text-green-400' : 'text-gray-500'} transition-colors duration-200`}
                  >
                    {formData.inStock ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <span className="text-white text-sm">Featured</span>
                  <button
                    type="button"
                    onClick={() => handleInputChange('featured', !formData.featured)}
                    className={`${formData.featured ? 'text-yellow-400' : 'text-gray-500'} transition-colors duration-200`}
                  >
                    {formData.featured ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <span className="text-white text-sm">VIP Product</span>
                  <button
                    type="button"
                    onClick={() => handleInputChange('isVip', !formData.isVip)}
                    className={`${formData.isVip ? 'text-purple-400' : 'text-gray-500'} transition-colors duration-200`}
                  >
                    {formData.isVip ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <span className="text-white text-sm">Coming Soon</span>
                  <button
                    type="button"
                    onClick={() => handleInputChange('comingSoon', !formData.comingSoon)}
                    className={`${formData.comingSoon ? 'text-blue-400' : 'text-gray-500'} transition-colors duration-200`}
                  >
                    {formData.comingSoon ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                  </button>
                </div>
              </div>

              {formData.isPhysical && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={formData.weight || ''}
                      onChange={(e) => handleInputChange('weight', parseFloat(e.target.value))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      placeholder="Product weight for shipping"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Dimensions (inches) - for shipping calculations
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Length</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.dimensions?.length || ''}
                          onChange={(e) => handleDimensionChange('length', parseFloat(e.target.value) || 0)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                          placeholder="0.0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Width</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.dimensions?.width || ''}
                          onChange={(e) => handleDimensionChange('width', parseFloat(e.target.value) || 0)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                          placeholder="0.0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Height</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.dimensions?.height || ''}
                          onChange={(e) => handleDimensionChange('height', parseFloat(e.target.value) || 0)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                          placeholder="0.0"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Enter package dimensions for accurate shipping cost calculations
                    </p>
                  </div>
                </div>
              )}

              {formData.isDigital && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Digital File URL
                  </label>
                  <input
                    type="url"
                    value={formData.digitalFileUrl || ''}
                    onChange={(e) => handleInputChange('digitalFileUrl', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    placeholder="https://..."
                  />
                </div>
              )}
            </div>



            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-700">
              <button
                type="button"
                onClick={() => {
                  const previewUrl = `/products/${product.slug || product.id}`;
                  window.open(previewUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
                }}
                className="flex items-center space-x-2 px-6 py-3 border border-green-600 text-green-400 rounded-lg hover:bg-green-600/10 transition-colors duration-200"
                disabled={isSaving}
                title="Preview product in new window"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Preview Product</span>
              </button>
              
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors duration-200"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center space-x-2 aurora-gradient text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Product</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
