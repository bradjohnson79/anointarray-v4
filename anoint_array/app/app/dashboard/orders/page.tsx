'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/dashboard/dashboard-layout';

type OrderItem = { id: string; name: string; quantity: number; price: number; isDigital: boolean; digitalFileUrl?: string | null };
type Order = { id: string; orderNumber: string; createdAt: string; total: number; paymentStatus: string; status: string; items: OrderItem[] };

export default function OrdersPage() {
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

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-4">Your Orders</h1>
        {loading ? (
          <div className="text-gray-400">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="text-gray-400">No orders found.</div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div key={o.id} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <div className="flex justify-between text-sm text-gray-300">
                  <div>
                    Order <span className="text-white font-mono">{o.orderNumber}</span>
                  </div>
                  <div>{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div className="mt-2">
                  {o.items.map((it) => (
                    <div key={it.id} className="flex justify-between text-gray-200 text-sm">
                      <div>
                        {it.name} × {it.quantity}
                      </div>
                      <div>
                        {'$'}{(it.price * it.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between border-t border-gray-700 mt-3 pt-2 text-white">
                  <div>Status: {o.paymentStatus}</div>
                  <div className="font-semibold">{'$'}{o.total.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

