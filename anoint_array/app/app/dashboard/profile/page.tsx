
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Save, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/dashboard-layout';

export default function ProfilePage() {
  const { data: session, update } = useSession() || {};
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  useEffect(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || '',
        email: session.user.email || '',
      });
    }
  }, [session]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement profile update API
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mystical-card p-6 rounded-lg"
        >
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg transition-colors duration-200"
            >
              <Edit3 className="h-4 w-4" />
              <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
            </motion.button>
          </div>

          <div className="flex items-center space-x-4 mb-8">
            <div className="w-20 h-20 bg-purple-600/30 rounded-full flex items-center justify-center">
              <User className="h-10 w-10 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {session?.user?.name || 'User'}
              </h2>
              <p className="text-gray-400">Member</p>
              <p className="text-sm text-gray-500 flex items-center mt-1">
                <Calendar className="h-4 w-4 mr-1" />
                Member since January 2024
              </p>
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 disabled:opacity-60 transition-colors duration-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 disabled:opacity-60 transition-colors duration-300"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Email changes require verification
                </p>
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end">
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center space-x-2 aurora-gradient text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
                </motion.button>
              </div>
            )}
          </form>
        </motion.div>

        {/* Account Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mystical-card p-6 rounded-lg"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Account Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <p className="text-2xl font-bold text-purple-400">12</p>
              <p className="text-sm text-gray-400">Arrays Generated</p>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <p className="text-2xl font-bold text-teal-400">3</p>
              <p className="text-sm text-gray-400">Orders Completed</p>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
