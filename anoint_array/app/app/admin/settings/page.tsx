'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, CreditCard, Bot, RefreshCw, Save, Upload, FileText, File, Truck } from 'lucide-react';
import { toast } from 'sonner';

type StorefrontPayments = {
  stripe: { enabled: boolean; testMode: boolean; publishableKey: string; secretKey: string; webhookSecret: string; testPublishableKey: string; testSecretKey: string; testWebhookSecret: string };
  paypal: { enabled: boolean; testMode: boolean; clientId: string; clientSecret: string; testClientId: string; testClientSecret: string };
  nowPayments: { enabled: boolean; testMode: boolean; apiKey: string; publicKey: string; testApiKey: string; testPublicKey: string };
  pricing: { currency: string };
  isConfigured: boolean;
  lastUpdated?: string;
};

export default function AdminSettingsPage() {
  const [tab, setTab] = useState('payments');
  const [payments, setPayments] = useState<StorefrontPayments | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pingLoading, setPingLoading] = useState(false);
  const [ping, setPing] = useState<{ stripe?: any; paypal?: any; nowPayments?: any } | null>(null);
  const [scanStatus, setScanStatus] = useState<string>('idle');
  const [supportConfig, setSupportConfig] = useState({ enabled: false, description: '', kbFiles: [] as string[] });
  const [kbList, setKbList] = useState<{ pdfs: string[]; mds: string[]; images: string[] }>({ pdfs: [], mds: [], images: [] });
  const [kbUploading, setKbUploading] = useState(false);
  const [kbSelected, setKbSelected] = useState<FileList | null>(null);
  const [kbUpdateProgress, setKbUpdateProgress] = useState(0);
  // Shipping config state
  type ShippingConfig = {
    origin?: { name?: string; company?: string; street1?: string; city?: string; state?: string; zip?: string; country?: string; phone?: string };
    parcelDefault?: { length?: number; width?: number; height?: number; distance_unit?: 'cm'|'in'; weight?: number; mass_unit?: 'kg'|'lb' };
    carrierAccountIds?: { canadaPost?: string; upsCanada?: string };
    parcelTemplateId?: string;
  };
  const [shipping, setShipping] = useState<ShippingConfig | null>(null);
  const [shippingSaving, setShippingSaving] = useState(false);
  const [shippoStatus, setShippoStatus] = useState<{ ok: boolean; checks: Array<{ key: string; label: string; ok?: boolean; detail?: any }> } | null>(null);
  const [shippoStatusLoading, setShippoStatusLoading] = useState(false);

  const runShippoStatus = async () => {
    setShippoStatusLoading(true);
    try {
      const params = new URLSearchParams();
      if (shipping?.parcelTemplateId) params.set('parcelTemplateId', shipping.parcelTemplateId);
      if (shipping?.carrierAccountIds?.canadaPost) params.set('carrierAccountId', shipping.carrierAccountIds.canadaPost);
      const resp = await fetch(`/api/shipping/shippo/status${params.toString() ? `?${params.toString()}` : ''}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Status check failed');
      setShippoStatus(data);
      toast.success('Shippo status check completed');
    } catch (e: any) {
      toast.error(e?.message || 'Status check failed');
      setShippoStatus(null);
    } finally {
      setShippoStatusLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch('/api/admin/storefront/payments');
        if (resp.ok) setPayments(await resp.json());
        const sup = await fetch('/api/admin/support/config');
        if (sup.ok) setSupportConfig(await sup.json());
        const list = await fetch('/api/admin/support/kb/files');
        if (list.ok) {
          const data = await list.json();
          setKbList({ pdfs: data.pdfs || [], mds: data.mds || [], images: data.images || [] });
        }
        const shipCfg = await fetch('/api/admin/shipping/config');
        if (shipCfg.ok) setShipping(await shipCfg.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const savePayments = async () => {
    if (!payments) return;
    setSaving(true);
    try {
      const resp = await fetch('/api/admin/storefront/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payments) });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Save failed');
      toast.success('Storefront payment settings saved');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  const pingGateways = async () => {
    setPingLoading(true);
    try {
      const r = await fetch('/api/admin/storefront/payments/ping');
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Ping failed');
      setPing(j);
      toast.success('Gateway ping completed');
    } catch (e: any) {
      toast.error(e?.message || 'Ping failed');
    } finally {
      setPingLoading(false);
    }
  };

  const runScan = async () => {
    setScanStatus('scanning');
    try {
      const resp = await fetch('/api/admin/immunity/scan', { method: 'POST' });
      const data = await resp.json();
      setScanStatus(data?.message || 'completed');
      toast.success('Immunity scan executed');
    } catch (e) {
      setScanStatus('failed');
      toast.error('Immunity scan failed');
    }
  };

  const saveSupport = async () => {
    try {
      const resp = await fetch('/api/admin/support/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(supportConfig) });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Save failed');
      toast.success('Support agent configuration saved');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save support agent config');
    }
  };

  const uploadKb = async () => {
    if (!kbSelected || kbSelected.length === 0) return;
    if (kbSelected.length > 10) {
      toast.error('You can upload up to 10 files at once');
      return;
    }
    setKbUploading(true);
    try {
      const form = new FormData();
      Array.from(kbSelected).forEach((f) => form.append('files', f));
      const resp = await fetch('/api/admin/support/kb/upload', { method: 'POST', body: form });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Upload failed');
      toast.success(`Uploaded ${data?.uploaded?.length || 0} files`);
      // refresh list
      const list = await fetch('/api/admin/support/kb/files');
      if (list.ok) {
        const data = await list.json();
        setKbList({ pdfs: data.pdfs || [], mds: data.mds || [], images: data.images || [] });
      }
      setKbSelected(null);
    } catch (e) {
      console.error(e);
      toast.error('Upload failed');
    } finally {
      setKbUploading(false);
    }
  };

  const updateKnowledgebase = async () => {
    setKbUpdateProgress(1);
    const timer = setInterval(() => {
      setKbUpdateProgress((p) => (p < 90 ? Math.min(90, p + Math.random() * 15) : p));
    }, 300);
    try {
      const resp = await fetch('/api/admin/support/kb/update', { method: 'POST' });
      await resp.json().catch(() => ({}));
      setKbUpdateProgress(100);
      toast.success('Knowledgebase update complete');
    } catch (e) {
      toast.error('Knowledgebase update failed');
    } finally {
      clearInterval(timer);
      setTimeout(() => setKbUpdateProgress(0), 1200);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="mystical-card p-6 rounded-lg">
          <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-300">Manage storefront payments, site immunity, and AI support agent.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="payments" className="text-white"><CreditCard className="h-4 w-4 mr-2"/>Payments</TabsTrigger>
            <TabsTrigger value="immunity" className="text-white"><Shield className="h-4 w-4 mr-2"/>Immunity</TabsTrigger>
            <TabsTrigger value="support" className="text-white"><Bot className="h-4 w-4 mr-2"/>AI Support</TabsTrigger>
            <TabsTrigger value="emails" className="text-white"><FileText className="h-4 w-4 mr-2"/>Emails</TabsTrigger>
            <TabsTrigger value="currency" className="text-white"><span className="mr-2">$</span>Currency</TabsTrigger>
            <TabsTrigger value="shipping" className="text-white"><Truck className="h-4 w-4 mr-2"/>Shipping</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="mt-4">
            <div className="bg-gray-800 rounded-lg p-6">
              {loading || !payments ? (
                <div className="text-gray-400">Loading payment configuration…</div>
              ) : (
                <div className="space-y-6">
                  <div className="text-gray-300 text-sm">Configured: {payments.isConfigured ? <span className="text-green-400 font-semibold">Yes</span> : <span className="text-yellow-400">Partial/No</span>}</div>
                  {/* Stripe */}
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-white font-semibold mb-2">Stripe</h3>
                    <div className="grid md:grid-cols-3 gap-3 text-sm">
                      <label className="flex items-center gap-2 text-gray-300">
                        <input type="checkbox" checked={payments.stripe.enabled} onChange={(e)=>setPayments({ ...payments, stripe: { ...payments.stripe, enabled: e.target.checked }})}/>
                        Enabled
                      </label>
                      <label className="flex items-center gap-2 text-gray-300">
                        <input type="checkbox" checked={payments.stripe.testMode} onChange={(e)=>setPayments({ ...payments, stripe: { ...payments.stripe, testMode: e.target.checked }})}/>
                        Test Mode
                      </label>
                      <div className="text-gray-400">Publishable: {(payments.stripe.publishableKey || payments.stripe.testPublishableKey) ? 'set' : 'empty'}</div>
                    </div>
                  </div>

                  {/* PayPal */}
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-white font-semibold mb-2">PayPal</h3>
                    <div className="grid md:grid-cols-3 gap-3 text-sm">
                      <label className="flex items-center gap-2 text-gray-300">
                        <input type="checkbox" checked={payments.paypal.enabled} onChange={(e)=>setPayments({ ...payments, paypal: { ...payments.paypal, enabled: e.target.checked }})}/>
                        Enabled
                      </label>
                      <label className="flex items-center gap-2 text-gray-300">
                        <input type="checkbox" checked={payments.paypal.testMode} onChange={(e)=>setPayments({ ...payments, paypal: { ...payments.paypal, testMode: e.target.checked }})}/>
                        Sandbox
                      </label>
                      <div className="text-gray-400">Client ID: {(payments.paypal.clientId || payments.paypal.testClientId) ? 'set' : 'empty'}</div>
                    </div>
                  </div>

                  {/* NowPayments */}
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-white font-semibold mb-2">NowPayments</h3>
                    <div className="grid md:grid-cols-3 gap-3 text-sm">
                      <label className="flex items-center gap-2 text-gray-300">
                        <input type="checkbox" checked={payments.nowPayments.enabled} onChange={(e)=>setPayments({ ...payments, nowPayments: { ...payments.nowPayments, enabled: e.target.checked }})}/>
                        Enabled
                      </label>
                      <div className="text-gray-400">Public Key: {payments.nowPayments.publicKey ? 'set' : 'empty'}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-400">
                      {ping && (
                        <div className="grid md:grid-cols-3 gap-3">
                          <div className={`p-2 rounded border ${ping.stripe?.ok ? 'border-green-600 text-green-300' : 'border-red-600 text-red-300'}`}>
                            <div className="font-semibold">Stripe</div>
                            <div className="text-xs break-words">{ping.stripe?.message || '-'}</div>
                          </div>
                          <div className={`p-2 rounded border ${ping.paypal?.ok ? 'border-green-600 text-green-300' : 'border-red-600 text-red-300'}`}>
                            <div className="font-semibold">PayPal</div>
                            <div className="text-xs break-words">{ping.paypal?.message || '-'}</div>
                          </div>
                          <div className={`p-2 rounded border ${ping.nowPayments?.ok ? 'border-green-600 text-green-300' : 'border-red-600 text-red-300'}`}>
                            <div className="font-semibold">NOWPayments</div>
                            <div className="text-xs break-words">{ping.nowPayments?.message || '-'}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={pingGateways} disabled={pingLoading} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                        {pingLoading ? 'Pinging…' : 'Ping Gateways'}
                      </button>
                      <button onClick={savePayments} disabled={saving} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center">
                      {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin"/> : <Save className="h-4 w-4 mr-2"/>}
                      Save Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="currency" className="mt-4">
            <div className="bg-gray-800 rounded-lg p-6">
              {loading || !payments ? (
                <div className="text-gray-400">Loading currency…</div>
              ) : (
                <div className="space-y-4">
                  <div className="text-gray-300 text-sm">Default storefront currency used for new checkout sessions.</div>
                  <div className="space-y-2 text-gray-300">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="currency" checked={(payments.pricing?.currency || 'USD').toUpperCase()==='CAD'} onChange={()=>setPayments({ ...payments, pricing: { currency: 'CAD' } })} />
                      Canadian Dollar (CAD)
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="currency" checked={(payments.pricing?.currency || 'USD').toUpperCase()==='USD'} onChange={()=>setPayments({ ...payments, pricing: { currency: 'USD' } })} />
                      US Dollar (USD)
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={savePayments} disabled={saving} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center">
                      {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin"/> : <Save className="h-4 w-4 mr-2"/>}
                      Save Currency
                    </button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="immunity" className="mt-4">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-2">Website Immunity & Self-Heal</h3>
              <p className="text-gray-300 mb-4 text-sm">Run a server-side scan for broken links or issues and attempt automated repairs. This is a placeholder integration that returns a mock result; wiring to the production Immunity Agent can be added after keys are available.</p>
              <button onClick={runScan} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center">
                <RefreshCw className="h-4 w-4 mr-2"/> Run Scan
              </button>
              <div className="mt-3 text-gray-300 text-sm">Status: {scanStatus}</div>
            </div>
          </TabsContent>

          <TabsContent value="shipping" className="mt-4">
            <div className="bg-gray-800 rounded-lg p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">Shipping Configuration</h3>
                <button onClick={runShippoStatus} disabled={shippoStatusLoading} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md flex items-center text-sm">
                  {shippoStatusLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin"/> : <RefreshCw className="h-4 w-4 mr-2"/>}
                  Run Status
                </button>
              </div>
              {loading && !shipping ? (
                <div className="text-gray-400">Loading shipping config…</div>
              ) : (
                <div className="space-y-6">
                  {/* Origin */}
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-white font-semibold mb-3">Origin (Ship‑From)</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Name</label>
                        <input value={shipping?.origin?.name || ''} onChange={(e)=>setShipping(s=>({ ...(s||{}), origin: { ...(s?.origin||{}), name: e.target.value } }))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"/>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Company</label>
                        <input value={shipping?.origin?.company || ''} onChange={(e)=>setShipping(s=>({ ...(s||{}), origin: { ...(s?.origin||{}), company: e.target.value } }))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"/>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-300 mb-1">Street</label>
                        <input value={shipping?.origin?.street1 || ''} onChange={(e)=>setShipping(s=>({ ...(s||{}), origin: { ...(s?.origin||{}), street1: e.target.value } }))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"/>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">City</label>
                        <input value={shipping?.origin?.city || ''} onChange={(e)=>setShipping(s=>({ ...(s||{}), origin: { ...(s?.origin||{}), city: e.target.value } }))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"/>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Province/State</label>
                        <input value={shipping?.origin?.state || ''} onChange={(e)=>setShipping(s=>({ ...(s||{}), origin: { ...(s?.origin||{}), state: e.target.value } }))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"/>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Postal Code</label>
                        <input value={shipping?.origin?.zip || ''} onChange={(e)=>setShipping(s=>({ ...(s||{}), origin: { ...(s?.origin||{}), zip: e.target.value } }))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"/>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Country</label>
                        <input value={shipping?.origin?.country || ''} onChange={(e)=>setShipping(s=>({ ...(s||{}), origin: { ...(s?.origin||{}), country: e.target.value } }))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"/>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm text-gray-300 mb-1">Phone</label>
                        <input value={shipping?.origin?.phone || ''} onChange={(e)=>setShipping(s=>({ ...(s||{}), origin: { ...(s?.origin||{}), phone: e.target.value } }))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"/>
                      </div>
                    </div>
                  </div>

                  {/* Parcel Defaults */}
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-white font-semibold mb-3">Parcel Defaults</h4>
                    <div className="grid md:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Length</label>
                        <input type="number" step="0.01" value={shipping?.parcelDefault?.length ?? ''} onChange={(e)=>setShipping(s=>({ ...(s||{}), parcelDefault: { ...(s?.parcelDefault||{}), length: Number(e.target.value) } }))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"/>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Width</label>
                        <input type="number" step="0.01" value={shipping?.parcelDefault?.width ?? ''} onChange={(e)=>setShipping(s=>({ ...(s||{}), parcelDefault: { ...(s?.parcelDefault||{}), width: Number(e.target.value) } }))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"/>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Height</label>
                        <input type="number" step="0.01" value={shipping?.parcelDefault?.height ?? ''} onChange={(e)=>setShipping(s=>({ ...(s||{}), parcelDefault: { ...(s?.parcelDefault||{}), height: Number(e.target.value) } }))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"/>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Distance Unit</label>
                        <select value={shipping?.parcelDefault?.distance_unit || 'cm'} onChange={(e)=>setShipping(s=>({ ...(s||{}), parcelDefault: { ...(s?.parcelDefault||{}), distance_unit: e.target.value as any } }))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                          <option value="cm">cm</option>
                          <option value="in">in</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Weight</label>
                        <input type="number" step="0.01" value={shipping?.parcelDefault?.weight ?? ''} onChange={(e)=>setShipping(s=>({ ...(s||{}), parcelDefault: { ...(s?.parcelDefault||{}), weight: Number(e.target.value) } }))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"/>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Mass Unit</label>
                        <select value={shipping?.parcelDefault?.mass_unit || 'kg'} onChange={(e)=>setShipping(s=>({ ...(s||{}), parcelDefault: { ...(s?.parcelDefault||{}), mass_unit: e.target.value as any } }))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                          <option value="kg">kg</option>
                          <option value="lb">lb</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Carrier Accounts */}
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-white font-semibold mb-3">Carrier Accounts</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Shippo Canada Post Account ID</label>
                        <input value={shipping?.carrierAccountIds?.canadaPost || ''} onChange={(e)=>setShipping(s=>({ ...(s||{}), carrierAccountIds: { ...(s?.carrierAccountIds||{}), canadaPost: e.target.value } }))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white" placeholder="e.g., 0ba8325c..."/>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-300 mb-1">Shippo UPS Canada Account ID</label>
                        <input value={shipping?.carrierAccountIds?.upsCanada || ''} onChange={(e)=>setShipping(s=>({ ...(s||{}), carrierAccountIds: { ...(s?.carrierAccountIds||{}), upsCanada: e.target.value } }))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white" placeholder="e.g., c0149183..."/>
                      </div>
                    </div>
                  </div>

                  {shippoStatus && (
                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                      <h4 className="text-white font-semibold mb-2">Shippo Status</h4>
                      <div className={`text-sm mb-3 ${shippoStatus.ok ? 'text-green-400' : 'text-yellow-400'}`}>Overall: {shippoStatus.ok ? 'OK' : 'Warnings/Errors'}</div>
                      <div className="grid md:grid-cols-3 gap-3">
                        {shippoStatus.checks?.map((c:any)=> (
                          <div key={c.key} className={`p-3 rounded border text-sm ${c.ok===false ? 'border-red-600 text-red-300' : 'border-green-600 text-green-300'}`}>
                            <div className="font-semibold">{c.label}</div>
                            <div className="break-words text-xs text-gray-300 mt-1">{typeof c.detail === 'string' ? c.detail : JSON.stringify(c.detail)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button onClick={async()=>{ setShippingSaving(true); try { const r = await fetch('/api/admin/shipping/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shipping || {}) }); const j = await r.json(); if (!r.ok) throw new Error(j?.error || 'Save failed'); toast.success('Shipping configuration saved'); } catch (e:any) { toast.error(e?.message || 'Save failed'); } finally { setShippingSaving(false); } }} disabled={shippingSaving} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center">
                      {shippingSaving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin"/> : <Save className="h-4 w-4 mr-2"/>}
                      Save Shipping
                    </button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="support" className="mt-4">
            <div className="bg-gray-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2">
                <label className="text-gray-300 text-sm flex items-center gap-2">
                  <input type="checkbox" checked={supportConfig.enabled} onChange={(e)=>setSupportConfig(prev=>({ ...prev, enabled: e.target.checked }))}/>
                  Enable AI Support Widget
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description / System Prompt</label>
                <textarea value={supportConfig.description} onChange={(e)=>setSupportConfig(prev=>({ ...prev, description: e.target.value }))} rows={4} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="Briefly describe how the support agent should help your customers"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Knowledgebase Files (URLs)</label>
                <textarea value={supportConfig.kbFiles.join('\n')} onChange={(e)=>setSupportConfig(prev=>({ ...prev, kbFiles: e.target.value.split(/\n+/).map(s=>s.trim()).filter(Boolean) }))} rows={4} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="https://example.com/manual.pdf\n/docs/how-to.md"/>
                <p className="text-xs text-gray-500 mt-1">Paste one URL per line (PDFs, Markdown guides, etc.).</p>
              </div>

              {/* Local KB Uploader */}
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 space-y-3">
                <h4 className="text-white font-semibold flex items-center gap-2"><Upload className="h-4 w-4"/>Upload Manuals (.pdf, .md) or Healing Card Images (.png)</h4>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.md,.png,application/pdf,text/markdown,image/png"
                  onChange={(e)=>setKbSelected(e.target.files)}
                  className="block w-full text-sm text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                />
                <div className="text-xs text-gray-400">Up to 10 files at a time. Stored under data/support-kb/ (pdfs, md, images).</div>
                <button onClick={uploadKb} disabled={kbUploading || !kbSelected || kbSelected.length === 0} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
                  {kbUploading ? 'Uploading…' : 'Upload Selected'}
                </button>

                <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300 mt-2">
                  <div>
                    <div className="font-semibold mb-1 flex items-center gap-2"><File className="h-4 w-4"/>PDFs ({kbList.pdfs.length})</div>
                    <ul className="list-disc ml-5 space-y-1 max-h-32 overflow-y-auto">
                      {kbList.pdfs.map((f)=> (<li key={f} className="truncate">{f}</li>))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold mb-1 flex items-center gap-2"><FileText className="h-4 w-4"/>Markdown ({kbList.mds.length})</div>
                    <ul className="list-disc ml-5 space-y-1 max-h-32 overflow-y-auto">
                      {kbList.mds.map((f)=> (<li key={f} className="truncate">{f}</li>))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold mb-1 flex items-center gap-2"><File className="h-4 w-4"/>Images ({kbList.images.length})</div>
                    <ul className="list-disc ml-5 space-y-1 max-h-32 overflow-y-auto">
                      {kbList.images.map((f)=> (<li key={f} className="truncate">{f}</li>))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Update / Index Button */}
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-3">
                  <button onClick={updateKnowledgebase} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Update Knowledgebase</button>
                  {kbUpdateProgress > 0 && (
                    <div className="flex-1 h-2 bg-gray-700 rounded">
                      <div className="h-2 bg-green-500 rounded" style={{ width: `${kbUpdateProgress}%` }} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={saveSupport} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center"><Save className="h-4 w-4 mr-2"/>Save Support Config</button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="emails" className="mt-4">
            <EmailTemplatesEditor />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function EmailTemplatesEditor() {
  const [templates, setTemplates] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { (async () => { const r = await fetch('/api/admin/email/templates'); if (r.ok) setTemplates(await r.json()); })(); }, []);
  const save = async () => {
    setSaving(true);
    try { const r = await fetch('/api/admin/email/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(templates) }); if (r.ok) toast.success('Email templates saved'); else toast.error('Save failed'); } finally { setSaving(false); }
  };
  if (!templates) return <div className="bg-gray-800 rounded-lg p-6 text-gray-300">Loading templates…</div>;
  const renderTpl = (key: string, label: string) => (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
      <h4 className="text-white font-semibold mb-3">{label}</h4>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Subject</label>
          <input value={templates[key]?.subject || ''} onChange={(e)=>setTemplates((t:any)=>({ ...t, [key]: { ...t[key], subject: e.target.value }}))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"/>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-300 mb-1">HTML</label>
          <textarea rows={6} value={templates[key]?.html || ''} onChange={(e)=>setTemplates((t:any)=>({ ...t, [key]: { ...t[key], html: e.target.value }}))} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"/>
          <p className="text-xs text-gray-500 mt-1">Variables: {'{customerName} {orderNumber} {orderSummary} {total} {message}'}</p>
        </div>
      </div>
    </div>
  );
  return (
    <div className="space-y-4">
      {renderTpl('receipt','Customer Receipt')}
      {renderTpl('newsletter_optin','Newsletter Opt‑In')}
      {renderTpl('vip_waitlist','VIP Waitlist Confirmation')}
      {renderTpl('support_reply','Support Reply')}
      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">{saving ? 'Saving…' : 'Save Email Templates'}</button>
      </div>
    </div>
  );
}
