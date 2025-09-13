'use client';

import AdminLayout from '@/components/admin/admin-layout';
import { useEffect, useState } from 'react';
import { Mail, RefreshCw } from 'lucide-react';

export default function AdminContactsPage() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Placeholder – wire to /api/admin/contacts when available
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="mystical-card p-6 rounded-lg flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2"><Mail className="h-6 w-6"/> Contact Messages</h1>
            <p className="text-gray-300">Review contact form submissions sent by visitors.</p>
          </div>
          <button disabled className="px-4 py-2 bg-gray-700 text-white rounded-lg flex items-center opacity-60 cursor-not-allowed">
            <RefreshCw className="h-4 w-4 mr-2"/> Refresh
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-300">No contact messages to display yet.</div>
          <div className="text-sm text-gray-500 mt-2">This is a placeholder. Once the contacts API is available, messages will appear here with filters and actions.</div>
        </div>
      </div>
    </AdminLayout>
  );
}

