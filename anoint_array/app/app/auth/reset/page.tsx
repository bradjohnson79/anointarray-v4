'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const router = useRouter();
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) toast.error('Missing reset token');
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (p1 !== p2) { toast.error('Passwords do not match'); return; }
    if (p1.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/password/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password: p1 }) });
      const j = await resp.json().catch(() => ({} as any));
      if (!resp.ok) throw new Error(j?.error || 'Reset failed');
      setDone(true);
      toast.success('Password updated. You can sign in now.');
      setTimeout(()=>router.push('/auth/login'), 1500);
    } catch (e: any) {
      toast.error(e?.message || 'Reset failed');
    } finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mystical-card p-8 rounded-lg">
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center space-x-2 mb-4"><Sparkles className="h-7 w-7 aurora-text"/><span className="text-2xl font-bold aurora-text">ANOINT ARRAY</span></Link>
            <h1 className="text-2xl font-bold">Reset your password</h1>
          </div>
          {done ? (
            <div className="text-center text-gray-300">Password updated. Redirecting to login…</div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input type="password" value={p1} onChange={(e)=>setP1(e.target.value)} required minLength={8} placeholder="New password" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"/>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input type="password" value={p2} onChange={(e)=>setP2(e.target.value)} required minLength={8} placeholder="Confirm password" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"/>
              </div>
              <button disabled={loading || !token} className="w-full aurora-gradient text-white py-3 rounded-lg font-semibold disabled:opacity-50">{loading ? 'Updating…' : 'Update password'}</button>
            </form>
          )}
          <div className="mt-6 text-center"><Link href="/auth/login" className="text-gray-400 hover:underline">Back to login</Link></div>
        </motion.div>
      </div>
    </main>
  );
}

