"use client";

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Mail, Download } from 'lucide-react';
import { usePayment } from '@/contexts/payment-context';

export default function SuccessPage() {
  const params = useSearchParams();
  const router = useRouter();
  const provider = params.get('provider') || 'payment';
  const payment = (() => {
    try { return usePayment(); } catch { return null as any; }
  })();

  // Clear cart only for known payment providers
  useEffect(() => {
    try {
      const okProviders = new Set(['stripe', 'paypal', 'crypto', 'nowpayments']);
      if (okProviders.has((provider || '').toLowerCase())) {
        if (payment?.clearCart) payment.clearCart();
        // Ensure localStorage cleared even if context unavailable
        if (typeof window !== 'undefined') {
          localStorage.setItem('anoint-cart', JSON.stringify([]));
        }
      }
    } catch {}
  }, []);

  // Notify opener (if this page was opened as a popup) then close
  // The checkout page listens for this message to clear cart and redirect
  if (typeof window !== 'undefined') {
    try {
      if (window.opener && window.opener !== window) {
        window.opener.postMessage({ type: 'payment-success', provider }, window.location.origin);
        setTimeout(() => {
          try { window.close(); } catch {}
        }, 600);
      }
    } catch {}
  }

  // Fire GoAffPro conversion tracking using local data
  useEffect(() => {
    try {
      const raw = localStorage.getItem('anoint:lastCheckout');
      if (!raw) return;
      const order = JSON.parse(raw);
      // Prepare and call conversion tracking if loader present
      (window as any).goaffpro_order = { number: String(order.number || ''), total: Number(order.total || 0) };
      if (typeof (window as any).goaffproTrackConversion !== 'undefined') {
        try { (window as any).goaffproTrackConversion((window as any).goaffpro_order); } catch {}
      }
      // Clear once used to avoid duplicate tracking
      localStorage.removeItem('anoint:lastCheckout');
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mystical-card max-w-xl w-full p-8 rounded-lg text-center"
      >
        <div className="flex items-center justify-center mb-4">
          <CheckCircle className="h-12 w-12 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Order Successful</h1>
        <p className="text-gray-300 mb-6">
          Thank you for your purchase. A receipt has been sent to your email.
        </p>

        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 text-left space-y-3 mb-6">
          <div className="flex items-center text-gray-300">
            <Mail className="h-5 w-5 mr-2 text-purple-400" />
            <span>Check your inbox for the receipt and details.</span>
          </div>
          <div className="flex items-center text-gray-300">
            <Download className="h-5 w-5 mr-2 text-blue-400" />
            <span>If you purchased a digital product, visit your dashboard to download it.</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => router.push('/dashboard/orders')}
            className="aurora-gradient text-white px-6 py-3 rounded-lg font-semibold"
          >
            Go to Orders
          </button>
          <button
            onClick={() => { try { window.close(); } catch {} }}
            className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold border border-gray-700"
          >
            Close Window
          </button>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold border border-gray-700"
          >
            Continue Shopping
          </button>
        </div>
      </motion.div>
    </div>
  );
}
