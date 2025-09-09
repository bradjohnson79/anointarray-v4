'use client';

import { motion } from 'framer-motion';
import { Sparkles, Wand2, Home, Activity, Clock, Shield } from 'lucide-react';

type ServiceKey = 'basic' | 'full' | 'environmental';

export default function ServicesSection() {
  const packages: { key: ServiceKey; name: string; price: number; description: string; features: string[]; icon: any; accent: string; highlight?: string }[] = [
    {
      key: 'basic',
      name: 'Basic Service',
      price: 35,
      description: 'Scalar and Transcendental Frequencies for personal and environmental rejuvenation.',
      features: [
        'Single target (item or personal field)',
        'Scalar + transcendental frequency imbuing',
        'Rapid turnaround',
      ],
      icon: Sparkles,
      accent: 'from-purple-500 to-pink-500',
    },
    {
      key: 'full',
      name: 'Full Body Scan Service',
      price: 98,
      description: 'Full body scan of major organs and subtle bodies + imbuing of up to 3 items.',
      features: [
        'Full body scan (organs + subtle bodies)',
        'Up to 3 personal items imbued',
        'Personal optimization recommendations',
      ],
      icon: Activity,
      highlight: 'Most Popular',
      accent: 'from-teal-400 to-cyan-400',
    },
    {
      key: 'environmental',
      name: 'Environmental Service',
      price: 143,
      description: 'Full Body Scan + environmental imbuing of an entire room or space.',
      features: [
        'Full body scan included',
        'Room/space-wide imbuing',
        'Harmonization for sleep, focus, and peace',
      ],
      icon: Home,
      accent: 'from-amber-400 to-orange-400',
    },
  ];

  return (
    <section id="services" className="py-20 relative overflow-hidden">
      {/* Background ribbon */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="cosmic-bg w-full h-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex justify-center mb-6"
          >
            <Wand2 className="h-16 w-16 aurora-text" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6"
          >
            <span className="aurora-text">Item Imbuing</span>{' '}
            <span className="text-white">& Full Body Scan</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl text-gray-300 max-w-3xl mx-auto"
          >
            ANOINT Array offers imbuing for household objects, apparel, accessories, and environments.
            Services are personally performed by creator Brad Johnson. Same‑day availability (as soon as 24 hours)
            with options for full body scans to precisely calibrate your field.
          </motion.p>
        </div>

        {/* Packages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {packages.map((pkg, idx) => (
            <motion.div
              key={pkg.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.05 }}
              className={`relative mystical-card p-6 rounded-xl border border-gray-700/60 hover:border-purple-500/30 transition-colors`}
            >
              {pkg.highlight && (
                <div className="absolute -top-3 right-4 bg-purple-600 text-white text-xs px-3 py-1 rounded-full shadow">
                  {pkg.highlight}
                </div>
              )}
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${pkg.accent} flex items-center justify-center mb-4`}>
                <pkg.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">{pkg.name}</h3>
              <div className="text-3xl font-bold aurora-text mb-3">{"$"}{pkg.price.toFixed(0)}</div>
              <p className="text-gray-300 text-sm mb-5">{pkg.description}</p>
              <ul className="space-y-2 text-gray-300 text-sm mb-6">
                {pkg.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-purple-400 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Ready in ~24 hours</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { window.location.href = `/services?type=${pkg.key}#form`; }}
                  className="flex-1 aurora-gradient text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Request Service
                </button>
                <button
                  onClick={() => { window.location.href = '/services'; }} 
                  className="flex-1 border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 py-3 rounded-lg font-medium transition-all"
                >
                  Learn More
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
