
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Crown, 
  Shield,
  Mail,
  Calendar,
  MoreHorizontal,
  Plus,
  Eye,
  ShoppingCart,
  Phone,
  MapPin,
  UserCheck,
  UserX,
  X
} from 'lucide-react';
import AdminLayout from '@/components/admin/admin-layout';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  phone?: string;
  address?: any;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  ordersCount: number;
  totalSpent: number;
  arraysGenerated: number;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedUserOrders, setSelectedUserOrders] = useState<any[]>([]);
  const [showOrderHistoryModal, setShowOrderHistoryModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        // Fallback to sample data for now
        setUsers([
          {
            id: '1',
            name: 'John Doe',
            email: 'john@doe.com',
            role: 'ADMIN',
            phone: '+1-555-0123',
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z',
            lastLoginAt: '2024-01-25T10:30:00Z',
            ordersCount: 0,
            totalSpent: 0,
            arraysGenerated: 5,
          },
          {
            id: '2',
            name: 'Sarah Johnson',
            email: 'sarah.johnson@email.com',
            role: 'USER',
            phone: '+1-555-0124',
            isActive: true,
            createdAt: '2024-01-15T00:00:00Z',
            lastLoginAt: '2024-01-24T15:45:00Z',
            ordersCount: 3,
            totalSpent: 299.99,
            arraysGenerated: 12,
          },
          {
            id: '3',
            name: 'Michael Chen',
            email: 'michael.chen@email.com',
            role: 'USER',
            phone: '+1-555-0125',
            isActive: true,
            createdAt: '2024-01-20T00:00:00Z',
            lastLoginAt: '2024-01-25T09:15:00Z',
            ordersCount: 1,
            totalSpent: 144.44,
            arraysGenerated: 8,
          },
          {
            id: '4',
            name: 'Emma Davis',
            email: 'emma.davis@email.com',
            role: 'USER',
            phone: '+1-555-0126',
            isActive: false,
            createdAt: '2024-01-18T00:00:00Z',
            lastLoginAt: '2024-01-23T14:20:00Z',
            ordersCount: 2,
            totalSpent: 199.98,
            arraysGenerated: 15,
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.phone && user.phone.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = filterRole === 'ALL' || user.role === filterRole;
    const matchesStatus = filterStatus === 'ALL' || 
                         (filterStatus === 'ACTIVE' && user.isActive) ||
                         (filterStatus === 'INACTIVE' && !user.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleRoleChange = async (userId: string, newRole: 'USER' | 'ADMIN') => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || 'Failed to update user role');
      }

      const updatedUser = await response.json();
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: updatedUser.role } : user
      ));
      toast.success(`User role updated to ${updatedUser.role}`);
    } catch (error) {
      console.error('Update role error:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const current = users.find(u => u.id === userId);
      const nextActive = !current?.isActive;
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextActive }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || 'Failed to update user status');
      }

      const updatedUser = await response.json();
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, isActive: updatedUser.isActive } : user
      ));
      toast.success('User status updated');
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        // TODO: Implement API call
        setUsers(prev => prev.filter(user => user.id !== userId));
        toast.success('User deleted successfully');
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  const handleViewOrderHistory = async (userId: string) => {
    setSelectedUserId(userId);
    try {
      // TODO: Implement API call to fetch user orders
      const sampleOrders = [
        {
          id: '1',
          orderNumber: 'ANA-2024-001',
          date: '2024-01-15',
          total: 144.44,
          status: 'delivered',
          items: 'Chakra Balancing Crystal Array'
        },
        {
          id: '2', 
          orderNumber: 'ANA-2024-002',
          date: '2024-01-20',
          total: 77.77,
          status: 'delivered',
          items: 'Sacred Frequency Healing Cards'
        }
      ];
      setSelectedUserOrders(sampleOrders);
      setShowOrderHistoryModal(true);
    } catch (error) {
      toast.error('Failed to load order history');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatLastActive = (dateString?: string) => {
    if (!dateString) return 'Never';
    const diff = Date.now() - new Date(dateString).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (days > 0) return `${days} days ago`;
    if (hours > 0) return `${hours} hours ago`;
    return 'Recently';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="aurora-text text-xl font-semibold">Loading users...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mystical-card p-6 rounded-lg"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">User Management</h1>
              <p className="text-gray-300">
                Manage user accounts, roles, permissions, and view order history
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                <div>
                  Total Users: <span className="text-white font-semibold">{users.length}</span>
                </div>
                <div>
                  Active: <span className="text-green-400 font-semibold">{users.filter(u => u.isActive).length}</span>
                </div>
                <div>
                  Admins: <span className="text-yellow-400 font-semibold">{users.filter(u => u.role === 'ADMIN').length}</span>
                </div>
                <div>
                  Revenue: <span className="text-purple-400 font-semibold">{formatCurrency(users.reduce((sum, u) => sum + u.totalSpent, 0))}</span>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center space-x-2 aurora-gradient text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-300"
              >
                <Plus className="h-4 w-4" />
                <span>Add User</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mystical-card p-4 rounded-lg"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as 'ALL' | 'USER' | 'ADMIN')}
                className="bg-gray-800 border border-gray-700 rounded-lg px-12 py-3 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Roles</option>
                <option value="USER">Users</option>
                <option value="ADMIN">Admins</option>
              </select>
            </div>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mystical-card rounded-lg overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50 border-b border-gray-700">
                <tr>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">User</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Contact</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Role</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Status</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Orders</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Total Spent</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Last Login</th>
                  <th className="text-right py-4 px-6 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors duration-200"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          user.isActive ? 'bg-green-600/30' : 'bg-gray-600/30'
                        }`}>
                          <Users className={`h-5 w-5 ${user.isActive ? 'text-green-400' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                          <p className="text-xs text-gray-500">Joined {formatDate(user.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm">
                        {user.phone && (
                          <div className="flex items-center text-gray-300 mb-1">
                            <Phone className="h-3 w-3 mr-1" />
                            {user.phone}
                          </div>
                        )}
                        <div className="flex items-center text-gray-400">
                          <Mail className="h-3 w-3 mr-1" />
                          <span className="truncate max-w-[120px]">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'ADMIN' 
                          ? 'bg-yellow-400/20 text-yellow-400' 
                          : 'bg-blue-400/20 text-blue-400'
                      }`}>
                        {user.role === 'ADMIN' && <Shield className="h-3 w-3 mr-1" />}
                        {user.role === 'USER' && <Users className="h-3 w-3 mr-1" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.isActive
                          ? 'bg-green-400/20 text-green-400'
                          : 'bg-red-400/20 text-red-400'
                      }`}>
                        {user.isActive ? <UserCheck className="h-3 w-3 mr-1" /> : <UserX className="h-3 w-3 mr-1" />}
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleViewOrderHistory(user.id)}
                        className="flex items-center space-x-1 text-purple-400 hover:text-purple-300 transition-colors duration-200"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        <span className="font-medium">{user.ordersCount}</span>
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-green-400">
                        {formatCurrency(user.totalSpent)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-300 text-sm">
                      {formatLastActive(user.lastLoginAt)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewOrderHistory(user.id)}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-colors duration-200"
                          title="View Order History"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as 'USER' | 'ADMIN')}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="USER">User</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <button
                          onClick={() => handleToggleStatus(user.id)}
                          className={`p-2 rounded-lg transition-colors duration-200 ${
                            user.isActive 
                              ? 'text-orange-400 hover:text-orange-300 hover:bg-orange-500/20' 
                              : 'text-green-400 hover:text-green-300 hover:bg-green-500/20'
                          }`}
                          title={user.isActive ? 'Deactivate User' : 'Activate User'}
                        >
                          {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors duration-200"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Users Found</h3>
              <p className="text-gray-400">
                {searchTerm || filterRole !== 'ALL' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'No users have registered yet'
                }
              </p>
            </div>
          )}
        </motion.div>

        {/* Order History Modal */}
        {showOrderHistoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Order History</h2>
                <button
                  onClick={() => setShowOrderHistoryModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {selectedUserOrders.map((order) => (
                  <div key={order.id} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-white">{order.orderNumber}</h3>
                        <p className="text-sm text-gray-400">{order.items}</p>
                        <p className="text-xs text-gray-500">{formatDate(order.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-400">{formatCurrency(order.total)}</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs ${
                          order.status === 'delivered' 
                            ? 'bg-green-400/20 text-green-400'
                            : 'bg-yellow-400/20 text-yellow-400'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Add User Modal */}
        {showAddUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Add New User</h2>
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Role
                  </label>
                  <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500">
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    placeholder="Enter password"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="flex-1 border border-gray-600 text-gray-300 py-2 rounded-lg hover:bg-gray-800 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 aurora-gradient text-white py-2 rounded-lg hover:shadow-lg transition-all duration-300"
                  >
                    Add User
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
