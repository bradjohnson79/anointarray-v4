
'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import AdminOverview from '@/components/admin/admin-overview';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    // Confirm ADMIN role before rendering admin dashboard
    (async () => {
      try {
        const r = await fetch('/api/me/account', { cache: 'no-store' });
        if (!r.ok) { router.push('/auth/login'); return; }
        const j = await r.json();
        if (String(j?.role || '').toUpperCase() !== 'ADMIN' || j?.isActive === false) {
          router.push('/dashboard');
          return;
        }
        setOk(true);
      } catch {
        router.push('/auth/login');
      }
    })();
  }, [user, authLoading, router]);

  if (authLoading || ok === null) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="aurora-text text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  if (!user || ok === false) {
    return null;
  }

  return (
    <AdminLayout>
      <AdminOverview />
    </AdminLayout>
  );
}
