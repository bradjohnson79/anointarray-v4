'use client';

import { useRouter } from 'next/navigation';
import { usePayment } from '@/contexts/payment-context';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { state, updateQuantity, removeFromCart, getTotalItems, getTotalPrice } = usePayment();

  const subtotal = getTotalPrice();
  const shippingEstimate = state.cart.length > 0 ? 12.5 : 0;
  const taxEstimate = 0; // shown at checkout based on country
  const total = +(subtotal + shippingEstimate + taxEstimate).toFixed(2);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <ShoppingCart className="h-6 w-6 text-purple-400" />
        Cart ({getTotalItems()})
      </h1>

      {state.cart.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <div className="text-gray-400 mb-4">Your cart is empty.</div>
          <button onClick={() => router.push('/#products')} className="aurora-gradient text-white px-6 py-3 rounded-lg font-semibold">Continue Shopping</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {state.cart.map(item => (
              <div key={item.id} className="flex items-center gap-4 bg-gray-900 p-4 rounded-lg border border-gray-700">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{item.name}</div>
                  <div className="text-gray-400 text-sm truncate">{item.type === 'seal' ? 'Custom Seal Array' : (item.category || 'Product')}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-gray-800 rounded">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-2 text-gray-300 hover:text-white"><Minus className="h-4 w-4" /></button>
                    <span className="px-3 text-white">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-2 text-gray-300 hover:text-white"><Plus className="h-4 w-4" /></button>
                  </div>
                  <div className="w-24 text-right text-gray-100">${(item.price * item.quantity).toFixed(2)}</div>
                  <button onClick={() => removeFromCart(item.id)} className="p-2 text-gray-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 h-max">
            <div className="text-white font-semibold mb-3">Summary</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-300"><span>Subtotal</span><span className="text-gray-100">${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-300"><span>Shipping (est.)</span><span className="text-gray-100">${shippingEstimate.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-300"><span>Tax (est.)</span><span className="text-gray-100">${taxEstimate.toFixed(2)}</span></div>
              <div className="flex justify-between text-white font-semibold pt-2"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
            <div className="mt-4 space-y-2">
              <button onClick={() => router.push('/checkout')} className="w-full aurora-gradient text-white px-6 py-3 rounded-lg font-semibold">Proceed to Checkout</button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button onClick={() => router.push('/#products')} className="w-full border border-gray-600 text-gray-300 px-6 py-3 rounded-lg">Continue Shopping</button>
                <button onClick={() => router.push('/')} className="w-full border border-gray-600 text-gray-300 px-6 py-3 rounded-lg">Return to Home</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
