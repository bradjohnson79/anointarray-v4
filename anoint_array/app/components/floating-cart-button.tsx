'use client';

import { ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePayment } from '@/contexts/payment-context';
import { useRouter, usePathname } from 'next/navigation';

export default function FloatingCartButton() {
  const { getTotalItems } = usePayment();
  const router = useRouter();
  const pathname = usePathname();
  const count = getTotalItems();

  // Hide on admin and dashboard routes; show on public/frontend pages only
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-40">
      <AnimatePresence>
        <motion.button
          key="cart-fab"
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          onClick={() => router.push('/cart')}
          className="relative w-14 h-14 aurora-gradient rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
          aria-label="View cart"
        >
          <ShoppingCart className="h-6 w-6 text-white" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </motion.button>
      </AnimatePresence>
    </div>
  );
}
