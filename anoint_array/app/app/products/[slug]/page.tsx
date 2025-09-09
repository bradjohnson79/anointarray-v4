

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { 
  ShoppingCart, 
  Star, 
  Crown, 
  Package, 
  Zap, 
  Download,
  ExternalLink,
  ArrowLeft,
  Youtube,
  Check,
  X,
  Globe,
  Scale,
  Truck,
  Heart,
  Share2,
  FileText
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { usePayment } from '@/contexts/payment-context';
import EnergyRibbons from '@/components/energy-ribbons';

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
  hsCode?: string;
  countryOfOrigin?: string;
  customsDescription?: string;
  defaultCustomsValueCad?: number;
  massGrams?: number;
  createdAt: string;
  updatedAt: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = usePayment();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (params.slug) {
      fetchProduct(params.slug as string);
    }
  }, [params.slug]);

  const fetchProduct = async (slug: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/products/by-slug/${slug}`);
      
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
      } else if (response.status === 404) {
        toast.error('Product not found');
        router.push('/');
      } else {
        toast.error('Failed to load product');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Error loading product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      type: 'product',
      imageUrl: product.imageUrl,
      category: product.category,
      customData: { isPhysical: product.isPhysical, isDigital: product.isDigital }
    });

    toast.success(`Added ${quantity} ${product.name} to cart`);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'healing-cards': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'crystals': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
      'jewelry': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'technology': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'meditation': 'bg-green-500/20 text-green-400 border-green-500/30',
      'oils': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      'clothing': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const shareProduct = async () => {
    if (navigator.share && product) {
      try {
        await navigator.share({
          title: product.name,
          text: product.teaserDescription || 'Check out this amazing product!',
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to copying to clipboard
        navigator.clipboard.writeText(window.location.href);
        toast.success('Product link copied to clipboard!');
      }
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Product link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Product not found</h2>
          <p className="text-gray-400 mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => router.push('/')}
            className="aurora-gradient text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const allImages = [product.imageUrl, ...(product.imageGallery || [])]
    .filter((img): img is string => Boolean(img) && typeof img === 'string');

  return (
    <div className="min-h-screen bg-gray-900">
      <EnergyRibbons intensity="subtle" count={3} />
      
      <div className="relative z-10">
        {/* Header Navigation */}
        <div className="container mx-auto px-4 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-400 hover:text-white transition-colors duration-200 mb-6"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Products
          </button>
        </div>

        {/* Product Details */}
        <div className="container mx-auto px-4 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Image Gallery */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {/* Main Image */}
              <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden relative">
                {allImages.length > 0 && allImages[selectedImageIndex] ? (
                  <Image
                    src={allImages[selectedImageIndex]}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="h-24 w-24 text-gray-600" />
                  </div>
                )}

                {/* Product Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {product.featured && (
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium flex items-center backdrop-blur-sm">
                      <Star className="h-4 w-4 mr-1" />
                      Featured
                    </span>
                  )}
                  {product.isVip && (
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium flex items-center backdrop-blur-sm">
                      <Crown className="h-4 w-4 mr-1" />
                      VIP Only
                    </span>
                  )}
                  {product.isDigital && (
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium flex items-center backdrop-blur-sm">
                      <Download className="h-4 w-4 mr-1" />
                      Digital
                    </span>
                  )}
                </div>

                {/* Share Button */}
                <button
                  onClick={shareProduct}
                  className="absolute top-4 right-4 p-2 bg-gray-900/50 hover:bg-gray-900/70 rounded-full backdrop-blur-sm transition-colors duration-200"
                  title="Share Product"
                >
                  <Share2 className="h-5 w-5 text-white" />
                </button>
              </div>

              {/* Image Thumbnails */}
              {allImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {allImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`aspect-square bg-gray-800 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                        selectedImageIndex === index 
                          ? 'border-purple-500' 
                          : 'border-transparent hover:border-gray-600'
                      }`}
                    >
                      {image ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={image}
                            alt={`${product.name} - Image ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 25vw, 12.5vw"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Package className="h-8 w-8 text-gray-600" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Product Information */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Header */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(product.category)}`}>
                    {product.category.split('-').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </span>
                  {product.isPhysical && (
                    <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-sm font-medium border border-gray-500/30 flex items-center">
                      <Truck className="h-4 w-4 mr-1" />
                      Physical
                    </span>
                  )}
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  {product.name}
                </h1>
                
                <div className="text-4xl font-bold aurora-text mb-6">
                  {formatPrice(product.price)}
                </div>
              </div>

              {/* Description */}
              {product.teaserDescription && (
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                  <p className="text-gray-300 leading-relaxed">
                    {product.teaserDescription}
                  </p>
                </div>
              )}

              {/* Full Description */}
              {product.fullDescription && (
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-3">Details</h3>
                  <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {product.fullDescription}
                  </div>
                </div>
              )}

              {/* Product Specifications */}
              {product.isPhysical && (
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Specifications</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {product.weight && (
                      <div className="flex items-center">
                        <Scale className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-400">Weight:</span>
                        <span className="text-white ml-2">{product.weight} kg</span>
                      </div>
                    )}
                    {product.dimensions && (product.dimensions.length || product.dimensions.width || product.dimensions.height) && (
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-400">Dimensions:</span>
                        <span className="text-white ml-2">
                          {product.dimensions.length}×{product.dimensions.width}×{product.dimensions.height} cm
                        </span>
                      </div>
                    )}
                    {product.countryOfOrigin && (
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-400">Origin:</span>
                        <span className="text-white ml-2">{product.countryOfOrigin}</span>
                      </div>
                    )}
                    {product.inventory !== undefined && product.inventory !== null && (
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-400">In Stock:</span>
                        <span className="text-white ml-2">{product.inventory} units</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Product Video */}
              {product.videoEmbedCode && (
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Youtube className="h-5 w-5 mr-2 text-red-500" />
                    Product Video
                  </h3>
                  <div 
                    className="rounded-lg overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: product.videoEmbedCode }}
                  />
                </div>
              )}

              {/* PDF Instruction Manual */}
              {product.instructionManualUrl && (
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-500" />
                    Instruction Manual
                  </h3>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-300 text-sm">
                      Download the PDF instruction manual for detailed product information and usage guidelines.
                    </p>
                    <a
                      href={product.instructionManualUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Download PDF
                    </a>
                  </div>
                </div>
              )}

              {/* Digital Download Info */}
              {product.isDigital && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                  <div className="flex items-start">
                    <Download className="h-6 w-6 text-blue-400 mr-3 mt-1" />
                    <div>
                      <h4 className="text-blue-400 font-semibold mb-2">Digital Product</h4>
                      <p className="text-blue-300 text-sm mb-3">
                        This is a digital product. After purchase, you'll receive an instant download link.
                      </p>
                      <ul className="text-blue-200 text-sm space-y-1">
                        <li className="flex items-center">
                          <Check className="h-4 w-4 mr-2" />
                          Instant download after payment
                        </li>
                        <li className="flex items-center">
                          <Check className="h-4 w-4 mr-2" />
                          No shipping required
                        </li>
                        <li className="flex items-center">
                          <Check className="h-4 w-4 mr-2" />
                          5% GST for Canadian customers
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Physical Product Info */}
              {product.isPhysical && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
                  <div className="flex items-start">
                    <Truck className="h-6 w-6 text-green-400 mr-3 mt-1" />
                    <div>
                      <h4 className="text-green-400 font-semibold mb-2">Physical Product</h4>
                      <p className="text-green-300 text-sm mb-3">
                        This product will be shipped to your address.
                      </p>
                      <ul className="text-green-200 text-sm space-y-1">
                        <li className="flex items-center">
                          <Check className="h-4 w-4 mr-2" />
                          Ships from Canada
                        </li>
                        <li className="flex items-center">
                          <Check className="h-4 w-4 mr-2" />
                          DDP included for US shipments
                        </li>
                        <li className="flex items-center">
                          <Check className="h-4 w-4 mr-2" />
                          Appropriate taxes calculated at checkout
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Purchase Section */}
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Purchase</h3>
                  {!product.inStock && (
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
                      Out of Stock
                    </span>
                  )}
                  {product.comingSoon && (
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                      Coming Soon
                    </span>
                  )}
                </div>

                {product.inStock && !product.comingSoon ? (
                  <div className="space-y-4">
                    {/* Quantity Selector */}
                    <div className="flex items-center space-x-4">
                      <label className="text-gray-300 font-medium">Quantity:</label>
                      <div className="flex items-center border border-gray-600 rounded-lg">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="px-3 py-2 text-gray-400 hover:text-white transition-colors duration-200"
                        >
                          -
                        </button>
                        <span className="px-4 py-2 text-white font-medium">{quantity}</span>
                        <button
                          onClick={() => setQuantity(quantity + 1)}
                          className="px-3 py-2 text-gray-400 hover:text-white transition-colors duration-200"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAddToCart}
                      className="w-full aurora-gradient text-white py-4 rounded-lg font-semibold text-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center"
                    >
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Add to Cart - {formatPrice(product.price * quantity)}
                    </motion.button>

                    {/* VIP Notice */}
                    {product.isVip && (
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                        <div className="flex items-start">
                          <Crown className="h-5 w-5 text-purple-400 mr-2 mt-0.5" />
                          <div>
                            <h4 className="text-purple-400 font-medium mb-1">VIP Exclusive Product</h4>
                            <p className="text-purple-300 text-sm">
                              This product is available exclusively to VIP members. Join our VIP program to access exclusive content and products.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-400 mb-4">
                      {product.comingSoon ? 'This product is coming soon!' : 'This product is currently out of stock.'}
                    </p>
                    {!product.comingSoon && (
                      <button className="aurora-gradient text-white px-6 py-3 rounded-lg opacity-50 cursor-not-allowed">
                        <Heart className="h-5 w-5 mr-2 inline" />
                        Notify When Available
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Digital Download Access */}
              {product.isDigital && product.digitalFileUrl && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Download className="h-5 w-5 mr-2" />
                    Digital Access
                  </h3>
                  <p className="text-gray-300 text-sm mb-4">
                    After purchase, you'll gain instant access to download this digital product.
                  </p>
                  <button
                    onClick={() => window.open(product.digitalFileUrl, '_blank')}
                    className="flex items-center text-purple-400 hover:text-purple-300 transition-colors duration-200"
                    disabled={!product.inStock}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Preview Download (After Purchase)
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
