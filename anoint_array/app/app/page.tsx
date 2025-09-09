
import { Suspense } from 'react';
import Navigation from '@/components/navigation';
import HeroSection from '@/components/hero-section';
import ProductsSection from '@/components/products-section';
import ArrayGeneratorSection from '@/components/array-generator-section';
import ServicesSection from '@/components/services-section';
import AboutSection from '@/components/about-section';
import AffiliatesSection from '@/components/affiliates-section';
import TestimonialsSection from '@/components/testimonials-section';
import ContactSection from '@/components/contact-section';
import Footer from '@/components/footer';
import ChatbotWidget from '@/components/chatbot-widget';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      <Navigation />
      
      <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
        <HeroSection />
        <ProductsSection />
        <ServicesSection />
        <ArrayGeneratorSection />
        <AboutSection />
        <AffiliatesSection />
        <TestimonialsSection />
        <ContactSection />
      </Suspense>
      
      <Footer />
      <ChatbotWidget />
    </main>
  );
}
