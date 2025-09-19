'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/dashboard/dashboard-layout';

type OrderItem = { id: string; name: string; quantity: number; price: number; isDigital: boolean; digitalFileUrl?: string | null };
type Order = { id: string; orderNumber: string; createdAt: string; total: number; paymentStatus: string; status: string; items: OrderItem[] };

export default function DownloadsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/me/orders', { cache: 'no-store' });
        const j = await r.json();
        if (Array.isArray(j)) setOrders(j);
      } finally { setLoading(false); }
    })();
  }, []);

  const downloads = useMemo(() => {
    const out: Array<{ name: string; url: string; orderNumber: string; createdAt: string }> = [];
    orders.forEach((o) => o.items.forEach((it) => { if (it.isDigital && it.digitalFileUrl) out.push({ name: it.name, url: it.digitalFileUrl!, orderNumber: o.orderNumber, createdAt: o.createdAt }); }));
    return out;
  }, [orders]);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-4">Your Downloads</h1>
        {loading ? (
          <div className="text-gray-400">Loading…</div>
        ) : downloads.length === 0 ? (
          <div className="text-gray-400">No digital purchases found.</div>
        ) : (
          <div className="space-y-3">
            {downloads.map((d, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-lg p-4">
                <div>
                  <div className="text-white font-semibold">{d.name}</div>
                  <div className="text-xs text-gray-400">Order {d.orderNumber} • {new Date(d.createdAt).toLocaleString()}</div>
                </div>
                <button onClick={() => window.open(d.url, '_blank')} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg">Download</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

