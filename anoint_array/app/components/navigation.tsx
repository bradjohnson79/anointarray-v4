
'use client';

import { useState, useEffect } from 'react';
import { Menu, X, User, LogOut, Settings, Shield, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePayment } from '@/contexts/payment-context';

const navLinks = [
  { href: '#hero', label: 'Home' },
  { href: '#products', label: 'Products' },
  { href: '#services', label: 'Services' },
  { href: '#array-generator', label: 'Array Generator' },
  { href: '#about', label: 'About' },
  { href: '#affiliates', label: 'Affiliates' },
  { href: '#testimonials', label: 'Testimonials' },
  { href: '#contact', label: 'Contact' },
];

export default function Navigation() {
  const { getTotalItems } = usePayment();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { data: session, status } = useSession() || {};
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSignOut = async () => {
    setIsUserMenuOpen(false);
    await signOut({ callbackUrl: '/' });
  };

  const isAdmin = session?.user?.role === 'ADMIN';

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled 
        ? 'nav-backdrop' 
        : 'bg-transparent md:bg-transparent bg-gradient-to-b from-black/40 to-transparent backdrop-blur-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-2"
          >
            <img
              src="/api/files/Figure-28.png"
              alt="ANOINT Array Logo"
              className="h-7 w-7 md:h-8 md:w-8 object-contain rounded-sm shadow"
              onError={(e)=>{ const t=e.currentTarget as HTMLImageElement; t.onerror=null; t.src='/api/files/test-export.png'; }}
            />
            <span className="text-lg md:text-xl font-bold aurora-text drop-shadow-lg">
              ANOINT ARRAY
            </span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-baseline space-x-4">
              {navLinks.map((link, index) => (
                <motion.button
                  key={link.href}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleNavClick(link.href)}
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 hover:bg-purple-500/20"
                >
                  {link.label}
                </motion.button>
              ))}
            </div>

            {/* Cart and Authentication Section */}
            <div className="flex items-center space-x-3 ml-6">
              {/* Shopping Cart Button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => router.push('/cart')}
                className="relative p-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors duration-200 border border-purple-500/30"
              >
                <ShoppingCart className="h-5 w-5 text-purple-400" />
                {getTotalItems() > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold"
                  >
                    {getTotalItems()}
                  </motion.span>
                )}
              </motion.button>
              {status === 'loading' ? (
                <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
              ) : session ? (
                /* User Menu */
                <div className="relative">
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 bg-purple-600/20 hover:bg-purple-600/30 px-3 py-2 rounded-lg transition-colors duration-200 border border-purple-500/30"
                  >
                    <User className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-white">
                      {session.user?.name?.split(' ')[0] || 'User'}
                    </span>
                    {isAdmin && <Shield className="h-3 w-3 text-yellow-400" />}
                  </motion.button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-gray-900 border border-purple-500/30 py-1 z-50"
                      >
                        <Link
                          href="/dashboard"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-purple-500/20 hover:text-white transition-colors duration-200"
                        >
                          <User className="mr-3 h-4 w-4" />
                          Member Dashboard
                        </Link>
                        
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-purple-500/20 hover:text-white transition-colors duration-200"
                          >
                            <Shield className="mr-3 h-4 w-4" />
                            Admin Dashboard
                          </Link>
                        )}
                        
                        <hr className="my-1 border-gray-700" />
                        <button
                          onClick={handleSignOut}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-red-500/20 hover:text-white transition-colors duration-200"
                        >
                          <LogOut className="mr-3 h-4 w-4" />
                          Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                /* Auth Buttons */
                <div className="flex items-center space-x-2">
                  <Link href="/auth/login">
                    <motion.button
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-gray-300 hover:text-white px-4 py-2 rounded-lg border border-purple-500/30 hover:bg-purple-500/20 transition-all duration-200"
                    >
                      Login
                    </motion.button>
                  </Link>
                  <Link href="/auth/signup">
                    <motion.button
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="aurora-gradient text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-200"
                    >
                      Sign Up
                    </motion.button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button - Top Right Corner */}
          <div className="md:hidden">
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="relative bg-black/20 backdrop-blur-sm border border-white/20 text-white hover:text-purple-300 hover:bg-purple-500/20 hover:border-purple-400/40 p-3 rounded-lg transition-all duration-200 shadow-lg"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Mobile Menu Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Mobile Menu Content */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden absolute top-full left-0 w-full bg-black/90 backdrop-blur-md border-t border-purple-500/30 shadow-2xl z-50"
            >
              <div className="px-4 pt-4 pb-6 space-y-2">
              {navLinks.map((link, index) => (
                <motion.button
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleNavClick(link.href)}
                  className="text-white hover:text-purple-300 block w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 hover:bg-purple-500/30 hover:shadow-md border border-transparent hover:border-purple-500/20"
                >
                  {link.label}
                </motion.button>
              ))}

              {/* Mobile Cart Button */}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  router.push('/cart');
                }}
                className="flex items-center text-white hover:text-purple-300 w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 hover:bg-purple-500/30 hover:shadow-md border border-transparent hover:border-purple-500/20"
              >
                <ShoppingCart className="mr-3 h-4 w-4" />
                Shopping Cart
                {getTotalItems() > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {getTotalItems()}
                  </span>
                )}
              </motion.button>

              {/* Mobile Authentication */}
              <div className="border-t border-purple-500/20 pt-4 mt-4">
                {session ? (
                  <div className="space-y-1">
                    <div className="px-4 py-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <p className="text-sm text-purple-200 font-medium">
                        Welcome, {session.user?.name?.split(' ')[0] || 'User'}
                        {isAdmin && <span className="ml-2 text-yellow-400 text-xs font-semibold">(Admin)</span>}
                      </p>
                    </div>
                    
                    <Link
                      href="/dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center text-white hover:text-purple-300 w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 hover:bg-purple-500/30 hover:shadow-md border border-transparent hover:border-purple-500/20"
                    >
                      <User className="mr-3 h-4 w-4" />
                      Member Dashboard
                    </Link>
                    
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center text-white hover:text-purple-300 w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 hover:bg-purple-500/30 hover:shadow-md border border-transparent hover:border-purple-500/20"
                      >
                        <Shield className="mr-3 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    )}
                    
                    <button
                      onClick={handleSignOut}
                      className="flex items-center text-white hover:text-red-300 w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 hover:bg-red-500/30 hover:shadow-md border border-transparent hover:border-red-500/20"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      href="/auth/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full text-center px-4 py-3 rounded-lg text-base font-medium text-white hover:text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 transition-all duration-200 hover:shadow-md"
                    >
                      Login
                    </Link>
                    <Link
                      href="/auth/signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full text-center px-4 py-3 rounded-lg text-base font-medium aurora-gradient text-white hover:shadow-lg transition-all duration-200 font-semibold"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
