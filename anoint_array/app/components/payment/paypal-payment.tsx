
'use client';

import { useState } from 'react';
import { DollarSign, Lock, Loader } from 'lucide-react';
import { usePayment } from '@/contexts/payment-context';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export default function PayPalPayment({ amount, shippingAmount, currency, displaySymbol }: { amount?: number; shippingAmount?: number; currency?: string; displaySymbol?: string }) {
  const { state, setProcessing, clearCart, toggleModal, getTotalPrice } = usePayment();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    const hasDigital = state.cart.some(item => item.type === 'seal' || item.customData?.isDigital === true);
    const guestAllowed = !hasDigital;
    if (!session && !guestAllowed) {
      toast.error('Please log in or create a free account to purchase digital items.');
      return;
    }

    setLoading(true);
    setProcessing(true);

    try {
      const popup = window.open('about:blank', 'paypal_checkout', 'width=520,height=720,menubar=no,toolbar=no,status=no');
      const onMessage = (e: MessageEvent) => {
        if (e.origin === window.location.origin && e.data?.type === 'payment-success') {
          try { popup?.close(); } catch {}
          clearCart();
          window.removeEventListener('message', onMessage);
          window.location.href = '/success?provider=paypal';
        }
      };
      window.addEventListener('message', onMessage);

      // Create PayPal order
      const response = await fetch('/api/payment/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: state.cart,
          userId: session?.user?.id,
          userEmail: session?.user?.email || state.shippingAddress?.email,
          allowGuest: !session?.user,
          shippingAddress: state.shippingAddress,
          billingAddress: state.billingAddress,
          billingSameAsShipping: state.billingSameAsShipping,
          shippingAmount: typeof shippingAmount === 'number' ? shippingAmount : 0,
          currency: (currency || 'USD').toUpperCase(),
        })
      });

      const { approvalUrl, orderId, error } = await response.json();

      if (error) throw new Error(error);

      // Open in popup
      if (approvalUrl && popup) {
        popup.location.href = approvalUrl;
      } else {
        throw new Error('PayPal approval URL missing');
      }
    } catch (error) {
      console.error('PayPal payment error:', error);
      toast.error('PayPal payment failed. Please try again.');
      setLoading(false);
      setProcessing(false);
      try { const w = window.open('', 'paypal_checkout'); w?.close(); } catch {}
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-gray-300 mb-4">
        <Lock className="h-4 w-4" />
        <span className="text-sm">Secure payment powered by PayPal</span>
      </div>

      {/* PayPal Info */}
      <div className="bg-gray-800 p-6 rounded-lg space-y-4">
        <div className="text-white font-medium flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-yellow-400" />
          <span>PayPal Payment</span>
        </div>
        
        <div className="text-sm text-gray-400">
          You'll be redirected to PayPal to complete your purchase securely. You can pay with your PayPal balance, bank account, or credit card.
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
          <div>
            <strong className="text-white">Payment Options:</strong><br />
            PayPal balance, Bank account, Credit/Debit cards
          </div>
          <div>
            <strong className="text-white">Buyer Protection:</strong><br />
            PayPal Purchase Protection included
          </div>
        </div>
      </div>

      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
      >
        {loading ? (
          <>
            <Loader className="h-5 w-5 animate-spin" />
            <span>Redirecting...</span>
          </>
        ) : (
          <>
            <DollarSign className="h-5 w-5" />
            <span>Pay with PayPal - {displaySymbol || '$'}{(amount ?? getTotalPrice()).toFixed(2)}</span>
          </>
        )}
      </button>

      <div className="text-xs text-gray-500 text-center">
        By clicking "Pay with PayPal", you'll be redirected to PayPal to complete your purchase.
        Your payment information is protected by PayPal's security measures.
      </div>
    </div>
  );
}
