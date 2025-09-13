'use client';

import AdminLayout from '@/components/admin/admin-layout';
import { BarChart3 } from 'lucide-react';

export default function AdminAnalyticsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="mystical-card p-6 rounded-lg">
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2"><BarChart3 className="h-6 w-6"/> Analytics</h1>
          <p className="text-gray-300">Key metrics and trends for your store.</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-300">Analytics dashboard coming soon.</div>
          <div className="text-sm text-gray-500 mt-2">We’ll add orders, revenue, top products, and customer activity charts here.</div>
        </div>
      </div>
    </AdminLayout>
  );
}

