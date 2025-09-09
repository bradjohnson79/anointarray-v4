'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/admin-layout';
import { RefreshCw, Wand2 } from 'lucide-react';

export default function ServiceOrdersPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    </AdminLayout>
  );
}
