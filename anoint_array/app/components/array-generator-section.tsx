
'use client';

import { motion } from 'framer-motion';
import { Compass, Palette, Calculator, Sparkles, Download, Settings } from 'lucide-react';
import Image from 'next/image';

export default function ArrayGeneratorSection() {
  const features = [
    {
      icon: Calculator,
      title: 'Numerical Frequencies',
      description: 'Generate custom healing sequences based on sacred mathematical principles'
    },
    {
      icon: Palette,
      title: 'Color Harmonics',
      description: 'Select healing colors aligned with your chakra system and energy needs'
    },
    {
      icon: Compass,
      title: 'Sacred Glyphs',
      description: 'Ancient symbols charged with transcendental frequencies for amplification'
    },
    {
      icon: Sparkles,
      title: 'Scalar Enhancement',
      description: 'Each seal is imbued with scalar wave technology for maximum potency'
    }
  ];

  return (
    <section id="array-generator" className="py-20 relative">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="relative w-full h-full">
          <Image
            src="https://cdn.abacus.ai/images/9267c0f3-0939-480b-b6a6-111629ba7256.png"
            alt="Sacred geometry background"
            fill
            className="object-cover opacity-10"
          />
          <div className="absolute inset-0 cosmic-bg" />
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex justify-center mb-6"
          >
            <Settings className="h-16 w-16 aurora-text animate-spin" style={{ animationDuration: '8s' }} />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            <span className="aurora-text">ANOINT</span>{' '}
            <span className="text-white">Array Generator</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl text-gray-300 max-w-3xl mx-auto"
          >
            Create personalized healing seals with our advanced Array Generator. 
            Combines numerical frequencies, healing colors, and sacred glyphs charged 
            with transcendental frequencies and scalar wave technology.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Features */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="flex items-start space-x-4"
              >
                <div className="flex-shrink-0 w-12 h-12 aurora-gradient rounded-lg flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-300">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Basic Seal Array Image Preview (replaces form) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mystical-card p-6 rounded-lg">
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold aurora-text mb-2">Basic Seal Array</h3>
                <p className="text-gray-300 text-sm">Representative example of a completed ANOINT Seal Array</p>
              </div>
              <div className="relative aspect-square w-full rounded-md overflow-hidden border border-gray-700 bg-gray-900">
                {/* Serve from uploads via API so ops can replace without deploy */}
                <img
                  src="/api/files/basic-seal-array.png"
                  alt="Basic ANOINT Seal Array example"
                  className="absolute inset-0 w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    // Fallback to a known image in uploads if basic-seal-array.png is missing
                    target.onerror = null;
                    target.src = '/api/files/test-export.png';
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-3">
                For personalized seals, use the generator in your dashboard or request a custom service.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Use Cases */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: 'Personal Healing',
              description: 'Create personalized healing arrays tailored to your specific energy needs and intentions',
              icon: Sparkles
            },
            {
              title: 'Environmental Clearing',
              description: 'Generate space-clearing arrays to harmonize and protect your living environment',
              icon: Compass
            },
            {
              title: 'Manifestation Support',
              description: 'Design arrays specifically calibrated to amplify your manifestation practices',
              icon: Calculator
            }
          ].map((useCase, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ scale: 1.05 }}
              className="mystical-card p-6 rounded-lg text-center"
            >
              <useCase.icon className="h-12 w-12 aurora-text mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-3">
                {useCase.title}
              </h3>
              <p className="text-gray-300">
                {useCase.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
