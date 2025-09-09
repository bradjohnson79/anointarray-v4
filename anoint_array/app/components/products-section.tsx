
import { Suspense } from 'react';
import ProductGrid from './product-grid';
import EnergyRibbons from './energy-ribbons';

export default async function ProductsSection() {
  return (
    <section id="products" className="py-20 relative">
      <div className="absolute inset-0 cosmic-bg opacity-30" />
      <EnergyRibbons intensity="subtle" count={2} />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            <span className="aurora-text">Sacred</span>{' '}
            <span className="text-white">Products</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
            Discover our collection of scalar-enhanced healing technologies, each calibrated 
            to specific frequencies for optimal mind-body-spirit alignment
          </p>
        </div>

        <Suspense fallback={
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
        }>
          <ProductGrid />
        </Suspense>
      </div>
    </section>
  );
}
