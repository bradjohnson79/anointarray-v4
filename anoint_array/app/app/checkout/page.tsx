'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePayment } from '@/contexts/payment-context';
import StripePayment from '@/components/payment/stripe-payment';
import PayPalPayment from '@/components/payment/paypal-payment';
import CryptoPayment from '@/components/payment/crypto-payment';
import { calculateCanadianTaxes } from '@/lib/canadian-taxes';
import { ChevronDown, ChevronUp, MapPin, Phone, User, Mail, ShoppingCart } from 'lucide-react';

export default function CheckoutPage() {
  const { data: session } = useSession();
  const {
    state,
    updateQuantity,
    removeFromCart,
    getTotalItems,
    getTotalPrice,
    setShippingAddress,
    setBillingAddress,
    setBillingSameAsShipping,
  } = usePayment();

  const [active, setActive] = useState<'shipping' | 'payment'>('shipping');
  const [paymentsCfg, setPaymentsCfg] = useState<any | null>(null);

  const [billingSame, setBillingSame] = useState<boolean>(state.billingSameAsShipping ?? true);
  const [shipping, setShipping] = useState({
    fullName: state.shippingAddress?.fullName || (session?.user?.name || ''),
    email: state.shippingAddress?.email || (session?.user?.email || ''),
    phone: state.shippingAddress?.phone || '',
    street: state.shippingAddress?.street || '',
    address2: (state.shippingAddress as any)?.address2 || '',
    city: state.shippingAddress?.city || '',
    state: state.shippingAddress?.state || '',
    zip: state.shippingAddress?.zip || '',
    country: state.shippingAddress?.country || 'CA',
  });
  const [billing, setBilling] = useState({
    fullName: state.billingAddress?.fullName || (session?.user?.name || ''),
    email: state.billingAddress?.email || (session?.user?.email || ''),
    phone: state.billingAddress?.phone || '',
    street: state.billingAddress?.street || '',
    address2: (state.billingAddress as any)?.address2 || '',
    city: state.billingAddress?.city || '',
    state: state.billingAddress?.state || '',
    zip: state.billingAddress?.zip || '',
    country: state.billingAddress?.country || 'CA',
  });

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/admin/storefront/payments');
        const data = await resp.json();
        setPaymentsCfg(data);
      } catch (_) {}
    })();
  }, []);
  const [fxRate, setFxRate] = useState(1);
  useEffect(() => {
    (async () => {
      const code = (paymentsCfg?.pricing?.currency || 'USD').toUpperCase();
      if (code !== 'USD') {
        try {
          const r = await fetch(`/api/currency/rate?from=USD&to=${code}`);
          const j = await r.json();
          setFxRate(Number(j?.rate) || 1);
        } catch { setFxRate(1); }
      } else {
        setFxRate(1);
      }
    })();
  }, [paymentsCfg?.pricing?.currency]);

  const currencyCode = (paymentsCfg?.pricing?.currency || 'USD').toUpperCase();
  const sym = currencyCode === 'CAD' ? 'CA$' : currencyCode === 'USD' ? '$' : currencyCode + ' ';

  const validateAddress = (a: any) => {
    if (!a.fullName || !a.email || !a.street || !a.city || !a.state || !a.zip || !a.country) return false;
    return true;
  };

  const onContinueToPayment = () => {
    if (!validateAddress(shipping)) return;
    setShippingAddress({ ...shipping });
    setBillingSameAsShipping(billingSame);
    setBillingAddress(billingSame ? { ...shipping } : { ...billing });
    setActive('payment');
  };

  // Guest checkout policy: allowed only if cart has no digital/seal items
  const hasDigital = state.cart.some(i => i.type === 'seal' || i.customData?.isDigital === true);

  const totals = useMemo(() => {
    const subtotalUSD = getTotalPrice();
    const shippingUSD = state.cart.length > 0 ? (shipping.country === 'US' ? 15.5 : 12.5) : 0;
    let taxUSD = 0;
    if (shipping.country === 'CA' && shipping.state) {
      try {
        const result = calculateCanadianTaxes({
          destinationProvince: String(shipping.state),
          buyerCountry: 'CA',
          items: state.cart.map((it:any)=>({ isDigital: !!(it.type==='seal' || it.customData?.isDigital), priceCents: Math.round(it.price*100), quantity: it.quantity }))
        });
        taxUSD = result.totalTaxCents / 100;
      } catch {}
    } else if (shipping.country === 'US') {
      taxUSD = +(subtotalUSD * 0.35).toFixed(2);
    }
    const rate = fxRate || 1;
    const subtotal = +(subtotalUSD * rate).toFixed(2);
    const shippingEstimate = +(shippingUSD * rate).toFixed(2);
    const tax = +(taxUSD * rate).toFixed(2);
    const total = +(subtotal + shippingEstimate + tax).toFixed(2);
    return { subtotal, shippingEstimate, tax, total };
  }, [getTotalPrice, state.cart, shipping.country, shipping.state, fxRate]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <ShoppingCart className="h-6 w-6 text-purple-400" />
        Checkout
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Accordions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Shipping Accordion */}
          <div className="bg-gray-900 rounded-lg border border-gray-700">
            <button
              className="w-full flex items-center justify-between p-4 text-left"
              onClick={() => setActive('shipping')}
            >
              <div className="text-white font-semibold">1. Shipping Information</div>
              {active === 'shipping' ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {active === 'shipping' && (
    <div className="p-4 pt-0 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-purple-400" />
          <input value={shipping.fullName} onChange={e=>setShipping({...shipping, fullName:e.target.value})} placeholder="Full name" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-purple-400" />
          <input value={shipping.email} onChange={e=>setShipping({...shipping, email:e.target.value})} placeholder="Email" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-purple-400" />
        <input value={shipping.phone} onChange={e=>setShipping({...shipping, phone:e.target.value})} placeholder="Phone" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white" />
      </div>
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-purple-400" />
        <input value={shipping.street} onChange={e=>setShipping({...shipping, street:e.target.value})} placeholder="Street address" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white" />
      </div>
      <div>
        <input value={shipping.address2 || ''} onChange={e=>setShipping({...shipping, address2:e.target.value})} placeholder="Address 2 (optional)" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white" />
      </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input value={shipping.city} onChange={e=>setShipping({...shipping, city:e.target.value})} placeholder="City" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white" />
                  <input value={shipping.state} onChange={e=>setShipping({...shipping, state:e.target.value})} placeholder="State/Province" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white" />
                  <input value={shipping.zip} onChange={e=>setShipping({...shipping, zip:e.target.value})} placeholder="Postal / ZIP" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <select value={shipping.country} onChange={e=>setShipping({...shipping, country:e.target.value})} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white">
                    <option value="CA">Canada</option>
                    <option value="US">United States</option>
                  </select>
                  <label className="flex items-center gap-2 text-gray-300">
                    <input type="checkbox" checked={billingSame} onChange={e=>setBillingSame(e.target.checked)} />
                    Billing same as shipping
                  </label>
                </div>
                {!billingSame && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input value={billing.fullName} onChange={e=>setBilling({...billing, fullName:e.target.value})} placeholder="Billing full name" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white" />
                      <input value={billing.email} onChange={e=>setBilling({...billing, email:e.target.value})} placeholder="Billing email" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white" />
                    </div>
                    <input value={billing.phone} onChange={e=>setBilling({...billing, phone:e.target.value})} placeholder="Billing phone" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white" />
                    <input value={billing.street} onChange={e=>setBilling({...billing, street:e.target.value})} placeholder="Billing street" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white" />
                    <input value={billing.address2 || ''} onChange={e=>setBilling({...billing, address2:e.target.value})} placeholder="Billing address 2 (optional)" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input value={billing.city} onChange={e=>setBilling({...billing, city:e.target.value})} placeholder="City" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white" />
                      <input value={billing.state} onChange={e=>setBilling({...billing, state:e.target.value})} placeholder="State/Province" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white" />
                      <input value={billing.zip} onChange={e=>setBilling({...billing, zip:e.target.value})} placeholder="Postal / ZIP" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white" />
                    </div>
                    <select value={billing.country} onChange={e=>setBilling({...billing, country:e.target.value})} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white">
                      <option value="CA">Canada</option>
                      <option value="US">United States</option>
                    </select>
                  </div>
                )}
                <div className="pt-2">
                  <button onClick={onContinueToPayment} className="aurora-gradient text-white px-6 py-3 rounded-lg font-semibold">Continue to Payment</button>
                </div>
              </div>
            )}
          </div>

          {/* Payment Accordion */}
          <div className="bg-gray-900 rounded-lg border border-gray-700">
            <button
              className="w-full flex items-center justify-between p-4 text-left"
              onClick={() => setActive(validateAddress(shipping) ? 'payment' : 'shipping')}
            >
              <div className="text-white font-semibold">2. Payment</div>
              {active === 'payment' ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {active === 'payment' && (
              <div className="p-4 pt-0 space-y-6">
                {!validateAddress(shipping) ? (
                  <div className="text-yellow-300 text-sm">Please complete shipping information first.</div>
                ) : (
                  <>
                    {!hasDigital ? null : (
                      <div className="p-3 bg-purple-600/10 border border-purple-500/40 rounded text-purple-200 text-sm">
                        Digital products require a free account. Please <a href="/auth/login" className="underline">log in</a> or <a href="/auth/signup" className="underline">create an account</a> to continue.
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <button onClick={() => setActive('shipping')} className="text-sm text-gray-300 hover:text-white underline">Back to Shipping</button>
                    </div>
                    {paymentsCfg?.stripe?.enabled && (
                      <StripePayment amount={totals.total} shippingAmount={totals.shippingEstimate} currency={currencyCode} displaySymbol={sym} publishableKey={(paymentsCfg?.stripe?.testMode ? paymentsCfg?.stripe?.testPublishableKey : paymentsCfg?.stripe?.publishableKey) || undefined} />
                    )}
                    {paymentsCfg?.paypal?.enabled && (
                      <PayPalPayment amount={totals.total} shippingAmount={totals.shippingEstimate} currency={currencyCode} displaySymbol={sym} />
                    )}
                    {paymentsCfg?.nowPayments?.enabled && (
                      <CryptoPayment amount={totals.total} shippingAmount={totals.shippingEstimate} currency={currencyCode} displaySymbol={sym} />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 h-max">
          <div className="text-white font-semibold mb-3">Order Summary</div>
          <div className="space-y-3 mb-4">
            {state.cart.length === 0 ? (
              <div className="text-gray-400 text-sm">Your cart is empty.</div>
            ) : (
              state.cart.map(item => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="text-gray-300 truncate mr-2">{item.name} × {item.quantity}</div>
                  <div className="text-gray-100">${(item.price * item.quantity).toFixed(2)}</div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-gray-700 pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-300"><span>Subtotal</span><span className="text-gray-100">{sym}{totals.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-gray-300"><span>Shipping</span><span className="text-gray-100">{sym}{totals.shippingEstimate.toFixed(2)}</span></div>
            <div className="flex justify-between text-gray-300"><span>Tax</span><span className="text-gray-100">{sym}{totals.tax.toFixed(2)}</span></div>
            <div className="flex justify-between text-white font-semibold pt-2"><span>Total</span><span>{sym}{totals.total.toFixed(2)}</span></div>
          </div>
          <div className="mt-3 text-sm flex items-center gap-4">
            <a href="/cart" className="text-gray-300 hover:text-white underline">Back to Cart</a>
            <a href="/" className="text-gray-300 hover:text-white underline">Return to Home</a>
          </div>
        </div>
      </div>
    </div>
  );
}
