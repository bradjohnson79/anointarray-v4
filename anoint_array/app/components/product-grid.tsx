
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Star, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePayment } from '@/contexts/payment-context';

interface Product {
  id: string;
  name: string;
  slug: string;
  teaserDescription: string;
  price: number;
  category: string;
  imageUrl: string;
  featured: boolean;
  inStock: boolean;
  isPhysical?: boolean;
  isDigital?: boolean;
}

export default function ProductGrid() {
  const { addToCart, toggleModal } = usePayment();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        const data = await response.json();
        setProducts(data?.products || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const categories = ['all', ...Array.from(new Set(products?.map(p => p?.category) || []))];
  const filteredProducts = selectedCategory === 'all' 
    ? products?.filter(p => !p?.name?.includes('VIP') && !p?.name?.includes('Bio-Scalar')) || []
    : products?.filter(p => p?.category === selectedCategory && !p?.name?.includes('VIP') && !p?.name?.includes('Bio-Scalar')) || [];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="mystical-card p-6 rounded-lg animate-pulse">
            <div className="aspect-video bg-gray-800 rounded-lg mb-4" />
            <div className="h-6 bg-gray-800 rounded mb-2" />
            <div className="h-4 bg-gray-800 rounded w-2/3 mb-4" />
            <div className="h-8 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {categories.map((category) => (
          <motion.button
            key={category}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedCategory(category)}
            className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
              selectedCategory === category
                ? 'aurora-gradient text-white shadow-lg'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {category === 'all' ? 'All Products' : category}
          </motion.button>
        ))}
      </div>

      {/* Product Grid */}
      <motion.div 
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        {filteredProducts.map((product, index) => (
          <motion.div
            key={product?.id || index}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="mystical-card p-6 rounded-lg group"
          >
            {/* Product Image */}
            <Link href={`/products/${product?.slug || product?.id}`} className="block">
              <div className="relative aspect-video mb-4 rounded-lg overflow-hidden bg-gray-800 cursor-pointer">
                {product?.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product?.name || 'Product image'}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-gray-500 text-center">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-700 flex items-center justify-center">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-xs">No image</p>
                    </div>
                  </div>
                )}
                {product?.featured && (
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Featured
                  </div>
                )}
              </div>
            </Link>

            {/* Product Info */}
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <Link href={`/products/${product?.slug || product?.id}`}>
                  <h3 className="text-lg font-semibold text-white group-hover:aurora-text transition-all duration-300 cursor-pointer hover:text-purple-400">
                    {product?.name || 'Unnamed Product'}
                  </h3>
                </Link>
                <Zap className="h-5 w-5 text-purple-400 flex-shrink-0" />
              </div>

              <p className="text-gray-400 text-sm line-clamp-3">
                {product?.teaserDescription || 'No description available'}
              </p>

              <div className="flex items-center justify-between pt-2">
                <span className="text-2xl font-bold aurora-text">
                  ${product?.price?.toFixed(2) || '0.00'}
                </span>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (product?.inStock) {
                      addToCart({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        quantity: 1,
                        type: 'product',
                        imageUrl: product.imageUrl,
                        category: product.category,
                        customData: { isPhysical: !!product.isPhysical, isDigital: !!product.isDigital }
                      });
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
                    product?.inStock
                      ? 'aurora-gradient hover:shadow-lg'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!product?.inStock}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {product?.inStock ? 'Add to Cart' : 'Out of Stock'}
                </motion.button>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                  {product?.category || 'Uncategorized'}
                </span>
                {product?.inStock && (
                  <span className="text-green-400">In Stock</span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {filteredProducts.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="text-gray-400 text-lg">
            No products found in this category
          </div>
        </div>
      )}
    </div>
  );
}
