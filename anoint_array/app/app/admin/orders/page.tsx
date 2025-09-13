
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Plus,
  Eye,
  Edit3,
  Trash2,
  Package,
  Truck,
  CreditCard,
  Download,
  RefreshCw,
  Calendar,
  DollarSign,
  User,
  MapPin,
  Phone,
  Mail,
  X,
  Check,
  AlertTriangle,
  Clock,
  FileText,
  Send,
  Loader2,
  Tag,
  PrinterIcon,
  ExternalLink,
  Copy,
  Calculator
} from 'lucide-react';
import AdminLayout from '@/components/admin/admin-layout';
import ImageViewer from '@/components/image-viewer';
import TaxesDutiesPanel from '@/components/admin/taxes-duties-panel';
import { calculateCanadianTaxes, formatTaxAmount, getProvinceName, getTaxTypeForProvince } from '@/lib/canadian-taxes';
import { toast } from 'sonner';

interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod?: 'stripe' | 'paypal' | 'crypto';
  totalAmount: number;
  subtotal?: number;
  taxAmount?: number;
  shippingAmount?: number;
  shippingAddress?: any;
  billingAddress?: any;
  trackingNumber?: string;
  notes?: string;
  isAbandoned: boolean;
  // Tax & Customs Fields
  buyerCountry?: string;
  shippingCountry?: string;
  taxSubtotalCad?: number;
  taxBreakdown?: any;
  dutiesEstimatedCad?: number;
  taxesEstimatedCad?: number;
  dutiesTaxesCurrency?: string;
  incoterm?: string;
  createdAt: string;
  updatedAt: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    // Customs snapshot fields
    hsCode?: string;
    countryOfOrigin?: string;
    customsDescription?: string;
    unitValueCad?: number;
    massGramsEach?: number;
    isDigital?: boolean;
  }[];
}

interface ShippingLabel {
  id: string;
  orderId: string;
  orderNumber: string;
  carrier: 'canada-post' | 'ups';
  trackingNumber: string;
  labelUrl: string;
  cost: number;
  service: string;
  estimatedDelivery: string;
  sender: any;
  recipient: any;
  createdAt: string;
  status: 'active' | 'used' | 'cancelled';
  transactionId?: string;
  shipmentId?: string;
}

