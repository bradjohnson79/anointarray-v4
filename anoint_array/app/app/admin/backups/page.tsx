"use client";

import AdminLayout from '@/components/admin/admin-layout';
import { useEffect, useState } from 'react';

type Status = { ok: boolean; message: string; details?: any };

export default function AdminBackupsPage() {
  const [supabaseStatus, setSupabaseStatus] = useState<Status>({ ok: false, message: 'Checking…' });
  const [backupState, setBackupState] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/debug/supabase', { cache: 'no-store' });
        const j = await r.json();
        if (j?.ok) setSupabaseStatus({ ok: true, message: `Bucket: ${j.bucket} (objects: ${j.count})` });
        else setSupabaseStatus({ ok: false, message: j?.error || 'Storage check failed' });
      } catch (e: any) {
        setSupabaseStatus({ ok: false, message: e?.message || 'Storage check failed' });
      }
    })();
  }, []);

  const doDryCheck = async () => {
    setBusy(true); setBackupState(null);
    try {
      const r = await fetch('/api/admin/products/backup?dry=1', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Backup check failed');
      setBackupState({ ok: true, message: `DB access OK. Products: ${j.count}` });
    } catch (e: any) {
      setBackupState({ ok: false, message: e?.message || 'Backup check failed' });
    } finally {
      setBusy(false);
    }
  };

  const doBackup = async () => {
    setBusy(true); setBackupState(null);
    try {
      const r = await fetch('/api/admin/products/backup', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Backup failed');
      const url = j?.signedUrl || '';
      setBackupState({ ok: true, message: `Saved to ${j?.bucket}/${j?.path}`, details: { url } });
      if (url) window.open(url, '_blank');
    } catch (e: any) {
      setBackupState({ ok: false, message: e?.message || 'Backup failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Backups</h2>
        <p className="text-gray-300">Create a JSON snapshot of products + variants into Supabase Storage.</p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Supabase Storage</h3>
            <div className={supabaseStatus.ok ? 'text-green-400' : 'text-red-400'}>
              {supabaseStatus.message}
            </div>
            <p className="text-gray-400 text-sm mt-2">Bucket must exist and be writable (configs).</p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Database Access</h3>
            <button onClick={doDryCheck} disabled={busy} className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 border border-gray-600 mr-3 disabled:opacity-50">Check Access</button>
            <button onClick={doBackup} disabled={busy} className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50">Backup Now</button>
            {backupState && (
              <div className={`mt-3 ${backupState.ok ? 'text-green-400' : 'text-red-400'}`}>{backupState.message}</div>
            )}
            {backupState?.details?.url && (
              <div className="mt-1 text-sm"><a className="underline" href={backupState.details.url} target="_blank">Download snapshot</a></div>
            )}
            {!backupState?.ok && backupState?.message?.toLowerCase()?.includes('permission denied') && (
              <div className="mt-3 text-yellow-300 text-sm">
                Hint: Grant USAGE on schema public and SELECT on tables to the service_role.
                <pre className="whitespace-pre-wrap mt-2 text-xs text-gray-300">{`GRANT USAGE ON SCHEMA public TO service_role;\nGRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;\nALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO service_role;`}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
