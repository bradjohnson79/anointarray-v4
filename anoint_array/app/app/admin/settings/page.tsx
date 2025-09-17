'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, CreditCard, Bot, RefreshCw, Save, Upload, FileText, File, Truck, Check, AlertTriangle, Mail, Server, Copy } from 'lucide-react';
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
  // MCP status
  const [mcpLoading, setMcpLoading] = useState(false);
  const [mcpStatus, setMcpStatus] = useState<{ ok: boolean; configPath: string; servers: Array<{ name: string; command: string; args: string[]; ok: boolean; issues: string[] }>; issues: string[] } | null>(null);
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
        await runMcpStatus(false);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const runMcpStatus = async (notify = true) => {
    setMcpLoading(true);
    try {
      const r = await fetch('/api/admin/mcp/status');
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Failed to load MCP status');
      setMcpStatus(j);
      if (notify) {
        if (j.ok) toast.success('MCP servers look good');
        else {
          const count = (Array.isArray(j.servers) ? j.servers.filter((s:any)=>!s.ok).length : 0) + (Array.isArray(j.issues) ? j.issues.length : 0);
          toast.error(`MCP issues detected (${count}). See details below.`);
        }
      }
    } catch (e: any) {
      setMcpStatus(null);
      if (notify) toast.error(e?.message || 'Failed to load MCP status');
    } finally {
      setMcpLoading(false);
    }
  };

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
            <TabsTrigger value="admin-passwords" className="text-white"><Shield className="h-4 w-4 mr-2"/>Admin Passwords</TabsTrigger>
            <TabsTrigger value="mcp" className="text-white"><Server className="h-4 w-4 mr-2"/>MCP Servers</TabsTrigger>
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
                    {/* Token fetch for MCP setup */}
                    <div className="mt-3">
                      <button onClick={async()=>{ try { const r = await fetch('/api/admin/paypal/token'); const j = await r.json(); if (!r.ok) throw new Error(j?.error || 'Failed'); await navigator.clipboard.writeText(j?.access_token || ''); toast.success(`Token (${j?.mode}) copied to clipboard (expires in ${j?.expires_in}s)`); } catch(e:any){ toast.error(e?.message || 'Failed to get token'); } }} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm">Get Access Token (copy)</button>
                      <p className="text-xs text-gray-500 mt-2">For MCP installation only. Token is short‑lived; prefer client credentials in MCP server config when possible.</p>
                    </div>
                  </div>

                  {/* Crypto removed */}

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
                          {/* NOWPayments removed */}
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

          {/* MCP Servers */}
          <TabsContent value="mcp" className="mt-4">
            <div className="bg-gray-800 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">MCP Servers</h3>
                  <div className="text-xs text-gray-400 mt-1">Reads `.codex/config.toml` and validates basic setup.</div>
                </div>
                <button onClick={()=>runMcpStatus()} disabled={mcpLoading} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md flex items-center text-sm">
                  {mcpLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin"/> : <RefreshCw className="h-4 w-4 mr-2"/>}
                  Refresh
                </button>
              </div>

              {!mcpStatus ? (
                <div className="text-gray-400">{mcpLoading ? 'Loading MCP status…' : 'No status available.'}</div>
              ) : (
                <div className="space-y-4">
                  <div className={`p-3 rounded border text-sm ${mcpStatus.ok ? 'border-green-600 text-green-300 bg-green-600/5' : 'border-yellow-600 text-yellow-300 bg-yellow-600/5'}`}>
                    <div><span className="font-semibold">Config:</span> <span className="text-gray-300">{mcpStatus.configPath}</span></div>
                    <div className="mt-1"><span className="font-semibold">Overall:</span> {mcpStatus.ok ? 'OK' : 'Has issues'}</div>
                    {Array.isArray(mcpStatus.issues) && mcpStatus.issues.length > 0 && (
                      <div className="mt-2">
                        <div className="font-semibold">Config Issues</div>
                        <ul className="list-disc list-inside text-gray-300">
                          {mcpStatus.issues.map((it, idx)=>(<li key={idx}>{it}</li>))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {(mcpStatus.servers || []).map((s:any) => (
                      <div key={s.name} className={`rounded border p-4 ${s.ok ? 'border-gray-700 bg-gray-900' : 'border-yellow-700 bg-gray-900'}`}>
                        <div className="flex items-center justify-between">
                          <div className="text-white font-semibold">{s.name}</div>
                          <div className={`text-xs px-2 py-0.5 rounded ${s.ok ? 'bg-green-600/10 text-green-300 border border-green-500/30' : 'bg-yellow-600/10 text-yellow-300 border border-yellow-500/30'}`}>{s.ok ? 'OK' : 'Needs attention'}</div>
                        </div>
                        <div className="mt-2 text-xs text-gray-400 break-words">
                          <div><span className="text-gray-500">command:</span> <span className="text-gray-300">{s.command || '—'}</span></div>
                          <div className="mt-1"><span className="text-gray-500">args:</span> <span className="text-gray-300">{Array.isArray(s.args) ? s.args.join(' ') : '—'}</span></div>
                        </div>
                        {!s.ok && Array.isArray(s.issues) && s.issues.length > 0 && (
                          <div className="mt-3 text-sm">
                            <div className="text-yellow-300 font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> Issues</div>
                            <ul className="list-disc list-inside text-gray-300 mt-1">
                              {s.issues.map((it: string, idx: number) => (<li key={idx}>{it}</li>))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-gray-400">
                    Notes: This checker validates presence of the command (e.g., pnpm) and that access tokens appear set. It doesn’t start servers. Use your MCP CLI to confirm: <code>mcp list-tools</code>.
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Admin Passwords */}
          <TabsContent value="admin-passwords" className="mt-4">
            <AdminPasswordsPanel />
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
          <TabsContent value="emails" className="mt-4 space-y-4">
            <EmailStatusPanel />
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
  const [testTo, setTestTo] = useState('');
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <button onClick={save} disabled={saving} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">{saving ? 'Saving…' : 'Save Email Templates'}</button>
        <div className="flex items-center gap-2">
          <input value={testTo} onChange={(e)=>setTestTo(e.target.value)} placeholder="Test recipient (optional)" className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"/>
          <button onClick={async()=>{ const r = await fetch('/api/admin/email/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: testTo || undefined }) }); const j = await r.json(); if (r.ok) toast.success(`Test sent to ${j?.to || 'your email'}`); else toast.error(j?.error || 'Test failed'); }} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm">Send Test Email</button>
        </div>
      </div>
    </div>
  );
}

function EmailStatusPanel() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch('/api/admin/email/status');
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Failed to load status');
      setStatus(j);
    } catch (e: any) {
      setError(e?.message || 'Failed to load status');
      setStatus(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const ok = !!status?.ok;
  const verifiedDomains = Array.isArray(status?.domains) ? status!.domains.filter((d: any)=> String(d.status).toLowerCase() === 'verified') : [];
  const notInList = !!status?.from && !status?.matchedDomain;
  const notVerified = !!status?.from && !!status?.matchedDomain && !status?.verifiedFromDomain;

  return (
    <div className="mystical-card p-6 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2"><Mail className="h-5 w-5 text-purple-400"/>Email Delivery Status</h3>
        <button onClick={load} disabled={loading} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Refresh</button>
      </div>
      {error && <div className="text-red-400 text-sm mb-3">{error}</div>}
      {loading ? (
        <div className="text-gray-300">Loading…</div>
      ) : (
        <div className="space-y-4">
          <div className={`p-3 rounded-lg flex items-center justify-between ${ok ? 'bg-green-600/10 border border-green-500/30' : 'bg-yellow-600/10 border border-yellow-500/30'}`}>
            <div className="text-white font-medium">Resend Connectivity</div>
            {ok ? <span className="flex items-center gap-2 text-green-300 text-sm"><Check className="h-4 w-4"/>OK</span> : <span className="flex items-center gap-2 text-yellow-300 text-sm"><AlertTriangle className="h-4 w-4"/>Check configuration</span>}
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="bg-gray-900 p-3 rounded border border-gray-700">
              <div className="text-gray-400 text-sm">API Key</div>
              <div className="text-white font-medium">{status?.hasKey ? 'Present' : 'Missing'}</div>
            </div>
            <div className="bg-gray-900 p-3 rounded border border-gray-700">
              <div className="text-gray-400 text-sm">From Address</div>
              <div className="text-white font-medium">{status?.from || '—'}</div>
            </div>
            <div className="bg-gray-900 p-3 rounded border border-gray-700">
              <div className="text-gray-400 text-sm">From Domain Verified</div>
              <div className={`font-medium ${status?.verifiedFromDomain ? 'text-green-300' : 'text-yellow-300'}`}>{status?.verifiedFromDomain ? 'Yes' : 'No'}</div>
            </div>
          </div>
          {!!status?.fromDomain && (
            <div className="text-xs text-gray-400">From domain: <span className="text-gray-300">{status.fromDomain}</span>{status?.matchedDomain ? <> → matched <span className="text-gray-300">{status.matchedDomain}</span></> : null}</div>
          )}

          {(notInList || notVerified) && (
            <div className="rounded border border-yellow-600 bg-yellow-600/10 p-3 text-sm text-yellow-200">
              <div className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4"/>{notInList ? 'From domain not found in Resend.' : 'From domain is not verified yet.'}</div>
              {verifiedDomains.length > 0 ? (
                <div className="mt-2 text-gray-200">
                  <div className="text-xs text-gray-300 mb-1">Use a verified domain for EMAIL_FROM. Quick suggestions:</div>
                  <div className="flex flex-wrap gap-2">
                    {verifiedDomains.map((d: any) => {
                      const local = (String(status?.from || '').split('@')[0] || 'info').trim() || 'info';
                      const suggestion = `${local}@${d.name}`;
                      return (
                        <button key={d.name} onClick={async()=>{ try { await navigator.clipboard.writeText(suggestion); toast.success(`Copied ${suggestion}`);} catch { toast.error('Copy failed'); } }} className="px-2 py-1 rounded bg-gray-900 border border-gray-700 text-gray-200 text-xs flex items-center gap-1">
                          <Copy className="h-3 w-3"/>{suggestion}
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">Set this in your environment as EMAIL_FROM and redeploy.</div>
                </div>
              ) : (
                <div className="mt-2 text-xs text-gray-300">No verified domains found in Resend. Verify a domain in Resend, then set EMAIL_FROM to an address on that domain.</div>
              )}
            </div>
          )}
          <div className="bg-gray-900 p-3 rounded border border-gray-700">
            <div className="text-gray-300 font-medium mb-2">Domains</div>
            {(status?.domains || []).length === 0 ? (
              <div className="text-gray-400 text-sm">No domains found.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {status.domains.map((d: any) => (
                  <span key={d.name} className={`px-2 py-1 rounded text-xs ${d.status === 'verified' ? 'bg-green-600/10 text-green-300 border border-green-500/30' : 'bg-yellow-600/10 text-yellow-300 border border-yellow-500/30'}`}>{d.name} — {d.status}</span>
                ))}
              </div>
            )}
          </div>
          {Array.isArray(status?.recent) && (
            <div className="bg-gray-900 p-3 rounded border border-gray-700">
              <div className="text-gray-300 font-medium mb-2">Recent Activity</div>
              <div className="text-xs text-gray-300 space-y-1 max-h-48 overflow-y-auto">
                {status.recent.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between border-b border-gray-800 pb-1">
                    <div className="truncate">{e.subject || 'Email'} → <span className="text-gray-400">{Array.isArray(e.to) ? e.to.join(', ') : (e.to || '')}</span></div>
                    <div className={`ml-3 px-2 py-0.5 rounded ${e.status === 'sent' || e.status === 'delivered' ? 'bg-green-600/10 text-green-300' : 'bg-yellow-600/10 text-yellow-300'}`}>{e.status || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminPasswordsPanel() {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saving, setSaving] = useState(false);

  const apply = async () => {
    if (!oldPwd || !newPwd || !confirmPwd) { toast.error('Please fill all fields'); return; }
    if (newPwd !== confirmPwd) { toast.error('New passwords do not match'); return; }
    if (newPwd.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/admin/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd, confirmPassword: confirmPwd }),
      });
      const j = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(j?.error || 'Password change failed');
      toast.success('Password updated');
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e: any) {
      toast.error(e?.message || 'Password change failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 max-w-2xl">
      <h3 className="text-white font-semibold mb-2">Update Admin Password</h3>
      <p className="text-gray-400 text-sm mb-4">For your current admin account. Enter your current password and choose a new one.</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Current Password</label>
          <input type="password" value={oldPwd} onChange={e=>setOldPwd(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white" placeholder="Enter current password"/>
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">New Password</label>
          <input type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white" placeholder="Enter new password"/>
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-2">Confirm New Password</label>
          <input type="password" value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white" placeholder="Re-enter new password"/>
        </div>
        <div className="pt-2">
          <button onClick={apply} disabled={saving} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white flex items-center gap-2">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
            {saving ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}
