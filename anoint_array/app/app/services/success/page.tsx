'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Mail, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

export default function ServicesSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mystical-card max-w-2xl w-full p-8 rounded-lg text-center"
      >
        <div className="flex items-center justify-center mb-4">
          <CheckCircle className="h-12 w-12 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Service Request Confirmed</h1>
        <p className="text-gray-300 mb-6">Thank you for your purchase. You’ll receive an email shortly with confirmation and next steps.</p>

        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 text-left space-y-3 mb-6">
          <div className="flex items-center text-gray-300">
            <Mail className="h-5 w-5 mr-2 text-purple-400" />
            <span>Reply to the confirmation email with any additional photos requested.</span>
          </div>
          <div className="flex items-center text-gray-300">
            <ImageIcon className="h-5 w-5 mr-2 text-teal-400" />
            <span>If you included a photo, our team will begin pre‑analysis. Turnaround can be as soon as 24 hours depending on demand.</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="aurora-gradient text-white px-6 py-3 rounded-lg font-semibold">Return Home</Link>
          <Link href="/contact" className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold border border-gray-700">Contact Support</Link>
        </div>
      </motion.div>
    </div>
  );
}

