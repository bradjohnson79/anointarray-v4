
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Save, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/dashboard-layout';

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  });

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const r = await fetch('/api/me/account', { cache: 'no-store' });
        const j = await r.json();
        setFormData({
          name: j?.name || '',
          email: j?.email || user.email || '',
          phone: j?.phone || '',
          address: j?.address || '',
          address2: j?.address2 || '',
          city: j?.city || '',
          state: j?.state || '',
          zip: j?.zip || '',
          country: j?.country || '',
        });
      } catch {
        setFormData(prev => ({
          ...prev,
          name: '',
          email: user.email || prev.email,
        }));
      }
    };
    load();
  }, [user]);

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
      // For now, only save name + email
      const payload = { name: formData.name, email: formData.email };
      const r = await fetch('/api/me/account', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(j?.error || 'Update failed');
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update profile');
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
                {formData.name || user?.email?.split('@')[0] || 'User'}
              </h2>
              <p className="text-gray-400">Member</p>
              {/* Optional member since date can be added when available */}
            </div>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div className="md:col-span-2">
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
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} disabled={!isEditing} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 disabled:opacity-60 transition-colors duration-300" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
                <input name="address" value={formData.address} onChange={handleInputChange} disabled={!isEditing} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 disabled:opacity-60 transition-colors duration-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Address 2</label>
                <input name="address2" value={formData.address2} onChange={handleInputChange} disabled={!isEditing} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 disabled:opacity-60 transition-colors duration-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                <input name="city" value={formData.city} onChange={handleInputChange} disabled={!isEditing} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 disabled:opacity-60 transition-colors duration-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">State/Province</label>
                <input name="state" value={formData.state} onChange={handleInputChange} disabled={!isEditing} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 disabled:opacity-60 transition-colors duration-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Postal/Zip</label>
                <input name="zip" value={formData.zip} onChange={handleInputChange} disabled={!isEditing} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 disabled:opacity-60 transition-colors duration-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                <input name="country" value={formData.country} onChange={handleInputChange} disabled={!isEditing} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 disabled:opacity-60 transition-colors duration-300" />
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
              <p className="text-2xl font-bold text-purple-400">0</p>
              <p className="text-sm text-gray-400">Arrays Generated</p>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <p className="text-2xl font-bold text-teal-400">0</p>
              <p className="text-sm text-gray-400">Orders Completed</p>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
