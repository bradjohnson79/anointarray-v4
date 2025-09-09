
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Calendar, DollarSign, Eye, Download } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/dashboard-layout';

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch real orders from API
    setTimeout(() => {
      setOrders([
        {
          id: '1',
          orderNumber: 'ANA-2024-001',
          date: '2024-01-15',
          total: 144.44,
          status: 'delivered',
          items: [
            { name: 'Chakra Balancing Crystal Array', quantity: 1, price: 144.44 }
          ]
        },
        {
          id: '2',
          orderNumber: 'ANA-2024-002',
          date: '2024-01-20',
          total: 77.77,
          status: 'delivered',
          items: [
            { name: 'Sacred Frequency Healing Cards', quantity: 1, price: 77.77 }
          ]
        },
        {
          id: '3',
          orderNumber: 'ANA-2024-003',
          date: '2024-01-25',
          total: 222.22,
          status: 'processing',
          items: [
            { name: 'Scalar Energy Pendant', quantity: 1, price: 222.22 }
          ]
        },
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/20';
      case 'processing':
        return 'text-blue-400 bg-blue-400/20';
      case 'shipped':
        return 'text-purple-400 bg-purple-400/20';
      case 'delivered':
        return 'text-green-400 bg-green-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="aurora-text text-xl font-semibold">Loading orders...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mystical-card p-6 rounded-lg"
        >
          <h1 className="text-2xl font-bold text-white mb-2">Order History</h1>
          <p className="text-gray-300">
            Track and manage your sacred healing product orders
          </p>
        </motion.div>

        {/* Orders List */}
        <div className="space-y-4">
          {orders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mystical-card p-8 rounded-lg text-center"
            >
              <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Orders Yet</h3>
              <p className="text-gray-400 mb-4">
                Start your healing journey by exploring our sacred products
              </p>
              <a
                href="/#products"
                className="inline-block aurora-gradient text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300"
              >
                Browse Products
              </a>
            </motion.div>
          ) : (
            orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="mystical-card p-6 rounded-lg"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      Order {order.orderNumber}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(order.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        ${order.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 mt-4 md:mt-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                    <div className="flex space-x-2">
                      <button className="p-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg transition-colors duration-200">
                        <Eye className="h-4 w-4 text-purple-400" />
                      </button>
                      {order.status === 'delivered' && (
                        <button className="p-2 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 rounded-lg transition-colors duration-200">
                          <Download className="h-4 w-4 text-teal-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Items:</h4>
                  <div className="space-y-2">
                    {order.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-white font-medium">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
