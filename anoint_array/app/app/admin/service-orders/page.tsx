'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/admin-layout';
import { RefreshCw, Wand2, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function ServiceOrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [svc, setSvc] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/auth/login'); return; }
    if (session.user?.role !== 'ADMIN') { router.push('/dashboard'); return; }
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/service-orders/list');
        const data = await res.json();
        setOrders(data.orders || []);
        const ss = await fetch('/api/services/settings');
        if (ss.ok) setSvc(await ss.json());
      } catch {}
      setLoading(false);
    };
    load();
  }, [session, status, router]);

  if (status === 'loading') return null;
  if (!session || session.user?.role !== 'ADMIN') return null;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wand2 className="h-6 w-6 text-yellow-400" />
          <h1 className="text-2xl font-bold">Service Orders</h1>
        </div>
        <button onClick={()=>window.location.reload()} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded border border-gray-700">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="orders" className="text-white">Orders</TabsTrigger>
          <TabsTrigger value="settings" className="text-white">Service Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          {loading ? (
            <div className="text-gray-400">Loading orders…</div>
          ) : orders.length === 0 ? (
            <div className="text-gray-400">No service orders yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2">Order ID</th>
                    <th className="px-3 py-2">Service</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Photo</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: any, i: number) => (
                    <tr key={o.orderId} className={i % 2 ? 'bg-gray-900/40' : ''}>
                      <td className="px-3 py-2 text-gray-300">{new Date(o.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2 text-gray-300">{o.orderId}</td>
                      <td className="px-3 py-2 text-gray-300">{o.service?.name || o.serviceType}</td>
                      <td className="px-3 py-2 text-gray-300">{o.customer?.fullName || ''} ({o.customer?.email || ''})</td>
                      <td className="px-3 py-2 text-gray-300">{o.photoProvided ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          {!svc ? (
            <div className="text-gray-400">Loading…</div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-6 space-y-5 max-w-3xl">
              <div className="text-gray-300 text-sm">Set the public descriptions and prices used on the Services page and checkout.</div>
              {(['basic','full','environmental'] as const).map((k)=> (
                <div key={k} className="bg-gray-900 rounded p-4 border border-gray-700 space-y-2">
                  <div className="text-white font-semibold capitalize">{k} Service</div>
                  <label className="block text-sm text-gray-300">Price (USD)</label>
                  <input type="number" step="1" value={svc[k]?.price ?? 0} onChange={(e)=>setSvc((v:any)=>({ ...v, [k]: { ...v[k], price: Number(e.target.value) } }))} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white w-48"/>
                  <label className="block text-sm text-gray-300 mt-2">Description</label>
                  <textarea rows={4} value={svc[k]?.description || ''} onChange={(e)=>setSvc((v:any)=>({ ...v, [k]: { ...v[k], description: e.target.value } }))} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"/>
                </div>
              ))}
              <div className="flex justify-end">
                <button disabled={saving} onClick={async()=>{ setSaving(true); try { const r = await fetch('/api/services/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(svc) }); const j = await r.json(); if (!r.ok) throw new Error(j?.error || 'Save failed'); toast.success('Service settings saved'); } catch (e:any) { toast.error(e?.message || 'Save failed'); } finally { setSaving(false); } }} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white flex items-center gap-2">
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                  {saving ? 'Saving…' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