export default function OrderManagementPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'shipping-labels' | 'taxes-duties'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [shippingLabels, setShippingLabels] = useState<ShippingLabel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPayment, setFilterPayment] = useState<string>('ALL');
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [showShippingLabelModal, setShowShippingLabelModal] = useState(false);
  const [showCreateLabelModal, setShowCreateLabelModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<ShippingLabel | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [labelPreviewUrl, setLabelPreviewUrl] = useState<string | null>(null);
  // Canada Post demo states
  const [demoLoading, setDemoLoading] = useState<boolean>(false);
  const [demoPreviewUrl, setDemoPreviewUrl] = useState<string | null>(null);
  // Shippo demo states
  const [shippoDemoPreviewUrl, setShippoDemoPreviewUrl] = useState<string | null>(null);
  const [shippoDemoLoading, setShippoDemoLoading] = useState<boolean>(false);
  const [shippoDemoOpenCA, setShippoDemoOpenCA] = useState<boolean>(false);
  const [shippoDemoOpenUS, setShippoDemoOpenUS] = useState<boolean>(false);

  // Shippo system status
  const [statusChecks, setStatusChecks] = useState<any[] | null>(null);
  const [statusLoading, setStatusLoading] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Precheck
  const [precheck, setPrecheck] = useState<{ ok: boolean; checks: Array<{ key: string; label: string; status: string; details?: any }> } | null>(null);
  const [precheckLoading, setPrecheckLoading] = useState<boolean>(false);

  // Create Label (Shippo) form state
  const [labelOrderId, setLabelOrderId] = useState<string>('');
  const [pkgWeight, setPkgWeight] = useState<number>(0.5);
  const [pkgLen, setPkgLen] = useState<number>(30);
  const [pkgWid, setPkgWid] = useState<number>(23);
  const [pkgHei, setPkgHei] = useState<number>(15);
  const [declaredValue, setDeclaredValue] = useState<number>(100);
  const [rates, setRates] = useState<any[]>([]);
  const [ratesLoading, setRatesLoading] = useState<boolean>(false);
  const [selectedRateId, setSelectedRateId] = useState<string>('');
  const [purchaseLoading, setPurchaseLoading] = useState<boolean>(false);
  // Clipboard + Shippo manual helpers
  const copyToClipboard = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`); }
    catch { toast.error(`Failed to copy ${label.toLowerCase()}`); }
  };
  const handleCopyShippingAddress = (order: Order) => {
    if (!order?.shippingAddress) { toast.error('No shipping address'); return; }
    const a: any = order.shippingAddress;
    const lines = [
      order.customerName,
      a.street,
      `${a.city}, ${a.state}`,
      `${a.country} ${a.zip}`
    ].filter(Boolean).join('\n');
    copyToClipboard(lines, 'Shipping address');
  };
  const handleCopyOrderItems = (order: Order) => {
    const rows = order.items.map(it => {
      const customs = [it.hsCode, it.countryOfOrigin, it.customsDescription].filter(Boolean).join(' | ');
      return `• ${it.name} x${it.quantity} — $${Number(it.price).toFixed(2)}${customs ? ` (${customs})` : ''}`;
    }).join('\n');
    const text = `Order ${order.orderNumber}\nItems:\n${rows}`;
    copyToClipboard(text, 'Order items');
  };
  const openShippoManualCreate = () => {
    window.open('https://apps.goshippo.com/orders/create?', '_blank');
  };

  useEffect(() => {
    fetchOrders();
    fetchShippingLabels();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        let detail = '';
        try { const j = await response.json(); detail = j?.detail || j?.error || response.statusText; } catch { detail = response.statusText; }
        console.error('Failed to fetch orders:', detail);
        setOrders([]);
        toast.error(`Failed to load orders${detail ? `: ${detail}` : ''}`);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const runPrecheck = async () => {
    setPrecheckLoading(true);
    try {
      const resp = await fetch('/api/admin/orders/precheck');
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Precheck failed');
      setPrecheck(data);
      toast.success('Precheck complete');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Precheck failed');
    } finally {
      setPrecheckLoading(false);
    }
  };

  const createQuickSampleOrder = async (destination: 'CA' | 'US' = 'CA') => {
    try {
      setIsCreatingOrder(true);
      // Load one product to attach to the order
      const prodResp = await fetch('/api/products?admin=true');
      const prodData = await prodResp.json();
      let first = Array.isArray(prodData) ? prodData[0] : null;
      // Auto-create a simple product if none exist
      if (!first) {
        const createResp = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Sample Product',
            teaserDescription: 'Sample product for testing orders',
            fullDescription: 'Auto-created by precheck quick-sample flow.',
            price: 25.0,
            category: 'test-items',
            isPhysical: true,
            isDigital: false,
            inStock: true,
            hsCode: '7117.11.0000',
            countryOfOrigin: 'CA',
            customsDescription: 'Sample item',
            defaultCustomsValueCad: 25.0,
            massGrams: 100
          })
        });
        if (createResp.ok) {
          first = await createResp.json();
        }
      }
      if (!first) { toast.error('No products available. Please add a product.'); return; }

      const address = destination === 'CA' ? {
        street: '200 Bloor St', city: 'Toronto', state: 'ON', country: 'CA', zip: 'M5S 1T8'
      } : {
        street: '1600 Amphitheatre Pkwy', city: 'Mountain View', state: 'CA', country: 'US', zip: '94043'
      };

      const qty = 1;
      const price = Number(first.price || 0);
      const subtotal = price * qty;
      const shippingAmount = destination === 'CA' ? 12.5 : 15.5;
      const taxAmount = destination === 'CA' ? Number((subtotal * 0.13).toFixed(2)) : 0;
      const totalAmount = Number((subtotal + shippingAmount + taxAmount).toFixed(2));

      const payload = {
        customerName: destination === 'CA' ? 'Canadian Customer' : 'American Customer',
        customerEmail: destination === 'CA' ? 'canadian.customer@example.com' : 'american.customer@example.com',
        customerPhone: '+1-555-0000',
        shippingAddress: address,
        billingAddress: address,
        items: [{ productId: first.id, name: first.name, quantity: qty, price }],
        subtotal,
        taxAmount,
        shippingAmount,
        totalAmount,
        paymentMethod: 'manual',
        paymentStatus: 'paid',
        notes: 'Quick sample order created from admin',
      };

      const resp = await fetch('/api/admin/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Create order failed');
      toast.success('Sample order created');
      fetchOrders();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Create order failed');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const buildShippoPayloadForOrder = (order: Order) => {
    const cpAccountId = process.env.NEXT_PUBLIC_SHIPPO_CP_ACCOUNT_ID as string | undefined;
    const payload: any = {
      orderId: order.id,
      sender: {
        name: 'ANOINT Array',
        company: 'ANOINT Array Inc.',
        address: '123 Sacred Way',
        city: 'Toronto',
        state: 'ON',
        province: 'ON',
        postalCode: 'M1A 1A1',
        country: 'CA',
        phone: '+1-416-555-0123'
      },
      recipient: {
        name: order.customerName,
        address: order.shippingAddress.street,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        province: order.shippingAddress.state,
        postalCode: order.shippingAddress.zip,
        country: order.shippingAddress.country,
        phone: order.customerPhone || '+1-555-0000',
        email: order.customerEmail
      },
      parcel: { weight: pkgWeight, dimensions: { length: pkgLen, width: pkgWid, height: pkgHei } },
      value: declaredValue,
      ...(order.shippingAddress.country === 'US' ? {
        customsItems: order.items.filter(it => !it.isDigital).map(it => ({
          description: it.customsDescription || it.name,
          quantity: it.quantity,
          unitValueCad: it.unitValueCad || it.price,
          hsCode: it.hsCode || '',
          countryOfOrigin: it.countryOfOrigin || 'CA',
          massGramsEach: it.massGramsEach || 100,
        }))
      } : {}),
      ...(cpAccountId ? { carrierAccountId: cpAccountId } : {})
    };
    return payload;
  };

  const fetchShippoRates = async () => {
    if (!labelOrderId) return;
    const order = orders.find(o => o.id === labelOrderId);
    if (!order || !order.shippingAddress) { toast.error('Select an order with shipping address'); return; }
    setRatesLoading(true);
    try {
      const payload = buildShippoPayloadForOrder(order);
      const resp = await fetch('/api/shipping/shippo/rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.detail ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) : (data?.error || 'Failed to get rates'));
      setRates(data.rates || []);
      setSelectedRateId('');
    } catch (e: any) {
      console.error(e); toast.error(e?.message || 'Rate fetch failed');
    } finally { setRatesLoading(false); }
  };

  const purchaseShippoLabel = async () => {
    if (!labelOrderId || !selectedRateId) { toast.error('Select a rate'); return; }
    setPurchaseLoading(true);
    try {
      const resp = await fetch('/api/shipping/shippo/purchase', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rateObjectId: selectedRateId, orderId: labelOrderId }) });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.detail ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) : (data?.error || 'Purchase failed'));
      const order = orders.find(o => o.id === labelOrderId)!;
      const newLabel: ShippingLabel = {
        id: `label-${Date.now()}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        carrier: 'canada-post',
        trackingNumber: data.trackingNumber,
        labelUrl: data.labelUrl,
        cost: data?.rate?.amount ? Number(data.rate.amount) : 0,
        service: data?.rate?.servicelevel?.name || 'Canada Post',
        estimatedDelivery: new Date().toISOString(),
        sender: {},
        recipient: order.shippingAddress,
        createdAt: new Date().toISOString(),
        status: 'active',
        transactionId: data.transactionId,
        shipmentId: data.shipmentId,
      };
      setShippingLabels(prev => [newLabel, ...prev]);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, trackingNumber: data.trackingNumber, status: 'processing' as const } : o));
      toast.success('Label purchased via Shippo');
      window.open(data.labelUrl, '_blank');
      setShowCreateLabelModal(false);
    } catch (e: any) { console.error(e); toast.error(e?.message || 'Purchase failed'); }
    finally { setPurchaseLoading(false); }
  };
  const demoGenerateShippo = async (destination: 'CA' | 'US') => {
    setShippoDemoLoading(true);
    try {
      // If NEXT_PUBLIC_SHIPPO_CP_ACCOUNT_ID is set, include it so Shippo returns your Canada Post rates
      const cpAccountId = process.env.NEXT_PUBLIC_SHIPPO_CP_ACCOUNT_ID as string | undefined;
      const payload: any = {
        orderId: `DEMO-${Date.now()}`,
        sender: {
          name: 'ANOINT Array',
          company: 'ANOINT Array Inc.',
          address: '123 Sacred Way',
          city: 'Toronto',
          state: 'ON',
          province: 'ON',
          postalCode: 'M1A 1A1',
          country: 'CA',
          phone: '+1-416-555-0123'
        },
        recipient: destination === 'CA' ? {
          name: 'Canadian Customer',
          address: '200 Bloor St',
          city: 'Toronto',
          state: 'ON',
          province: 'ON',
          postalCode: 'M5S 1T8',
          country: 'CA',
          phone: '+1-416-555-2222',
          email: 'canadian.customer@example.com'
        } : {
          name: 'American Customer',
          address: '1600 Amphitheatre Pkwy',
          city: 'Mountain View',
          state: 'CA',
          province: 'CA',
          postalCode: '94043',
          country: 'US',
          phone: '+1-650-253-0000',
          email: 'american.customer@example.com'
        },
        value: 144.44,
        parcel: {
          weight: 0.5,
          dimensions: { length: 30, width: 23, height: 15 }
        },
        ...(destination === 'US' ? {
          customsItems: [
            {
              description: 'Sterling silver chakra healing pendant with crystals',
              quantity: 1,
              unitValueCad: 144.44,
              hsCode: '7117.11.0000',
              countryOfOrigin: 'CA',
              massGramsEach: 45
            }
          ],
        } : {}),
        ...(cpAccountId ? { carrierAccountId: cpAccountId } : {})
      };

      const resp = await fetch('/api/shipping/shippo/label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Shippo demo failed');
      const url = data?.labelUrl || data?.label_url || null;
      setShippoDemoPreviewUrl(url);
      toast.success(`Shippo demo label created (${destination === 'CA' ? 'Canada' : 'USA'})`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Shippo demo failed. Add SHIPPO_API_KEY to .env');
    } finally {
      setShippoDemoLoading(false);
    }
  };

  const fetchShippingLabels = async () => {
    try {
      // TODO: Implement API call for shipping labels
      // For now, use mock data
      setShippingLabels([
        {
          id: '1',
          orderId: '1',
          orderNumber: 'ANA-2024-001',
          carrier: 'canada-post',
          trackingNumber: 'CA1642857392456',
          labelUrl: '/api/shipping/labels-png/mock-canada-post-label.png',
          cost: 12.50,
          service: 'Regular Parcel',
          estimatedDelivery: '2024-01-23',
          sender: {
            name: 'ANOINT Array Inc.',
            address: '123 Sacred Way',
            city: 'Toronto',
            province: 'ON',
            postalCode: 'M1A 1A1',
            country: 'CA'
          },
          recipient: {
            name: 'Sarah Johnson',
            address: '123 Main St',
            city: 'Toronto',
            province: 'ON',
            postalCode: 'M1A 1A1',
            country: 'CA'
          },
          createdAt: '2024-01-20T15:45:00Z',
          status: 'active'
        },
        {
          id: '2',
          orderId: '2',
          orderNumber: 'ANA-2024-002',
          carrier: 'ups',
          trackingNumber: '1Z16428573924567890',
          labelUrl: '/api/shipping/labels-png/mock-ups-label.png',
          cost: 15.50,
          service: 'UPS Ground',
          estimatedDelivery: '2024-01-22',
          sender: {
            name: 'ANOINT Array Inc.',
            address: '123 Sacred Way',
            city: 'Toronto',
            state: 'ON',
            postalCode: 'M1A 1A1',
            country: 'CA'
          },
          recipient: {
            name: 'Michael Chen',
            address: '789 Business Ave',
            city: 'Vancouver',
            state: 'BC',
            postalCode: 'V6B 2W2',
            country: 'CA'
          },
          createdAt: '2024-01-20T16:20:00Z',
          status: 'used'
        }
      ]);
    } catch (error) {
      console.error('Error fetching shipping labels:', error);
      toast.error('Failed to load shipping labels');
    }
  };

  const runStatusCheck = async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const cpAccountId = process.env.NEXT_PUBLIC_SHIPPO_CP_ACCOUNT_ID as string | undefined;
      const parcelTpl = process.env.NEXT_PUBLIC_SHIPPO_PARCEL_TEMPLATE_ID as string | undefined;
      const params = new URLSearchParams();
      if (cpAccountId) params.set('carrierAccountId', cpAccountId);
      if (parcelTpl) params.set('parcelTemplateId', parcelTpl);
      const resp = await fetch(`/api/shipping/shippo/status${params.toString() ? `?${params.toString()}` : ''}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Status check failed');
      setStatusChecks(data.checks || []);
    } catch (e: any) {
      console.error(e);
      setStatusError(e?.message || 'Status check failed');
      setStatusChecks(null);
    } finally {
      setStatusLoading(false);
    }
  };

  const demoGenerateCanadaPost = async (destination: 'CA' | 'US') => {
    setDemoLoading(true);
    try {
      const payload: any = {
        orderId: `DEMO-${Date.now()}`,
        sender: {
          name: 'ANOINT Array',
          company: 'ANOINT Array Inc.',
          address: '123 Sacred Way',
          city: 'Toronto',
          state: 'ON',
          province: 'ON',
          postalCode: 'M1A 1A1',
          country: 'CA',
          phone: '+1-416-555-0123'
        },
        recipient: destination === 'CA' ? {
          name: 'Canadian Customer',
          address: '200 Bloor St',
          city: 'Toronto',
          state: 'ON',
          province: 'ON',
          postalCode: 'M5S 1T8',
          country: 'CA',
          phone: '+1-416-555-2222',
          email: 'canadian.customer@example.com'
        } : {
          name: 'American Customer',
          address: '1600 Amphitheatre Pkwy',
          city: 'Mountain View',
          state: 'CA',
          province: 'CA',
          postalCode: '94043',
          country: 'US',
          phone: '+1-650-253-0000',
          email: 'american.customer@example.com'
        },
        serviceCode: destination === 'CA' ? 'DOM.RP' : 'USA.EP',
        value: 144.44,
        parcel: {
          weight: 0.5,
          dimensions: { length: 30, width: 23, height: 15 }
        },
        ...(destination === 'US' ? {
          customsItems: [
            {
              description: 'Sterling silver chakra healing pendant with crystals',
              quantity: 1,
              unitValueCad: 144.44,
              hsCode: '7117.11.0000',
              countryOfOrigin: 'CA',
              massGramsEach: 45
            }
          ],
          isDdpRequired: true
        } : {})
      };

      const resp = await fetch('/api/shipping/canada-post/label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error('Canada Post label demo failed');
      const data = await resp.json();
      const url = data?.labelUrl || null;
      setDemoPreviewUrl(url);
      toast.success(`Canada Post demo label created (${destination === 'CA' ? 'Canada' : 'USA'})`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to create demo label');
    } finally {
      setDemoLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || order.status === filterStatus;
    const matchesPayment = filterPayment === 'ALL' || order.paymentStatus === filterPayment;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const handleSeedDatabase = async () => {
    setIsCreatingOrder(true);
    try {
      const response = await fetch('/api/admin/orders/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Database seeded: ${result.message}`);
        // Refresh orders after seeding
        fetchOrders();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to seed database');
      }
    } catch (error) {
      toast.error('Error seeding database');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleCreateShippingLabel = async (order: Order, carrier: 'canada-post' | 'ups') => {
    if (!order.shippingAddress) {
      toast.error('Order missing shipping address');
      return;
    }

    setIsCreatingLabel(true);
    try {
      const labelEndpoint = `/api/shipping/${carrier}/label`;
      const shippoEndpoint = `/api/shipping/shippo/label`;
      let labelData: any;

      if (carrier === 'canada-post') {
        labelData = {
          orderId: order.id,
          sender: {
            name: 'ANOINT Array',
            company: 'ANOINT Array Inc.',
            address: '123 Sacred Way',
            city: 'Toronto',
            state: 'ON',
            province: 'ON',
            postalCode: 'M1A 1A1',
            country: 'CA',
            phone: '+1-416-555-0123'
          },
          recipient: {
            name: order.customerName,
            address: order.shippingAddress.street,
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            province: order.shippingAddress.state,
            postalCode: order.shippingAddress.zip,
            country: order.shippingAddress.country,
            phone: order.customerPhone || '+1-555-0000',
            email: order.customerEmail
          },
          serviceCode: 'DOM.RP',
          value: order.totalAmount,
          parcel: {
            weight: 0.5, // 0.5 kg
            dimensions: {
              length: 30, // cm
              width: 23,
              height: 15
            }
          },
          // For US shipments, include customs items and enforce DDP
          ...(order.shippingAddress.country === 'US' ? {
            customsItems: order.items
              .filter(it => !it.isDigital)
              .map(it => ({
                description: it.customsDescription || it.name,
                quantity: it.quantity,
                unitValueCad: it.unitValueCad || it.price,
                hsCode: it.hsCode || '',
                countryOfOrigin: it.countryOfOrigin || 'CA',
                massGramsEach: it.massGramsEach || 100,
              })),
            isDdpRequired: true,
          } : {})
        };
      } else {
        labelData = {
          orderId: order.id,
          sender: {
            name: 'ANOINT Array',
            company: 'ANOINT Array Inc.',
            address: '123 Sacred Way',
            city: 'Toronto',
            state: 'ON',
            province: 'ON',
            postalCode: 'M1A 1A1',
            country: 'CA',
            phone: '+1-416-555-0123'
          },
          recipient: {
            name: order.customerName,
            address: order.shippingAddress.street,
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            province: order.shippingAddress.state,
            postalCode: order.shippingAddress.zip,
            country: order.shippingAddress.country,
            phone: order.customerPhone || '+1-555-0000',
            email: order.customerEmail
          },
          serviceCode: '03',
          value: order.totalAmount,
          package: {
            weight: 1, // 1 lb
            dimensions: {
              length: 12, // inches
              width: 9,
              height: 6
            }
          }
        };
      }

      // Prefer Shippo for Canada Post labels when available; fallback to our internal route
      let response: Response | null = null;
      if (carrier === 'canada-post') {
        try {
          const cpAccountId = process.env.NEXT_PUBLIC_SHIPPO_CP_ACCOUNT_ID as string | undefined;
          const shippoBody = { ...labelData, ...(cpAccountId ? { carrierAccountId: cpAccountId } : {}) };
          response = await fetch(shippoEndpoint, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shippoBody)
          });
          if (!response.ok) throw new Error('Shippo not available');
        } catch {
          response = await fetch(labelEndpoint, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(labelData)
          });
        }
      } else {
        response = await fetch(labelEndpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(labelData)
        });
      }

      if (response.ok) {
        const result = await response.json();
        
        // Update order with tracking number
        if (result.trackingNumber) {
          const updatedOrders = orders.map(o => 
            o.id === order.id 
              ? { ...o, trackingNumber: result.trackingNumber, status: 'shipped' as const }
              : o
          );
          setOrders(updatedOrders);

          // Add to shipping labels list
          const newLabel: ShippingLabel = {
            id: `label-${Date.now()}`,
            orderId: order.id,
            orderNumber: order.orderNumber,
            carrier,
            trackingNumber: result.trackingNumber,
            labelUrl: result.labelUrl,
            cost: result.cost || (carrier === 'canada-post' ? 12.50 : 15.50),
            service: result.service || (carrier === 'canada-post' ? 'Regular Parcel' : 'UPS Ground'),
            estimatedDelivery: result.estimatedDelivery,
            sender: labelData.sender,
            recipient: labelData.recipient,
            createdAt: new Date().toISOString(),
            status: 'active'
          };
          setShippingLabels(prev => [newLabel, ...prev]);
        }

        toast.success(`${carrier === 'canada-post' ? 'Canada Post' : 'UPS'} shipping label created!`);
        
        // Open label PDF in new tab
        if (result.labelUrl) {
          window.open(result.labelUrl, '_blank');
        }
        
        console.log('Shipping Label Result:', result);
      } else {
        toast.error(`Failed to create ${carrier} shipping label`);
      }
    } catch (error) {
      console.error('Shipping label error:', error);
      toast.error('Error creating shipping label');
    } finally {
      setIsCreatingLabel(false);
      setShowShippingLabelModal(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      // TODO: Implement API call
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus as any } : order
      ));
      toast.success('Order status updated successfully');
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetailsModal(true);
  };

  const handleRefundOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to refund this order?')) {
      try {
        // TODO: Implement refund API call
        setOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, status: 'refunded', paymentStatus: 'refunded' } : order
        ));
        toast.success('Order refunded successfully');
      } catch (error) {
        toast.error('Failed to refund order');
      }
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      try {
        // TODO: Implement API call
        setOrders(prev => prev.filter(order => order.id !== orderId));
        toast.success('Order deleted successfully');
      } catch (error) {
        toast.error('Failed to delete order');
      }
    }
  };

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
      case 'cancelled':
        return 'text-red-400 bg-red-400/20';
      case 'refunded':
        return 'text-orange-400 bg-orange-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-400 bg-green-400/20';
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/20';
      case 'failed':
        return 'text-red-400 bg-red-400/20';
      case 'refunded':
        return 'text-orange-400 bg-orange-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handlePreviewLabel = (label: ShippingLabel) => {
    setSelectedLabel(label);
    // PNG images work perfectly in all browsers without any special handling
    setLabelPreviewUrl(label.labelUrl);
  };

  const handleCopyTrackingNumber = (trackingNumber: string) => {
    navigator.clipboard.writeText(trackingNumber);
    toast.success('Tracking number copied to clipboard');
  };

  const handleDownloadLabel = (labelUrl: string, filename?: string) => {
    window.open(labelUrl, '_blank');
  };

  const handleMarkLabelUsed = (labelId: string) => {
    setShippingLabels(prev => prev.map(label => 
      label.id === labelId ? { ...label, status: 'used' as const } : label
    ));
    toast.success('Label marked as used');
  };

  const handleCancelLabel = async (labelId: string) => {
    const label = shippingLabels.find(l => l.id === labelId);
    if (!label) return;
    if (!window.confirm('Are you sure you want to cancel this shipping label?')) return;
    try {
      if (label.transactionId) {
        const resp = await fetch('/api/shipping/shippo/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionId: label.transactionId, shipmentId: label.shipmentId }) });
        if (!resp.ok) { const err = await resp.json(); console.warn('Shippo cancel failed', err); }
      }
      setShippingLabels(prev => prev.map(l => l.id === labelId ? { ...l, status: 'cancelled' as const } : l));
      toast.success('Label cancelled');
    } catch (e) { console.error(e); toast.error('Cancel failed'); }
  };

  const getCarrierColor = (carrier: string) => {
    switch (carrier) {
      case 'canada-post':
        return 'text-red-400 bg-red-400/20';
      case 'ups':
        return 'text-yellow-400 bg-yellow-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getLabelStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-400/20';
      case 'used':
        return 'text-blue-400 bg-blue-400/20';
      case 'cancelled':
        return 'text-red-400 bg-red-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  const handleRefreshTracking = async (label: ShippingLabel) => {
    try {
      const carrierToken = 'canada_post';
      const resp = await fetch('/api/shipping/shippo/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ carrier: carrierToken, trackingNumber: label.trackingNumber }) });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Tracking failed');
      toast.success('Tracking refreshed');
      console.log('Tracking:', data.tracking);
    } catch (e: any) { console.error(e); toast.error(e?.message || 'Tracking failed'); }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="aurora-text text-xl font-semibold">Loading orders...</div>
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
              <h1 className="text-2xl font-bold text-white mb-2">Order Management</h1>
              <p className="text-gray-300">
                Manage orders, shipping, payments, and customer fulfillment
              </p>
            </div>
          <div className="flex items-center gap-4">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
              <div>
                Total Orders: <span className="text-white font-semibold">{orders.length}</span>
              </div>
                <div>
                  Pending: <span className="text-yellow-400 font-semibold">{orders.filter(o => o.status === 'pending').length}</span>
                </div>
                <div>
                  Delivered: <span className="text-green-400 font-semibold">{orders.filter(o => o.status === 'delivered').length}</span>
                </div>
                <div>
                  Revenue: <span className="text-purple-400 font-semibold">{formatCurrency(orders.reduce((sum, o) => sum + o.totalAmount, 0))}</span>
                </div>
              </div>
              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSeedDatabase}
                  disabled={isCreatingOrder}
                  className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                >
                  {isCreatingOrder ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Package className="h-4 w-4" />
                  )}
                  <span>Seed Sample Orders</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => createQuickSampleOrder('CA')}
                  disabled={isCreatingOrder}
                  className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                >
                  {isCreatingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Quick Sample (CA)</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateOrderModal(true)}
                  className="flex items-center space-x-2 aurora-gradient text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-300"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Order</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={runPrecheck}
                  className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-300"
                >
                  {precheckLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span>Run Precheck</span>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Precheck Panel */}
        {precheck && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mystical-card p-4 rounded-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-white font-semibold">System Precheck</div>
              <div className={`px-2 py-1 rounded text-xs ${precheck.ok ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{precheck.ok ? 'OK' : 'Warnings'}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {precheck.checks.map((c, idx) => (
                <div key={idx} className="bg-gray-800 rounded-md p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">{c.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${c.status === 'ok' ? 'bg-green-500/20 text-green-300' : c.status === 'warn' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>{c.status.toUpperCase()}</span>
                  </div>
                  {(c as any).message && (
                    <div className="mt-2 text-xs text-red-300 whitespace-pre-wrap">{(c as any).message}</div>
                  )}
                  {c.details && (
                    <div className="mt-2 text-xs text-gray-400 break-words">
                      {Object.entries(c.details).map(([k,v]) => (
                        <div key={k}>{k}: {typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v)}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mystical-card p-2 rounded-lg"
        >
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                activeTab === 'orders'
                  ? 'aurora-gradient text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <ShoppingCart className="h-5 w-5" />
              <span>Orders</span>
              <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                {orders.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('shipping-labels')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                activeTab === 'shipping-labels'
                  ? 'aurora-gradient text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Package className="h-5 w-5" />
              <span>Shipping Labels</span>
              <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                {shippingLabels.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('taxes-duties')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                activeTab === 'taxes-duties'
                  ? 'aurora-gradient text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Calculator className="h-5 w-5" />
              <span>Taxes & Duties</span>
              <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                {orders.filter(o => o.shippingAddress?.country === 'US' || (o.taxAmount && o.taxAmount > 0)).length}
              </span>
            </button>
          </div>
        </motion.div>

        {/* Tab Content */}
        {activeTab === 'orders' && (
          <>
            {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { title: 'Recent Orders', value: orders.filter(o => new Date(o.createdAt) > new Date(Date.now() - 7*24*60*60*1000)).length, icon: Clock, color: 'text-blue-400' },
            { title: 'Abandoned Carts', value: orders.filter(o => o.isAbandoned).length, icon: AlertTriangle, color: 'text-orange-400' },
            { title: 'Shipping Required', value: orders.filter(o => o.status === 'processing').length, icon: Truck, color: 'text-purple-400' },
            { title: 'Refunds', value: orders.filter(o => o.status === 'refunded').length, icon: RefreshCw, color: 'text-red-400' },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="mystical-card p-4 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.title}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mystical-card p-4 rounded-lg"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders by number, customer name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-12 py-3 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div className="relative">
              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Payments</option>
                <option value="pending">Payment Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Orders Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mystical-card rounded-lg overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50 border-b border-gray-700">
                <tr>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Order</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Customer</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Status</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Payment</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Total</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Date</th>
                  <th className="text-right py-4 px-6 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    className="border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors duration-200"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          order.isAbandoned ? 'bg-orange-600/30' : 'bg-purple-600/30'
                        }`}>
                          {order.isAbandoned ? (
                            <AlertTriangle className="h-5 w-5 text-orange-400" />
                          ) : (
                            <ShoppingCart className="h-5 w-5 text-purple-400" />
                          )}
                        </div>
                        <div>
                          <button onClick={() => handleViewDetails(order)} className="font-medium text-white hover:underline text-left">
                            {order.orderNumber}
                          </button>
                          <p className="text-sm text-gray-400">{order.items.length} items</p>
                          {order.trackingNumber && (
                            <p className="text-xs text-teal-400">Track: {order.trackingNumber}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm">
                        <button onClick={() => handleViewDetails(order)} className="font-medium text-white hover:underline text-left">
                          {order.customerName}
                        </button>
                        <div className="flex items-center text-gray-400 mb-1">
                          <Mail className="h-3 w-3 mr-1" />
                          <span className="truncate max-w-[150px]">{order.customerEmail}</span>
                        </div>
                        {order.customerPhone && (
                          <div className="flex items-center text-gray-400">
                            <Phone className="h-3 w-3 mr-1" />
                            {order.customerPhone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                          {order.paymentStatus}
                        </span>
                        {order.paymentMethod && (
                          <p className="text-xs text-gray-400 capitalize">{order.paymentMethod}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-green-400">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-300 text-sm">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetails(order)}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-colors duration-200"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        {/* Removed inline label creation; use details modal with external Shippo link */}
                        {order.paymentStatus === 'paid' && (
                          <button
                            onClick={() => handleRefundOrder(order.id)}
                            className="p-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20 rounded-lg transition-colors duration-200"
                            title="Refund Order"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors duration-200"
                          title="Delete Order"
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

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Orders Found</h3>
              <p className="text-gray-400 mb-4">
                {searchTerm || filterStatus !== 'ALL' || filterPayment !== 'ALL'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No orders have been placed yet'
                }
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateOrderModal(true)}
                className="aurora-gradient text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300"
              >
                Create First Order
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Order Details Modal */}
        {showOrderDetailsModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Order Details</h2>
                <button
                  onClick={() => setShowOrderDetailsModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Order Info */}
                <div className="space-y-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold text-white mb-3">Order Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Order Number:</span>
                        <span className="text-white font-medium">{selectedOrder.orderNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedOrder.status)}`}>
                          {selectedOrder.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Payment:</span>
                        <span className={`px-2 py-1 rounded text-xs ${getPaymentStatusColor(selectedOrder.paymentStatus)}`}>
                          {selectedOrder.paymentStatus}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Created:</span>
                        <span className="text-white">{formatDate(selectedOrder.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold text-white mb-3">Customer Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-white">{selectedOrder.customerName}</span>
                        </div>
                        <button onClick={() => copyToClipboard(selectedOrder.customerName, 'Customer name')} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-1"><Copy className="h-3 w-3"/> Copy</button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-white">{selectedOrder.customerEmail}</span>
                        </div>
                        <button onClick={() => copyToClipboard(selectedOrder.customerEmail, 'Customer email')} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-1"><Copy className="h-3 w-3"/> Copy</button>
                      </div>
                      {selectedOrder.customerPhone && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-white">{selectedOrder.customerPhone}</span>
                          </div>
                          <button onClick={() => copyToClipboard(selectedOrder.customerPhone!, 'Customer phone')} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-1"><Copy className="h-3 w-3"/> Copy</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Shipping Address */}
                  {selectedOrder.shippingAddress && (
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-white">Shipping Address</h3>
                        <button onClick={() => handleCopyShippingAddress(selectedOrder)} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-1">
                          <Copy className="h-3 w-3"/> Copy
                        </button>
                      </div>
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-1" />
                        <div className="text-sm text-white">
                          <p>{selectedOrder.shippingAddress.street}</p>
                          <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}</p>
                          <p>{selectedOrder.shippingAddress.country} {selectedOrder.shippingAddress.zip}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Items & Totals */}
                <div className="space-y-4">
                  {selectedOrder.billingAddress && (
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-white">Billing Address</h3>
                        <button onClick={() => {
                          const a: any = selectedOrder.billingAddress;
                          const lines = [selectedOrder.customerName, a.street, `${a.city}, ${a.state}`, `${a.country} ${a.zip}`].filter(Boolean).join('\n');
                          copyToClipboard(lines, 'Billing address');
                        }} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-1"><Copy className="h-3 w-3"/> Copy</button>
                      </div>
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-1" />
                        <div className="text-sm text-white">
                          <p>{(selectedOrder as any).billingAddress.street}</p>
                          <p>{(selectedOrder as any).billingAddress.city}, {(selectedOrder as any).billingAddress.state}</p>
                          <p>{(selectedOrder as any).billingAddress.country} {(selectedOrder as any).billingAddress.zip}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-white">Order Items</h3>
                      <button onClick={() => handleCopyOrderItems(selectedOrder)} className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-1">
                        <Copy className="h-3 w-3"/> Copy
                      </button>
                    </div>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                          <div>
                            <p className="text-white">{item.name}</p>
                            <p className="text-gray-400">Qty: {item.quantity}</p>
                          </div>
                          <span className="text-green-400 font-medium">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold text-white mb-3">Order Total</h3>
                    <div className="space-y-2 text-sm">
                      {selectedOrder.subtotal && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Subtotal:</span>
                          <span className="text-white">{formatCurrency(selectedOrder.subtotal)}</span>
                        </div>
                      )}
                      {selectedOrder.taxAmount && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Tax:</span>
                          <span className="text-white">{formatCurrency(selectedOrder.taxAmount)}</span>
                        </div>
                      )}
                      {selectedOrder.shippingAmount && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Shipping:</span>
                          <span className="text-white">{formatCurrency(selectedOrder.shippingAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-gray-700 pt-2">
                        <span className="text-white font-semibold">Total:</span>
                        <span className="text-green-400 font-bold">{formatCurrency(selectedOrder.totalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedOrder.trackingNumber && (
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h3 className="font-semibold text-white mb-3">Tracking Information</h3>
                      <div className="flex items-center">
                        <Truck className="h-4 w-4 text-teal-400 mr-2" />
                        <span className="text-white">{selectedOrder.trackingNumber}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tax & Duties Information */}
              <div className="mt-6">
                <TaxesDutiesPanel
                  buyerCountry={selectedOrder.buyerCountry || selectedOrder.shippingAddress?.country || 'CA'}
                  shippingCountry={selectedOrder.shippingCountry || selectedOrder.shippingAddress?.country || 'CA'}
                  shippingProvince={selectedOrder.shippingAddress?.state}
                  taxSubtotalCad={selectedOrder.taxSubtotalCad || selectedOrder.taxAmount || 0}
                  taxBreakdown={selectedOrder.taxBreakdown || {}}
                  dutiesEstimatedCad={selectedOrder.dutiesEstimatedCad || 0}
                  taxesEstimatedCad={selectedOrder.taxesEstimatedCad || 0}
                  incoterm={selectedOrder.incoterm || 'DDP'}
                  customsItems={selectedOrder.items.map(item => ({
                    hsCode: item.hsCode,
                    countryOfOrigin: item.countryOfOrigin,
                    customsDescription: item.customsDescription,
                    unitValueCad: item.unitValueCad,
                    massGramsEach: item.massGramsEach,
                    quantity: item.quantity,
                    name: item.name,
                    isDigital: item.isDigital || false
                  }))}
                  isEditable={false}
                />
              </div>

              {/* Manual Shippo create */}
              <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-gray-400">If APIs are unavailable, copy details and create a label directly in Shippo.</div>
                <button onClick={openShippoManualCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2">
                  <Truck className="h-4 w-4"/> Create label in Shippo
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Shipping Label Modal */}
        {showShippingLabelModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Create Shipping Label</h2>
                <button
                  onClick={() => setShowShippingLabelModal(false)}
                  className="text-gray-400 hover:text-white"
                  disabled={isCreatingLabel}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-2">Order Details</h3>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Order:</span>
                      <span className="text-white">{selectedOrder.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Customer:</span>
                      <span className="text-white">{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total:</span>
                      <span className="text-white">{formatCurrency(selectedOrder.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-3">Choose Shipping Carrier</h3>
                  <div className="space-y-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setShowCreateLabelModal(true); setLabelOrderId(selectedOrder.id); }}
                      disabled={isCreatingLabel}
                      className="w-full flex items-center justify-between p-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg transition-colors duration-200 disabled:opacity-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
                          <Package className="h-4 w-4 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-white font-medium">Canada Post</p>
                          <p className="text-red-300 text-xs">Regular Parcel</p>
                        </div>
                      </div>
                      {isCreatingLabel ? (
                        <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                      ) : (
                        <span className="text-red-300 text-sm">~$12.50</span>
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setShowCreateLabelModal(true); setLabelOrderId(selectedOrder.id); }}
                      disabled={isCreatingLabel}
                      className="w-full flex items-center justify-between p-3 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 rounded-lg transition-colors duration-200 disabled:opacity-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-amber-600 rounded flex items-center justify-center">
                          <Truck className="h-4 w-4 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="text-white font-medium">UPS</p>
                          <p className="text-amber-300 text-xs">UPS Ground</p>
                        </div>
                      </div>
                      {isCreatingLabel ? (
                        <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                      ) : (
                        <span className="text-amber-300 text-sm">~$15.50</span>
                      )}
                    </motion.button>
                  </div>
                </div>

                {selectedOrder.shippingAddress && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold text-white mb-2">Shipping To</h3>
                    <div className="text-sm text-gray-300">
                      <p>{selectedOrder.customerName}</p>
                      <p>{selectedOrder.shippingAddress.street}</p>
                      <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}</p>
                      <p>{selectedOrder.shippingAddress.country} {selectedOrder.shippingAddress.zip}</p>
                    </div>
                  </div>
                )}

                {isCreatingLabel && (
                  <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                      <span className="text-blue-300 text-sm">Creating shipping label...</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

          </>
        )}

        {/* Shipping Labels Tab Content */}
        {activeTab === 'shipping-labels' && (
          <>
            {/* System Pre-check (Shippo) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mystical-card p-4 rounded-lg mb-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">Shipping System Status</h3>
                <button onClick={runStatusCheck} disabled={statusLoading} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
                  <RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} />
                  {statusLoading ? 'Checking…' : 'Run Pre-check'}
                </button>
              </div>
              {statusError && (<div className="text-red-400 text-sm mb-2">{statusError}</div>)}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(statusChecks || []).map((c: any) => (
                  <div key={c.key} className={`flex items-center gap-3 p-3 rounded border ${c.ok ? 'border-green-500/30 bg-green-600/10' : 'border-red-500/30 bg-red-600/10'}`}>
                    {c.ok ? <Check className="h-5 w-5 text-green-400" /> : <AlertTriangle className="h-5 w-5 text-red-400" />}
                    <div>
                      <div className="text-white text-sm font-medium">{c.label}</div>
                      {c.detail && (<div className="text-gray-400 text-xs">{c.detail}</div>)}
                    </div>
                  </div>
                ))}
                {!statusChecks && !statusLoading && (
                  <div className="text-gray-400 text-sm">Click “Run Pre-check” to validate Shippo API key, Canada Post account, and rate availability.</div>
                )}
              </div>
            </motion.div>
            {/* Old in-house demo removed; using Shippo demo below */}
            {/* Shipping Labels Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { title: 'Active Labels', value: shippingLabels.filter(l => l.status === 'active').length, icon: Package, color: 'text-green-400' },
                { title: 'Used Labels', value: shippingLabels.filter(l => l.status === 'used').length, icon: Check, color: 'text-blue-400' },
                { title: 'Canada Post', value: shippingLabels.filter(l => l.carrier === 'canada-post').length, icon: Truck, color: 'text-red-400' },
                { title: 'UPS Labels', value: shippingLabels.filter(l => l.carrier === 'ups').length, icon: Truck, color: 'text-yellow-400' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="mystical-card p-4 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">{stat.title}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                    </div>
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Actions Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mystical-card p-4 rounded-lg"
            >
              <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search labels by tracking number, order, or customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreateLabelModal(true)}
                    className="flex items-center space-x-2 aurora-gradient text-white px-4 py-3 rounded-lg hover:shadow-lg transition-all duration-300"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Label</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Shipping Labels Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mystical-card rounded-lg overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50 border-b border-gray-700">
                    <tr>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Label</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Carrier</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Order</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Tracking</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Status</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Cost</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Created</th>
                      <th className="text-right py-4 px-6 text-gray-300 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shippingLabels.map((label, index) => (
                      <motion.tr
                        key={label.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + index * 0.05 }}
                        className="border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors duration-200"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getCarrierColor(label.carrier)}`}>
                              <Truck className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-white">
                                {label.carrier === 'canada-post' ? 'Canada Post' : 'UPS'}
                              </p>
                              <p className="text-sm text-gray-400">{label.service}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCarrierColor(label.carrier)}`}>
                            {label.carrier === 'canada-post' ? 'Canada Post' : 'UPS'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-medium text-white">{label.orderNumber}</p>
                            <p className="text-sm text-gray-400">Order #{label.orderId}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <code className="text-sm bg-gray-800 px-2 py-1 rounded text-white">
                              {label.trackingNumber}
                            </code>
                            <button
                              onClick={() => handleCopyTrackingNumber(label.trackingNumber)}
                              className="text-gray-400 hover:text-white transition-colors p-1"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getLabelStatusColor(label.status)}`}>
                            {label.status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-white font-medium">{formatCurrency(label.cost)}</p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-gray-400 text-sm">{formatDate(label.createdAt)}</p>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2 justify-end">
                            <button
                              onClick={() => handlePreviewLabel(label)}
                              className="text-blue-400 hover:text-blue-300 transition-colors p-2 rounded-lg hover:bg-blue-600/20"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadLabel(label.labelUrl)}
                              className="text-green-400 hover:text-green-300 transition-colors p-2 rounded-lg hover:bg-green-600/20"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => window.open(label.labelUrl, '_blank')}
                              className="text-purple-400 hover:text-purple-300 transition-colors p-2 rounded-lg hover:bg-purple-600/20"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                            {label.status === 'active' && (
                              <button
                                onClick={() => handleMarkLabelUsed(label.id)}
                                className="text-yellow-400 hover:text-yellow-300 transition-colors p-2 rounded-lg hover:bg-yellow-600/20"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleCancelLabel(label.id)}
                              className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-600/20"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                {shippingLabels.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No shipping labels found</p>
                    <p className="text-gray-500 text-sm">Create your first shipping label to get started</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Third-party Label Demo (Shippo) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mystical-card p-4 rounded-lg mt-4"
            >
              <h3 className="text-lg font-semibold text-white mb-2">Third‑party Label Demo (Shippo)</h3>
              <p className="text-gray-400 text-sm mb-3">Generates the carrier’s official label (PDF) via Shippo. Requires SHIPPO_API_KEY in environment and a Canada Post account connected in Shippo.</p>
              <div className="bg-gray-800 rounded-lg border border-gray-700 mb-3">
                <button onClick={() => setShippoDemoOpenCA(o => !o)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                  <span className="text-white font-semibold">Sample 1 — Canadian Customer (Domestic)</span>
                  <span className="text-gray-400">{shippoDemoOpenCA ? '−' : '+'}</span>
                </button>
                {shippoDemoOpenCA && (
                  <div className="p-4 pt-0 space-y-3">
                    <div className="text-sm text-gray-300">Creates a domestic label via Shippo. Service auto‑selected from rates.</div>
                    <div className="flex gap-3">
                      <button disabled={shippoDemoLoading} onClick={() => demoGenerateShippo('CA')} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg">Generate Demo Label</button>
                      {shippoDemoPreviewUrl && (
                        <button onClick={() => window.open(shippoDemoPreviewUrl!, '_blank')} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">Open Label</button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700">
                <button onClick={() => setShippoDemoOpenUS(o => !o)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                  <span className="text-white font-semibold">Sample 2 — American Customer (USA, DDP)</span>
                  <span className="text-gray-400">{shippoDemoOpenUS ? '−' : '+'}</span>
                </button>
                {shippoDemoOpenUS && (
                  <div className="p-4 pt-0 space-y-3">
                    <div className="text-sm text-gray-300">Creates a USA label with customs items and DDP via Shippo (official carrier label).</div>
                    <div className="flex gap-3">
                      <button disabled={shippoDemoLoading} onClick={() => demoGenerateShippo('US')} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg">Generate Demo Label</button>
                      {shippoDemoPreviewUrl && (
                        <button onClick={() => window.open(shippoDemoPreviewUrl!, '_blank')} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg">Open Label</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}

        {/* Taxes & Duties Tab Content */}
        {activeTab === 'taxes-duties' && (
          <>
            {/* Tax & Customs Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { 
                  title: 'Canadian Orders', 
                  value: orders.filter(o => o.buyerCountry === 'CA' || o.shippingAddress?.country === 'CA').length, 
                  icon: MapPin, 
                  color: 'text-red-400' 
                },
                { 
                  title: 'US Shipments (DDP)', 
                  value: orders.filter(o => o.shippingAddress?.country === 'US').length, 
                  icon: Truck, 
                  color: 'text-blue-400' 
                },
                { 
                  title: 'Tax Collected', 
                  value: `$${formatTaxAmount((orders.reduce((sum, o) => sum + (o.taxSubtotalCad || o.taxAmount || 0), 0)) * 100)}`, 
                  icon: DollarSign, 
                  color: 'text-green-400',
                  isAmount: true 
                },
                { 
                  title: 'Customs Issues', 
                  value: orders.filter(o => 
                    o.shippingAddress?.country === 'US' && 
                    o.items?.some(item => !item.isDigital && (!item.hsCode || !item.countryOfOrigin))
                  ).length, 
                  icon: AlertTriangle, 
                  color: 'text-amber-400' 
                },
              ].map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="mystical-card p-6 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium">{stat.title}</p>
                      <p className={`text-2xl font-bold ${stat.color}`}>
                        {stat.isAmount ? stat.value : stat.value}
                      </p>
                    </div>
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Provincial Tax Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mystical-card p-6 rounded-lg"
            >
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Calculator className="h-6 w-6 text-green-400 mr-3" />
                Provincial Tax Summary
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {['ON', 'BC', 'AB', 'QC', 'NB', 'NS', 'PE', 'NL', 'MB', 'SK', 'YT', 'NT', 'NU'].map(province => {
                  const provinceOrders = orders.filter(o => 
                    o.shippingAddress?.state === province && o.buyerCountry === 'CA'
                  );
                  const provinceTax = provinceOrders.reduce((sum, o) => sum + (o.taxSubtotalCad || o.taxAmount || 0), 0);
                  
                  if (provinceOrders.length === 0) return null;
                  
                  return (
                    <div key={province} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-white">{getProvinceName(province)}</span>
                        <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">
                          {getTaxTypeForProvince(province)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {provinceOrders.length} orders • ${formatTaxAmount(provinceTax * 100)} tax
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Orders Requiring Customs Attention */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mystical-card rounded-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <AlertTriangle className="h-6 w-6 text-amber-400 mr-3" />
                  Orders Requiring Customs Attention
                </h3>
                <p className="text-gray-400 mt-1">
                  US shipments missing required customs information
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50 border-b border-gray-700">
                    <tr>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Order</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Customer</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Destination</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Issues</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Incoterm</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {orders.filter(order => 
                      order.shippingAddress?.country === 'US' && 
                      order.items?.some(item => !item.isDigital && (!item.hsCode || !item.countryOfOrigin))
                    ).map((order, index) => {
                      const missingItems = order.items?.filter(item => 
                        !item.isDigital && (!item.hsCode || !item.countryOfOrigin || !item.customsDescription)
                      ) || [];
                      
                      return (
                        <motion.tr
                          key={order.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="hover:bg-gray-800/50"
                        >
                          <td className="py-4 px-6">
                            <div>
                              <span className="font-medium text-white">{order.orderNumber}</span>
                              <div className="text-sm text-gray-400">
                                {formatDate(order.createdAt)}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div>
                              <span className="text-white">{order.customerName}</span>
                              <div className="text-sm text-gray-400">{order.customerEmail}</div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center">
                              <span className="text-white mr-2">🇺🇸</span>
                              <span className="text-white">
                                {order.shippingAddress?.city}, {order.shippingAddress?.state}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="space-y-1">
                              {missingItems.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded">
                                  {item.name}: Missing customs data
                                </div>
                              ))}
                              {missingItems.length > 2 && (
                                <div className="text-xs text-amber-400">
                                  +{missingItems.length - 2} more items
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              order.incoterm === 'DDP' 
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {order.incoterm || 'DDU'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleViewDetails(order)}
                                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors duration-200"
                                title="View & Fix Customs"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
                {orders.filter(order => 
                  order.shippingAddress?.country === 'US' && 
                  order.items?.some(item => !item.isDigital && (!item.hsCode || !item.countryOfOrigin))
                ).length === 0 && (
                  <div className="text-center py-12">
                    <Check className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <p className="text-green-400 text-lg">All US Orders Compliant</p>
                    <p className="text-gray-500 text-sm">No customs issues detected</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* All Orders Tax Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mystical-card rounded-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <FileText className="h-6 w-6 text-purple-400 mr-3" />
                  All Orders - Tax & Customs Overview
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50 border-b border-gray-700">
                    <tr>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Order</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Customer Location</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Tax Applied</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Customs Status</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Incoterm</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredOrders.map((order, index) => {
                      const isUsOrder = order.shippingAddress?.country === 'US';
                      const isCanadianOrder = order.buyerCountry === 'CA' || order.shippingAddress?.country === 'CA';
                      const hasCustomsIssues = isUsOrder && order.items?.some(item => 
                        !item.isDigital && (!item.hsCode || !item.countryOfOrigin)
                      );
                      
                      return (
                        <motion.tr
                          key={order.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-gray-800/50"
                        >
                          <td className="py-4 px-6">
                            <div>
                              <span className="font-medium text-white">{order.orderNumber}</span>
                              <div className="text-sm text-gray-400">
                                {formatCurrency(order.totalAmount)}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center">
                              <span className="text-white mr-2">
                                {order.shippingAddress?.country === 'CA' ? '🇨🇦' : 
                                 order.shippingAddress?.country === 'US' ? '🇺🇸' : '🌍'}
                              </span>
                              <div>
                                <span className="text-white">
                                  {order.shippingAddress?.city}, {order.shippingAddress?.state}
                                </span>
                                <div className="text-sm text-gray-400">
                                  {order.shippingAddress?.country}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div>
                              {isCanadianOrder ? (
                                <div>
                                  <span className="text-green-400 font-medium">
                                    ${formatTaxAmount((order.taxSubtotalCad || order.taxAmount || 0) * 100)}
                                  </span>
                                  <div className="text-xs text-gray-400">
                                    {order.shippingAddress?.state ? getTaxTypeForProvince(order.shippingAddress.state) : 'Tax Applied'}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-blue-400 text-sm">Tax Exempt (Export)</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {isUsOrder ? (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                hasCustomsIssues 
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-green-500/20 text-green-400'
                              }`}>
                                {hasCustomsIssues ? 'Incomplete' : 'Complete'}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">Not Required</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              isUsOrder 
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {isUsOrder ? (order.incoterm || 'DDP') : 'N/A'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleViewDetails(order)}
                                className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors duration-200"
                                title="View Tax & Customs Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {hasCustomsIssues && (
                                <button
                                  onClick={() => {
                                    toast.info('Navigate to Product Management to update customs information');
                                  }}
                                  className="p-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors duration-200"
                                  title="Fix Customs Data"
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredOrders.length === 0 && (
                  <div className="text-center py-12">
                    <Calculator className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No orders found</p>
                    <p className="text-gray-500 text-sm">Orders will appear here with tax and customs information</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}

        {/* Create Order Modal */}
        {showCreateOrderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Create New Order</h2>
                <button
                  onClick={() => setShowCreateOrderModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      placeholder="Enter customer name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Customer Email
                    </label>
                    <input
                      type="email"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      placeholder="Enter customer email"
                    />
                  </div>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Payment Method
                    </label>
                    <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500">
                      <option value="">Select method</option>
                      <option value="stripe">Credit Card (Stripe)</option>
                      <option value="paypal">PayPal</option>
                      <option value="crypto">Cryptocurrency</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Order Status
                    </label>
                    <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500">
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Order Notes
                  </label>
                  <textarea
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
                    placeholder="Add any notes about this order..."
                  ></textarea>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateOrderModal(false)}
                    className="flex-1 border border-gray-600 text-gray-300 py-2 rounded-lg hover:bg-gray-800 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 aurora-gradient text-white py-2 rounded-lg hover:shadow-lg transition-all duration-300"
                  >
                    Create Order
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Create Label Modal */}
        {showCreateLabelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Create Shipping Label</h3>
                  <button
                    onClick={() => setShowCreateLabelModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <form className="p-6 space-y-6">
                {/* Order Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Order
                  </label>
                  <select value={labelOrderId} onChange={(e)=>setLabelOrderId(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500">
                    <option value="">Choose an order...</option>
                    {orders.filter(o => o.shippingAddress).map(order => (
                      <option key={order.id} value={order.id}>
                        {order.orderNumber} - {order.customerName} - {formatCurrency(order.totalAmount)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Shippo (Canada Post) Only */}
                <div className="text-sm text-gray-400">Labels are created via Shippo using your Canada Post account.</div>

                {/* Package Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={pkgWeight}
                      onChange={(e)=>setPkgWeight(parseFloat(e.target.value || '0'))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Declared Value
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={declaredValue}
                      onChange={(e)=>setDeclaredValue(parseFloat(e.target.value || '0'))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Dimensions */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Package Dimensions (cm)
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <input
                      type="number"
                      value={pkgLen}
                      onChange={(e)=>setPkgLen(parseFloat(e.target.value || '0'))}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    />
                    <input
                      type="number"
                      value={pkgWid}
                      onChange={(e)=>setPkgWid(parseFloat(e.target.value || '0'))}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    />
                    <input
                      type="number"
                      value={pkgHei}
                      onChange={(e)=>setPkgHei(parseFloat(e.target.value || '0'))}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Rates */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-semibold">Rates</h4>
                    <button type="button" onClick={fetchShippoRates} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50" disabled={!labelOrderId || ratesLoading}>{ratesLoading ? 'Fetching…' : 'Get Rates'}</button>
                  </div>
                  {rates.length === 0 && (
                    <div className="text-gray-400 text-sm">No rates yet. Select an order and click Get Rates.</div>
                  )}
                  {rates.length > 0 && (
                    <div className="space-y-2">
                      {rates.map((r:any) => (
                        <label key={r.object_id} className="flex items-center justify-between p-3 bg-gray-800 rounded border border-gray-700 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <input type="radio" name="rate" checked={selectedRateId===r.object_id} onChange={()=>setSelectedRateId(r.object_id)} />
                            <div>
                              <div className="text-white font-semibold">{r?.servicelevel?.name || 'Service'} — ${Number(r.amount).toFixed(2)} {r.currency}</div>
                              <div className="text-gray-400 text-xs">Provider: {r.provider} • Est: {r.estimated_days ? `${r.estimated_days} days` : 'N/A'}</div>
                            </div>
                          </div>
                          <div className="text-gray-400 text-xs">{r.carrier_account?.slice(-6)}</div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateLabelModal(false)}
                    className="flex-1 border border-gray-600 text-gray-300 py-3 rounded-lg hover:bg-gray-800 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={purchaseShippoLabel}
                    disabled={purchaseLoading || !selectedRateId}
                    className="flex-1 aurora-gradient text-white py-3 rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {purchaseLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Purchasing…</span>
                      </>
                    ) : (
                      <>
                        <PrinterIcon className="h-4 w-4" />
                        <span>Purchase Label</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Label Preview Modal */}
        {selectedLabel && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">Shipping Label Preview</h3>
                    <p className="text-gray-400 text-sm">
                      {selectedLabel.carrier === 'canada-post' ? 'Canada Post' : 'UPS'} - {selectedLabel.trackingNumber}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedLabel(null);
                      setLabelPreviewUrl(null);
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Label Details */}
                  <div className="lg:col-span-1 space-y-4">
                    <div className="mystical-card p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-white mb-3">Label Information</h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="text-gray-400">Carrier:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${getCarrierColor(selectedLabel.carrier)}`}>
                            {selectedLabel.carrier === 'canada-post' ? 'Canada Post' : 'UPS'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Service:</span>
                          <span className="text-white ml-2">{selectedLabel.service}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Cost:</span>
                          <span className="text-white ml-2">{formatCurrency(selectedLabel.cost)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Status:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs capitalize ${getLabelStatusColor(selectedLabel.status)}`}>
                            {selectedLabel.status}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Tracking:</span>
                          <div className="mt-1 flex items-center space-x-2">
                            <code className="bg-gray-800 px-2 py-1 rounded text-white text-xs">
                              {selectedLabel.trackingNumber}
                            </code>
                            <button
                              onClick={() => handleCopyTrackingNumber(selectedLabel.trackingNumber)}
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Expected Delivery:</span>
                          <span className="text-white ml-2">{formatDate(selectedLabel.estimatedDelivery)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mystical-card p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-white mb-3">Actions</h4>
                      <div className="space-y-2">
                        <button
                          onClick={() => handleDownloadLabel(selectedLabel.labelUrl)}
                          className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download PDF</span>
                        </button>
                        <button
                          onClick={() => handleRefreshTracking(selectedLabel)}
                          className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span>Refresh Status</span>
                        </button>
                        <button
                          onClick={() => window.open(selectedLabel.labelUrl, '_blank')}
                          className="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span>Open in New Tab</span>
                        </button>
                        {selectedLabel.status === 'active' && (
                          <button
                            onClick={() => handleMarkLabelUsed(selectedLabel.id)}
                            className="w-full flex items-center justify-center space-x-2 bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded-lg transition-colors"
                          >
                            <Check className="h-4 w-4" />
                            <span>Mark as Used</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleCancelLabel(selectedLabel.id)}
                          className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg transition-colors"
                        >
                          <X className="h-4 w-4" />
                          <span>Cancel Label</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* PDF Preview */}
                  <div className="lg:col-span-2">
                    <div className="mystical-card p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-white">Label Preview</h4>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => window.open(selectedLabel.labelUrl, '_blank')}
                            className="flex items-center space-x-1 text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>Open in Tab</span>
                          </button>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = selectedLabel.labelUrl;
                              link.download = `${selectedLabel.carrier}-label-${selectedLabel.trackingNumber}.pdf`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="flex items-center space-x-1 text-sm bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                      
                      {labelPreviewUrl ? (
                        <ImageViewer
                          src={labelPreviewUrl}
                          alt={`${selectedLabel.carrier === 'canada-post' ? 'Canada Post' : 'UPS'} Shipping Label`}
                          filename={`${selectedLabel.carrier}-label-${selectedLabel.trackingNumber}.png`}
                          className="min-h-[400px]"
                        />
                      ) : (
                        <div className="bg-gray-800 rounded-lg p-8 min-h-[400px] flex flex-col items-center justify-center">
                          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-400">Loading label preview...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
