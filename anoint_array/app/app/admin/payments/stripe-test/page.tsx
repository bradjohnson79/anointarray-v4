'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import AdminLayout from '@/components/admin/admin-layout';
import { motion } from 'framer-motion';
import { Check, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

type Result = { ok: boolean; label: string; detail?: string; url?: string };

export default function StripeTestPage() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[]>([]);

  const add = (r: Result) => setResults(prev => [...prev, r]);

  const run = async () => {
    setRunning(true); setResults([]);
    try {
      // Products (cart) via /api/payment/stripe/create-payment
      const prod = await fetch('/api/payment/stripe/create-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        items: [{ name: 'Test Item', price: 1.23, quantity: 1, type: 'product', customData: { isDigital: false } }],
        userEmail: user?.email || 'buyer@example.com',
        shippingAddress: { fullName: 'QA Buyer', street: '200 Bloor St', city: 'Toronto', state: 'ON', zip: 'M5S1T8', country: 'CA' },
        billingSameAsShipping: true,
        allowGuest: true,
        shippingAmount: 1,
        currency: 'USD'
      }) });
      const pj = await prod.json();
      add({ ok: prod.ok && !!pj?.url, label: 'Products: Stripe checkout session', url: pj?.url });

      // Services
      const svc = await fetch('/api/payment/create-service-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentMethod: 'stripe', serviceType: 'basic', customer: { fullName: 'QA Buyer', email: user?.email || 'buyer@example.com' } }) });
      const sj = await svc.json();
      add({ ok: svc.ok && !!sj?.checkoutUrl, label: 'Services: Stripe checkout session', url: sj?.checkoutUrl });

      // Seal generator
      const seal = await fetch('/api/payment/create-seal-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentMethod: 'stripe', userId: user?.id || 'qa', sealConfig: { category: 'healing' }, userDetails: { fullName: 'QA Buyer' }, testMode: true }) });
      const zj = await seal.json();
      add({ ok: seal.ok && !!zj?.checkoutUrl, label: 'Seal Generator: Stripe checkout session', url: zj?.checkoutUrl });

      toast.success('Stripe integration checks completed');
    } catch (e: any) {
      toast.error(e?.message || 'Tests failed');
    } finally { setRunning(false); }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="mystical-card p-6 rounded-lg">
          <h1 className="text-2xl font-bold text-white mb-1">Stripe Integration Test</h1>
          <p className="text-gray-300">Runs product, service, and seal array checkout session creation through Stripe (via MCP when configured) and shows the checkout URLs.</p>
        </div>
        <div className="mystical-card p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-gray-300 text-sm">Environment: Test mode expected</div>
            <button onClick={run} disabled={running} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2">{running ? <RefreshCw className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}Run Tests</button>
          </div>
          <div className="space-y-2">
            {results.map((r,i)=> (
              <div key={i} className={`p-3 rounded border ${r.ok ? 'border-green-600/60 bg-green-600/10' : 'border-red-600/60 bg-red-600/10'}`}>
                <div className="flex items-center justify-between">
                  <div className="text-white text-sm flex items-center gap-2">{r.ok ? <Check className="h-4 w-4 text-green-300"/> : <AlertTriangle className="h-4 w-4 text-red-300"/>}{r.label}</div>
                  {r.url && (<a href={r.url} target="_blank" className="text-blue-300 text-xs flex items-center gap-1"><ExternalLink className="h-3 w-3"/>Open</a>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
