
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    formType: 'contact'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Message sent successfully! We\'ll be in touch soon.');
        setFormData({ name: '', email: '', subject: '', message: '', formType: 'contact' });
      } else {
        const error = await response.text();
        toast.error(error || 'Failed to send message');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <section id="contact" className="py-20 relative">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="relative w-full h-full">
          <Image
            src="https://cdn.abacus.ai/images/2f4ff114-991e-4753-9e94-8d3485053e79.png"
            alt="Contact section mystical background"
            fill
            className="object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950/90 via-transparent to-gray-950" />
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
            <MessageSquare className="h-16 w-16 aurora-text" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6"
          >
            <span className="text-white">Contact</span>{' '}
            <span className="aurora-text">Us</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl text-gray-300 max-w-3xl mx-auto"
          >
            Ready to begin your healing journey? Have questions about our products? 
            We're here to guide you every step of the way.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="mystical-card p-8 rounded-lg"
          >
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold aurora-text mb-6">Send Us a Message</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors duration-300"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors duration-300"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="formType" className="block text-sm font-medium text-gray-300 mb-2">
                  Inquiry Type
                </label>
                <select
                  id="formType"
                  name="formType"
                  value={formData.formType}
                  onChange={handleInputChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors duration-300"
                >
                  <option value="contact">General Contact</option>
                  <option value="feedback">Product Feedback</option>
                  <option value="inquiry">Purchase Inquiry</option>
                  <option value="support">Technical Support</option>
                  <option value="affiliate">Affiliate Application</option>
                </select>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors duration-300"
                  placeholder="Brief subject line"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors duration-300 resize-none"
                  placeholder="Tell us how we can help you on your healing journey..."
                />
              </div>

              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full aurora-gradient text-white py-4 min-h-[44px] rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Send Message
                  </>
                )}
              </motion.button>
            </form>

            <div className="mt-6 p-4 bg-purple-500/10 rounded-lg">
              <p className="text-xs text-purple-300 text-center">
                📧 All messages are sent to <strong>info@anoint.me</strong> and stored securely for follow-up
              </p>
            </div>
          </motion.div>

          {/* Contact Information / AI Support */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* AI Support Agent Card */}
            <div className="mystical-card p-8 rounded-lg">
              <h3 className="text-2xl font-bold aurora-text mb-4">AI Support Agent</h3>
              <p className="text-gray-300 mb-5">
                Meet the ANOINT Assistant — a friendly, AI‑powered guide that helps you navigate the site,
                understand our offerings, and choose the right tools for your healing journey.
              </p>
              <div className="space-y-3 text-gray-300 text-sm mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 aurora-gradient rounded flex items-center justify-center flex-shrink-0"><MessageSquare className="h-3.5 w-3.5 text-white"/></div>
                  <span>Instant answers to questions about products, services, and orders.</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 aurora-gradient rounded flex items-center justify-center flex-shrink-0"><Mail className="h-3.5 w-3.5 text-white"/></div>
                  <span>Personalized suggestions based on your intention (sleep, focus, space harmonizing, and more).</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 aurora-gradient rounded flex items-center justify-center flex-shrink-0"><Phone className="h-3.5 w-3.5 text-white"/></div>
                  <span>Simple energy‑aware guidance for working with items — always safe and optional.</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 aurora-gradient rounded flex items-center justify-center flex-shrink-0"><MapPin className="h-3.5 w-3.5 text-white"/></div>
                  <span>Available 24/7. Click the turquoise chat bubble at the bottom‑right to begin.</span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { try { window.dispatchEvent(new Event('anoint:open-chat')); } catch {} }}
                className="w-full aurora-gradient text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Open Chat
              </motion.button>
            </div>

            {/* Quick Links */}
            <div className="mystical-card p-8 rounded-lg">
              <h3 className="text-2xl font-bold aurora-text mb-6">Quick Actions</h3>
              
              <div className="space-y-4">
                {/* VIP quick action temporarily removed */}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => document.getElementById('affiliates')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 text-teal-300 py-3 min-h-[44px] rounded-lg font-medium transition-all duration-300"
              >
                Affiliate Program
              </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const subject = encodeURIComponent('Direct Contact from ANOINT Array Website');
                    const body = encodeURIComponent('Hello,\n\nI would like to get in touch regarding ANOINT Array products.\n\nBest regards,');
                    window.open(`mailto:info@anoint.me?subject=${subject}&body=${body}`);
                  }}
                className="w-full bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 text-yellow-300 py-3 min-h-[44px] rounded-lg font-medium transition-all duration-300"
              >
                Email Us Directly
              </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
