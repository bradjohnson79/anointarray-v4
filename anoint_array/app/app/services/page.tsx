'use client';

import { useEffect, useRef, useState } from 'react';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Wand2, Activity, Home, Upload, CreditCard, DollarSign, Coins } from 'lucide-react';

type ServiceType = 'basic' | 'full' | 'environmental';

const SERVICE_INFO: Record<ServiceType, { title: string; price: number; description: string; icon: any } > = {
  basic: { title: 'Basic Service', price: 35, description: 'Scalar and Transcendental Frequencies for personal and environmental rejuvenation.', icon: Wand2 },
  full: { title: 'Full Body Scan Service', price: 98, description: 'Scan of major organs and subtle bodies + imbuing of up to 3 items.', icon: Activity },
  environmental: { title: 'Environmental Service', price: 143, description: 'Full Body Scan + environmental imbuing of an entire room.', icon: Home },
};

export default function ServicesPage() {
  const [service, setService] = useState<ServiceType>('full');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [photoData, setPhotoData] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickFile = async (file: File | null) => {
    if (!file) return setPhotoData('');
    if (!/^image\//.test(file.type)) {
      toast.error('Please select an image file');
      return;
    }
    // compress via canvas for reasonable size
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoData(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error('Please provide your name and email');
      return false;
    }
    return true;
  };

  const submitPayment = async (method: 'stripe' | 'paypal' | 'nowpayments') => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/payment/create-service-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: method,
          serviceType: service,
          customer: { fullName, email, phone, notes },
          photoData,
        }),
      });
      if (!res.ok) throw new Error('Payment init failed');
      const data = await res.json();
      try {
        localStorage.setItem('anoint:lastCheckout', JSON.stringify({ number: data.orderId || `service_${Date.now()}`, total: SERVICE_INFO[service].price }));
      } catch {}
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
        toast.success('Checkout opened in a new tab');
      } else if (data.paypalUrl) {
        window.open(data.paypalUrl, '_blank');
      } else if (data.cryptoUrl) {
        window.open(data.cryptoUrl, '_blank');
      } else {
        toast.error('Unexpected response from payment gateway');
      }
    } catch (e) {
      toast.error('Failed to initialize payment');
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const InfoIcon = SERVICE_INFO[service].icon;
  const formRef = useRef<HTMLDivElement | null>(null);

  // Preselect service from query and optionally scroll to form
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const t = (url.searchParams.get('type') || '').toLowerCase();
      if (t === 'basic' || t === 'full' || t === 'environmental') {
        setService(t as ServiceType);
      }
      if (url.hash === '#form') {
        setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
      }
    } catch {}
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Navigation />
      <section className="pt-24 pb-16 max-w-5xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <Wand2 className="h-14 w-14 aurora-text mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold">Item Imbuing & Full Body Scan</h1>
          <p className="text-gray-300 mt-3 max-w-2xl mx-auto">
            Select your service, upload an optional photo, and complete checkout. Once confirmed, we’ll email you instructions to provide any additional photos or details. Turnaround can be as soon as 24 hours depending on demand.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {(Object.keys(SERVICE_INFO) as ServiceType[]).map((key) => {
            const s = SERVICE_INFO[key];
            const Selected = s.icon;
            const active = key === service;
            return (
              <button
                key={key}
                onClick={() => setService(key)}
                className={`text-left p-5 rounded-xl border transition-all ${active ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700 bg-gray-800/40 hover:bg-gray-800/70'}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Selected className="h-6 w-6 aurora-text" />
                  <div className="text-lg font-semibold">{s.title}</div>
                </div>
                <div className="text-sm text-gray-300 mb-2">{s.description}</div>
                <div className="text-xl font-bold aurora-text">${'{'}s.price.toFixed(0){'}'}</div>
              </button>
            );
          })}
        </div>

        <div ref={formRef} id="form" className="mystical-card p-6 rounded-xl border border-gray-700/60">
          <h2 className="text-xl font-semibold mb-4">Your Details</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input placeholder="Full Name" value={fullName} onChange={(e)=>setFullName(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 w-full focus:outline-none focus:border-purple-500" />
            <input placeholder="Email Address" value={email} onChange={(e)=>setEmail(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 w-full focus:outline-none focus:border-purple-500" />
            <input placeholder="Phone (optional)" value={phone} onChange={(e)=>setPhone(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 w-full focus:outline-none focus:border-purple-500" />
            <div className="relative">
              <label className="block text-sm text-gray-400 mb-2">Upload a recent photo (optional)</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 bg-gray-800 border border-gray-700 px-4 py-3 rounded-lg cursor-pointer hover:border-purple-500">
                  <Upload className="h-5 w-5 text-purple-400" />
                  <span>{photoData ? 'Change Photo' : 'Choose Photo'}</span>
                  <input type="file" accept="image/*" onChange={(e)=>pickFile(e.target.files?.[0] || null)} className="hidden" />
                </label>
                {photoData && <span className="text-xs text-gray-400">Photo attached</span>}
              </div>
              <p className="text-xs text-gray-400 mt-2">After confirmation, we’ll request any additional photos needed based on the service selected.</p>
            </div>
          </div>
          <div className="mt-4">
            <textarea placeholder="Notes (optional)" value={notes} onChange={(e)=>setNotes(e.target.value)} rows={4} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500" />
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <button disabled={isSubmitting} onClick={()=>submitPayment('stripe')} className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 px-6 py-3 min-h-[44px] rounded-lg font-semibold">
            <CreditCard className="h-5 w-5" /> Pay with Card (Stripe)
          </button>
          <button disabled={isSubmitting} onClick={()=>submitPayment('paypal')} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 px-6 py-3 min-h-[44px] rounded-lg font-semibold">
            <DollarSign className="h-5 w-5" /> PayPal
          </button>
          <button disabled={isSubmitting} onClick={()=>submitPayment('nowpayments')} className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-60 px-6 py-3 min-h-[44px] rounded-lg font-semibold">
            <Coins className="h-5 w-5" /> Crypto
          </button>
        </div>
      </section>
      <Footer />
    </main>
  );
}
