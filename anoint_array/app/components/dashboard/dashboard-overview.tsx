
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  Download, 
  Zap, 
  Star,
  TrendingUp,
  Calendar,
  Package,
  Crown
} from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DashboardOverviewProps {
  user: User;
}

export default function DashboardOverview({ user }: DashboardOverviewProps) {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalDownloads: 0,
    arraysGenerated: 0,
    memberSince: '',
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    // TODO: Fetch real data from API
    setStats({
      totalOrders: 3,
      totalDownloads: 7,
      arraysGenerated: 12,
      memberSince: 'January 2024',
    });
  }, []);

  const statCards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
    },
    {
      title: 'Downloads',
      value: stats.totalDownloads,
      icon: Download,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
    },
    {
      title: 'Arrays Generated',
      value: stats.arraysGenerated,
      icon: Zap,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30',
    },
    {
      title: 'Member Since',
      value: stats.memberSince,
      icon: Calendar,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30',
    },
  ];

  const quickActions = [
    {
      title: 'Generate New Array',
      description: 'Create a personalized healing seal array',
      icon: Zap,
      href: '/dashboard/array-generator',
      color: 'aurora-gradient',
    },
    {
      title: 'Browse Products',
      description: 'Explore our sacred healing collection',
      icon: Package,
      href: '/#products',
      color: 'bg-teal-600 hover:bg-teal-700',
    },
    {
      title: 'VIP Experience',
      description: 'Join our exclusive VIP waitlist',
      icon: Crown,
      href: '/#vip',
      color: 'bg-yellow-600 hover:bg-yellow-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mystical-card p-6 rounded-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome back, {user.name?.split(' ')[0] || 'User'}! ✨
            </h1>
            <p className="text-gray-300">
              Continue your sacred healing journey with ANOINT Array
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-16 h-16 bg-purple-600/30 rounded-full flex items-center justify-center">
              <Star className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`mystical-card p-6 rounded-lg border ${stat.borderColor}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mystical-card p-6 rounded-lg"
      >
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={action.title}
              href={action.href}
              className="group block"
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-purple-500/50 transition-all duration-300"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white group-hover:aurora-text transition-all duration-300">
                    {action.title}
                  </h3>
                </div>
                <p className="text-gray-400 text-sm">
                  {action.description}
                </p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mystical-card p-6 rounded-lg"
      >
        <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
        
        {recentActivity.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              No recent activity yet. Start by generating your first healing array!
            </p>
            <Link
              href="/dashboard/array-generator"
              className="inline-block mt-4 aurora-gradient text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-300"
            >
              Generate Array
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* TODO: Display actual recent activity */}
          </div>
        )}
      </motion.div>
    </div>
  );
}
