
'use client';

import { motion } from 'framer-motion';
import { Users, DollarSign, TrendingUp, Gift, Star, Award } from 'lucide-react';

export default function AffiliatesSection() {
  const benefits = [
    {
      icon: DollarSign,
      title: '15% Commission',
      description: 'Earn 15% on every sale you refer',
      highlight: 'Up to $333 per premium sale'
    },
    {
      icon: Gift,
      title: 'Customer Discounts',
      description: 'Your referrals save $5-$10 on select products',
      highlight: 'Exclusive discount codes'
    },
    {
      icon: TrendingUp,
      title: 'Monthly Payouts',
      description: 'End of month payouts through PayPal.',
      highlight: 'PayPal payouts'
    }
  ];

  const howItWorks = [
    {
      step: '01',
      title: 'Join the Program',
      description: 'Sign up for your unique affiliate code and marketing materials'
    },
    {
      step: '02',
      title: 'Share & Promote',
      description: 'Share ANOINT Array products with your audience using your code'
    },
    {
      step: '03',
      title: 'Earn Commissions',
      description: 'Receive 15% commission on all successful referrals and sales'
    },
    {
      step: '04',
      title: 'Get Paid',
      description: 'Monthly payouts directly to your preferred payment method'
    }
  ];

  return (
    <section id="affiliates" className="py-20 relative">
      {/* Background */}
      <div className="absolute inset-0 cosmic-bg opacity-30" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex justify-center mb-6"
          >
            <Users className="h-16 w-16 aurora-text" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6"
          >
            <span className="aurora-text">Affiliates</span>{' '}
            <span className="text-white">Program</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl text-gray-300 max-w-3xl mx-auto"
          >
            Join our community of healing advocates and earn generous commissions 
            while sharing transformative products with those who need them most.
          </motion.p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="mystical-card p-6 rounded-lg text-center group"
            >
              <div className="w-12 h-12 aurora-gradient rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <benefit.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:aurora-text transition-all duration-300">
                {benefit.title}
              </h3>
              <p className="text-gray-300 mb-3 text-sm">
                {benefit.description}
              </p>
              <div className="text-xs aurora-text font-medium">
                {benefit.highlight}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Commission Structure */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mystical-card p-8 rounded-lg mb-16"
        >
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold aurora-text mb-4">Commission Structure</h3>
            <p className="text-gray-300">Transparent and generous rewards for your efforts</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">15%</div>
              <div className="text-white font-semibold mb-1">In‑House Products</div>
              <div className="text-gray-400 text-sm">Flat referral rate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-teal-400 mb-2">15%</div>
              <div className="text-white font-semibold mb-1">Services</div>
              <div className="text-gray-400 text-sm">Imbuing, scans, and more</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-indigo-400 mb-2">15%</div>
              <div className="text-white font-semibold mb-1">Seal Array Generator</div>
              <div className="text-gray-400 text-sm">Custom arrays purchased</div>
            </div>
          </div>
        </motion.div>

        {/* How It Works */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h3 className="text-2xl font-bold aurora-text mb-8">How It Works</h3>
            <div className="space-y-6">
              {howItWorks.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="flex items-start space-x-4"
                >
                  <div className="flex-shrink-0 w-12 h-12 aurora-gradient rounded-full flex items-center justify-center font-bold text-white">
                    {step.step}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">
                      {step.title}
                    </h4>
                    <p className="text-gray-300 text-sm">
                      {step.description}
                    </p>
                  </div>
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
            <div className="text-center mb-6">
              <Star className="h-12 w-12 aurora-text mx-auto mb-4" />
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3">
                Ready to Join?
              </h3>
              <p className="text-gray-300">
                Start earning commissions while helping others discover 
                the power of conscious healing technology
              </p>
            </div>

            <div className="space-y-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { window.open('https://anointarray.goaffpro.com', '_blank'); }}
                className="w-full aurora-gradient text-white py-4 min-h-[44px] rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Join Now
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { window.open('https://anointarray.goaffpro.com/login', '_blank'); }}
                className="w-full border-2 border-purple-400 text-purple-400 hover:bg-purple-400/20 py-3 min-h-[44px] rounded-lg font-medium transition-all duration-300"
              >
                Affiliate Log‑in
              </motion.button>
            </div>

            <div className="mt-6 p-4 bg-purple-500/10 rounded-lg">
              <div className="flex items-center justify-center space-x-2 text-purple-300 text-sm">
                <Gift className="h-4 w-4" />
                <span><strong>Bonus:</strong> Sign up this month and get your first commission doubled!</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
