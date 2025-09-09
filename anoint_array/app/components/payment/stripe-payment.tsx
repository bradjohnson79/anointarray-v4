
'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CreditCard, Lock, Loader } from 'lucide-react';
import { usePayment } from '@/contexts/payment-context';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export default function StripePayment({ publishableKey, amount, shippingAmount, currency, displaySymbol }: { publishableKey?: string; amount?: number; shippingAmount?: number; currency?: string; displaySymbol?: string }) {
  const { state, setProcessing, clearCart, toggleModal, getTotalPrice } = usePayment();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    // Guest checkout allowed only for physical products
    const hasDigital = state.cart.some(item => item.type === 'seal' || item.customData?.isDigital === true);
    const guestAllowed = !hasDigital;
    if (!session && !guestAllowed) {
      toast.error('Please log in or create a free account to purchase digital items.');
      return;
    }

    setLoading(true);
    setProcessing(true);

    try {
      // Create payment session
      const popup = window.open('about:blank', 'stripe_checkout', 'width=520,height=720,menubar=no,toolbar=no,status=no');
      const onMessage = (e: MessageEvent) => {
        if (e.origin === window.location.origin && e.data?.type === 'payment-success') {
          try { popup?.close(); } catch {}
          clearCart();
          window.removeEventListener('message', onMessage);
          window.location.href = '/success?provider=stripe';
        }
      };
      window.addEventListener('message', onMessage);

      const response = await fetch('/api/payment/stripe/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: state.cart,
          userId: session?.user?.id,
          userEmail: session?.user?.email || state.shippingAddress?.email,
          shippingAddress: state.shippingAddress,
          billingAddress: state.billingAddress,
          billingSameAsShipping: state.billingSameAsShipping,
          allowGuest: !session?.user,
          shippingAmount: typeof shippingAmount === 'number' ? shippingAmount : 0,
          currency: (currency || 'USD').toUpperCase(),
        })
      });

      const { clientSecret, url, error } = await response.json();

      if (error) throw new Error(error);

      // Open in popup
      if (url && popup) {
        popup.location.href = url;
      } else {
        // Fallback: redirect via Stripe SDK
        const stripe = await loadStripe(publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
        if (!stripe) throw new Error('Stripe failed to load');
        const { error: stripeError } = await stripe.redirectToCheckout({ sessionId: clientSecret });
        if (stripeError) throw new Error(stripeError.message);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
      try { const w = window.open('', 'stripe_checkout'); w?.close(); } catch {}
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-gray-300 mb-4">
        <Lock className="h-4 w-4" />
        <span className="text-sm">Secure payment powered by Stripe</span>
      </div>

      {/* Payment Form Placeholder */}
      <div className="bg-gray-800 p-6 rounded-lg space-y-4">
        <div className="text-white font-medium flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-blue-400" />
          <span>Credit Card Payment</span>
        </div>
        
        <div className="text-sm text-gray-400">
          Click "Pay with Stripe" to be redirected to our secure payment page where you can enter your card details.
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
          <div>
            <strong className="text-white">Accepted Cards:</strong><br />
            Visa, Mastercard, American Express, Discover
          </div>
          <div>
            <strong className="text-white">Security:</strong><br />
            256-bit SSL encryption, PCI DSS compliant
          </div>
        </div>
      </div>

      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full aurora-gradient text-white px-6 py-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {loading ? (
          <>
            <Loader className="h-5 w-5 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5" />
            <span>Pay with Stripe - {displaySymbol || '$'}{(amount ?? getTotalPrice()).toFixed(2)}</span>
          </>
        )}
      </button>

      <div className="text-xs text-gray-500 text-center">
        By clicking "Pay with Stripe", you agree to our Terms of Service and Privacy Policy.
        Your payment information is secure and encrypted.
      </div>
    </div>
  );
}
