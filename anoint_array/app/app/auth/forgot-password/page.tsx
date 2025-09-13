'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Mail, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/password/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({} as any));
        throw new Error(j?.error || 'Failed to send reset email');
      }
      setSent(true);
      toast.success('If an account exists, a reset link was sent.');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send reset email');
    } finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mystical-card p-8 rounded-lg">
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center space-x-2 mb-4"><Sparkles className="h-7 w-7 aurora-text"/><span className="text-2xl font-bold aurora-text">ANOINT ARRAY</span></Link>
            <h1 className="text-2xl font-bold">Forgot your password?</h1>
            <p className="text-gray-300">Enter your email and we'll send a reset link.</p>
          </div>
          {sent ? (
            <div className="text-center text-gray-300">Check your email for a password reset link. The link expires in 60 minutes.</div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required placeholder="Email Address" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"/>
              </div>
              <button disabled={loading} className="w-full aurora-gradient text-white py-3 rounded-lg font-semibold disabled:opacity-50">{loading ? 'Sending…' : 'Send reset link'}</button>
            </form>
          )}
          <div className="mt-6 text-center"><Link href="/auth/login" className="text-gray-400 hover:underline">Back to login</Link></div>
        </motion.div>
      </div>
    </main>
  );
}

