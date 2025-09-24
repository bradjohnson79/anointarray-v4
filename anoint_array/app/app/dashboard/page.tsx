
'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import DashboardOverview from '@/components/dashboard/dashboard-overview';

export default function MemberDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="aurora-text text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <DashboardOverview
        user={{
          id: user.id,
          email: user.email || '',
          name: user.name || user.email || 'Member',
          role: String(user.role || 'USER'),
        }}
      />
    </DashboardLayout>
  );
}
