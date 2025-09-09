
'use client';

import { motion } from 'framer-motion';
import { Quote, Star, User } from 'lucide-react';
import Image from 'next/image';

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Sarah Mitchell',
      title: 'Energy Healer & Reiki Master',
      image: 'https://i.pinimg.com/736x/6e/e2/ec/6ee2ec4db38c9a5ba597e5d77321cd48.jpg',
      content: 'The ANOINT Healing Code Cards have completely transformed my practice. My clients experience deeper healing sessions, and I can feel the scalar enhancement amplifying the energy work. These aren\'t just cards - they\'re genuine healing tools.',
      rating: 5,
      product: 'Healing Code Cards'
    },
    {
      name: 'Dr. Marcus Chen',
      title: 'Holistic Wellness Practitioner',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
      content: 'As a practitioner, I\'ve seen many products claiming to enhance healing. The ANOINT Scalar Enhanced Essential Oils actually deliver. The frequency enhancement is palpable, and my patients report accelerated recovery times.',
      rating: 5,
      product: 'Scalar Enhanced Oils'
    },
    {
      name: 'Luna Rodriguez',
      title: 'Meditation Teacher & Spiritual Guide',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
      content: 'The Manifestation Sphere has become central to my meditation practice. I can literally feel the energy vortex it creates. My manifestations are coming through faster and with more clarity than ever before.',
      rating: 5,
      product: 'Manifestation Sphere'
    },
    {
      name: 'James Thompson',
      title: 'Former Skeptic & Engineer',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
      content: 'I approached ANOINT Array with scientific skepticism. The Wooden Rejuvenation Arrays changed my mind completely. The mathematical precision combined with measurable energy fields convinced this engineer that this technology is real.',
      rating: 5,
      product: 'Wooden Arrays'
    },
    {
      name: 'Isabella Grace',
      title: 'Crystal Therapist',
      image: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop&crop=face',
      content: 'The Scalar Enhanced Crystal Bracelets are unlike any crystal jewelry I\'ve worked with. They maintain their charge continuously and create a protective field around the wearer. My clients won\'t leave home without them.',
      rating: 5,
      product: 'Crystal Bracelets'
    },
    {
      name: 'Michael Davis',
      title: 'Chronic Pain Survivor',
      image: 'https://images.unsplash.com/photo-1556474835-b0f3ac40d4d1?w=400&h=400&fit=crop&crop=face',
      content: 'After 10 years of chronic back pain, the ANOINT Enhanced Massage Oil has given me my life back. The scalar frequencies seem to penetrate deep into the tissue. I finally have pain-free days again.',
      rating: 5,
      product: 'Enhanced Massage Oil'
    }
  ];

  return (
    <section id="testimonials" className="py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="relative w-full h-full">
          <Image
            src="https://cdn.abacus.ai/images/bc15acf5-02a5-42e7-9182-6fa7d7da3623.png"
            alt="Testimonials aurora background"
            fill
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950/80 via-transparent to-gray-950/80" />
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
            <Quote className="h-16 w-16 aurora-text" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            <span className="text-white">Healing</span>{' '}
            <span className="aurora-text">Stories</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl text-gray-300 max-w-3xl mx-auto"
          >
            Real transformations from our community of healers, practitioners, 
            and individuals who have experienced the power of scalar-enhanced healing
          </motion.p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="mystical-card p-6 rounded-lg group"
            >
              {/* Rating Stars */}
              <div className="flex items-center justify-center space-x-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star 
                    key={i} 
                    className="h-4 w-4 fill-yellow-400 text-yellow-400" 
                  />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-gray-300 text-sm leading-relaxed mb-6 italic">
                "{testimonial.content}"
              </blockquote>

              {/* Profile */}
              <div className="flex items-center space-x-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-teal-400 flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white text-sm group-hover:aurora-text transition-all duration-300">
                    {testimonial.name}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {testimonial.title}
                  </div>
                  <div className="text-purple-300 text-xs mt-1">
                    {testimonial.product}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mt-16"
        >
          <div className="mystical-card p-8 rounded-lg max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold aurora-text mb-4">
              Share Your Story
            </h3>
            <p className="text-gray-300 mb-6">
              Have you experienced transformation with ANOINT Array products? 
              We'd love to hear about your healing journey.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              className="aurora-gradient text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Submit Your Testimonial
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
