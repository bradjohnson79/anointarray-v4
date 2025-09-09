
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, CreditCard, DollarSign, Coins, Minus, Plus, Trash2, Loader, MapPin, Phone, User, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { usePayment } from '@/contexts/payment-context';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import StripePayment from './stripe-payment';
import PayPalPayment from './paypal-payment';
import CryptoPayment from './crypto-payment';

export default function PaymentModal() {
  const { state, toggleModal, updateQuantity, removeFromCart, clearCart, setPaymentMethod, getTotalPrice, getTotalItems, setShippingAddress, setBillingAddress, setBillingSameAsShipping } = usePayment();
  const { data: session } = useSession();
  const [step, setStep] = useState<'cart' | 'payment' | 'processing'>('cart');
  const [payments, setPayments] = useState<any | null>(null);
  const [buyerCountry, setBuyerCountry] = useState<string>(state.shippingAddress?.country || 'CA');
  // Location data
  const US_STATES = [
    { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'DC', name: 'District of Columbia' },
    { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
  ];
  const CA_PROVINCES = [
    { code: 'AB', name: 'Alberta' }, { code: 'BC', name: 'British Columbia' }, { code: 'MB', name: 'Manitoba' },
    { code: 'NB', name: 'New Brunswick' }, { code: 'NL', name: 'Newfoundland and Labrador' }, { code: 'NS', name: 'Nova Scotia' },
    { code: 'NT', name: 'Northwest Territories' }, { code: 'NU', name: 'Nunavut' }, { code: 'ON', name: 'Ontario' },
    { code: 'PE', name: 'Prince Edward Island' }, { code: 'QC', name: 'Quebec' }, { code: 'SK', name: 'Saskatchewan' },
    { code: 'YT', name: 'Yukon' },
  ];

  // Local form state for address details
  const [shipping, setShipping] = useState({
    fullName: state.shippingAddress?.fullName || (session?.user?.name || ''),
    email: state.shippingAddress?.email || (session?.user?.email || ''),
    phone: state.shippingAddress?.phone || '',
    street: state.shippingAddress?.street || '',
    city: state.shippingAddress?.city || '',
    state: state.shippingAddress?.state || '',
    zip: state.shippingAddress?.zip || '',
    country: state.shippingAddress?.country || buyerCountry || 'CA',
  });
  const [billingSame, setBillingSame] = useState<boolean>(state.billingSameAsShipping ?? true);
  const [billing, setBilling] = useState({
    fullName: state.billingAddress?.fullName || (session?.user?.name || ''),
    email: state.billingAddress?.email || (session?.user?.email || ''),
    phone: state.billingAddress?.phone || '',
    street: state.billingAddress?.street || '',
    city: state.billingAddress?.city || '',
    state: state.billingAddress?.state || '',
    zip: state.billingAddress?.zip || '',
    country: state.billingAddress?.country || buyerCountry || 'CA',
  });

  // Determine cart composition for guest checkout rules
  const hasPhysical = state.cart.some(item => (item.type === 'product' && item.customData?.isDigital !== true));
  const hasDigital = state.cart.some(item => (item.type === 'seal') || item.customData?.isDigital === true);
  const canGuestCheckout = hasPhysical && !hasDigital;
  const shippingCompleteAtStart = (() => {
    if (!hasPhysical) return true;
    const a = state.shippingAddress as any;
    return !!(a && a.fullName && a.street && a.city && a.state && a.zip && a.country);
  })();
  const [addressOpen, setAddressOpen] = useState<boolean>(hasPhysical && !shippingCompleteAtStart);
  const [paymentOpen, setPaymentOpen] = useState<boolean>(!hasPhysical || shippingCompleteAtStart);
  const subtotal = state.cart.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const previewExtra = (() => {
    const buyer = (shipping.country || '').toUpperCase();
    if (buyer === 'CA' && shipping.state) {
      // Lightweight client-side estimate (5% GST nationwide on digital, province rules for physical)
      // For UI preview only. Server is source of truth.
      try {
        // Inline minimal logic: assume HST 13% for ON, 15% for NB/NL/NS/PE; else 5% GST + PST for BC(7), SK(6), MB(7), QC(9.975); GST 5% for others
        const prov = String(shipping.state).toUpperCase();
        const itemSubtotal = subtotal;
        const hstProv: Record<string, number> = { ON: 13, NB: 15, NL: 15, NS: 15, PE: 15 };
        if (hstProv[prov]) return Math.round(itemSubtotal * (hstProv[prov] / 100) * 100) / 100;
        if (['BC','SK','MB','QC'].includes(prov)) {
          const pstRates: Record<string, number> = { BC: 7, SK: 6, MB: 7, QC: 9.975 };
          return Math.round(itemSubtotal * ((5 + pstRates[prov]) / 100) * 100) / 100;
        }
        return Math.round(itemSubtotal * 0.05 * 100) / 100;
      } catch { return 0; }
    }
    if (buyer === 'US') {
      return Math.round(subtotal * 0.35 * 100) / 100;
    }
    return 0;
  })();

  useEffect(() => {
    if (!state.isOpen) return;
    (async () => {
      try {
        const resp = await fetch('/api/admin/storefront/payments');
        if (resp.ok) setPayments(await resp.json());
      } catch (e) {
        console.error('Load payments config error', e);
      }
    })();
  }, [state.isOpen]);

  useEffect(() => {
    if (state.isOpen && state.cart.length === 0) {
      setStep('cart');
    }
  }, [state.isOpen, state.cart.length]);

  const handlePaymentMethodSelect = (method: typeof state.selectedPaymentMethod) => {
    setPaymentMethod(method);
    setStep('payment');
  };

  const handleClose = () => {
    toggleModal(false);
    setStep('cart');
    setPaymentMethod(null);
  };

  const validateAddress = (a: typeof shipping) => {
    const required = ['fullName', 'street', 'city', 'state', 'zip', 'country'] as const;
    for (const key of required) {
      if (!a[key] || String(a[key]).trim() === '') return false;
    }
    // Basic postal validation
    if (a.country === 'US' && !/^\d{5}(-\d{4})?$/.test(a.zip)) return false;
    if (a.country === 'CA' && !/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(a.zip)) return false;
    return true;
  };

  const handleSaveDetailsAndContinue = () => {
    if (!session && !canGuestCheckout) {
      toast.error('Please log in to continue');
      return;
    }
    if (!validateAddress(shipping)) {
      toast.error('Please complete all required shipping fields');
      return;
    }
    setShippingAddress({ ...shipping });
    setBillingSameAsShipping(billingSame);
    if (!billingSame) {
      if (!validateAddress(billing)) {
        toast.error('Please complete all required billing fields');
        return;
      }
      setBillingAddress({ ...billing });
    } else {
      setBillingAddress({ ...shipping });
    }
    setBuyerCountry(shipping.country);
    setStep('payment');
  };

  if (!state.isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <ShoppingCart className="h-6 w-6 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">
                {step === 'cart' ? 'Shopping Cart' : step === 'payment' ? 'Checkout' : 'Processing Order'}
              </h2>
              {step === 'cart' && (
                <span className="bg-purple-600 text-white text-sm px-2 py-1 rounded-full">
                  {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'}
                </span>
              )}
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
            {step === 'cart' && (
              <div>
                {state.cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">Your cart is empty</h3>
                    <p className="text-gray-500 mb-6">Add some products to get started</p>
                    <button
                      onClick={handleClose}
                      className="aurora-gradient text-white px-6 py-3 rounded-lg font-semibold"
                    >
                      Continue Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Cart Items */}
                    <div className="space-y-4">
                      {state.cart.map(item => (
                        <div key={item.id} className="flex items-center space-x-4 bg-gray-800 p-4 rounded-lg">
                          {item.imageUrl && (
                            <div className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium truncate">{item.name}</h4>
                            <p className="text-gray-400 text-sm">
                              {item.type === 'seal' ? 'Custom Seal Array' : item.category}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2 bg-gray-700 rounded-lg">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="p-2 text-gray-400 hover:text-white transition-colors"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="text-white font-medium px-2">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="p-2 text-gray-400 hover:text-white transition-colors"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-white font-semibold">${(item.price * item.quantity).toFixed(2)}</div>
                              <div className="text-gray-400 text-sm">${item.price.toFixed(2)} each</div>
                            </div>
                            
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="p-2 text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary */}
                    <div className="border-t border-gray-700 pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-semibold text-white">Total</span>
                        <span className="text-2xl font-bold aurora-text">${getTotalPrice().toFixed(2)}</span>
                      </div>
                      
                      <div className="flex space-x-3">
                        <button
                          onClick={clearCart}
                          className="flex-1 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                        >
                          Clear Cart
                        </button>
                        <button
                          onClick={() => setStep('payment')}
                          disabled={!session && !canGuestCheckout}
                          className="flex-2 aurora-gradient text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {session ? 'Proceed to Checkout' : (canGuestCheckout ? 'Proceed as Guest' : 'Login Required')}
                        </button>
                      </div>
                      
                      {!session && (
                        <p className="text-yellow-400 text-sm mt-2 text-center">
                          {canGuestCheckout ? 'Guest checkout available for physical items only' : 'Please log in to complete your purchase'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* details step removed; address captured inside payment step accordion */}

            {step === 'payment' && (
              <div className="space-y-6">
                {hasPhysical && (
                  <div className="bg-gray-800 rounded-lg border border-gray-700">
                    <button onClick={() => setAddressOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                      <span className="text-white font-semibold">1. User Address Information</span>
                      {addressOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </button>
                    {addressOpen && (
                      <div className="p-4 pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm text-gray-300 mb-1">Full Name <span className="text-red-400">*</span></label>
                            <div className="relative">
                              <User className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                              <input value={shipping.fullName} onChange={(e)=>setShipping(s=>({...s, fullName:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-10 py-2 text-white" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Email</label>
                            <div className="relative">
                              <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                              <input value={shipping.email} onChange={(e)=>setShipping(s=>({...s, email:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-10 py-2 text-white" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Phone</label>
                            <div className="relative">
                              <Phone className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                              <input value={shipping.phone} onChange={(e)=>setShipping(s=>({...s, phone:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-10 py-2 text-white" />
                            </div>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm text-gray-300 mb-1">Street Address <span className="text-red-400">*</span></label>
                            <div className="relative">
                              <MapPin className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                              <input value={shipping.street} onChange={(e)=>setShipping(s=>({...s, street:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-10 py-2 text-white" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">City <span className="text-red-400">*</span></label>
                            <input value={shipping.city} onChange={(e)=>setShipping(s=>({...s, city:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white" />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">{shipping.country === 'CA' ? 'Province' : shipping.country === 'US' ? 'State' : 'State/Region'} <span className="text-red-400">*</span></label>
                            {shipping.country === 'US' ? (
                              <select value={shipping.state} onChange={(e)=>setShipping(s=>({...s, state:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white">
                                <option value="">Select state...</option>
                                {US_STATES.map(s => (<option key={s.code} value={s.code}>{s.name}</option>))}
                              </select>
                            ) : shipping.country === 'CA' ? (
                              <select value={shipping.state} onChange={(e)=>setShipping(s=>({...s, state:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white">
                                <option value="">Select province...</option>
                                {CA_PROVINCES.map(p => (<option key={p.code} value={p.code}>{p.name}</option>))}
                              </select>
                            ) : (
                              <input value={shipping.state} onChange={(e)=>setShipping(s=>({...s, state:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white" />
                            )}
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Postal/ZIP <span className="text-red-400">*</span></label>
                            <input value={shipping.zip} onChange={(e)=>setShipping(s=>({...s, zip:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white" />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-300 mb-1">Country <span className="text-red-400">*</span></label>
                            <select value={shipping.country} onChange={(e)=>setShipping(s=>({...s, country:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white">
                              <option value="US">United States</option>
                              <option value="CA">Canada</option>
                              <option value="GB">United Kingdom</option>
                              <option value="AU">Australia</option>
                              <option value="DE">Germany</option>
                              <option value="FR">France</option>
                              <option value="IT">Italy</option>
                              <option value="ES">Spain</option>
                              <option value="NL">Netherlands</option>
                              <option value="BE">Belgium</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="inline-flex items-center space-x-2 text-sm text-gray-300">
                            <input type="checkbox" checked={billingSame} onChange={(e)=>setBillingSame(e.target.checked)} className="form-checkbox" />
                            <span>Billing same as shipping</span>
                          </label>
                        </div>
                        {!billingSame && (
                          <div className="space-y-4">
                            <h3 className="text-sm text-gray-300">Billing Address</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm text-gray-300 mb-1">Full Name</label>
                                <div className="relative">
                                  <User className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                                  <input value={billing.fullName} onChange={(e)=>setBilling(s=>({...s, fullName:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-10 py-2 text-white" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm text-gray-300 mb-1">Email</label>
                                <div className="relative">
                                  <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                                  <input value={billing.email} onChange={(e)=>setBilling(s=>({...s, email:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-10 py-2 text-white" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm text-gray-300 mb-1">Phone</label>
                                <div className="relative">
                                  <Phone className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                                  <input value={billing.phone} onChange={(e)=>setBilling(s=>({...s, phone:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-10 py-2 text-white" />
                                </div>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm text-gray-300 mb-1">Street Address</label>
                                <div className="relative">
                                  <MapPin className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                                  <input value={billing.street} onChange={(e)=>setBilling(s=>({...s, street:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-10 py-2 text-white" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm text-gray-300 mb-1">City</label>
                                <input value={billing.city} onChange={(e)=>setBilling(s=>({...s, city:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white" />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-300 mb-1">{billing.country === 'CA' ? 'Province' : billing.country === 'US' ? 'State' : 'State/Region'} <span className="text-red-400">*</span></label>
                                {billing.country === 'US' ? (
                                  <select value={billing.state} onChange={(e)=>setBilling(s=>({...s, state:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white">
                                    <option value="">Select state...</option>
                                    {US_STATES.map(s => (<option key={s.code} value={s.code}>{s.name}</option>))}
                                  </select>
                                ) : billing.country === 'CA' ? (
                                  <select value={billing.state} onChange={(e)=>setBilling(s=>({...s, state:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white">
                                    <option value="">Select province...</option>
                                    {CA_PROVINCES.map(p => (<option key={p.code} value={p.code}>{p.name}</option>))}
                                  </select>
                                ) : (
                                  <input value={billing.state} onChange={(e)=>setBilling(s=>({...s, state:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white" />
                                )}
                              </div>
                              <div>
                                <label className="block text-sm text-gray-300 mb-1">Postal/ZIP</label>
                                <input value={billing.zip} onChange={(e)=>setBilling(s=>({...s, zip:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white" />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-300 mb-1">Country</label>
                                <select value={billing.country} onChange={(e)=>setBilling(s=>({...s, country:e.target.value}))} className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white">
                                  <option value="US">United States</option>
                                  <option value="CA">Canada</option>
                                  <option value="GB">United Kingdom</option>
                                  <option value="AU">Australia</option>
                                  <option value="DE">Germany</option>
                                  <option value="FR">France</option>
                                  <option value="IT">Italy</option>
                                  <option value="ES">Spain</option>
                                  <option value="NL">Netherlands</option>
                                  <option value="BE">Belgium</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                        {shipping.country === 'US' && (
                          <div className="mt-2 p-2 bg-yellow-600/20 border border-yellow-500/40 rounded text-yellow-300 text-sm">
                            Note: U.S. customers — prices include pre‑paid Canadian tariffs (approx. 35%).
                          </div>
                        )}
                        <div className="flex justify-end mt-4">
                          <button onClick={() => { handleSaveDetailsAndContinue(); setAddressOpen(false); setPaymentOpen(true); }} className="aurora-gradient text-white px-6 py-2 rounded-lg font-semibold">Save & Continue</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="bg-gray-800 rounded-lg border border-gray-700">
                  <button
                    onClick={() => {
                      if (hasPhysical) {
                        // Require saved address to proceed
                        const ok = state.shippingAddress && (
                          state.shippingAddress.fullName && state.shippingAddress.street && state.shippingAddress.city && state.shippingAddress.state && state.shippingAddress.zip && state.shippingAddress.country
                        );
                        if (!ok) {
                          toast.error('Please save your shipping address first');
                          return;
                        }
                      }
                      setPaymentOpen(o => !o);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="text-white font-semibold">{hasPhysical ? '2. ' : ''}Payment Options</span>
                    {paymentOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </button>
                  {paymentOpen && (
                    <div className="p-4 pt-0">
                      {/* Order summary with taxes/tariff preview (client-side estimate; server authoritative) */}
                      {(previewExtra > 0) && (
                        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-4">
                          <div className="flex justify-between text-gray-300 text-sm">
                            <span>Subtotal</span>
                            <span>${subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-gray-300 text-sm mt-1">
                            <span>{(shipping.country || '').toUpperCase() === 'CA' ? 'Estimated Taxes' : 'Prepaid Tariff (35%)'}</span>
                            <span>${previewExtra.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-white font-semibold border-t border-gray-700 pt-2 mt-2">
                            <span>Estimated Total</span>
                            <span>${(subtotal + previewExtra).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                      {!state.selectedPaymentMethod ? (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-white mb-6">Choose Payment Method</h3>
                          {buyerCountry === 'US' && (
                            <div className="mb-4 p-2 bg-yellow-600/20 border border-yellow-500/40 rounded text-yellow-300 text-sm">Note: U.S. customers — prices include pre‑paid Canadian tariffs (approx. 35%).</div>
                          )}
                          <div className="grid gap-4">
                            {payments?.stripe?.enabled && (
                              <button onClick={() => handlePaymentMethodSelect('stripe')} className="flex items-center space-x-4 p-4 border-2 border-gray-700 hover:border-blue-500 rounded-lg transition-colors group">
                                <CreditCard className="h-8 w-8 text-blue-400" />
                                <div className="text-left">
                                  <div className="text-white font-semibold group-hover:text-blue-400 transition-colors">Credit/Debit Card</div>
                                  <div className="text-gray-400 text-sm">Visa, Mastercard, American Express</div>
                                </div>
                              </button>
                            )}
                            {payments?.paypal?.enabled && (
                              <button onClick={() => handlePaymentMethodSelect('paypal')} className="flex items-center space-x-4 p-4 border-2 border-gray-700 hover:border-yellow-500 rounded-lg transition-colors group">
                                <DollarSign className="h-8 w-8 text-yellow-400" />
                                <div className="text-left">
                                  <div className="text-white font-semibold group-hover:text-yellow-400 transition-colors">PayPal</div>
                                  <div className="text-gray-400 text-sm">Pay with your PayPal account</div>
                                </div>
                              </button>
                            )}
                            {payments?.nowPayments?.enabled && (
                              <button onClick={() => handlePaymentMethodSelect('crypto')} className="flex items-center space-x-4 p-4 border-2 border-gray-700 hover:border-purple-500 rounded-lg transition-colors group">
                                <Coins className="h-8 w-8 text-purple-400" />
                                <div className="text-left">
                                  <div className="text-white font-semibold group-hover:text-purple-400 transition-colors">Cryptocurrency</div>
                                  <div className="text-gray-400 text-sm">Bitcoin, Ethereum, and more</div>
                                </div>
                              </button>
                            )}
                          </div>
                          <div className="flex justify-between mt-6">
                            <button onClick={() => setStep('cart')} className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">Back to Cart</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="bg-gray-800 p-4 rounded-lg mb-6">
                            <h4 className="text-white font-semibold mb-2">Order Summary</h4>
                            <div className="space-y-1 text-sm">
                              {state.cart.map(item => (
                                <div key={item.id} className="flex justify-between text-gray-300"><span>{item.name} × {item.quantity}</span><span>${(item.price * item.quantity).toFixed(2)}</span></div>
                              ))}
                              <div className="border-t border-gray-700 pt-2 mt-2">
                                <div className="flex justify-between text-white font-semibold"><span>Total</span><span>${getTotalPrice().toFixed(2)}</span></div>
                              </div>
                            </div>
                          </div>
                          {state.selectedPaymentMethod === 'stripe' && (
                            <StripePayment publishableKey={(payments?.stripe?.testMode ? payments?.stripe?.testPublishableKey : payments?.stripe?.publishableKey) || undefined} />
                          )}
                          {state.selectedPaymentMethod === 'paypal' && <PayPalPayment />}
                          {state.selectedPaymentMethod === 'crypto' && <CryptoPayment />}
                          <div className="flex justify-between mt-6">
                            <button onClick={() => setPaymentMethod(null)} disabled={state.isProcessing} className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50">Change Method</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 'processing' && (
              <div className="text-center py-12">
                <Loader className="h-16 w-16 text-purple-400 mx-auto mb-4 animate-spin" />
                <h3 className="text-xl font-semibold text-white mb-2">Processing Your Order</h3>
                <p className="text-gray-400">Please wait while we process your payment...</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
