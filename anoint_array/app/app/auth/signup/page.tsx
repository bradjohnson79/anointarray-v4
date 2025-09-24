
'use client';

import { useState } from 'react';
import { getSession } from 'next-auth/react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import EnergyRibbons from '@/components/energy-ribbons';
import { createAccountAction } from './actions';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const rawCallbackUrl = searchParams.get('callbackUrl');
      const callbackUrl = (() => {
        if (!rawCallbackUrl) return null;
        try {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          if (!origin) return null;
          const candidate = new URL(rawCallbackUrl, origin);
          if (candidate.origin !== origin) return null;
          return `${candidate.pathname}${candidate.search}${candidate.hash}`;
        } catch {
          return null;
        }
      })();

      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(formData.password, 12);

      const result = await createAccountAction({
        name: formData.fullName.trim(),
        email: formData.email,
        passwordHash,
      });

      if (!result?.ok) {
        toast.error(result?.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      toast.success('Account created successfully!');

      let destination = '/dashboard';
      try {
        await login(formData.email, formData.password, { callbackUrl });
        const session = await getSession();
        const role = String(session?.user?.role || '').toUpperCase();
        destination = callbackUrl || (role === 'ADMIN' ? '/admin' : '/dashboard');
      } catch {
        toast.error('Account created but login failed. Please try logging in manually.');
        destination = callbackUrl ? `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/auth/login';
      }

      router.push(destination);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      <EnergyRibbons intensity="subtle" count={2} />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mystical-card p-8 rounded-lg"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <Link href="/" className="inline-flex items-center space-x-2 mb-6">
                <Sparkles className="h-8 w-8 aurora-text" />
                <span className="text-2xl font-bold aurora-text">ANOINT ARRAY</span>
              </Link>
              
              <h1 className="text-3xl font-bold text-white mb-2">Join Our Sacred Community</h1>
              <p className="text-gray-300">
                Create your account and begin your healing journey
              </p>
            </div>

            {/* Signup Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Full Name"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors duration-300"
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors duration-300"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Password (min. 6 characters)"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-12 py-3 pr-12 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 h-5 w-5 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-12 py-3 pr-12 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 h-5 w-5 text-gray-400 hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full aurora-gradient text-white py-3 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </motion.button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-gray-400">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="aurora-text hover:underline font-medium"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
