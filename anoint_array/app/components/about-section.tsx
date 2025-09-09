
'use client';

import { motion } from 'framer-motion';
import { Atom, Waves, Shield, Zap, Heart, Brain } from 'lucide-react';
import Image from 'next/image';

export default function AboutSection() {
  const technologies = [
    {
      icon: Atom,
      title: 'Scalar Wave Technology',
      description: 'Harnessing quantum field fluctuations to create healing frequencies that transcend traditional electromagnetic limitations'
    },
    {
      icon: Waves,
      title: 'Bio-Frequency Harmonics',
      description: 'Precisely calibrated frequencies that resonate with your body\'s natural healing mechanisms and cellular regeneration'
    },
    {
      icon: Shield,
      title: 'Sacred Geometry Integration',
      description: 'Ancient mathematical principles combined with modern quantum physics to create powerful healing amplification fields'
    },
    {
      icon: Zap,
      title: 'Tesla Coil Enhancement',
      description: 'Copper Tesla coils that generate and direct healing energy with unprecedented precision and potency. Product coming soon.'
    },
    {
      icon: Heart,
      title: 'Chakra Balancing Systems',
      description: 'Multi-dimensional energy healing that aligns and balances your entire energetic system for optimal wellness'
    },
    {
      icon: Brain,
      title: 'Consciousness Amplification',
      description: 'Technology designed to enhance psychic abilities, meditation depth, and spiritual awakening processes'
    }
  ];

  return (
    <section id="about" className="py-20 relative">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="relative w-full h-full">
          <Image
            src="https://cdn.abacus.ai/images/04d9b566-f7d8-4f27-9af1-3dcb208ce1b2.png"
            alt="Mystical symbols background"
            fill
            className="object-cover opacity-5"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950/90 via-transparent to-gray-950/90" />
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6"
          >
            <span className="text-white">About</span>{' '}
            <span className="aurora-text">ANOINT Array</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-gray-300 max-w-4xl mx-auto"
          >
            We bridge the gap between ancient wisdom and cutting-edge quantum technology, 
            creating healing solutions that work on physical, emotional, mental, and spiritual levels. 
            Our products represent the next evolution in conscious healing technology.
          </motion.p>
        </div>

        {/* Mission Statement */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mystical-card p-8 rounded-lg mb-16 text-center"
        >
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold aurora-text mb-4">Our Mission</h3>
          <p className="text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed">
            To empower individuals on their healing journey by providing access to advanced 
            scalar-enhanced technologies that activate the body's natural healing intelligence. 
            We combine sacred mathematical principles with quantum field dynamics to create 
            products that facilitate deep transformation and spiritual awakening.
          </p>
        </motion.div>

        {/* Technologies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {technologies.map((tech, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="mystical-card p-6 rounded-lg group"
            >
              <div className="w-12 h-12 aurora-gradient rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <tech.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 group-hover:aurora-text transition-all duration-300">
                {tech.title}
              </h3>
              <p className="text-gray-300">
                {tech.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Values & Principles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="mystical-card p-8 rounded-lg"
          >
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold aurora-text mb-6">Our Values</h3>
            <div className="space-y-4">
              {[
                'Integrity in every product and interaction',
                'Commitment to genuine healing transformation',
                'Respect for ancient wisdom and modern science',
                'Empowerment of individual healing journeys',
                'Continuous innovation in conscious technology'
              ].map((value, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-center space-x-3"
                >
                  <div className="w-2 h-2 aurora-gradient rounded-full flex-shrink-0" />
                  <span className="text-gray-300">{value}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="mystical-card p-8 rounded-lg"
          >
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold aurora-text mb-6">Why Choose ANOINT Array</h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Proven Technology</h4>
                <p className="text-gray-300 text-sm">
                  Our scalar enhancement process has been refined through years of research 
                  and testing to ensure maximum healing efficacy.
                </p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Personalized Approach</h4>
                <p className="text-gray-300 text-sm">
                  Every product can be customized to your specific healing needs and 
                  energetic requirements for optimal results.
                </p>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Continuous Support</h4>
                <p className="text-gray-300 text-sm">
                  We provide ongoing guidance and support to help you maximize the 
                  benefits of your healing journey with ANOINT Array.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
