
'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Home, 
  User, 
  Package, 
  Download, 
  Zap, 
  LogOut, 
  Menu, 
  X, 
  Sparkles,
  Settings,
  Star
} from 'lucide-react';
import EnergyRibbons from '@/components/energy-ribbons';

const memberNavLinks = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/orders', label: 'Orders', icon: Package },
  { href: '/dashboard/downloads', label: 'Downloads', icon: Download },
  { href: '/dashboard/seal-generator', label: 'Seal Array Generator', icon: Star },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { data: session } = useSession() || {};
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      <EnergyRibbons intensity="subtle" count={2} />
      
      <div className="relative z-10">
        {/* Mobile sidebar overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900/95 backdrop-blur-md border-r border-purple-500/20 transform transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0`}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-purple-500/20">
              <Link href="/" className="flex items-center space-x-2">
                <Sparkles className="h-8 w-8 aurora-text" />
                <span className="text-xl font-bold aurora-text">ANOINT ARRAY</span>
              </Link>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-purple-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-600/30 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-white">
                    {session?.user?.name || 'User'}
                  </p>
                  <p className="text-sm text-gray-400">Member</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                {memberNavLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                          isActive
                            ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                            : 'text-gray-300 hover:text-white hover:bg-purple-500/20'
                        }`}
                      >
                        <link.icon className="h-5 w-5" />
                        <span>{link.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-purple-500/20">
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-3 w-full px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-red-500/20 transition-colors duration-200"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="md:ml-64">
          {/* Top Bar */}
          <header className="bg-gray-900/50 backdrop-blur-md border-b border-purple-500/20 px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden text-gray-400 hover:text-white"
              >
                <Menu className="h-6 w-6" />
              </button>

              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-white">
                  Member Dashboard
                </h1>
              </div>

              <div className="hidden md:flex items-center space-x-4">
                <Link
                  href="/dashboard/profile"
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <Settings className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
