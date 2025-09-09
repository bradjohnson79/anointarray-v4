
'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Heart } from 'lucide-react';
import Image from 'next/image';

export default function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative min-h-screen md:min-h-screen flex items-center justify-center overflow-hidden pt-16 md:pt-0"
      style={{ minHeight: 'calc(100vh - env(safe-area-inset-top))' }}
    >
      {/* Aurora Background with Nebula Effects */}
      <div className="absolute inset-0">
        <div className="relative w-full h-full">
          <Image
            src="https://cdn.abacus.ai/images/dd037903-356a-4acd-b325-adf37ba6f379.png"
            alt="Aurora borealis background"
            fill
            className="object-cover opacity-60"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-950/20 to-gray-950" />
          
          {/* Enhanced Nebula Effects */}
          <div className="absolute inset-0 nebula-effect opacity-40" />
          <div className="absolute inset-0 nebula-swirl opacity-30" />
        </div>
      </div>

      {/* Streaming Energy Ribbons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="energy-ribbon energy-ribbon-1" />
        <div className="energy-ribbon energy-ribbon-2" />
        <div className="energy-ribbon energy-ribbon-3" />
        <div className="energy-ribbon energy-ribbon-4" />
      </div>

      {/* Sacred Symbols - OM, Yin Yang, Flower of Life */}
      <div className="absolute inset-0 pointer-events-none">
        {/* OM Symbol */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-20 left-16 text-6xl font-bold text-purple-400/30"
          style={{ fontFamily: 'serif' }}
        >
          ॐ
        </motion.div>

        {/* Yin Yang Symbol */}
        <motion.div
          animate={{
            rotate: 360,
            scale: [0.8, 1, 0.8],
            opacity: [0.25, 0.45, 0.25],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute top-32 right-20 w-16 h-16 flex items-center justify-center"
        >
          <div className="text-5xl text-teal-400/35">☯</div>
        </motion.div>

        {/* Flower of Life */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            rotate: [0, 360, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute bottom-32 left-24 w-20 h-20"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full opacity-30">
            <defs>
              <pattern id="flowerPattern" patternUnits="userSpaceOnUse" width="20" height="20">
                <circle cx="10" cy="10" r="8" fill="none" stroke="rgb(168, 85, 247)" strokeWidth="0.5" opacity="0.6"/>
              </pattern>
            </defs>
            <circle cx="50" cy="30" r="12" fill="none" stroke="rgb(168, 85, 247)" strokeWidth="1" opacity="0.4"/>
            <circle cx="35" cy="45" r="12" fill="none" stroke="rgb(168, 85, 247)" strokeWidth="1" opacity="0.4"/>
            <circle cx="65" cy="45" r="12" fill="none" stroke="rgb(168, 85, 247)" strokeWidth="1" opacity="0.4"/>
            <circle cx="35" cy="60" r="12" fill="none" stroke="rgb(168, 85, 247)" strokeWidth="1" opacity="0.4"/>
            <circle cx="65" cy="60" r="12" fill="none" stroke="rgb(168, 85, 247)" strokeWidth="1" opacity="0.4"/>
            <circle cx="50" cy="70" r="12" fill="none" stroke="rgb(168, 85, 247)" strokeWidth="1" opacity="0.4"/>
            <circle cx="50" cy="50" r="12" fill="none" stroke="rgb(168, 85, 247)" strokeWidth="1" opacity="0.4"/>
          </svg>
        </motion.div>

        {/* Additional OM Symbol */}
        <motion.div
          animate={{
            opacity: [0.15, 0.35, 0.15],
            y: [0, -8, 0],
            x: [0, 5, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute bottom-40 right-32 text-4xl font-bold text-yellow-400/25"
          style={{ fontFamily: 'serif' }}
        >
          ॐ
        </motion.div>

        {/* Seed of Life */}
        <motion.div
          animate={{
            rotate: -360,
            scale: [0.9, 1.1, 0.9],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute top-1/2 left-12 w-14 h-14"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="35" r="15" fill="none" stroke="rgb(20, 184, 166)" strokeWidth="1" opacity="0.3"/>
            <circle cx="35" cy="50" r="15" fill="none" stroke="rgb(20, 184, 166)" strokeWidth="1" opacity="0.3"/>
            <circle cx="65" cy="50" r="15" fill="none" stroke="rgb(20, 184, 166)" strokeWidth="1" opacity="0.3"/>
            <circle cx="35" cy="65" r="15" fill="none" stroke="rgb(20, 184, 166)" strokeWidth="1" opacity="0.3"/>
            <circle cx="65" cy="65" r="15" fill="none" stroke="rgb(20, 184, 166)" strokeWidth="1" opacity="0.3"/>
            <circle cx="50" cy="75" r="15" fill="none" stroke="rgb(20, 184, 166)" strokeWidth="1" opacity="0.3"/>
            <circle cx="50" cy="50" r="15" fill="none" stroke="rgb(20, 184, 166)" strokeWidth="1" opacity="0.3"/>
          </svg>
        </motion.div>

        {/* Another Yin Yang */}
        <motion.div
          animate={{
            rotate: -180,
            opacity: [0.2, 0.4, 0.2],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-3/4 right-16 text-3xl text-emerald-400/30"
        >
          ☯
        </motion.div>

        {/* Enhanced Floating Numerological Sequences */}
        <motion.div
          animate={{
            opacity: [0.2, 0.9, 0.2],
            scale: [1, 1.1, 1],
            y: [0, -10, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute bottom-20 left-16 text-purple-400/60 font-mono text-lg numerology-glow"
        >
          111 • 222 • 333
        </motion.div>

        <motion.div
          animate={{
            opacity: [0.3, 0.8, 0.3],
            x: [-5, 5, -5],
            scale: [0.9, 1.1, 0.9],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-32 right-40 text-teal-400/60 font-mono text-lg numerology-glow"
        >
          777 • 888 • 999
        </motion.div>

        <motion.div
          animate={{
            opacity: [0.25, 0.75, 0.25],
            rotate: [0, 5, 0],
            y: [0, 15, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/4 left-1/3 text-yellow-400/50 font-mono text-base numerology-glow"
        >
          369 • 963 • 639
        </motion.div>

        <motion.div
          animate={{
            opacity: [0.4, 0.9, 0.4],
            x: [0, -8, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute bottom-1/4 right-1/3 text-emerald-400/50 font-mono text-base numerology-glow"
        >
          144 • 528 • 741
        </motion.div>

        <motion.div
          animate={{
            opacity: [0.2, 0.7, 0.2],
            y: [0, -12, 0],
            rotate: [0, -3, 0],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-3/4 left-20 text-rose-400/50 font-mono text-sm numerology-glow"
        >
          432Hz • 528Hz • 741Hz
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-4 md:space-y-6 py-4 md:py-8"
        >


          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight"
          >
            <span className="aurora-text">ANOINT</span>{' '}
            <span className="text-white">ARRAY</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-6 md:mb-8 max-w-4xl mx-auto leading-relaxed px-4"
          >
            Unlock transcendental healing through{' '}
            <span className="aurora-text font-semibold">scalar-enhanced technology</span>,{' '}
            <span className="aurora-text font-semibold">sacred geometry</span>, and{' '}
            <span className="aurora-text font-semibold">bio-frequency harmonics</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4"
          >
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
              className="aurora-gradient text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
            >
              Explore Products
            </motion.button>

            {/* Secondary CTA removed (VIP Experience) */}
          </motion.div>

          {/* Features Preview */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-8 md:mt-16 max-w-4xl mx-auto"
          >
            {[
              { icon: Sparkles, text: 'Sacred Healing Cards' },
              { icon: Zap, text: 'Scalar Technology' },
              { icon: Heart, text: 'Energy Harmonization' },
            ].map((item, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                className="mystical-card p-6 rounded-lg text-center"
              >
                <item.icon className="h-8 w-8 aurora-text mx-auto mb-3" />
                <p className="text-gray-300">{item.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        animate={{
          y: [0, 10, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-gray-400"
      >
        <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-gradient-to-b from-purple-400 to-transparent rounded-full mt-2" />
        </div>
      </motion.div>
    </section>
  );
}
