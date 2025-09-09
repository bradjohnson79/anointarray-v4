
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Zap, Users, Mail, Phone, User } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import EnergyRibbons from './energy-ribbons';

export default function VipSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    interests: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/vip-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Successfully joined VIP waitlist!');
        setFormData({ name: '', email: '', phone: '', interests: '' });
      } else {
        const error = await response.text();
        toast.error(error || 'Failed to join waitlist');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <section id="vip" className="py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="relative w-full h-full">
          <Image
            src="https://cdn.abacus.ai/images/11364ac2-4a24-4f8a-9eb5-cc80758be27f.png"
            alt="VIP technology background"
            fill
            className="object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950/80 via-transparent to-gray-950/80" />
        </div>
      </div>
      
      <EnergyRibbons intensity="moderate" count={3} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex justify-center mb-6"
          >
            <Crown className="h-16 w-16 aurora-text" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            <span className="aurora-text">VIP</span>{' '}
            <span className="text-white">Experience</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl text-gray-300 max-w-3xl mx-auto"
          >
            Exclusive access to cutting-edge healing technologies reserved for our most dedicated practitioners
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Bio-Scalar Vest Feature */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <div className="mystical-card p-8 rounded-lg">
              <div className="relative aspect-square mb-6 rounded-lg overflow-hidden bg-gray-800">
                <Image
                  src="https://cdn.abacus.ai/images/dae6b1a9-c4f4-4510-abcb-7edf51626d16.png"
                  alt="ANOINT Bio-Scalar Vest"
                  fill
                  className="object-cover"
                />
                <div className="absolute top-4 left-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Coming Soon
                </div>
              </div>

              <h3 className="text-2xl font-bold aurora-text mb-4">
                ANOINT Bio-Scalar Vest
              </h3>

              <p className="text-gray-300 mb-6">
                Revolutionary wearable healing technology featuring four Copper Tesla coils 
                and modular frequency generators. This custom-built scalar healing vest 
                provides targeted frequencies directly to your body for rapid recovery 
                from injuries and chronic conditions.
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-purple-400" />
                  <span className="text-gray-300">Four Copper Tesla Coils</span>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-teal-400" />
                  <span className="text-gray-300">Modular Frequency System</span>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  <span className="text-gray-300">Professional Calibration</span>
                </div>
              </div>

              <div className="text-3xl font-bold aurora-text mb-4">
                $888.88
              </div>
            </div>
          </motion.div>

          {/* VIP Waitlist Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mystical-card p-8 rounded-lg">
              <div className="text-center mb-8">
                <Users className="h-12 w-12 aurora-text mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-3">
                  Join VIP Waitlist
                </h3>
                <p className="text-gray-300">
                  Be the first to access exclusive VIP products and receive 
                  priority notifications when the Bio-Scalar Vest becomes available
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    placeholder="Full Name"
                    value={formData.name}
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
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number (Optional)"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors duration-300"
                  />
                </div>

                <div>
                  <textarea
                    name="interests"
                    placeholder="Tell us about your healing interests or specific needs..."
                    value={formData.interests}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors duration-300 resize-none"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full aurora-gradient text-white py-4 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Joining...' : 'Join VIP Waitlist'}
                </motion.button>
              </form>

              <p className="text-xs text-gray-500 text-center mt-4">
                By joining, you agree to receive priority notifications about VIP products and exclusive offers.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
