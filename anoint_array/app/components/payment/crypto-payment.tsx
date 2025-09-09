
'use client';

import { useState, useEffect } from 'react';
import { Coins, Lock, Loader, Copy, CheckCircle } from 'lucide-react';
import { usePayment } from '@/contexts/payment-context';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface CryptoOption {
  id: string;
  name: string;
  symbol: string;
  network: string;
  icon: string;
}

const CRYPTO_OPTIONS: CryptoOption[] = [
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC', network: 'Bitcoin', icon: '₿' },
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', network: 'Ethereum', icon: 'Ξ' },
  { id: 'ltc', name: 'Litecoin', symbol: 'LTC', network: 'Litecoin', icon: 'Ł' },
  { id: 'usdt', name: 'Tether', symbol: 'USDT', network: 'Ethereum', icon: '₮' },
  { id: 'usdc', name: 'USD Coin', symbol: 'USDC', network: 'Ethereum', icon: '$' }
];

export default function CryptoPayment({ amount, shippingAmount, currency, displaySymbol }: { amount?: number; shippingAmount?: number; currency?: string; displaySymbol?: string }) {
  const { state, setProcessing, clearCart, toggleModal, getTotalPrice } = usePayment();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<string>('btc');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('idle');
  const [copied, setCopied] = useState(false);

  const createCryptoPayment = async () => {
    const hasDigital = state.cart.some(item => item.type === 'seal' || item.customData?.isDigital === true);
    const guestAllowed = !hasDigital;
    if (!session && !guestAllowed) {
      toast.error('Please log in or create a free account to purchase digital items.');
      return;
    }

    setLoading(true);
    setProcessing(true);

    try {
      const popup = window.open('about:blank', 'crypto_checkout', 'width=520,height=720,menubar=no,toolbar=no,status=no');
      const onMessage = (e: MessageEvent) => {
        if (e.origin === window.location.origin && e.data?.type === 'payment-success') {
          try { popup?.close(); } catch {}
          clearCart();
          window.removeEventListener('message', onMessage);
          window.location.href = '/success?provider=crypto';
        }
      };
      window.addEventListener('message', onMessage);

      const response = await fetch('/api/payment/crypto/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: state.cart,
          currency: selectedCrypto.toUpperCase(),
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          shippingAddress: state.shippingAddress,
          shippingAmount: typeof shippingAmount === 'number' ? shippingAmount : 0,
          fiatCurrency: (currency || 'USD').toUpperCase(),
        })
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // If NOWPayments provides a hosted payment URL, open in popup
      const hostedUrl = result?.invoice_url || result?.payment_url || result?.pay_url || '';
      if (hostedUrl && popup) {
        popup.location.href = hostedUrl;
      }

      setPaymentData(result);
      setPaymentStatus('created');
      if (!hostedUrl) {
        toast.success('Crypto payment created! Please send the exact amount.');
      }
    } catch (error) {
      console.error('Crypto payment error:', error);
      toast.error('Failed to create crypto payment. Please try again.');
      setProcessing(false);
      try { const w = window.open('', 'crypto_checkout'); w?.close(); } catch {}
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Poll for payment status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (paymentStatus === 'created' && paymentData?.paymentId) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/payment/crypto/status/${paymentData.paymentId}`);
          const result = await response.json();
          
          if (result.status === 'confirming') {
            setPaymentStatus('confirming');
            toast.success('Payment detected! Waiting for confirmation...');
          } else if (result.status === 'confirmed') {
            setPaymentStatus('completed');
            toast.success('Payment confirmed! Your order is being processed.');
            clearCart();
            toggleModal(false);
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Status check error:', error);
        }
      }, 30000); // Check every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentStatus, paymentData?.paymentId, clearCart, toggleModal]);

  if (paymentStatus === 'created' && paymentData) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="text-center mb-6">
            <div className="text-2xl font-bold text-white mb-2">
              {paymentData.payAmount} {paymentData.payCurrency.toUpperCase()}
            </div>
            <div className="text-gray-400">
              ≈ ${getTotalPrice().toFixed(2)} USD
            </div>
          </div>

          {/* QR Code would go here */}
          <div className="bg-white p-4 rounded-lg mb-4 flex items-center justify-center">
            <div className="text-gray-600 text-center">
              <Coins className="h-12 w-12 mx-auto mb-2" />
              <div className="text-sm">QR Code</div>
              <div className="text-xs">Scan with your wallet app</div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Send to Address:</label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-700 p-3 rounded font-mono text-sm text-white break-all">
                  {paymentData.payAddress}
                </div>
                <button
                  onClick={() => copyToClipboard(paymentData.payAddress)}
                  className="p-3 bg-purple-600 hover:bg-purple-500 rounded text-white transition-colors"
                >
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Exact Amount:</label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-700 p-3 rounded font-mono text-sm text-white">
                  {paymentData.payAmount} {paymentData.payCurrency.toUpperCase()}
                </div>
                <button
                  onClick={() => copyToClipboard(paymentData.payAmount)}
                  className="p-3 bg-purple-600 hover:bg-purple-500 rounded text-white transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-600/20 rounded-lg border border-yellow-500/50">
            <div className="text-yellow-300 text-sm">
              <strong>Important:</strong> Send the exact amount to the address above. 
              The payment will be automatically confirmed once received on the blockchain.
            </div>
          </div>

          {['confirming'].includes(paymentStatus) && (
            <div className="mt-4 p-4 bg-blue-600/20 rounded-lg border border-blue-500/50">
              <div className="text-blue-300 text-sm flex items-center space-x-2">
                <Loader className="h-4 w-4 animate-spin" />
                <span>Payment detected! Waiting for blockchain confirmation...</span>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 text-center">
          This payment will expire in 24 hours. Network fees may apply.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-gray-300 mb-4">
        <Lock className="h-4 w-4" />
        <span className="text-sm">Secure crypto payment powered by NOWPayments</span>
      </div>

      {/* Crypto Selection */}
      <div>
        <h4 className="text-white font-medium mb-3">Select Cryptocurrency</h4>
        <div className="grid grid-cols-2 gap-3">
          {CRYPTO_OPTIONS.map(crypto => (
            <button
              key={crypto.id}
              onClick={() => setSelectedCrypto(crypto.id)}
              className={`p-3 rounded-lg border transition-all ${
                selectedCrypto === crypto.id
                  ? 'border-purple-400 bg-purple-600/20'
                  : 'border-gray-600 bg-gray-800 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{crypto.icon}</span>
                <div className="text-left">
                  <div className="text-white font-medium text-sm">{crypto.name}</div>
                  <div className="text-gray-400 text-xs">{crypto.symbol}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Info */}
      <div className="bg-gray-800 p-6 rounded-lg space-y-4">
        <div className="text-white font-medium flex items-center space-x-2">
          <Coins className="h-5 w-5 text-purple-400" />
          <span>Cryptocurrency Payment</span>
        </div>
        
        <div className="text-sm text-gray-400">
          Pay with {CRYPTO_OPTIONS.find(c => c.id === selectedCrypto)?.name}. 
          You'll receive a unique wallet address to send your payment to.
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
          <div>
            <strong className="text-white">Processing Time:</strong><br />
            Usually 10-60 minutes depending on network
          </div>
          <div>
            <strong className="text-white">Network:</strong><br />
            {CRYPTO_OPTIONS.find(c => c.id === selectedCrypto)?.network} network
          </div>
        </div>
      </div>

      <button
        onClick={createCryptoPayment}
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-500 text-white px-6 py-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
      >
        {loading ? (
          <>
            <Loader className="h-5 w-5 animate-spin" />
            <span>Creating Payment...</span>
          </>
        ) : (
          <>
            <Coins className="h-5 w-5" />
            <span>Pay with {CRYPTO_OPTIONS.find(c => c.id === selectedCrypto)?.symbol} - {displaySymbol || '$'}{(amount ?? getTotalPrice()).toFixed(2)}</span>
          </>
        )}
      </button>

      <div className="text-xs text-gray-500 text-center">
        Crypto payments are final and cannot be refunded. Network fees apply and are paid by the sender.
      </div>
    </div>
  );
}
