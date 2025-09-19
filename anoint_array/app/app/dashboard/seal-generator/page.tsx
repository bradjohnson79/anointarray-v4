'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/dashboard-layout';
import { motion } from 'framer-motion';
import { Hourglass, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';

// Launch time: Sun Sep 21, 2025 12:00 PM Pacific (PDT = UTC-7)
// Use a stable UTC timestamp to avoid client timezone differences
const LAUNCH_UTC = '2025-09-21T19:00:00Z';

function useCountdown(target: Date) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { diff, days, hours, minutes, seconds };
}

export default function SealGeneratorLaunchPage() {
  const router = useRouter();
  const target = useMemo(() => new Date(LAUNCH_UTC), []);
  const { diff, days, hours, minutes, seconds } = useCountdown(target);

  // Auto-redirect to the generator once the countdown hits zero
  useEffect(() => {
    if (diff <= 0) {
      router.replace('/dashboard/array-generator');
    }
  }, [diff, router]);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mystical-card p-8 rounded-lg text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="h-8 w-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Seal Array Generator</h1>
          </div>
          <p className="text-gray-300 max-w-2xl mx-auto">
            We’re putting the final touches on the ANOINT Seal Array Generator. It will be live for members at noon Pacific on Sunday, Sept 21, 2025.
          </p>

          {/* Countdown */}
          <div className="mt-8">
            <div className="inline-flex items-center gap-3 bg-gray-900/60 border border-purple-500/30 rounded-xl px-6 py-4">
              <Hourglass className="h-6 w-6 text-purple-400" />
              <div className="flex gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-white tabular-nums">{String(days)}</div>
                  <div className="text-xs text-gray-400">Days</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white tabular-nums">{String(hours).padStart(2, '0')}</div>
                  <div className="text-xs text-gray-400">Hours</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white tabular-nums">{String(minutes).padStart(2, '0')}</div>
                  <div className="text-xs text-gray-400">Minutes</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white tabular-nums">{String(seconds).padStart(2, '0')}</div>
                  <div className="text-xs text-gray-400">Seconds</div>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">Launch: 12:00 PM PT • Sun, Sept 21, 2025</div>
          </div>

          {/* Highlights */}
          <div className="grid md:grid-cols-3 gap-4 mt-10 text-left">
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
              <div className="font-semibold text-white mb-1">Sacred Geometry</div>
              <div className="text-gray-400 text-sm">Flower of Life, Sri Yantra, and Torus templates refined for healing.</div>
            </div>
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
              <div className="font-semibold text-white mb-1">Intelligent Assembly</div>
              <div className="text-gray-400 text-sm">AI-assisted placement of numbers, glyphs, and mantras across rings.</div>
            </div>
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
              <div className="font-semibold text-white mb-1">Download & Activation</div>
              <div className="text-gray-400 text-sm">Preview with watermark; purchase to unlock full-resolution activation file.</div>
            </div>
          </div>

          {/* Under construction notice */}
          <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-200">
            Under construction: final calibration and payment flows are being completed.
          </div>

          {/* Admin quick access */}
          <div className="mt-6 text-sm text-gray-400">
            Admin? Use Generator Settings → Seal Generator tab, or go directly
            <Link href="/dashboard/array-generator" className="text-purple-300 hover:text-purple-200 ml-1 inline-flex items-center gap-1">
              <Zap className="h-3 w-3" /> here
            </Link>
            .
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
