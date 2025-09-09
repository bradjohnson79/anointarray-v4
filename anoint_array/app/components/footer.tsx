
'use client';

import { motion } from 'framer-motion';
import { Sparkles, Mail, Phone, MapPin } from 'lucide-react';
import Image from 'next/image';

export default function Footer() {
  const footerLinks = [
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '#about' },
        { label: 'Contact', href: '#contact' },
        { label: 'Affiliates', href: '#affiliates' },
      ]
    },
    {
      title: 'Products',
      links: [
        { label: 'All Products', href: '#products' },
        { label: 'Services', href: '#services' },
        { label: 'Array Generator', href: '#array-generator' },
      ]
    },
    {
      title: 'Support',
      links: [
        { label: 'Contact Form', href: '#contact' },
        { label: 'Privacy Policy', href: '#' },
        { label: 'Terms & Conditions', href: '#' },
      ]
    }
  ];

  const handleNavClick = (href: string) => {
    if (href === '#') {
      // For placeholder links, show a message
      alert('This page is coming soon. For legal inquiries, please contact us.');
      return;
    }
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <footer className="relative py-20 border-t border-gray-800">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="relative w-full h-full">
          <Image
            src="https://cdn.abacus.ai/images/d4911141-5f65-4f35-b5c8-f68c68464ea3.png"
            alt="Footer numerological background"
            fill
            className="object-cover opacity-10"
          />
          <div className="absolute inset-0 cosmic-bg" />
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Sparkles className="h-10 w-10 aurora-text" />
              <span className="text-2xl font-bold aurora-text">ANOINT ARRAY</span>
            </div>
            
            <p className="text-gray-300 mb-6 max-w-md leading-relaxed">
              Bridging ancient wisdom with quantum technology to create 
              transformative healing solutions for mind, body, and spirit. 
              Experience the future of conscious healing.
            </p>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-gray-300">
                <Mail className="h-5 w-5 text-purple-400" />
                <span>info@anoint.me</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <Phone className="h-5 w-5 text-teal-400" />
                <span>Available Mon-Fri, 9 AM - 6 PM PST</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <MapPin className="h-5 w-5 text-yellow-400" />
                <span>Serving Globally via Remote Technology</span>
              </div>
            </div>
          </motion.div>

          {/* Footer Links */}
          {footerLinks.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <h3 className="text-lg font-semibold text-white mb-6">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <motion.button
                      onClick={() => handleNavClick(link.href)}
                      whileHover={{ x: 5 }}
                      className="text-gray-300 hover:aurora-text transition-all duration-300 text-left"
                    >
                      {link.label}
                    </motion.button>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="pt-8 border-t border-gray-800"
        >
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm">
              © 2025 ANOINT Array. All rights reserved. Scalar healing technology.
            </div>
            
            <div className="flex items-center space-x-6 text-sm">
              <motion.button
                onClick={() => handleNavClick('#contact')}
                whileHover={{ scale: 1.05 }}
                className="text-gray-400 hover:aurora-text transition-colors duration-300"
              >
                Contact Support
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  alert('Privacy Policy coming soon. For privacy inquiries, please contact us.');
                }}
                className="text-gray-400 hover:aurora-text transition-colors duration-300"
              >
                Privacy Policy
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  alert('Terms & Conditions coming soon. For legal inquiries, please contact us.');
                }}
                className="text-gray-400 hover:aurora-text transition-colors duration-300"
              >
                Terms & Conditions
              </motion.button>
            </div>
          </div>

          {/* Mystical Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-center mt-8 pt-6 border-t border-gray-800/50"
          >
            <p className="aurora-text text-sm font-medium italic">
              "Where Ancient Wisdom Meets Quantum Healing Technology"
            </p>
            <div className="flex justify-center mt-2 space-x-2 text-xs text-gray-500">
              <span>✧</span>
              <span>Sacred Geometry</span>
              <span>•</span>
              <span>Scalar Waves</span>
              <span>•</span>
              <span>Bio-Frequencies</span>
              <span>✧</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </footer>
  );
}
